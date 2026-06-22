from __future__ import annotations

import hashlib
import json
import re

from flask import current_app, g, jsonify, request

from .config import AppConfig
from .database import DatabaseError
from .repositories import idempotency as idempotency_repository
from .responses import api_error
from .security import PrincipalError, bearer_payload, verify_live_token_principal


IDEMPOTENT_PATHS = {
    "/api/account/recharge",
    "/api/rider/withdraw",
    "/api/withdraws",
    "/api/ai/generate",
    "/api/ai/listing/generate",
    "/api/ai/goods/title",
    "/api/ai/goods/desc",
    "/api/ai/goods/tags",
    "/api/auth/bind",
    "/api/user/profile/update",
    "/api/user/profile",
    "/api/user/role",
    "/api/user/email-code",
    "/api/user/verify",
    "/api/goods/favorite",
    "/api/goods/remove",
    "/api/goods/relist",
    "/api/goods/save",
    "/api/goods/publish",
    "/api/goods",
    "/api/service/save",
    "/api/service",
    "/api/services",
    "/api/errands",
    "/api/services/publish",
    "/api/errands/publish",
    "/api/service/order",
    "/api/services/orders/create",
    "/api/order/create",
    "/api/order",
    "/api/orders",
    "/api/orders/create",
    "/api/order/pay",
    "/api/order/cancel",
    "/api/order/receive",
    "/api/orders/confirm",
    "/api/order/refund",
    "/api/order/confirm",
    "/api/order/ship",
    "/api/order/complaint",
    "/api/comment",
    "/api/rider/take",
    "/api/errands/accept",
    "/api/rider/status",
    "/api/chat/send",
    "/api/chats/messages",
    "/api/admin/reconcile/run",
    "/api/admin/reconciliations",
    "/api/admin/goods/audit",
    "/api/admin/order/arbitrate",
    "/api/admin/withdraw/audit",
    "/api/admin/user/status",
    "/api/admin/ai/rules/update",
    "/api/admin/ai/rules",
    "/api/admin/backup/run",
    "/api/admin/backups",
}

IDEMPOTENCY_EXEMPT_POSTS = {
    "/api/auth/login",
    "/api/auth/logout",
    "/api/files/upload",
    "/api/files/upload-credential",
    "/api/oss/sts",
}

IDEMPOTENCY_KEY_RE = re.compile(r"^[A-Za-z0-9:_-]{8,80}$")


def _normalized_path() -> str:
    path = request.path
    if path.startswith("/v1/api/"):
        return path[3:]
    return path


def _request_hash(path: str) -> str:
    raw = request.get_data(cache=True) or b""
    return hashlib.sha256(
        b"|".join([request.method.encode("ascii"), path.encode("utf-8"), raw])
    ).hexdigest()


def _route_requires_api_auth() -> bool:
    endpoint = request.endpoint
    if not endpoint:
        return False
    view_func = current_app.view_functions.get(endpoint)
    return bool(getattr(view_func, "_requires_api_auth", False))


def _requires_idempotency(path: str) -> bool:
    if path in IDEMPOTENT_PATHS:
        return True
    if re.match(r"^/api/goods/\d+$", path):
        return True
    if re.match(r"^/api/goods/\d+/status$", path):
        return True
    if re.match(r"^/api/services/\d+/orders$", path):
        return True
    if re.match(r"^/api/orders/[^/]+/(pay|cancel|receive|refunds|confirm|ship|complaints)$", path):
        return True
    if re.match(r"^/api/errands/\d+/(accept|status)$", path):
        return True
    if re.match(r"^/api/admin/goods/\d+/audit$", path):
        return True
    if re.match(r"^/api/admin/refunds/\d+/arbitration$", path):
        return True
    if re.match(r"^/api/admin/withdraws/\d+/audit$", path):
        return True
    if re.match(r"^/api/admin/users/\d+/status$", path):
        return True
    if path in IDEMPOTENCY_EXEMPT_POSTS:
        return False
    return path.startswith("/api/") and _route_requires_api_auth()


def _begin(user_id: int, key: str, path: str, digest: str) -> tuple[str, int | None, str | None]:
    return idempotency_repository.begin_request(user_id, key, path, digest)


def _finish(user_id: int, key: str, code: int, body: str, status: str) -> None:
    idempotency_repository.finish_request(user_id, key, code, body, status)


def init_idempotency(app, config: AppConfig) -> None:
    @app.before_request
    def begin_idempotency():
        g.idempotency = None
        if request.method.lower() not in {"post", "put", "delete"}:
            return None
        path = _normalized_path()
        if not _requires_idempotency(path):
            return None
        payload = bearer_payload()
        if not payload:
            return None
        try:
            principal = verify_live_token_principal(payload)
        except PrincipalError as exc:
            return api_error(str(exc), 401, 401)
        if path.startswith("/api/admin/") and principal["role"] != "admin":
            return api_error("permission denied", 403, 403)
        key = request.headers.get("X-Idempotency-Key", "").strip()
        if not key:
            if config.idempotency_required or config.is_production:
                return api_error("missing X-Idempotency-Key", 428, 428)
            return None
        if not IDEMPOTENCY_KEY_RE.match(key):
            return api_error("invalid X-Idempotency-Key", 400, 400)
        try:
            user_id = int(principal["id"])
            state, response_code, response_body = _begin(user_id, key, path, _request_hash(path))
        except DatabaseError as exc:
            if config.is_production:
                return api_error("idempotency check failed: " + str(exc), 500, 500)
            app.logger.warning("idempotency disabled for this request: %s", exc)
            return None
        if state == "replay" and response_body:
            return jsonify(json.loads(response_body)), int(response_code or 200)
        if state == "processing":
            return api_error("request is already processing", 409, 409)
        g.idempotency = {"user_id": user_id, "key": key}
        return None

    @app.after_request
    def finish_idempotency(response):
        info = getattr(g, "idempotency", None)
        if not info:
            return response
        try:
            body = response.get_data(as_text=True)
            json.loads(body)
            final_status = "success" if response.status_code < 500 else "failed"
            _finish(info["user_id"], info["key"], response.status_code, body, final_status)
        except Exception as exc:
            app.logger.warning("failed to store idempotency result: %s", exc)
        return response
