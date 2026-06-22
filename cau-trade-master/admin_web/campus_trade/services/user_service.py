from __future__ import annotations

import hashlib
import hmac
import re
from datetime import datetime

from sqlalchemy.exc import IntegrityError

from ..crypto_utils import code_hash, encrypt_sensitive, stable_sensitive_hash
from ..repositories import users as user_repository


class UserError(ValueError):
    pass


ROLE_APPLICATION_PREFIX = "ROLE_"


def _to_int(value, default: int = 0) -> int:
    try:
        return int(value or default)
    except (TypeError, ValueError):
        return default


def validate_campus_email(email: str) -> str:
    normalized = str(email or "").strip().lower()
    if not re.match(r"^[a-zA-Z0-9._%+-]+@cau\.edu\.cn$", normalized):
        raise UserError("please use a CAU campus email address")
    return normalized


def validate_student_email_match(student_id: str, email: str) -> tuple[str, str]:
    normalized_student_id = str(student_id or "").strip()
    normalized_email = validate_campus_email(email)
    if not re.match(r"^\d{8,13}$", normalized_student_id):
        raise UserError("student id format is invalid")
    expected_email = f"{normalized_student_id}@cau.edu.cn"
    if normalized_email != expected_email:
        raise UserError("campus email must match student id")
    return normalized_student_id, normalized_email


def validate_real_name(value: str) -> str:
    text = str(value or "").strip()
    if len(text) < 2 or len(text) > 30:
        raise UserError("real name format is invalid")
    for char in text:
        if "\u4e00" <= char <= "\u9fff":
            continue
        if "A" <= char <= "Z" or "a" <= char <= "z":
            continue
        if char in {" ", ".", "·"}:
            continue
        raise UserError("real name format is invalid")
    return text


def request_role(user_id: int, data: dict, *, auto_approve: bool = False, admin_id: int | None = None) -> dict:
    role = str(data.get("role") or "user").strip()
    if role not in {"user", "provider", "rider"}:
        raise UserError("role is invalid")
    if role == "user":
        user_repository.set_user_role(user_id, "user")
        return {"role": "user", "status": "approved"}

    if not user_repository.is_user_verified(user_id):
        raise UserError("real-name verification is required before applying for a role")
    if user_repository.get_user_role(user_id) == role:
        return {"role": role, "status": "approved"}

    marker = ROLE_APPLICATION_PREFIX + role.upper()
    existing = user_repository.find_pending_role_application(user_id, marker)
    if existing:
        if auto_approve:
            return user_repository.approve_role_application(user_id, role, admin_id)
        return {"role": role, "status": "pending", "verificationId": existing["id"]}

    service_category = str(data.get("serviceCategory") or "").strip()
    campus_area = str(data.get("campusArea") or "").strip()
    contact = str(data.get("emergencyContact") or "").strip()
    verification_id = user_repository.create_role_application(
        user_id,
        marker,
        encrypt_sensitive(contact or service_category or "role_application"),
        campus_area or service_category or "role_application",
        role,
    )
    if auto_approve:
        return user_repository.approve_role_application(user_id, role, admin_id)
    return {"role": role, "status": "pending", "verificationId": verification_id}


def create_email_code(user_id: int, email: str, code: str, ttl_seconds: int) -> datetime:
    campus_email = validate_campus_email(email)
    return user_repository.create_email_code(user_id, campus_email, code_hash(campus_email, code), ttl_seconds)


def verify_campus_identity(user_id: int, data: dict, admin_id: int) -> dict:
    student_id, email = validate_student_email_match(data.get("studentId") or "", str(data.get("email") or ""))
    code = str(data.get("emailCode") or data.get("code") or "").strip()
    real_name = validate_real_name(str(data.get("realName") or ""))
    college = str(data.get("college") or "").strip()
    if not college:
        raise UserError("college is required")
    if not code:
        raise UserError("email verification code is required")

    record = user_repository.latest_pending_email_code(user_id, email)
    if not record:
        raise UserError("verification code is expired; please request a new one")
    if record["expires_at"] < datetime.now():
        user_repository.update_email_code_status(record["id"], "expired")
        raise UserError("verification code is expired; please request a new one")
    if int(record["attempt_count"] or 0) >= 5:
        user_repository.update_email_code_status(record["id"], "locked")
        raise UserError("too many verification attempts; please request a new code")
    if not hmac.compare_digest(record["code_hash"], code_hash(email, code)):
        user_repository.increment_email_code_attempts(record["id"])
        raise UserError("email verification code is incorrect")

    student_enc = stable_sensitive_hash(student_id, "student_id")
    name_enc = stable_sensitive_hash(real_name, "real_name")
    owner_id = user_repository.student_hash_owner(student_enc)
    if owner_id and int(owner_id) != int(user_id):
        raise UserError("student id has already been verified by another account")
    user_repository.approve_campus_identity(
        user_id,
        record["id"],
        student_enc,
        name_enc,
        college,
        email,
        admin_id,
    )
    phone = str(data.get("phone") or "").strip()
    if phone:
        user_repository.update_phone(user_id, encrypt_sensitive(phone))
    return {"status": "approved", "email": email, "verified": True, "phone": phone, "college": college}


def toggle_goods_favorite(user_id: int, goods_id: int) -> dict:
    if goods_id <= 0:
        raise UserError("missing goods id")
    result = user_repository.toggle_goods_favorite(user_id, goods_id)
    if result is None:
        raise UserError("goods does not exist")
    return result


def update_goods_status(user_id: int, goods_id: int, status: str) -> dict:
    if goods_id <= 0:
        raise UserError("missing goods id")
    if status not in {"removed", "on_sale"}:
        raise UserError("goods status is invalid")
    if not user_repository.update_goods_status(user_id, goods_id, status):
        raise UserError("goods does not exist or is not owned by current user")
    return {"id": goods_id, "status": status}


def create_comment(user_id: int, data: dict) -> dict:
    order_sn = str(data.get("orderSn") or "").strip()
    content = str(data.get("content") or "").strip()
    score = max(1, min(5, _to_int(data.get("score"), 5)))
    if not order_sn or not content:
        raise UserError("comment content is required")
    order = user_repository.get_order_for_comment(order_sn)
    if not order:
        raise UserError("order does not exist")
    if user_id not in {int(order["buyer_id"]), int(order["seller_id"])}:
        raise UserError("only order participants can comment")
    if order.get("status") != "completed":
        raise UserError("only completed orders can be commented")
    if user_repository.has_comment_for_order(order_sn, user_id):
        raise UserError("this order has already been commented")
    target_user_id = int(order["seller_id"]) if int(order["buyer_id"]) == user_id else int(order["buyer_id"])
    request_id = "comment-" + hashlib.sha256(f"{order_sn}:{user_id}:{content}".encode("utf-8")).hexdigest()[:24]
    try:
        comment_id = user_repository.create_comment_with_audit_event(
            order_sn,
            user_id,
            target_user_id,
            order["item_type"],
            order["item_id"],
            score,
            content,
            request_id,
        )
    except IntegrityError:
        raise UserError("this order has already been commented") from None
    return {"id": comment_id, "status": "created"}
