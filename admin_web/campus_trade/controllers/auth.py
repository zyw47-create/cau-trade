from __future__ import annotations

from flask import Blueprint

from ..cache import redis_status
from ..database import DatabaseError, ping as database_ping
from ..mailer import can_send_real_email
from ..responses import api_error, api_ok
from ..runtime import app_config
from ..security import require_api_auth, request_json
from ..services import auth_service, status_service
from ..services.auth_service import AuthError


bp = Blueprint("auth", __name__)


@bp.route("/api/status")
@bp.route("/v1/api/status")
def api_status():
    try:
        database_ping()
    except DatabaseError as exc:
        return api_error("操作失败: " + str(exc), 500, 500)
    config = app_config()
    return api_ok(
        status_service.api_status_payload(
            config,
            config.db_config()["database"],
            redis_status(),
            can_send_real_email(),
        )
    )


@bp.route("/api/health")
@bp.route("/v1/api/health")
def api_health():
    mysql_state = "up"
    try:
        database_ping()
    except DatabaseError:
        mysql_state = "down"
    redis_state = redis_status()
    redis_up = redis_state in {"connected", "fallback_mysql", "disabled"}
    status = "ok" if mysql_state == "up" and redis_up else "degraded"
    return api_ok(
        {
            "status": status,
            "mysql": mysql_state,
            "redis": "up" if redis_up else "down",
            "redisMode": redis_state,
        }
    )


@bp.route("/api/auth/login", methods=["POST"])
@bp.route("/v1/api/auth/login", methods=["POST"])
def api_auth_login():
    try:
        return api_ok(auth_service.login(request_json()))
    except AuthError as exc:
        return api_error(exc, 401, 401)
    except DatabaseError as exc:
        return api_error(exc, 500, 500)


@bp.route("/api/auth/logout", methods=["POST"])
@bp.route("/v1/api/auth/logout", methods=["POST"])
@require_api_auth
def api_auth_logout():
    return api_ok({})
