from __future__ import annotations

import os
import random
import smtplib
import time

from flask import Blueprint, request

from ..cache import redis_lock, redis_rate_limited, redis_unlock
from ..crypto_utils import decrypt_sensitive, encrypt_sensitive
from ..database import DatabaseError
from ..mailer import can_send_real_email, send_email_code
from ..repositories import users as user_repository
from ..responses import api_error, api_ok
from ..runtime import app_config, safe_upload_scene, to_int
from ..security import (
    current_api_openid,
    current_api_role,
    current_user_id,
    jwt_sign,
    require_api_auth,
    request_json,
)
from ..serialization import row_to_api
from ..services import account_service, user_service
from ..services.account_service import AccountError
from ..services.content_service import BusinessError, generate_metadata
from ..services.user_service import UserError


bp = Blueprint("users", __name__)


@bp.route("/api/user/profile")
@bp.route("/v1/api/user/profile")
@require_api_auth
def api_user_profile():
    user_id = current_user_id()
    data = account_service.get_profile_payload(user_id, decrypt_sensitive)
    if not data:
        return api_error("用户不存在", 404, 404)
    return api_ok(data)


@bp.route("/api/user/profile/update", methods=["POST"])
@bp.route("/api/user/profile", methods=["PUT"])
@bp.route("/v1/api/user/profile/update", methods=["POST"])
@bp.route("/v1/api/user/profile", methods=["PUT"])
@require_api_auth
def api_user_profile_update():
    try:
        account_service.update_profile(current_user_id(), request_json(), encrypt_sensitive)
    except DatabaseError as exc:
        return api_error(exc)
    return api_user_profile()


@bp.route("/api/user/public")
@bp.route("/v1/api/user/public")
def api_user_public():
    data = request_json()
    username = str(request.args.get("username") or data.get("username") or "").strip()
    user_id = to_int(request.args.get("id") or data.get("id") or 0)
    if user_id <= 0 and username:
        user_id = user_repository.user_id_by_username(username) or 0
    if user_id <= 0:
        user_id = 1
    row = user_repository.get_public_profile(user_id)
    if not row:
        return api_error("用户不存在", 404, 404)
    reviews = user_repository.list_public_reviews(user_id)
    goods = user_repository.list_public_goods(user_id)
    services = user_repository.list_public_services(user_id)
    user = row_to_api(row)
    user["verified"] = bool(row.get("is_verified"))
    user["creditScore"] = row.get("credit_score")
    user["goodRate"] = float(row.get("good_rate_snapshot") or 100)
    user["reviewCount"] = row.get("review_count") or 0
    user["completedCount"] = row.get("completed_trade_count") or 0
    user["activeGoodsCount"] = row.get("active_goods_count") or 0
    user["activeServiceCount"] = row.get("active_service_count") or 0
    return api_ok(
        {
            "user": user,
            "reviews": [row_to_api(item) for item in reviews],
            "goods": [row_to_api(item) for item in goods],
            "services": [row_to_api(item) for item in services],
        }
    )


@bp.route("/api/user/credit")
@bp.route("/v1/api/user/credit")
@require_api_auth
def api_user_credit():
    summary = user_repository.get_credit_summary(current_user_id())
    return api_ok({"score": summary["score"], "records": [row_to_api(row) for row in summary["records"]]})


@bp.route("/api/user/role", methods=["POST"])
@bp.route("/v1/api/user/role", methods=["POST"])
@require_api_auth
def api_user_role():
    try:
        result = user_service.request_role(
            current_user_id(),
            request_json(),
            auto_approve=False,
            admin_id=app_config().admin_id,
        )
    except UserError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    message = "角色申请已提交，等待管理员审核" if result.get("status") == "pending" else "success"
    return api_ok(result, message)


@bp.route("/api/user/avatar", methods=["POST"])
@bp.route("/v1/api/user/avatar", methods=["POST"])
@require_api_auth
def api_user_avatar():
    data = request_json()
    avatar = str(data.get("avatar") or data.get("avatarUrl") or "").strip()
    if not avatar:
        return api_error("missing avatar url")
    try:
        account_service.update_avatar(current_user_id(), avatar)
    except AccountError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    return api_user_profile()


@bp.route("/api/account/logs")
@bp.route("/v1/api/account/logs")
@require_api_auth
def api_account_logs():
    rows = account_service.list_wallet_logs(current_user_id())
    return api_ok({"list": [row_to_api(row) for row in rows]})


@bp.route("/api/rider/earnings")
@bp.route("/v1/api/rider/earnings")
@require_api_auth
def api_rider_earnings():
    try:
        summary = account_service.list_rider_earnings(current_user_id())
    except AccountError as exc:
        return api_error(exc, 403, 403)
    except DatabaseError as exc:
        return api_error(exc)
    return api_ok(
        {
            "total": summary["total"],
            "amount": summary["amount"],
            "pendingAmount": summary["pendingAmount"],
            "acceptedCount": summary["acceptedCount"],
            "list": [row_to_api(row) for row in summary["list"]],
            "withdraws": [row_to_api(row) for row in summary["withdraws"]],
        }
    )


@bp.route("/api/rider/withdraw", methods=["POST"])
@bp.route("/v1/api/rider/withdraw", methods=["POST"])
@require_api_auth
def api_rider_withdraw():
    try:
        result = account_service.request_withdraw(current_user_id(), request_json())
    except AccountError as exc:
        return api_error(exc, 403, 403)
    except DatabaseError as exc:
        return api_error(exc)
    return api_ok(result)


@bp.route("/api/account/recharge", methods=["POST"])
@bp.route("/v1/api/account/recharge", methods=["POST"])
@require_api_auth
def api_account_recharge():
    try:
        result = account_service.recharge(current_user_id(), request_json())
    except AccountError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    return api_ok(result)


@bp.route("/api/oss/sts", methods=["POST"])
@bp.route("/api/files/upload-credential", methods=["POST"])
@bp.route("/v1/api/oss/sts", methods=["POST"])
@bp.route("/v1/api/files/upload-credential", methods=["POST"])
@require_api_auth
def api_oss_sts():
    scene = safe_upload_scene(str(request_json().get("scene") or "goods"))
    expires_at = int(time.time()) + 900
    return api_ok(
        {
            "host": f"http://127.0.0.1:{os.getenv('FLASK_PORT', '5000')}/uploads/{scene}",
            "uploadUrl": "/api/files/upload",
            "uploadToken": jwt_sign(
                {
                    "sub": current_user_id(),
                    "role": current_api_role(),
                    "openid": current_api_openid(),
                    "purpose": "upload",
                    "scene": scene,
                    "exp": expires_at,
                }
            ),
            "scene": scene,
            "expire": expires_at,
            "policy": "local-upload-token",
        }
    )


@bp.route("/api/ai/listing/generate", methods=["POST"])
@bp.route("/v1/api/ai/listing/generate", methods=["POST"])
@bp.route("/api/ai/generate", methods=["POST"])
@bp.route("/v1/api/ai/generate", methods=["POST"])
@bp.route("/api/ai/goods/title", methods=["POST"])
@bp.route("/api/ai/goods/desc", methods=["POST"])
@bp.route("/api/ai/goods/tags", methods=["POST"])
@bp.route("/v1/api/ai/goods/title", methods=["POST"])
@bp.route("/v1/api/ai/goods/desc", methods=["POST"])
@bp.route("/v1/api/ai/goods/tags", methods=["POST"])
@require_api_auth
def api_ai_listing_generate():
    try:
        return api_ok(generate_metadata(request_json(), current_user_id()))
    except BusinessError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)


@bp.route("/api/user/email-code", methods=["POST"])
@bp.route("/v1/api/user/email-code", methods=["POST"])
@require_api_auth
def api_user_email_code():
    data = request_json()
    student_id = str(data.get("studentId") or "").strip()
    raw_email = str(data.get("email") or "").strip().lower()
    try:
        _, email = user_service.validate_student_email_match(student_id, raw_email)
    except UserError as exc:
        return api_error(exc)
    config = app_config()
    user_id = current_user_id(1)
    if redis_rate_limited(f"campus_trade:rate:email-code:{email}", 5, 3600):
        return api_error("验证码发送过于频繁，请稍后再试", 429, 429)
    lock_key = f"campus_trade:lock:email-code:{email}"
    if not redis_lock(lock_key, 60):
        return api_error("验证码正在发送中，请稍后再试", 429, 429)
    code = f"{random.randint(0, 999999):06d}"
    try:
        user_service.create_email_code(user_id, email, code, config.email_code_ttl_seconds)
        send_email_code(email, code)
    except (smtplib.SMTPException, OSError) as exc:
        if not config.is_production:
            return api_ok({
                "sent": False,
                "expiresIn": config.email_code_ttl_seconds,
                "demoCode": code,
                "mailError": str(exc),
            })
        return api_error("email code delivery failed: " + str(exc), 500, 500)
    except (UserError, DatabaseError, smtplib.SMTPException, OSError) as exc:
        return api_error("验证码发送失败: " + str(exc), 500, 500)
    finally:
        redis_unlock(lock_key)
    payload = {"sent": True, "expiresIn": config.email_code_ttl_seconds}
    if not config.is_production:
        payload["demoCode"] = code
    return api_ok(payload)


@bp.route("/api/user/verify", methods=["POST"])
@bp.route("/api/auth/bind", methods=["POST"])
@bp.route("/v1/api/user/verify", methods=["POST"])
@bp.route("/v1/api/auth/bind", methods=["POST"])
@require_api_auth
def api_user_verify():
    try:
        result = user_service.verify_campus_identity(current_user_id(1), request_json(), app_config().admin_id)
    except UserError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    return api_ok(result)
