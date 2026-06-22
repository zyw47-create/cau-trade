from __future__ import annotations

from decimal import Decimal, InvalidOperation

from ..repositories import accounts as account_repository
from ..repositories import users as user_repository
from ..serialization import row_to_api


class AccountError(ValueError):
    pass


def _positive_decimal(value, field: str = "amount") -> Decimal:
    try:
        amount = Decimal(str(value or "0"))
    except (InvalidOperation, ValueError):
        raise AccountError(f"{field} is invalid")
    if amount <= 0:
        raise AccountError(f"{field} must be greater than 0")
    return amount


def list_wallet_logs(user_id: int) -> list[dict]:
    return account_repository.list_wallet_logs(user_id)


def list_rider_earnings(user_id: int) -> dict:
    if user_repository.get_user_role(user_id) not in {"rider", "provider", "admin"}:
        raise AccountError("rider or provider role is required before viewing earnings")
    rows = account_repository.list_rider_earnings(user_id)
    withdraws = account_repository.list_withdraw_requests(user_id)
    total = sum(Decimal(row["amount"]) for row in rows if row["status"] in {"settled", "frozen"})
    settled = sum(Decimal(row["amount"]) for row in rows if row["status"] == "settled")
    pending = sum(Decimal(row["amount"]) for row in rows if row["status"] == "frozen")
    return {
        "total": str(total),
        "amount": str(settled),
        "pendingAmount": str(pending),
        "acceptedCount": len(rows),
        "list": rows,
        "withdraws": withdraws,
    }


def request_withdraw(user_id: int, data: dict) -> dict:
    if user_repository.get_user_role(user_id) not in {"rider", "provider", "admin"}:
        raise AccountError("rider or provider role is required before requesting withdrawal")
    amount = _positive_decimal(data.get("amount"))
    withdraw_id = account_repository.request_withdraw(user_id, amount, data.get("reason") or "withdraw request")
    return {"id": withdraw_id, "status": "pending"}


def get_profile_payload(user_id: int, decrypt_phone) -> dict | None:
    user = user_repository.get_profile(user_id)
    if not user:
        return None
    data = row_to_api(user)
    identity = user_repository.latest_identity_verification(user_id) or {}
    identity_api = row_to_api(identity) or {}
    student_id = identity.get("student_id_enc") or identity_api.get("studentIdEnc") or ""
    real_name = identity.get("real_name_enc") or identity_api.get("realNameEnc") or ""
    school_email = identity.get("school_email") or identity_api.get("schoolEmail") or ""
    if str(student_id).startswith("hmac-sha256:"):
        student_id = school_email.split("@", 1)[0] if school_email.endswith("@cau.edu.cn") else ""
    if str(real_name).startswith("hmac-sha256:"):
        real_name = user.get("nickname") or ""
    data["verified"] = bool(user.get("is_verified"))
    data["verificationStatus"] = identity.get("status") or identity_api.get("status") or ("approved" if data["verified"] else "")
    data["verificationId"] = identity.get("id") or identity_api.get("id") or ""
    data["studentId"] = student_id
    data["realName"] = real_name
    data["schoolEmail"] = school_email
    data["emailVerifiedAt"] = identity.get("email_verified_at") or identity_api.get("emailVerifiedAt") or ""
    data["reviewNote"] = identity.get("review_note") or identity_api.get("reviewNote") or ""
    data["creditScore"] = user.get("credit_score")
    data["avatar"] = user.get("avatar_url") or ""
    data["phone"] = decrypt_phone(user.get("phone_enc"))
    data["address"] = user.get("address") or ""
    data["roleCertifications"] = row_to_api(user_repository.list_role_certifications(user_id, data.get("role")))
    data.pop("phone_enc", None)
    return data


def recharge(user_id: int, data: dict) -> dict:
    amount = _positive_decimal(data.get("amount"))
    balance_after = account_repository.recharge(user_id, amount)
    if balance_after is None:
        raise AccountError("user does not exist")
    return {"balance": str(balance_after)}


def update_profile(user_id: int, data: dict, encrypt_phone) -> None:
    nickname = str(data.get("nickname") or "").strip() or "Campus User"
    username = str(data.get("username") or "").strip() or "campus_user"
    phone = str(data.get("phone") or "").strip()
    address = str(data.get("address") or "").strip()
    from ..repositories import users as user_repository

    user_repository.update_profile(user_id, nickname, username, encrypt_phone(phone) if phone else "", address)


def update_avatar(user_id: int, avatar_url: str) -> None:
    text = str(avatar_url or "").strip()
    if not text:
        raise AccountError("avatar url is required")
    user_repository.update_avatar(user_id, text)
