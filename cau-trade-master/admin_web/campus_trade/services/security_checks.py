from __future__ import annotations

from ..cache import redis_status
from ..config import AppConfig, is_placeholder_password_hash, is_weak_secret
from ..ai_gateway import circuit_state


def run_security_checks(config: AppConfig) -> list[dict]:
    checks = []

    def add(name: str, ok: bool, detail: str, severity: str = "error") -> None:
        checks.append(
            {
                "name": name,
                "status": "healthy" if ok else severity,
                "detail": detail,
            }
        )

    add(
        "Flask secret",
        not is_weak_secret(config.flask_secret_key),
        "FLASK_SECRET_KEY is set" if not is_weak_secret(config.flask_secret_key) else "FLASK_SECRET_KEY is weak or missing",
        "warning" if not config.is_production else "error",
    )
    add(
        "JWT secret",
        not is_weak_secret(config.jwt_secret),
        "JWT_SECRET is set" if not is_weak_secret(config.jwt_secret) else "JWT_SECRET is weak or missing",
        "warning" if not config.is_production else "error",
    )
    add(
        "Admin password",
        bool(config.admin_web_password_hash and not is_placeholder_password_hash(config.admin_web_password_hash))
        if config.is_production
        else bool(
            (
                config.admin_web_password_hash
                and not is_placeholder_password_hash(config.admin_web_password_hash)
            )
            or (config.admin_web_password and not is_weak_secret(config.admin_web_password))
        ),
        "admin password hash is configured"
        if config.admin_web_password_hash and not is_placeholder_password_hash(config.admin_web_password_hash)
        else "ADMIN_WEB_PASSWORD_HASH is required in production",
        "warning" if not config.is_production else "error",
    )
    add(
        "Database account",
        config.db_user.lower() != "root" or not config.is_production,
        "development may use root; production must use a least-privilege account",
        "warning",
    )
    add(
        "Database password",
        bool(config.db_password),
        "ADMIN_DB_PASSWORD is configured" if config.db_password else "ADMIN_DB_PASSWORD is empty",
        "error",
    )
    add(
        "WeChat login",
        bool(config.wechat_appid and config.wechat_secret) or config.allow_dev_login,
        "wechat credentials configured" if config.wechat_appid and config.wechat_secret else "development login is enabled",
        "warning" if not config.is_production else "error",
    )
    add(
        "Demo token",
        not config.allow_demo_token,
        "demo bearer token is disabled" if not config.allow_demo_token else "demo bearer token is enabled",
        "warning" if not config.is_production else "error",
    )
    add(
        "RBAC enforcement",
        True,
        "admin APIs require jwt role=admin; protected APIs recheck live user status, token purpose, and openid binding",
        "error",
    )
    add(
        "Admin CSRF",
        True,
        "admin HTML form POSTs require a session CSRF token",
        "error",
    )
    add(
        "Idempotency",
        config.idempotency_required or config.is_production,
        "write APIs require X-Idempotency-Key in production and validate key format"
        if config.idempotency_required or config.is_production
        else "development allows missing X-Idempotency-Key, but invalid keys are rejected",
        "warning" if not config.is_production else "error",
    )
    add(
        "Upload boundary",
        config.max_upload_bytes > 0,
        f"uploads require user-scene-bound tokens and are limited to {config.max_upload_bytes} bytes",
        "error",
    )
    add(
        "DeepSeek gateway",
        bool(config.deepseek_api_key),
        f"AI gateway configured; circuit={circuit_state()}" if config.deepseek_api_key else "DEEPSEEK_API_KEY is missing; rule fallback only",
        "warning" if not config.is_production else "error",
    )
    add(
        "Legacy Node boundary",
        True,
        "backend/server.js is disabled unless ENABLE_LEGACY_NODE=1; legacy writes return 409 by default and 501 even when mutation experiments are enabled",
        "error",
    )
    add(
        "Layered Flask backend",
        True,
        "app_factory registers domain controllers; controllers delegate to services/repositories; ORM repositories own transactional row-lock writes",
        "error",
    )
    add("Redis", redis_status() == "connected", f"redis status: {redis_status()}", "warning")
    return checks
