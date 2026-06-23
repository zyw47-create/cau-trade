from __future__ import annotations

from datetime import date, datetime

from flask import Blueprint

from ..cache import redis_delete_pattern, redis_status
from ..database import DatabaseError
from ..responses import api_error, api_ok
from ..runtime import app_config, client_ip, datetime_filter, to_int
from ..security import current_user_id, require_admin_api, request_json
from ..serialization import row_to_api
from ..services import admin_query_service, admin_service
from ..services.admin_service import AdminError
from ..services.security_checks import run_security_checks


bp = Blueprint("admin_api", __name__)


@bp.route("/api/admin/stats")
@bp.route("/v1/api/admin/stats")
@require_admin_api
def api_admin_stats():
    stats = admin_query_service.stats_snapshot()
    return api_ok(row_to_api(stats or {}))


@bp.route("/api/admin/stats/export")
@bp.route("/v1/api/admin/stats/export")
@require_admin_api
def api_admin_stats_export():
    return api_ok({"fileName": "campus-trade-stats.csv", "generatedAt": datetime_filter(datetime.now())})


@bp.route("/api/admin/reconcile/run", methods=["POST"])
@bp.route("/api/admin/reconciliations", methods=["POST"])
@bp.route("/v1/api/admin/reconcile/run", methods=["POST"])
@bp.route("/v1/api/admin/reconciliations", methods=["POST"])
@require_admin_api
def api_admin_reconcile_run():
    stat_date = request_json().get("date") or date.today().isoformat()
    try:
        result = admin_service.run_reconcile_with_audit(stat_date, current_user_id(), client_ip())
    except DatabaseError as exc:
        return api_error(exc)
    result["abnormalList"] = [row_to_api(row) for row in result["abnormalList"]]
    return api_ok(result)


@bp.route("/api/admin/goods/pending")
@bp.route("/v1/api/admin/goods/pending")
@require_admin_api
def api_admin_goods_pending():
    return api_ok({"list": [row_to_api(row) for row in admin_query_service.fetch_pending_goods()]})


@bp.route("/api/admin/goods/audit", methods=["POST"])
@bp.route("/api/admin/goods/<int:goods_id>/audit", methods=["POST"])
@bp.route("/v1/api/admin/goods/audit", methods=["POST"])
@bp.route("/v1/api/admin/goods/<int:goods_id>/audit", methods=["POST"])
@require_admin_api
def api_admin_goods_audit(goods_id: int | None = None):
    data = request_json()
    goods_id = goods_id or to_int(data.get("id"))
    try:
        result = admin_service.audit_goods(goods_id, data.get("result"), data.get("reason") or "", admin_id=current_user_id(), ip_address=client_ip())
    except AdminError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:goods:list:on_sale:*")
    redis_delete_pattern(f"campus_trade:goods:detail:{goods_id}")
    return api_ok(result)


@bp.route("/api/admin/orders/refunding")
@bp.route("/v1/api/admin/orders/refunding")
@require_admin_api
def api_admin_orders_refunding():
    return api_ok({"list": [row_to_api(row) for row in admin_query_service.fetch_refunds()]})


@bp.route("/api/admin/order/arbitrate", methods=["POST"])
@bp.route("/api/admin/refunds/<int:refund_id>/arbitration", methods=["POST"])
@bp.route("/v1/api/admin/order/arbitrate", methods=["POST"])
@bp.route("/v1/api/admin/refunds/<int:refund_id>/arbitration", methods=["POST"])
@require_admin_api
def api_admin_order_arbitrate(refund_id: int | None = None):
    data = request_json()
    try:
        if refund_id:
            return api_ok(admin_service.arbitrate_refund(refund_id, data.get("result") or "buyer", data.get("note") or "Mini-program admin arbitration", current_user_id(), ip_address=client_ip()))
        return api_ok(admin_service.arbitrate_order(data.get("orderSn"), data.get("result") or "buyer", current_user_id()))
    except AdminError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)


@bp.route("/api/admin/verifications")
@bp.route("/v1/api/admin/verifications")
@require_admin_api
def api_admin_verifications():
    return api_ok({"list": [row_to_api(row) for row in admin_query_service.fetch_verifications()]})


@bp.route("/api/admin/verifications/<int:verification_id>/audit", methods=["POST"])
@bp.route("/v1/api/admin/verifications/<int:verification_id>/audit", methods=["POST"])
@require_admin_api
def api_admin_verification_audit(verification_id: int):
    data = request_json()
    try:
        result = admin_service.audit_verification(
            verification_id,
            data.get("result") or "",
            data.get("note") or "Manual verification review",
            current_user_id(),
            client_ip(),
        )
    except AdminError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    return api_ok(result)

@bp.route("/api/admin/withdraws")
@bp.route("/v1/api/admin/withdraws")
@require_admin_api
def api_admin_withdraws():
    return api_ok({"list": [row_to_api(row) for row in admin_query_service.fetch_withdraws()]})


@bp.route("/api/admin/withdraw/audit", methods=["POST"])
@bp.route("/api/admin/withdraws/<int:withdraw_id>/audit", methods=["POST"])
@bp.route("/v1/api/admin/withdraw/audit", methods=["POST"])
@bp.route("/v1/api/admin/withdraws/<int:withdraw_id>/audit", methods=["POST"])
@require_admin_api
def api_admin_withdraw_audit(withdraw_id: int | None = None):
    data = request_json()
    try:
        return api_ok(admin_service.audit_withdraw(withdraw_id or to_int(data.get("id")), data.get("result") or "approve", current_user_id()))
    except AdminError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)


@bp.route("/api/admin/users")
@bp.route("/v1/api/admin/users")
@require_admin_api
def api_admin_users():
    return api_ok({"list": [row_to_api(row) for row in admin_query_service.fetch_users()]})


@bp.route("/api/admin/user/status", methods=["POST"])
@bp.route("/api/admin/users/<int:user_id>/status", methods=["PUT"])
@bp.route("/v1/api/admin/user/status", methods=["POST"])
@bp.route("/v1/api/admin/users/<int:user_id>/status", methods=["PUT"])
@require_admin_api
def api_admin_user_status(user_id: int | None = None):
    data = request_json()
    try:
        return api_ok(admin_service.update_user_status(user_id or to_int(data.get("id")), data.get("status") or "active"))
    except AdminError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)


@bp.route("/api/admin/ai/rules")
@bp.route("/v1/api/admin/ai/rules")
@require_admin_api
def api_admin_ai_rules():
    rule = admin_query_service.fetch_ai_rule()
    return api_ok(
        {
            "textAudit": bool(rule.get("text_audit_enabled")),
            "imageAudit": bool(rule.get("image_audit_enabled")),
            "manualRiskLevel": rule.get("manual_risk_level"),
            "keywords": rule.get("keywords") or "",
            "updatedAt": datetime_filter(rule.get("updated_at")),
        }
    )


@bp.route("/api/admin/ai/rules/update", methods=["POST"])
@bp.route("/api/admin/ai/rules", methods=["PUT"])
@bp.route("/v1/api/admin/ai/rules/update", methods=["POST"])
@bp.route("/v1/api/admin/ai/rules", methods=["PUT"])
@require_admin_api
def api_admin_ai_rules_update():
    try:
        admin_service.update_ai_rule(request_json(), current_user_id(), ip_address=client_ip())
    except AdminError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    return api_admin_ai_rules()


@bp.route("/api/admin/audit/logs")
@bp.route("/v1/api/admin/audit/logs")
@require_admin_api
def api_admin_audit_logs():
    return api_ok({"list": [row_to_api(row) for row in admin_query_service.fetch_recent_logs()]})


@bp.route("/api/admin/ops/health")
@bp.route("/v1/api/admin/ops/health")
@require_admin_api
def api_admin_ops_health():
    try:
        health = admin_service.ops_health(redis_status, datetime_filter)
    except DatabaseError as exc:
        return api_error(exc)
    health["events"] = [row_to_api(row) for row in health["events"]]
    latest = health.get("latestBackup") or {}
    if latest.get("createdAt"):
        latest["createdAt"] = datetime_filter(latest.get("createdAt"))
    health["latestBackup"] = latest
    return api_ok(health)


@bp.route("/api/admin/security/checks")
@bp.route("/v1/api/admin/security/checks")
@require_admin_api
def api_admin_security_checks():
    return api_ok({"list": run_security_checks(app_config())})


@bp.route("/api/admin/backup/run", methods=["POST"])
@bp.route("/api/admin/backups", methods=["POST"])
@bp.route("/v1/api/admin/backup/run", methods=["POST"])
@bp.route("/v1/api/admin/backups", methods=["POST"])
@require_admin_api
def api_admin_backup_run():
    now_text = datetime.now().strftime("%Y%m%d%H%M%S")
    try:
        result = admin_service.create_backup_audit(now_text, "Mini-program admin triggered backup drill", client_ip(), current_user_id())
    except DatabaseError as exc:
        return api_error(exc)
    result["createdAt"] = datetime_filter(result["createdAt"])
    return api_ok(result)


@bp.route("/api/admin/backup/latest")
@bp.route("/api/admin/backups/latest")
@bp.route("/v1/api/admin/backup/latest")
@bp.route("/v1/api/admin/backups/latest")
@require_admin_api
def api_admin_backup_latest():
    try:
        result = admin_service.latest_backup()
    except DatabaseError as exc:
        return api_error(exc)
    if result.get("createdAt"):
        result["createdAt"] = datetime_filter(result.get("createdAt"))
    return api_ok(result)
