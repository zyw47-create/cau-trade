from __future__ import annotations

import csv
import io
import json
import os
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal
from functools import wraps

import pymysql
from flask import (
    Flask,
    Response,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)


ADMIN_ID = int(os.getenv("ADMIN_ID", "99"))
ADMIN_WEB_USERNAME = os.getenv("ADMIN_WEB_USERNAME", "admin")
ADMIN_WEB_PASSWORD = os.getenv("ADMIN_WEB_PASSWORD", "admin123")

DB_CONFIG = {
    "host": os.getenv("ADMIN_DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("ADMIN_DB_PORT", "3306")),
    "user": os.getenv("ADMIN_DB_USER", "root"),
    "password": os.getenv("ADMIN_DB_PASSWORD", "Aa123456@"),
    "database": os.getenv("ADMIN_DB_NAME", "campus_trade"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv(
    "FLASK_SECRET_KEY", "campus-admin-local-secret-change-me"
)


STATUS_LABELS = {
    "active": "正常",
    "pending_verify": "待实名",
    "banned": "封禁",
    "removed": "已移除",
    "disabled": "停用",
    "pending": "待处理",
    "approved": "已通过",
    "rejected": "已驳回",
    "on_sale": "在售",
    "paused": "已暂停",
    "reserved": "交易锁定",
    "sold": "已售出",
    "unpaid": "待支付",
    "paid": "已支付",
    "confirmed": "已确认",
    "shipped": "已发货",
    "completed": "已完成",
    "refunding": "售后中",
    "refunded": "已退款",
    "cancelled": "已取消",
    "disputed": "纠纷中",
    "seller_agreed": "卖家同意",
    "seller_rejected": "卖家拒绝",
    "arbitrating": "仲裁中",
    "buyer_win": "买家胜诉",
    "seller_win": "卖家胜诉",
    "none": "未托管",
    "frozen": "托管冻结",
    "settled": "已结算",
    "waiting_accept": "待接单",
    "accepted": "已接单",
    "processing": "配送中",
    "success": "成功",
    "failed": "失败",
    "partial": "部分异常",
    "running": "运行中",
}

RISK_LABELS = {
    "pass": "通过",
    "manual": "人工复核",
    "reject": "疑似违规",
}


@contextmanager
def db_conn():
    conn = pymysql.connect(**DB_CONFIG, autocommit=False)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_all(sql: str, params: tuple | list | None = None) -> list[dict]:
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return list(cur.fetchall())


def fetch_one(sql: str, params: tuple | list | None = None) -> dict | None:
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def json_default(value):
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def to_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, default=json_default)


def client_ip() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return request.remote_addr or "127.0.0.1"


def require_login(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("login", next=request.path))
        return view_func(*args, **kwargs)

    return wrapper


def add_audit_log(
    conn,
    action: str,
    target_type: str,
    target_id: str | int,
    reason: str,
    before_data=None,
    after_data=None,
):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO admin_audit_logs
              (admin_id, action, target_type, target_id,
               before_data, after_data, reason, ip_address)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                ADMIN_ID,
                action,
                target_type,
                str(target_id),
                to_json(before_data) if before_data is not None else None,
                to_json(after_data) if after_data is not None else None,
                reason,
                client_ip(),
            ),
        )


@app.template_filter("money")
def money_filter(value) -> str:
    if value is None:
        return "0.00"
    return f"{Decimal(value):.2f}"


@app.template_filter("dt")
def datetime_filter(value) -> str:
    if not value:
        return "-"
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    return str(value)


@app.template_filter("label")
def label_filter(value) -> str:
    return STATUS_LABELS.get(value, RISK_LABELS.get(value, value or "-"))


@app.template_filter("brief")
def brief_filter(value, size=72) -> str:
    text = "" if value is None else str(value)
    return text if len(text) <= size else text[:size] + "..."


@app.context_processor
def common_context():
    return {
        "status_labels": STATUS_LABELS,
        "risk_labels": RISK_LABELS,
        "admin_username": ADMIN_WEB_USERNAME,
        "admin_id": ADMIN_ID,
    }


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        if username == ADMIN_WEB_USERNAME and password == ADMIN_WEB_PASSWORD:
            session["admin_logged_in"] = True
            session["admin_name"] = username
            return redirect(request.args.get("next") or url_for("dashboard"))
        flash("账号或密码不正确。", "error")
    return render_template("login.html")


@app.route("/logout")
@require_login
def logout():
    session.clear()
    flash("已退出管理后台。", "ok")
    return redirect(url_for("login"))


@app.route("/")
@require_login
def dashboard():
    try:
        stats = fetch_dashboard_stats()
        pending_goods = fetch_pending_goods()
        services = fetch_services()
        errands = fetch_errands()
        orders = fetch_orders()
        refunds = fetch_refunds()
        withdraws = fetch_withdraws()
        verifications = fetch_verifications()
        users = fetch_users()
        evidence_cases = fetch_evidence_cases()
        reconcile_rows = fetch_reconciliation_rows()
        ai_rule = fetch_ai_rule()
        recent_logs = fetch_recent_logs()
    except pymysql.MySQLError as exc:
        return render_template("db_error.html", error=exc, db=DB_CONFIG), 500

    return render_template(
        "dashboard.html",
        stats=stats or {},
        pending_goods=pending_goods,
        services=services,
        errands=errands,
        orders=orders,
        refunds=refunds,
        withdraws=withdraws,
        verifications=verifications,
        users=users,
        evidence_cases=evidence_cases,
        reconcile_rows=reconcile_rows,
        ai_rule=ai_rule,
        recent_logs=recent_logs,
    )


def fetch_dashboard_stats() -> dict | None:
    return fetch_one(
        """
        SELECT
          (SELECT COUNT(*) FROM users WHERE status <> 'removed') AS user_count,
          (SELECT COUNT(*) FROM goods WHERE status = 'pending') AS pending_goods,
          (SELECT COUNT(*) FROM services WHERE status = 'pending') AS pending_services,
          (SELECT COUNT(*) FROM errand_orders WHERE status = 'disputed') AS disputed_errands,
          (SELECT COUNT(*) FROM ai_audit_records
             WHERE risk_level IN ('manual','reject')) AS risky_ai_records,
          (SELECT COUNT(*) FROM user_verifications
             WHERE status = 'pending') AS pending_verifications,
          (SELECT COUNT(*) FROM refund_requests
             WHERE status IN ('pending','seller_rejected','arbitrating')) AS refund_queue,
          (SELECT COUNT(*) FROM withdraw_requests
             WHERE status = 'pending') AS withdraw_queue,
          (SELECT COUNT(*) FROM orders) AS order_count,
          (SELECT COALESCE(SUM(amount), 0) FROM orders
             WHERE status IN ('paid','completed','refunding','refunded')) AS trade_amount
        """
    )


def fetch_pending_goods() -> list[dict]:
    return fetch_all(
        """
        SELECT
          g.id, g.title, g.price, g.condition_level, g.description,
          g.location, g.status, g.audit_note, g.created_at,
          c.name AS category_name,
          u.id AS seller_id, u.nickname AS seller_name,
          u.username AS seller_username, u.credit_score AS seller_credit_score,
          u.status AS seller_status,
          ar.risk_level AS ai_risk_level, ar.reason AS ai_reason,
          ar.provider AS ai_provider, ar.created_at AS ai_created_at
        FROM goods g
        JOIN users u ON u.id = g.seller_id
        LEFT JOIN categories c ON c.id = g.category_id
        LEFT JOIN ai_audit_records ar ON ar.id = (
          SELECT ar2.id
          FROM ai_audit_records ar2
          WHERE ar2.target_type = 'goods'
            AND ar2.target_id = g.id
            AND ar2.audit_type IN ('text_audit', 'image_audit')
          ORDER BY ar2.created_at DESC, ar2.id DESC
          LIMIT 1
        )
        WHERE g.status = 'pending'
           OR ar.risk_level IN ('manual', 'reject')
        ORDER BY FIELD(g.status, 'pending', 'on_sale', 'rejected', 'removed'),
                 g.created_at DESC
        LIMIT 50
        """
    )


def fetch_services() -> list[dict]:
    return fetch_all(
        """
        SELECT
          s.id, s.title, s.price, s.description, s.status, s.avg_score,
          s.created_at, c.name AS category_name,
          u.id AS provider_id, u.nickname AS provider_name,
          u.username AS provider_username, u.credit_score AS provider_credit_score,
          ar.risk_level AS ai_risk_level, ar.reason AS ai_reason
        FROM services s
        JOIN users u ON u.id = s.provider_id
        LEFT JOIN categories c ON c.id = s.category_id
        LEFT JOIN ai_audit_records ar ON ar.id = (
          SELECT ar2.id
          FROM ai_audit_records ar2
          WHERE ar2.target_type = 'service'
            AND ar2.target_id = s.id
          ORDER BY ar2.created_at DESC, ar2.id DESC
          LIMIT 1
        )
        WHERE s.status IN ('pending','on_sale','paused')
           OR ar.risk_level IN ('manual','reject')
        ORDER BY FIELD(s.status, 'pending', 'on_sale', 'paused', 'removed'),
                 s.created_at DESC
        LIMIT 50
        """
    )


def fetch_errands() -> list[dict]:
    return fetch_all(
        """
        SELECT
          e.id, e.title, e.description, e.pickup_location, e.delivery_location,
          e.fee, e.status, e.created_at, e.accepted_at, e.completed_at,
          publisher.nickname AS publisher_name,
          publisher.username AS publisher_username,
          publisher.credit_score AS publisher_credit_score,
          rider.nickname AS rider_name,
          rider.username AS rider_username,
          rider.credit_score AS rider_credit_score,
          (SELECT COUNT(*) FROM errand_events ee WHERE ee.errand_id = e.id) AS event_count
        FROM errand_orders e
        JOIN users publisher ON publisher.id = e.publisher_id
        LEFT JOIN users rider ON rider.id = e.rider_id
        WHERE e.status IN ('waiting_accept','accepted','processing','disputed')
        ORDER BY FIELD(e.status, 'disputed','processing','accepted','waiting_accept'),
                 e.created_at DESC
        LIMIT 50
        """
    )


def fetch_orders() -> list[dict]:
    return fetch_all(
        """
        SELECT
          o.order_sn, o.item_type, o.item_id, o.amount, o.status, o.remark,
          o.created_at, o.paid_at, o.completed_at,
          buyer.nickname AS buyer_name, buyer.username AS buyer_username,
          seller.nickname AS seller_name, seller.username AS seller_username,
          f.status AS fund_status, f.amount AS fund_amount,
          (SELECT COUNT(*) FROM order_events oe WHERE oe.order_sn = o.order_sn) AS event_count,
          (SELECT COUNT(*) FROM messages m
             JOIN conversations c ON c.id = m.conversation_id
             WHERE c.business_type = o.item_type
               AND c.business_id = o.item_id) AS message_count
        FROM orders o
        JOIN users buyer ON buyer.id = o.buyer_id
        JOIN users seller ON seller.id = o.seller_id
        LEFT JOIN order_funds f ON f.order_sn = o.order_sn
        ORDER BY FIELD(o.status, 'disputed','refunding','paid','unpaid','completed','cancelled'),
                 o.created_at DESC
        LIMIT 80
        """
    )


def fetch_refunds() -> list[dict]:
    return fetch_all(
        """
        SELECT
          rr.id, rr.order_sn, rr.reason, rr.evidence_urls,
          rr.status AS refund_status, rr.seller_reply,
          rr.arbitrate_result, rr.created_at, rr.updated_at, rr.resolved_at,
          o.amount, o.status AS order_status, o.item_type, o.item_id,
          o.item_snapshot, o.remark AS order_remark,
          applicant.id AS applicant_id,
          applicant.nickname AS applicant_name,
          applicant.username AS applicant_username,
          applicant.credit_score AS applicant_credit_score,
          seller.id AS seller_id,
          seller.nickname AS seller_name,
          seller.username AS seller_username,
          seller.credit_score AS seller_credit_score,
          f.status AS fund_status,
          f.amount AS fund_amount,
          (SELECT COUNT(*) FROM order_events oe WHERE oe.order_sn = rr.order_sn) AS event_count
        FROM refund_requests rr
        JOIN orders o ON o.order_sn = rr.order_sn
        JOIN users applicant ON applicant.id = rr.applicant_id
        JOIN users seller ON seller.id = rr.seller_id
        LEFT JOIN order_funds f ON f.order_sn = rr.order_sn
        WHERE rr.status IN ('pending','seller_rejected','arbitrating')
        ORDER BY FIELD(rr.status, 'arbitrating', 'seller_rejected', 'pending'),
                 rr.created_at ASC
        LIMIT 50
        """
    )


def fetch_withdraws() -> list[dict]:
    return fetch_all(
        """
        SELECT
          wr.id, wr.user_id, wr.amount, wr.reason, wr.status,
          wr.review_note, wr.reviewed_at, wr.created_at,
          u.nickname, u.username, u.role, u.balance, u.frozen_balance, u.credit_score
        FROM withdraw_requests wr
        JOIN users u ON u.id = wr.user_id
        WHERE wr.status IN ('pending','approved','rejected')
        ORDER BY FIELD(wr.status, 'pending','approved','rejected'), wr.created_at DESC
        LIMIT 50
        """
    )


def fetch_verifications() -> list[dict]:
    return fetch_all(
        """
        SELECT
          uv.id, uv.user_id, uv.student_id_enc, uv.real_name_enc,
          uv.college, uv.school_email, uv.email_verified_at,
          uv.student_card_image_url, uv.ocr_match_score,
          uv.status, uv.review_note, uv.reviewed_at, uv.created_at,
          u.nickname, u.username, u.role, u.status AS user_status,
          u.is_verified, u.credit_score
        FROM user_verifications uv
        JOIN users u ON u.id = uv.user_id
        WHERE uv.status IN ('pending', 'rejected')
        ORDER BY FIELD(uv.status, 'pending', 'rejected'), uv.created_at DESC
        LIMIT 50
        """
    )


def fetch_users() -> list[dict]:
    return fetch_all(
        """
        SELECT
          u.id, u.nickname, u.username, u.role, u.status, u.is_verified,
          u.credit_score, u.balance, u.frozen_balance, u.created_at,
          up.campus_area, up.major, up.completed_trade_count,
          up.good_rate_snapshot, up.last_active_at
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        ORDER BY FIELD(u.status, 'active', 'pending_verify', 'banned', 'removed'),
                 u.id ASC
        LIMIT 80
        """
    )


def fetch_evidence_cases() -> list[dict]:
    return fetch_all(
        """
        SELECT
          c.id AS conversation_id, c.session_type, c.business_type, c.business_id,
          c.last_message_at, c.created_at,
          a.nickname AS user_a_name, a.username AS user_a_username,
          b.nickname AS user_b_name, b.username AS user_b_username,
          COUNT(m.id) AS message_count,
          SUM(CASE WHEN m.status = 'recalled' THEN 1 ELSE 0 END) AS recalled_count,
          SUM(CASE WHEN m.previous_hash IS NULL THEN 1 ELSE 0 END) AS root_hash_count,
          MIN(m.created_at) AS first_message_at,
          MAX(m.created_at) AS last_message_created_at
        FROM conversations c
        JOIN users a ON a.id = c.user_a_id
        JOIN users b ON b.id = c.user_b_id
        LEFT JOIN messages m ON m.conversation_id = c.id
        WHERE c.business_type IN ('goods','service','errand','order')
        GROUP BY
          c.id, c.session_type, c.business_type, c.business_id,
          c.last_message_at, c.created_at,
          a.nickname, a.username, b.nickname, b.username
        HAVING message_count > 0
        ORDER BY c.last_message_at DESC, c.id DESC
        LIMIT 40
        """
    )


def fetch_reconciliation_rows() -> list[dict]:
    return fetch_all(
        """
        SELECT
          o.order_sn, o.status AS order_status, o.amount AS order_amount,
          f.status AS fund_status, f.amount AS fund_amount,
          COALESCE(SUM(CASE WHEN wl.type = 'pay' THEN wl.amount ELSE 0 END), 0) AS paid_amount,
          COALESCE(SUM(CASE WHEN wl.type IN ('income','refund') THEN wl.amount ELSE 0 END), 0) AS closed_amount,
          CASE
            WHEN f.id IS NULL THEN '缺少托管记录'
            WHEN o.amount <> f.amount THEN '订单与托管金额不一致'
            WHEN o.status IN ('paid','refunding','disputed') AND f.status <> 'frozen' THEN '应处于托管冻结'
            WHEN o.status = 'completed' AND f.status <> 'settled' THEN '应处于已结算'
            WHEN o.status IN ('refunded','cancelled') AND f.status <> 'refunded' THEN '应处于已退款'
            WHEN COALESCE(SUM(CASE WHEN wl.type = 'pay' THEN wl.amount ELSE 0 END), 0) > 0
                 AND COALESCE(SUM(CASE WHEN wl.type IN ('income','refund') THEN wl.amount ELSE 0 END), 0) = 0
                 AND o.status IN ('completed','refunded') THEN '资金流水未闭环'
            ELSE '正常'
          END AS check_result
        FROM orders o
        LEFT JOIN order_funds f ON f.order_sn = o.order_sn
        LEFT JOIN wallet_logs wl ON wl.order_sn = o.order_sn
        GROUP BY
          o.order_sn, o.status, o.amount, o.created_at,
          f.id, f.status, f.amount
        HAVING check_result <> '正常'
        ORDER BY o.created_at DESC
        LIMIT 50
        """
    )


def fetch_ai_rule() -> dict:
    rule = fetch_one(
        """
        SELECT id, rule_name, text_audit_enabled, image_audit_enabled,
               manual_risk_level, keywords, updated_at
        FROM ai_rules
        WHERE rule_name = 'default_publish_audit'
        LIMIT 1
        """
    )
    return rule or {
        "rule_name": "default_publish_audit",
        "text_audit_enabled": 1,
        "image_audit_enabled": 1,
        "manual_risk_level": "manual",
        "keywords": "烟草,校园贷,代考,作弊,违禁,管制刀具",
        "updated_at": None,
    }


def fetch_recent_logs() -> list[dict]:
    return fetch_all(
        """
        SELECT
          l.id, l.admin_id, l.action, l.target_type, l.target_id,
          l.reason, l.ip_address, l.created_at,
          u.nickname AS admin_name, u.username AS admin_username
        FROM admin_audit_logs l
        LEFT JOIN users u ON u.id = l.admin_id
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT 35
        """
    )


@app.post("/goods/<int:goods_id>/audit")
@require_login
def audit_goods(goods_id: int):
    result = request.form.get("result", "").strip()
    note = request.form.get("note", "").strip() or "管理员人工审核"
    mapping = {
        "pass": ("on_sale", "商品审核通过"),
        "reject": ("rejected", "商品审核驳回"),
        "remove": ("removed", "违规商品下架"),
    }
    if result not in mapping:
        flash("商品审核结果不合法。", "error")
        return redirect(url_for("dashboard") + "#goods")

    new_status, action = mapping[result]
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, title, seller_id, status, audit_note
                    FROM goods
                    WHERE id = %s
                    FOR UPDATE
                    """,
                    (goods_id,),
                )
                before = cur.fetchone()
                if not before:
                    flash("商品不存在。", "error")
                    return redirect(url_for("dashboard") + "#goods")

                cur.execute(
                    """
                    UPDATE goods
                    SET status = %s, audit_note = %s, updated_at = NOW()
                    WHERE id = %s
                    """,
                    (new_status, note, goods_id),
                )
                cur.execute(
                    """
                    INSERT INTO notifications
                      (user_id, business_type, business_id, title, content)
                    VALUES (%s, 'goods', %s, %s, %s)
                    """,
                    (
                        before["seller_id"],
                        str(goods_id),
                        action,
                        f"{before['title']}：{note}",
                    ),
                )
                add_audit_log(
                    conn,
                    action,
                    "goods",
                    goods_id,
                    note,
                    before_data=before,
                    after_data={"status": new_status, "audit_note": note},
                )
        flash(f"{action}已完成。", "ok")
    except pymysql.MySQLError as exc:
        flash(f"商品审核失败：{exc}", "error")
    return redirect(url_for("dashboard") + "#goods")


@app.post("/services/<int:service_id>/audit")
@require_login
def audit_service(service_id: int):
    result = request.form.get("result", "").strip()
    note = request.form.get("note", "").strip() or "服务内容治理处理"
    mapping = {
        "pass": ("on_sale", "服务审核通过"),
        "pause": ("paused", "服务暂停展示"),
        "remove": ("removed", "违规服务下架"),
    }
    if result not in mapping:
        flash("服务处理结果不合法。", "error")
        return redirect(url_for("dashboard") + "#services")

    new_status, action = mapping[result]
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, title, provider_id, status FROM services WHERE id = %s FOR UPDATE",
                    (service_id,),
                )
                before = cur.fetchone()
                if not before:
                    flash("服务不存在。", "error")
                    return redirect(url_for("dashboard") + "#services")
                cur.execute(
                    "UPDATE services SET status = %s, updated_at = NOW() WHERE id = %s",
                    (new_status, service_id),
                )
                cur.execute(
                    """
                    INSERT INTO notifications
                      (user_id, business_type, business_id, title, content)
                    VALUES (%s, 'service', %s, %s, %s)
                    """,
                    (before["provider_id"], str(service_id), action, note),
                )
                add_audit_log(
                    conn,
                    action,
                    "service",
                    service_id,
                    note,
                    before_data=before,
                    after_data={"status": new_status},
                )
        flash(f"{action}已完成。", "ok")
    except pymysql.MySQLError as exc:
        flash(f"服务处理失败：{exc}", "error")
    return redirect(url_for("dashboard") + "#services")


@app.post("/errands/<int:errand_id>/resolve")
@require_login
def resolve_errand(errand_id: int):
    result = request.form.get("result", "").strip()
    note = request.form.get("note", "").strip() or "管理员处理跑腿任务"
    if result not in {"complete", "cancel"}:
        flash("跑腿处理结果不合法。", "error")
        return redirect(url_for("dashboard") + "#errands")

    new_status = "completed" if result == "complete" else "cancelled"
    action = "跑腿任务确认完成" if result == "complete" else "跑腿任务取消"
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, title, publisher_id, rider_id, status
                    FROM errand_orders
                    WHERE id = %s
                    FOR UPDATE
                    """,
                    (errand_id,),
                )
                before = cur.fetchone()
                if not before:
                    flash("跑腿任务不存在。", "error")
                    return redirect(url_for("dashboard") + "#errands")
                cur.execute(
                    """
                    UPDATE errand_orders
                    SET status = %s,
                        completed_at = IF(%s = 'completed', COALESCE(completed_at, NOW()), completed_at),
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (new_status, new_status, errand_id),
                )
                cur.execute(
                    """
                    INSERT INTO errand_events
                      (errand_id, from_status, to_status, operator_id, note)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (errand_id, before["status"], new_status, ADMIN_ID, note),
                )
                add_audit_log(
                    conn,
                    action,
                    "errand",
                    errand_id,
                    note,
                    before_data=before,
                    after_data={"status": new_status},
                )
        flash(f"{action}已完成。", "ok")
    except pymysql.MySQLError as exc:
        flash(f"跑腿处理失败：{exc}", "error")
    return redirect(url_for("dashboard") + "#errands")


@app.post("/refunds/<int:refund_id>/arbitrate")
@require_login
def arbitrate_refund(refund_id: int):
    result = request.form.get("result", "").strip()
    note = request.form.get("note", "").strip() or "平台管理员仲裁"
    if result not in {"buyer", "seller"}:
        flash("仲裁结果不合法。", "error")
        return redirect(url_for("dashboard") + "#refunds")

    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.callproc("sp_arbitrate_refund", (refund_id, ADMIN_ID, result, note))
            add_audit_log(
                conn,
                "售后仲裁",
                "refund",
                refund_id,
                note,
                after_data={"result": result},
            )
        flash("售后仲裁已执行，资金状态已由数据库事务同步处理。", "ok")
    except pymysql.MySQLError as exc:
        flash(f"售后仲裁失败：{exc}", "error")
    return redirect(url_for("dashboard") + "#refunds")


@app.post("/withdraws/<int:withdraw_id>/review")
@require_login
def review_withdraw(withdraw_id: int):
    result = request.form.get("result", "").strip()
    note = request.form.get("note", "").strip() or "管理员审核提现申请"
    if result not in {"approve", "reject"}:
        flash("提现审核结果不合法。", "error")
        return redirect(url_for("dashboard") + "#withdraws")

    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT wr.*, u.balance, u.username
                    FROM withdraw_requests wr
                    JOIN users u ON u.id = wr.user_id
                    WHERE wr.id = %s
                    FOR UPDATE
                    """,
                    (withdraw_id,),
                )
                before = cur.fetchone()
                if not before:
                    flash("提现申请不存在。", "error")
                    return redirect(url_for("dashboard") + "#withdraws")
                if before["status"] != "pending":
                    flash("该提现申请已处理。", "error")
                    return redirect(url_for("dashboard") + "#withdraws")

                if result == "approve":
                    if Decimal(before["balance"]) < Decimal(before["amount"]):
                        flash("用户可用余额不足，无法通过提现。", "error")
                        return redirect(url_for("dashboard") + "#withdraws")
                    next_balance = Decimal(before["balance"]) - Decimal(before["amount"])
                    cur.execute(
                        """
                        UPDATE users
                        SET balance = %s, updated_at = NOW()
                        WHERE id = %s
                        """,
                        (next_balance, before["user_id"]),
                    )
                    cur.execute(
                        """
                        INSERT INTO wallet_logs
                          (user_id, type, direction, amount, balance_after, title, note)
                        VALUES (%s, 'withdraw', 'out', %s, %s, '提现审核通过', %s)
                        """,
                        (before["user_id"], before["amount"], next_balance, note),
                    )
                    new_status = "approved"
                    action = "提现审核通过"
                    after = {"status": new_status, "balance_after": str(next_balance)}
                else:
                    new_status = "rejected"
                    action = "提现审核驳回"
                    after = {"status": new_status, "review_note": note}

                cur.execute(
                    """
                    UPDATE withdraw_requests
                    SET status = %s,
                        reviewer_id = %s,
                        review_note = %s,
                        reviewed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (new_status, ADMIN_ID, note, withdraw_id),
                )
                add_audit_log(
                    conn,
                    action,
                    "withdraw",
                    withdraw_id,
                    note,
                    before_data=before,
                    after_data=after,
                )
        flash(f"{action}已完成。", "ok")
    except pymysql.MySQLError as exc:
        flash(f"提现审核失败：{exc}", "error")
    return redirect(url_for("dashboard") + "#withdraws")


@app.post("/verifications/<int:verification_id>/audit")
@require_login
def audit_verification(verification_id: int):
    result = request.form.get("result", "").strip()
    note = request.form.get("note", "").strip() or "实名认证人工审核"
    if result not in {"approve", "reject"}:
        flash("实名审核结果不合法。", "error")
        return redirect(url_for("dashboard") + "#verifications")

    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT uv.*, u.credit_score, u.status AS user_status
                    FROM user_verifications uv
                    JOIN users u ON u.id = uv.user_id
                    WHERE uv.id = %s
                    FOR UPDATE
                    """,
                    (verification_id,),
                )
                before = cur.fetchone()
                if not before:
                    flash("实名认证申请不存在。", "error")
                    return redirect(url_for("dashboard") + "#verifications")
                if before["status"] != "pending":
                    flash("该实名认证申请已经处理过。", "error")
                    return redirect(url_for("dashboard") + "#verifications")

                if result == "approve":
                    cur.execute(
                        """
                        UPDATE user_verifications
                        SET status = 'approved',
                            reviewer_id = %s,
                            review_note = %s,
                            reviewed_at = NOW(),
                            email_verified_at = COALESCE(email_verified_at, NOW())
                        WHERE id = %s
                        """,
                        (ADMIN_ID, note, verification_id),
                    )
                    cur.execute(
                        """
                        UPDATE users
                        SET is_verified = 1,
                            status = 'active',
                            student_id_enc = %s,
                            real_name_enc = %s,
                            college = %s,
                            credit_score = LEAST(100, credit_score + 5),
                            updated_at = NOW()
                        WHERE id = %s
                        """,
                        (
                            before["student_id_enc"],
                            before["real_name_enc"],
                            before["college"],
                            before["user_id"],
                        ),
                    )
                    next_score = min(100, int(before["credit_score"]) + 5)
                    cur.execute(
                        """
                        INSERT INTO credit_logs
                          (user_id, change_value, reason_type, reason_detail,
                           related_type, related_id, operator_id, score_after)
                        VALUES (%s, %s, 'verify_approved', %s,
                                'verification', %s, %s, %s)
                        """,
                        (
                            before["user_id"],
                            max(0, next_score - int(before["credit_score"])),
                            note,
                            str(verification_id),
                            ADMIN_ID,
                            next_score,
                        ),
                    )
                    action = "实名认证通过"
                    after = {"status": "approved", "user_verified": 1}
                else:
                    cur.execute(
                        """
                        UPDATE user_verifications
                        SET status = 'rejected',
                            reviewer_id = %s,
                            review_note = %s,
                            reviewed_at = NOW()
                        WHERE id = %s
                        """,
                        (ADMIN_ID, note, verification_id),
                    )
                    cur.execute(
                        """
                        SELECT COUNT(*) AS approved_count
                        FROM user_verifications
                        WHERE user_id = %s AND status = 'approved'
                        """,
                        (before["user_id"],),
                    )
                    approved_count = cur.fetchone()["approved_count"]
                    if approved_count == 0:
                        cur.execute(
                            """
                            UPDATE users
                            SET is_verified = 0,
                                status = 'pending_verify',
                                updated_at = NOW()
                            WHERE id = %s
                            """,
                            (before["user_id"],),
                        )
                    action = "实名认证驳回"
                    after = {"status": "rejected", "note": note}

                add_audit_log(
                    conn,
                    action,
                    "verification",
                    verification_id,
                    note,
                    before_data=before,
                    after_data=after,
                )
        flash(f"{action}已完成。", "ok")
    except pymysql.MySQLError as exc:
        flash(f"实名审核失败：{exc}", "error")
    return redirect(url_for("dashboard") + "#verifications")


@app.post("/ai-rules")
@require_login
def save_ai_rules():
    text_enabled = 1 if request.form.get("text_audit_enabled") == "on" else 0
    image_enabled = 1 if request.form.get("image_audit_enabled") == "on" else 0
    manual_level = request.form.get("manual_risk_level", "manual").strip()
    keywords = request.form.get("keywords", "").strip()
    if manual_level not in {"pass", "manual", "reject"}:
        flash("AI 规则等级不合法。", "error")
        return redirect(url_for("dashboard") + "#ai-rules")

    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO ai_rules
                      (rule_name, text_audit_enabled, image_audit_enabled,
                       manual_risk_level, keywords, updated_by)
                    VALUES ('default_publish_audit', %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                      text_audit_enabled = VALUES(text_audit_enabled),
                      image_audit_enabled = VALUES(image_audit_enabled),
                      manual_risk_level = VALUES(manual_risk_level),
                      keywords = VALUES(keywords),
                      updated_by = VALUES(updated_by),
                      updated_at = NOW()
                    """,
                    (text_enabled, image_enabled, manual_level, keywords, ADMIN_ID),
                )
                add_audit_log(
                    conn,
                    "AI审核规则更新",
                    "ai_rules",
                    "default_publish_audit",
                    "更新发布审核规则",
                    after_data={
                        "text_audit_enabled": text_enabled,
                        "image_audit_enabled": image_enabled,
                        "manual_risk_level": manual_level,
                        "keywords": keywords,
                    },
                )
        flash("AI 审核规则已保存。", "ok")
    except pymysql.MySQLError as exc:
        flash(f"保存 AI 规则失败：{exc}", "error")
    return redirect(url_for("dashboard") + "#ai-rules")


@app.post("/users/<int:user_id>/status")
@require_login
def change_user_status(user_id: int):
    action = request.form.get("action", "").strip()
    note = request.form.get("note", "").strip() or "管理员用户治理"
    if user_id == ADMIN_ID:
        flash("不能在当前后台封禁正在使用的管理员账号。", "error")
        return redirect(url_for("dashboard") + "#users")
    if action not in {"ban", "unban"}:
        flash("用户状态操作不合法。", "error")
        return redirect(url_for("dashboard") + "#users")

    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, username, nickname, status, credit_score
                    FROM users
                    WHERE id = %s
                    FOR UPDATE
                    """,
                    (user_id,),
                )
                before = cur.fetchone()
                if not before:
                    flash("用户不存在。", "error")
                    return redirect(url_for("dashboard") + "#users")

                if action == "ban":
                    new_status = "banned"
                    new_score = min(int(before["credit_score"]), 60)
                    action_name = "封禁用户"
                else:
                    new_status = "active"
                    new_score = int(before["credit_score"])
                    action_name = "解封用户"

                cur.execute(
                    """
                    UPDATE users
                    SET status = %s, credit_score = %s, updated_at = NOW()
                    WHERE id = %s
                    """,
                    (new_status, new_score, user_id),
                )
                if new_score != int(before["credit_score"]):
                    cur.execute(
                        """
                        INSERT INTO credit_logs
                          (user_id, change_value, reason_type, reason_detail,
                           related_type, related_id, operator_id, score_after)
                        VALUES (%s, %s, 'violation', %s,
                                'admin_action', %s, %s, %s)
                        """,
                        (
                            user_id,
                            new_score - int(before["credit_score"]),
                            note,
                            f"user-{user_id}",
                            ADMIN_ID,
                            new_score,
                        ),
                    )
                add_audit_log(
                    conn,
                    action_name,
                    "user",
                    user_id,
                    note,
                    before_data=before,
                    after_data={"status": new_status, "credit_score": new_score},
                )
        flash(f"{action_name}已完成。", "ok")
    except pymysql.MySQLError as exc:
        flash(f"用户状态更新失败：{exc}", "error")
    return redirect(url_for("dashboard") + "#users")


@app.post("/reconcile/run")
@require_login
def run_reconcile():
    note = request.form.get("note", "").strip() or "管理员手动触发资金对账"
    try:
        abnormal_count = len(fetch_reconciliation_rows())
        status = "partial" if abnormal_count else "success"
        message = f"发现 {abnormal_count} 条资金或状态异常" if abnormal_count else "本次对账未发现异常"
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO job_logs
                      (job_name, status, scanned_count, success_count, fail_count,
                       message, started_at, finished_at)
                    VALUES ('manual_wallet_reconcile', %s, 0, %s, %s, %s, NOW(), NOW())
                    """,
                    (status, 0 if abnormal_count else 1, abnormal_count, message),
                )
                job_id = cur.lastrowid
                add_audit_log(
                    conn,
                    "手动资金对账",
                    "job_logs",
                    job_id,
                    note,
                    after_data={"status": status, "abnormal_count": abnormal_count},
                )
        flash(message, "ok" if not abnormal_count else "error")
    except pymysql.MySQLError as exc:
        flash(f"资金对账失败：{exc}", "error")
    return redirect(url_for("dashboard") + "#reconcile")


@app.route("/exports/audit-logs.csv")
@require_login
def export_audit_logs():
    rows = fetch_all(
        """
        SELECT
          l.id, l.created_at, COALESCE(u.username, 'system') AS admin_username,
          l.action, l.target_type, l.target_id, l.reason, l.ip_address
        FROM admin_audit_logs l
        LEFT JOIN users u ON u.id = l.admin_id
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT 500
        """
    )
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


if __name__ == "__main__":
    app.run(
        host=os.getenv("FLASK_HOST", "127.0.0.1"),
        port=int(os.getenv("FLASK_PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
    )
