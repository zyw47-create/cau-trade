from __future__ import annotations

import os
from dataclasses import dataclass
import secrets
from pathlib import Path
from urllib.parse import quote_plus


ADMIN_WEB_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ADMIN_WEB_DIR.parent


WEAK_SECRET_VALUES = {
    "",
    "123456",
    "admin" + "123",
    "change-me",
    "change-this-to-a-random-local-secret",
    "campus-admin-local-secret-change-me",
    "campus-trade-local-secret",
}


def is_weak_secret(value: str | None) -> bool:
    text = (value or "").strip()
    lowered = text.lower()
    if lowered in WEAK_SECRET_VALUES:
        return True
    if lowered.startswith(("replace-", "replace_", "your-", "your_", "example-", "example_")):
        return True
    if "<" in text or ">" in text:
        return True
    return len(text) < 16


def is_placeholder_password_hash(value: str | None) -> bool:
    text = (value or "").strip().lower()
    if not text:
        return True
    return any(marker in text for marker in ["placeholder", "example", "<", ">", "change-me"])


def local_secret(name: str) -> str:
    """Create a per-process development secret when no env secret is configured."""
    return f"local-{name.lower().replace('_', '-')}-{secrets.token_urlsafe(32)}"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and value and key not in os.environ:
            os.environ[key] = value


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


@dataclass(frozen=True)
class AppConfig:
    app_env: str
    testing: bool
    flask_host: str
    flask_port: int
    flask_secret_key: str
    jwt_secret: str
    email_code_secret: str
    pii_encryption_key: str
    admin_id: int
    admin_web_username: str
    admin_web_password: str
    admin_web_password_hash: str
    db_host: str
    db_port: int
    db_user: str
    db_password: str
    db_name: str
    redis_url: str
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_pass: str
    smtp_from: str
    mock_email: str
    email_code_ttl_seconds: int
    allow_dev_login: bool
    allow_demo_token: bool
    api_demo_token: str
    wechat_appid: str
    wechat_secret: str
    deepseek_api_key: str
    deepseek_base_url: str
    deepseek_model: str
    deepseek_timeout_seconds: int
    ai_enabled: bool
    ai_circuit_fail_threshold: int
    ai_circuit_reset_seconds: int
    idempotency_required: bool
    max_upload_bytes: int
    image_audit_endpoint: str = ""
    image_audit_api_key: str = ""
    image_audit_timeout_seconds: int = 8

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"prod", "production"}

    def db_config(self) -> dict:
        return {
            "host": self.db_host,
            "port": self.db_port,
            "user": self.db_user,
            "password": self.db_password,
            "database": self.db_name,
            "charset": "utf8mb4",
        }

    def database_uri(self) -> str:
        user = quote_plus(self.db_user)
        password = quote_plus(self.db_password)
        host = self.db_host
        return (
            f"mysql+pymysql://{user}:{password}@{host}:{self.db_port}/"
            f"{self.db_name}?charset=utf8mb4"
        )

    def validate(self) -> None:
        if not self.is_production:
            if self.testing:
                return
            if self.db_user.strip().lower() != "root" and not self.db_password.strip():
                raise RuntimeError(
                    "incomplete local configuration: ADMIN_DB_PASSWORD is required "
                    f"when ADMIN_DB_USER={self.db_user!r}"
                )
            return
        required = {
            "FLASK_SECRET_KEY": self.flask_secret_key,
            "JWT_SECRET": self.jwt_secret,
            "EMAIL_CODE_SECRET": self.email_code_secret,
            "PII_ENCRYPTION_KEY": self.pii_encryption_key,
            "ADMIN_WEB_PASSWORD_HASH": self.admin_web_password_hash,
            "DEEPSEEK_API_KEY": self.deepseek_api_key,
            "WECHAT_APPID": self.wechat_appid,
            "WECHAT_SECRET": self.wechat_secret,
            "ADMIN_DB_PASSWORD": self.db_password,
        }
        weak = [name for name, value in required.items() if is_weak_secret(value)]
        if not self.admin_web_password_hash:
            weak.append("ADMIN_WEB_PASSWORD_HASH")
        if self.admin_web_password_hash and is_placeholder_password_hash(self.admin_web_password_hash):
            weak.append("ADMIN_WEB_PASSWORD_HASH")
        if self.admin_web_password:
            weak.append("ADMIN_WEB_PASSWORD")
        if self.max_upload_bytes <= 0:
            weak.append("MAX_UPLOAD_BYTES")
        if weak:
            joined = ", ".join(sorted(weak))
            raise RuntimeError(f"unsafe production configuration: {joined}")
        if self.db_user.lower() == "root":
            raise RuntimeError("unsafe production configuration: ADMIN_DB_USER must not be root")
        if self.allow_dev_login or self.allow_demo_token:
            raise RuntimeError("unsafe production configuration: demo/dev login is enabled")


def load_config() -> AppConfig:
    load_env_file(PROJECT_ROOT / ".env")
    load_env_file(ADMIN_WEB_DIR / ".env")
    load_env_file(ADMIN_WEB_DIR / ".env.local")

    flask_secret = os.getenv("FLASK_SECRET_KEY") or local_secret("FLASK_SECRET_KEY")
    jwt_secret = os.getenv("JWT_SECRET") or local_secret("JWT_SECRET")
    email_secret = os.getenv("EMAIL_CODE_SECRET") or local_secret("EMAIL_CODE_SECRET")
    pii_key = os.getenv("PII_ENCRYPTION_KEY") or local_secret("PII_ENCRYPTION_KEY")

    config = AppConfig(
        app_env=os.getenv("APP_ENV", os.getenv("FLASK_ENV", "development")),
        testing=env_bool("TESTING", False),
        flask_host=os.getenv("FLASK_HOST", "127.0.0.1"),
        flask_port=env_int("FLASK_PORT", 5000),
        flask_secret_key=flask_secret,
        jwt_secret=jwt_secret,
        email_code_secret=email_secret,
        pii_encryption_key=pii_key,
        admin_id=env_int("ADMIN_ID", 99),
        admin_web_username=os.getenv("ADMIN_WEB_USERNAME", "admin"),
        admin_web_password=os.getenv("ADMIN_WEB_PASSWORD", ""),
        admin_web_password_hash=os.getenv("ADMIN_WEB_PASSWORD_HASH", ""),
        db_host=os.getenv("ADMIN_DB_HOST", "127.0.0.1"),
        db_port=env_int("ADMIN_DB_PORT", 3306),
        db_user=os.getenv("ADMIN_DB_USER", "root"),
        db_password=os.getenv("ADMIN_DB_PASSWORD", ""),
        db_name=os.getenv("ADMIN_DB_NAME", "campus_trade"),
        redis_url=os.getenv("REDIS_URL", ""),
        smtp_host=os.getenv("SMTP_HOST", ""),
        smtp_port=env_int("SMTP_PORT", 465),
        smtp_user=os.getenv("SMTP_USER", ""),
        smtp_pass=os.getenv("SMTP_PASS", ""),
        smtp_from=os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "") or "campus-trade@example.com"),
        mock_email=os.getenv("MOCK_EMAIL", "auto").lower(),
        email_code_ttl_seconds=env_int("EMAIL_CODE_TTL_SECONDS", 600),
        allow_dev_login=env_bool("ALLOW_DEV_LOGIN", False),
        allow_demo_token=env_bool("ALLOW_DEMO_TOKEN", False),
        api_demo_token=os.getenv("API_DEMO_TOKEN", ""),
        wechat_appid=os.getenv("WECHAT_APPID", ""),
        wechat_secret=os.getenv("WECHAT_SECRET", ""),
        deepseek_api_key=os.getenv("DEEPSEEK_API_KEY", ""),
        deepseek_base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        deepseek_model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        deepseek_timeout_seconds=env_int("DEEPSEEK_TIMEOUT_SECONDS", 12),
        ai_enabled=env_bool("AI_ENABLED", True),
        ai_circuit_fail_threshold=env_int("AI_CIRCUIT_FAIL_THRESHOLD", 3),
        ai_circuit_reset_seconds=env_int("AI_CIRCUIT_RESET_SECONDS", 60),
        idempotency_required=env_bool("IDEMPOTENCY_REQUIRED", False),
        max_upload_bytes=env_int("MAX_UPLOAD_BYTES", 5 * 1024 * 1024),
        image_audit_endpoint=os.getenv("IMAGE_AUDIT_ENDPOINT", ""),
        image_audit_api_key=os.getenv("IMAGE_AUDIT_API_KEY", ""),
        image_audit_timeout_seconds=env_int("IMAGE_AUDIT_TIMEOUT_SECONDS", 8),
    )
    config.validate()
    return config
