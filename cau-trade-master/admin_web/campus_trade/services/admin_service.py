from __future__ import annotations

from datetime import datetime

from ..repositories import admin as admin_repository


class AdminError(ValueError):
    pass


def run_reconcile(stat_date: str) -> dict:
    rows = admin_repository.wallet_reconcile(stat_date)
    return {"date": stat_date, "abnormalCount": len(rows), "abnormalList": rows}


def run_reconcile_with_audit(stat_date: str, admin_id: int, ip_address: str = "") -> dict:
    result = run_reconcile(stat_date)
    admin_repository.add_audit_log(
        admin_id,
        "wallet reconcile",
        "wallet_reconcile",
        stat_date,
        f"admin triggered wallet reconcile, abnormal={result['abnormalCount']}",
        after_data={"date": stat_date, "abnormal_count": result["abnormalCount"]},
        ip_address=ip_address,
    )
    return result


def audit_goods(goods_id: int, result: str, reason: str = "", admin_id: int = 0, conn=None, ip_address: str = "") -> dict:
    if goods_id <= 0:
        raise AdminError("missing goods id")
    mapping = {
        "pass": ("on_sale", "goods audit approved"),
        "approve": ("on_sale", "goods audit approved"),
        "reject": ("rejected", "goods audit rejected"),
        "remove": ("removed", "violating goods removed"),
    }
    if result not in mapping:
        raise AdminError("goods audit result is invalid")
    status, action = mapping[result]
    note = reason or ("manual audit rejected" if status == "rejected" else "manual audit approved")
    if not admin_repository.audit_goods(goods_id, status, note, action, admin_id, ip_address):
        raise AdminError("goods does not exist")
    return {"id": goods_id, "status": status}


def arbitrate_order(order_sn: str, result: str, admin_id: int) -> dict:
    normalized_result = result if result in {"buyer", "seller"} else "buyer"
    from ..repositories import orders as order_repository

    refund = order_repository.latest_refund_for_order(order_sn)
    if not refund:
        raise AdminError("refund or complaint record does not exist")
    try:
        ok = admin_repository.arbitrate_refund(refund["id"], admin_id, normalized_result, "Mini-program admin arbitration")
    except ValueError as exc:
        raise AdminError(str(exc)) from exc
    if not ok:
        raise AdminError("refund or complaint record does not exist")
    return {"orderSn": order_sn, "result": normalized_result}


def arbitrate_refund(refund_id: int, result: str, note: str, admin_id: int, conn=None, ip_address: str = "") -> dict:
    if refund_id <= 0:
        raise AdminError("missing refund id")
    normalized_result = result if result in {"buyer", "seller"} else ""
    if not normalized_result:
        raise AdminError("refund arbitration result is invalid")
    try:
        ok = admin_repository.arbitrate_refund(refund_id, admin_id, normalized_result, note)
    except ValueError as exc:
        raise AdminError(str(exc)) from exc
    if not ok:
        raise AdminError("refund request does not exist")
    return {"id": refund_id, "result": normalized_result}


def audit_withdraw(withdraw_id: int, result: str, admin_id: int) -> dict:
    if withdraw_id <= 0:
        raise AdminError("missing withdraw id")
    normalized_result = result if result in {"approve", "reject"} else "approve"
    status = "approved" if normalized_result == "approve" else "rejected"
    try:
        ok = admin_repository.audit_withdraw(withdraw_id, admin_id, status, "Mini-program admin withdrawal audit")
    except ValueError as exc:
        raise AdminError(str(exc)) from exc
    if not ok:
        raise AdminError("withdraw request does not exist")
    return {"id": withdraw_id, "result": normalized_result}


def update_user_status(user_id: int, status: str) -> dict:
    if user_id <= 0:
        raise AdminError("missing user id")
    if status not in {"active", "banned", "pending_verify", "removed"}:
        raise AdminError("user status is invalid")
    if not admin_repository.update_user_status(user_id, status):
        raise AdminError("user does not exist")
    return {"id": user_id, "status": status}


def update_ai_rule(data: dict, admin_id: int, conn=None, ip_address: str = "") -> None:
    manual_level = str(data.get("manualRiskLevel") or "manual")
    if manual_level not in {"pass", "manual", "reject"}:
        raise AdminError("manual risk level is invalid")
    admin_repository.upsert_ai_rule(
        {
            "text_enabled": 1 if data.get("textAudit") else 0,
            "image_enabled": 1 if data.get("imageAudit") else 0,
            "manual_level": manual_level,
            "keywords": data.get("keywords") or "",
        },
        admin_id,
        ip_address,
    )


def create_backup_audit(now_text: str, reason: str, ip_address: str = "", admin_id: int = 0) -> dict:
    admin_repository.add_audit_log(admin_id, "database backup drill", "backup", now_text, reason, ip_address=ip_address)
    return {
        "fileName": f"campus_trade_backup_{now_text}.sql",
        "createdAt": datetime.now(),
        "status": "created",
    }


def audit_verification(verification_id: int, result: str, note: str, admin_id: int, ip_address: str = "") -> dict:
    if result not in {"approve", "reject"}:
        raise AdminError("verification audit result is invalid")
    payload = admin_repository.audit_verification(verification_id, result, note, admin_id, ip_address)
    if not payload:
        raise AdminError("verification record does not exist")
    if payload.get("error") == "reviewed":
        raise AdminError("verification record has already been reviewed")
    return payload


def change_user_status(user_id: int, action: str, note: str, admin_id: int, ip_address: str = "") -> dict:
    if user_id == admin_id:
        raise AdminError("cannot change current admin account")
    if action not in {"ban", "unban"}:
        raise AdminError("user status action is invalid")
    result = admin_repository.change_user_status(user_id, action, note, admin_id, ip_address)
    if not result:
        raise AdminError("user does not exist")
    return result


def latest_backup() -> dict:
    return admin_repository.latest_backup()


def ops_health(redis_status, datetime_filter) -> dict:
    payload = admin_repository.ops_health_events()
    return {
        "status": "healthy",
        "mysqlVersion": ".".join(str(part) for part in (payload.get("mysqlVersion") or ())),
        "redis": redis_status(),
        "checkedAt": datetime_filter(datetime.now()),
        "events": payload["events"],
        "latestBackup": payload["latestBackup"],
    }
