from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from functools import wraps

from flask import request, session

from .config import AppConfig
from .repositories.users import get_auth_principal
from .responses import api_error


_config: AppConfig | None = None


class PrincipalError(ValueError):
    pass


def configure_security(config: AppConfig) -> None:
    global _config
    _config = config


def config() -> AppConfig:
    if _config is None:
        raise RuntimeError("security is not configured")
    return _config


def b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def jwt_sign(payload: dict) -> str:
    cfg = config()
    body = dict(payload)
    body.setdefault("iat", int(time.time()))
    body.setdefault("exp", int(time.time()) + 86400)
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = ".".join(
        [
            b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8")),
            b64url_encode(json.dumps(body, separators=(",", ":")).encode("utf-8")),
        ]
    )
    signature = hmac.new(
        cfg.jwt_secret.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256
    ).digest()
    return f"{signing_input}.{b64url_encode(signature)}"


def issue_api_token(user_id: int, role: str, openid: str) -> str:
    return jwt_sign({"sub": user_id, "role": role, "openid": openid, "purpose": "api"})


def jwt_verify(token: str) -> dict | None:
    cfg = config()
    try:
        header_b64, payload_b64, signature_b64 = token.split(".", 2)
        header = json.loads(b64url_decode(header_b64).decode("utf-8"))
        if header.get("alg") != "HS256" or header.get("typ") != "JWT":
            return None
        signing_input = f"{header_b64}.{payload_b64}"
        expected = hmac.new(
            cfg.jwt_secret.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(b64url_decode(signature_b64), expected):
            return None
        payload = json.loads(b64url_decode(payload_b64).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def request_json() -> dict:
    return request.get_json(silent=True) or {}


def bearer_payload() -> dict | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    payload = jwt_verify(token) if "." in token else None
    if payload and payload.get("purpose") != "api":
        return None
    cfg = config()
    if not payload and cfg.allow_demo_token and token and token == cfg.api_demo_token:
        return {"sub": 1, "role": "user", "purpose": "api", "demo": True}
    return payload


def csrf_token() -> str:
    token = session.get("_csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["_csrf_token"] = token
    return str(token)


def verify_csrf_token(token: str | None) -> bool:
    stored = str(session.get("_csrf_token") or "")
    supplied = str(token or "")
    return bool(stored and supplied and hmac.compare_digest(stored, supplied))


def verify_live_token_principal(payload: dict) -> dict:
    user_id = int(payload.get("sub") or 0)
    if user_id <= 0:
        raise PrincipalError("invalid token subject")
    row = get_auth_principal(user_id)
    if not row or row.get("status") in {"banned", "removed"}:
        raise PrincipalError("account is not allowed")
    token_openid = str(payload.get("openid") or "")
    token_role = str(payload.get("role") or "")
    if not payload.get("demo") and not token_openid:
        raise PrincipalError("token principal binding missing")
    if not payload.get("demo") and not token_role:
        raise PrincipalError("token role binding missing")
    if not payload.get("demo") and row.get("openid") and not hmac.compare_digest(token_openid, str(row["openid"])):
        raise PrincipalError("token principal mismatch")
    return {
        "id": user_id,
        "role": str(row.get("role") or token_role or "user"),
        "openid": str(row.get("openid") or token_openid),
    }


def require_api_auth(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        payload = bearer_payload()
        if not payload:
            return api_error("missing or invalid bearer token", 401, 401)
        try:
            principal = verify_live_token_principal(payload)
        except PrincipalError as exc:
            return api_error(str(exc), 401, 401)
        request.api_user_id = principal["id"]
        request.api_role = principal["role"]
        request.api_openid = principal["openid"]
        return view_func(*args, **kwargs)

    wrapper._requires_api_auth = True
    return wrapper


def current_user_id(default: int = 0) -> int:
    return int(getattr(request, "api_user_id", default) or default)


def current_api_role() -> str:
    return str(getattr(request, "api_role", "guest") or "guest")


def current_api_openid() -> str:
    return str(getattr(request, "api_openid", "") or "")


def require_api_role(*roles: str):
    allowed = set(roles)

    def decorator(view_func):
        @require_api_auth
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            if current_api_role() not in allowed:
                return api_error("permission denied", 403, 403)
            return view_func(*args, **kwargs)

        wrapper._requires_api_auth = True
        wrapper._requires_api_role = tuple(roles)
        return wrapper

    return decorator


def require_admin_api(view_func):
    return require_api_role("admin")(view_func)


def hash_password(password: str, iterations: int = 260000) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return (
        f"pbkdf2_sha256${iterations}$"
        f"{base64.b64encode(salt).decode('ascii')}$"
        f"{base64.b64encode(digest).decode('ascii')}"
    )


def verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False
    try:
        alg, iterations_text, salt_text, digest_text = stored_hash.split("$", 3)
        if alg != "pbkdf2_sha256":
            return False
        iterations = int(iterations_text)
        salt = base64.b64decode(salt_text.encode("ascii"))
        expected = base64.b64decode(digest_text.encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def verify_admin_login(username: str, password: str) -> bool:
    cfg = config()
    if not hmac.compare_digest(username, cfg.admin_web_username):
        return False
    if cfg.admin_web_password_hash:
        return verify_password(password, cfg.admin_web_password_hash)
    if not cfg.admin_web_password:
        return False
    return hmac.compare_digest(password, cfg.admin_web_password)


def require_login(view_func):
    from flask import redirect, url_for

    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("login", next=request.path))
        return view_func(*args, **kwargs)

    return wrapper
