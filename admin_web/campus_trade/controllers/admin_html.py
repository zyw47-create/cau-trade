from __future__ import annotations

import csv
import io
from datetime import date

from flask import Response, flash, redirect, render_template, request, session, url_for

from ..cache import redis_delete_pattern
from ..database import DatabaseError
from ..runtime import app_config, client_ip, datetime_filter, require_admin_csrf
from ..security import require_login, verify_admin_login
from ..services import admin_query_service, admin_service
from ..services.admin_service import AdminError


def login():
    if request.method == "POST":
        if not require_admin_csrf():
            flash("表单已过期，请刷新后重试", "error")
            return render_template("login.html"), 400
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        if verify_admin_login(username, password):
            session["admin_logged_in"] = True
            session["admin_name"] = username
            return redirect(request.args.get("next") or url_for("dashboard"))
        flash("账号或密码错误", "error")
    return render_template("login.html")


@require_login
def logout():
    session.clear()
    flash("已退出登录", "ok")
    return redirect(url_for("login"))


@require_login
def dashboard():
    try:
        data = admin_query_service.dashboard_snapshot()
    except DatabaseError as exc:
        return render_template("db_error.html", error=exc, db=app_config().db_config()), 500
    return render_template(
        "dashboard.html",
        stats=data["stats"],
        pending_goods=data["pending_goods"],
        refunds=data["refunds"],
        verifications=data["verifications"],
        users=data["users"],
        ai_rule=data["ai_rule"],
        recent_logs=data["recent_logs"],
        today=data["today"],
    )


def fetch_pending_goods() -> list[dict]:
    return admin_query_service.fetch_pending_goods()


def fetch_refunds() -> list[dict]:
    return admin_query_service.fetch_refunds()


def fetch_verifications() -> list[dict]:
    return admin_query_service.fetch_verifications()


def fetch_users() -> list[dict]:
    return admin_query_service.fetch_users()


def fetch_ai_rule() -> dict:
    return admin_query_service.fetch_ai_rule()


def fetch_recent_logs() -> list[dict]:
    return admin_query_service.fetch_recent_logs()


@require_login
def audit_goods(goods_id: int):
    if not require_admin_csrf():
        flash("表单已过期，请刷新后重试", "error")
        return redirect(url_for("dashboard") + "#goods")
    result = request.form.get("result", "").strip()
    note = request.form.get("note", "").strip() or "管理员人工审核"
    try:
        admin_service.audit_goods(goods_id, result, note, admin_id=app_config().admin_id, ip_address=client_ip())
        redis_delete_pattern("campus_trade:goods:list:on_sale:*")
        redis_delete_pattern(f"campus_trade:goods:detail:{goods_id}")
        flash("商品审核已处理", "ok")
    except AdminError as exc:
        flash(str(exc), "error")
    except DatabaseError as exc:
        flash("商品审核失败: " + str(exc), "error")
    return redirect(url_for("dashboard") + "#goods")


@require_login
def arbitrate_refund(refund_id: int):
    if not require_admin_csrf():
        flash("表单已过期，请刷新后重试", "error")
        return redirect(url_for("dashboard") + "#refunds")
    result = request.form.get("result", "").strip()
    note = request.form.get("note", "").strip() or "管理员仲裁售后"
    try:
        admin_service.arbitrate_refund(refund_id, result, note, app_config().admin_id, ip_address=client_ip())
        flash("售后仲裁已处理", "ok")
    except AdminError as exc:
        flash(str(exc), "error")
    except DatabaseError as exc:
        flash("售后仲裁失败: " + str(exc), "error")
    return redirect(url_for("dashboard") + "#refunds")


@require_login
def run_wallet_reconcile():
    if not require_admin_csrf():
        flash("表单已过期，请刷新后重试", "error")
        return redirect(url_for("dashboard") + "#ops")
    stat_date = request.form.get("stat_date", "").strip() or date.today().isoformat()
    try:
        result = admin_service.run_reconcile_with_audit(stat_date, app_config().admin_id, ip_address=client_ip())
        flash(f"资金对账完成，异常 {result['abnormalCount']} 项", "ok" if result["abnormalCount"] == 0 else "error")
    except DatabaseError as exc:
        flash("资金对账失败: " + str(exc), "error")
    return redirect(url_for("dashboard") + "#ops")


@require_login
def audit_verification(verification_id: int):
    if not require_admin_csrf():
        flash("表单已过期，请刷新后重试", "error")
        return redirect(url_for("dashboard") + "#verifications")
    result = request.form.get("result", "").strip()
    note = request.form.get("note", "").strip() or "实名认证人工审核"
    try:
        admin_service.audit_verification(verification_id, result, note, app_config().admin_id, client_ip())
        flash("认证审核已处理", "ok")
    except AdminError as exc:
        flash(str(exc), "error")
    except DatabaseError as exc:
        flash("认证审核失败: " + str(exc), "error")
    return redirect(url_for("dashboard") + "#verifications")


@require_login
def save_ai_rules():
    if not require_admin_csrf():
        flash("表单已过期，请刷新后重试", "error")
        return redirect(url_for("dashboard") + "#ai-rules")
    try:
        admin_service.update_ai_rule(
            {
                "textAudit": request.form.get("text_audit_enabled") == "on",
                "imageAudit": request.form.get("image_audit_enabled") == "on",
                "manualRiskLevel": request.form.get("manual_risk_level", "manual").strip(),
                "keywords": request.form.get("keywords", "").strip(),
            },
            app_config().admin_id,
            ip_address=client_ip(),
        )
        flash("AI 审核规则已更新", "ok")
    except AdminError as exc:
        flash(str(exc), "error")
    except DatabaseError as exc:
        flash("AI 审核规则更新失败: " + str(exc), "error")
    return redirect(url_for("dashboard") + "#ai-rules")


@require_login
def change_user_status(user_id: int):
    if not require_admin_csrf():
        flash("表单已过期，请刷新后重试", "error")
        return redirect(url_for("dashboard") + "#users")
    action = request.form.get("action", "").strip()
    note = request.form.get("note", "").strip() or "管理员账号治理"
    try:
        admin_service.change_user_status(user_id, action, note, app_config().admin_id, client_ip())
        flash("用户状态已更新", "ok")
    except AdminError as exc:
        flash(str(exc), "error")
    except DatabaseError as exc:
        flash("用户状态更新失败: " + str(exc), "error")
    return redirect(url_for("dashboard") + "#users")


@require_login
def export_audit_logs():
    rows = admin_query_service.fetch_audit_log_export_rows()
    buffer = io.StringIO()
    buffer.write("\ufeff")
    writer = csv.writer(buffer)
    writer.writerow(["ID", "时间", "管理员", "动作", "对象类型", "对象ID", "原因", "IP"])
    for row in rows:
        writer.writerow(
            [
                row["id"],
                datetime_filter(row["created_at"]),
                row["admin_username"],
                row["action"],
                row["target_type"],
                row["target_id"],
                row["reason"],
                row["ip_address"],
            ]
        )
    return Response(
        buffer.getvalue(),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=admin-audit-logs.csv"},
    )
