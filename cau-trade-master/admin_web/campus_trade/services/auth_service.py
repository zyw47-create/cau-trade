from __future__ import annotations

import json
import re
import urllib.error
import urllib.parse
import urllib.request

from ..config import AppConfig
from ..crypto_utils import decrypt_sensitive
from ..repositories.users import create_dev_user, create_wechat_user, get_user_by_openid
from ..security import issue_api_token
from ..serialization import row_to_api
from . import account_service


class AuthError(ValueError):
    pass


_config: AppConfig | None = None


def configure_auth_service(config: AppConfig) -> None:
    global _config
    _config = config


def config() -> AppConfig:
    if _config is None:
        raise RuntimeError("auth service is not configured")
    return _config


def _wechat_jscode2session(code: str) -> dict:
    cfg = config()
    if not cfg.wechat_appid or not cfg.wechat_secret:
        raise AuthError("wechat credentials are not configured")
    query = urllib.parse.urlencode(
        {
            "appid": cfg.wechat_appid,
            "secret": cfg.wechat_secret,
            "js_code": code,
            "grant_type": "authorization_code",
        }
    )
    url = "https://api.weixin.qq.com/sns/jscode2session?" + query
    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        raise AuthError(f"wechat login request failed: {exc}") from exc


def _wechat_openid(code: str) -> str:
    payload = _wechat_jscode2session(code)
    if payload.get("errcode"):
        raise AuthError(f"wechat login failed: {payload.get('errmsg') or payload.get('errcode')}")
    openid = str(payload.get("openid") or "")
    if not openid:
        raise AuthError("wechat login did not return openid")
    return openid


def _resolve_identity(data: dict) -> tuple[str, str]:
    cfg = config()
    if data.get("userId") or data.get("openid"):
        raise AuthError("wechat code is required; userId/openid login is not allowed")
    code = str(data.get("code") or "").strip()
    if code:
        return _wechat_openid(code), "wechat"
    dev_openid = str(data.get("devOpenid") or "").strip()
    if cfg.allow_dev_login and dev_openid:
        if not re.match(r"^[A-Za-z0-9:_-]{6,64}$", dev_openid):
            raise AuthError("devOpenid format is invalid")
        return dev_openid, "dev"
    raise AuthError("wechat code is required")


def login(data: dict) -> dict:
    openid, identity_source = _resolve_identity(data)
    user = get_user_by_openid(openid)
    if not user and identity_source == "wechat":
        user = create_wechat_user(
            openid,
            data.get("nickname") or "Campus User",
            data.get("avatarUrl") or data.get("avatar") or "",
        )
    elif not user and identity_source == "dev" and config().allow_dev_login:
        username = "dev_" + openid.replace("-", "_")[-24:]
        user = create_dev_user(openid, data.get("nickname") or "Campus User", username)
    if not user:
        raise AuthError("user is not registered")
    if user.get("status") in {"banned", "removed"}:
        raise AuthError("account is not allowed to login")
    token = issue_api_token(int(user["id"]), user["role"], openid)
    api_user = account_service.get_profile_payload(int(user["id"]), decrypt_sensitive) or row_to_api(user)
    if "verified" not in api_user:
        api_user["verified"] = bool(user.get("is_verified"))
    if "creditScore" not in api_user:
        api_user["creditScore"] = user.get("credit_score")
    if "avatar" not in api_user:
        api_user["avatar"] = user.get("avatar_url") or ""
    return {"token": token, "user": api_user}
