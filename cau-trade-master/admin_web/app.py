from __future__ import annotations

import csv
import base64
import hashlib
import hmac
import io
import json
import os
import random
import re
import smtplib
import struct
import ssl
import time
import uuid
import zlib
from contextlib import contextmanager
from datetime import date, datetime, timedelta
from decimal import Decimal
from functools import wraps

import pymysql
from flask import (
    Flask,
    Response,
    flash,
    g,
    jsonify,
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
    "password": os.getenv("ADMIN_DB_PASSWORD", "123456"),
    "database": os.getenv("ADMIN_DB_NAME", "campus_trade"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv(
    "FLASK_SECRET_KEY", "campus-admin-local-secret-change-me"
)

JWT_SECRET = os.getenv("JWT_SECRET", app.config["SECRET_KEY"])
CODE_SECRET = os.getenv("EMAIL_CODE_SECRET", JWT_SECRET)
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "campus-trade@example.com")
MOCK_EMAIL = os.getenv("MOCK_EMAIL", "auto").lower()
EMAIL_CODE_TTL_SECONDS = int(os.getenv("EMAIL_CODE_TTL_SECONDS", "600"))
REDIS_URL = os.getenv("REDIS_URL", "")
PII_ENCRYPTION_KEY = os.getenv("PII_ENCRYPTION_KEY") or JWT_SECRET

try:
    import redis  # type: ignore
except Exception:
    redis = None

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # type: ignore
except Exception:
    AESGCM = None

redis_client = None
if redis and REDIS_URL:
    try:
        redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()
    except Exception:
        redis_client = None


def make_placeholder_png(seed: str) -> bytes:
    width, height = 480, 320
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    color_a = (220 + digest[0] % 28, 236 + digest[1] % 18, 240 + digest[2] % 16)
    color_b = (245 + digest[3] % 10, 210 + digest[4] % 30, 225 + digest[5] % 25)
    rows = []
    for y in range(height):
        row = bytearray([0])
        ratio = y / max(height - 1, 1)
        r = int(color_a[0] * (1 - ratio) + color_b[0] * ratio)
        g = int(color_a[1] * (1 - ratio) + color_b[1] * ratio)
        b = int(color_a[2] * (1 - ratio) + color_b[2] * ratio)
        row.extend(bytes((r, g, b)) * width)
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 6))
        + chunk(b"IEND", b"")
    )


STATUS_LABELS = {
    "active": "正常",
    "pending_verify": "待实名",
    "banned": "封禁",
    "removed": "已注销",
    "pending": "待处理",
    "approved": "已通过",
    "rejected": "已驳回",
    "on_sale": "在售",
    "reserved": "交易锁定",
    "sold": "已售出",
    "unpaid": "待支付",
    "paid": "待卖家确认",
    "confirmed": "待发货",
    "shipped": "待收货",
    "completed": "已完成",
    "refunding": "售后退款中",
    "refunded": "已退款",
    "cancelled": "已取消",
    "disputed": "投诉仲裁中",
    "seller_rejected": "卖家拒绝",
    "arbitrating": "平台仲裁中",
    "buyer_win": "买家胜诉",
    "seller_win": "卖家胜诉",
    "frozen": "托管冻结",
    "settled": "已结算",
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


def execute(sql: str, params: tuple | list | None = None) -> int:
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.rowcount


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


@app.before_request
def attach_trace_id():
    g.trace_id = request.headers.get("X-Trace-Id") or uuid.uuid4().hex


@app.after_request
def attach_trace_header(response):
    response.headers["X-Trace-Id"] = getattr(g, "trace_id", "")
    return response


def api_ok(data=None, msg="success"):
    return jsonify({"code": 200, "msg": msg, "data": data or {}, "trace_id": getattr(g, "trace_id", "")})


def api_error(msg, code=400, status=200):
    return jsonify({"code": code, "msg": str(msg), "data": {}, "trace_id": getattr(g, "trace_id", "")}), status


def b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def jwt_sign(payload: dict) -> str:
    body = dict(payload)
    body.setdefault("iat", int(time.time()))
    body.setdefault("exp", int(time.time()) + 86400)
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = ".".join(
        [
            b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8")),
            b64url_encode(json.dumps(body, separators=(",", ":")).encode("utf-8")),
        ]
    )
    signature = hmac.new(
        JWT_SECRET.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256
    ).digest()
    return f"{signing_input}.{b64url_encode(signature)}"


def jwt_verify(token: str) -> dict | None:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".", 2)
        signing_input = f"{header_b64}.{payload_b64}"
        expected = hmac.new(
            JWT_SECRET.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(b64url_decode(signature_b64), expected):
            return None
        payload = json.loads(b64url_decode(payload_b64).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def require_api_auth(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return api_error("?? Bearer Token", 401, 401)
        token = auth.split(" ", 1)[1].strip()
        payload = jwt_verify(token) if "." in token else None
        allow_demo_token = os.getenv("ALLOW_DEMO_TOKEN", "0") == "1"
        if not payload and not (
            allow_demo_token and token == os.getenv("API_DEMO_TOKEN", "campus-demo-token")
        ):
            return api_error("Token 无效或已过期", 401, 401)
        request.api_user_id = int((payload or {}).get("sub") or 1)
        request.api_role = str((payload or {}).get("role") or "user")
        return view_func(*args, **kwargs)

    return wrapper


def current_user_id(default=1) -> int:
    return int(getattr(request, "api_user_id", default) or default)


def current_api_role() -> str:
    return str(getattr(request, "api_role", "guest") or "guest")


def require_api_role(*roles: str):
    allowed = set(roles)

    def decorator(view_func):
        @require_api_auth
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            if current_api_role() not in allowed:
                return api_error("鏉冮檺涓嶈冻", 403, 403)
            return view_func(*args, **kwargs)

        return wrapper

    return decorator


def require_admin_api(view_func):
    return require_api_role("admin")(view_func)


def request_json() -> dict:
    return request.get_json(silent=True) or {}


def row_to_api(row: dict | None) -> dict | None:
    if row is None:
        return None
    return json.loads(to_json(row))


def client_ip() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return request.remote_addr or "127.0.0.1"


def redis_status() -> str:
    if not REDIS_URL:
        return "not_configured"
    return "connected" if redis_client else "fallback_mysql"


def redis_rate_limited(key: str, limit: int, ttl_seconds: int) -> bool:
    if not redis_client:
        return False
    try:
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, ttl_seconds)
        return int(count) > limit
    except Exception:
        return False


def redis_lock(key: str, ttl_seconds: int) -> bool:
    if not redis_client:
        return True
    try:
        return bool(redis_client.set(key, "1", nx=True, ex=ttl_seconds))
    except Exception:
        return True


def redis_unlock(key: str):
    if not redis_client:
        return
    try:
        redis_client.delete(key)
    except Exception:
        return


def redis_get_json(key: str):
    if not redis_client:
        return None
    try:
        raw = redis_client.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


def redis_set_json(key: str, value, ttl_seconds: int):
    if not redis_client:
        return
    try:
        redis_client.setex(key, ttl_seconds, to_json(value))
    except Exception:
        return


def redis_delete_pattern(pattern: str):
    if not redis_client:
        return
    try:
        cursor = 0
        while True:
            cursor, keys = redis_client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                redis_client.delete(*keys)
            if cursor == 0:
                break
    except Exception:
        return


def encrypt_sensitive(value: str) -> str:
    text = str(value or "")
    if not text:
        return ""
    key = hashlib.sha256(PII_ENCRYPTION_KEY.encode("utf-8")).digest()
    if AESGCM:
        nonce = os.urandom(12)
        encrypted = AESGCM(key).encrypt(nonce, text.encode("utf-8"), None)
        return "aes256gcm:v1:" + base64.urlsafe_b64encode(nonce + encrypted).decode("ascii")
    digest = hashlib.sha256((text + ":" + PII_ENCRYPTION_KEY).encode("utf-8")).hexdigest()
    return "hash:v1:" + digest


def code_hash(email: str, code: str) -> str:
    return hashlib.sha256(f"{email}:{code}:{CODE_SECRET}".encode("utf-8")).hexdigest()


def can_send_real_email() -> bool:
    if MOCK_EMAIL in {"1", "true", "yes"}:
        return False
    if MOCK_EMAIL in {"0", "false", "no"}:
        return True
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASS)


def send_email_code(email: str, code: str):
    if not can_send_real_email():
        return
    message = "\r\n".join(
        [
            f"From: {SMTP_FROM}",
            f"To: {email}",
            "Subject: Campus Trade Email Verification Code",
            "Content-Type: text/plain; charset=utf-8",
            "",
            f"Your verification code is {code}. It expires in {EMAIL_CODE_TTL_SECONDS // 60} minutes.",
        ]
    )
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=12) as smtp:
        smtp.login(SMTP_USER, SMTP_PASS)
        smtp.sendmail(SMTP_FROM, [email], message.encode("utf-8"))


def valid_real_name(value: str) -> bool:
    text = value.strip()
    if len(text) < 2 or len(text) > 30:
        return False
    for char in text:
        if "\u4e00" <= char <= "\u9fff":
            continue
        if "A" <= char <= "Z" or "a" <= char <= "z":
            continue
        if char in {" ", ".", "路"}:
            continue
        return False
    return True


def to_int(value, default=0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


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
    }


@app.route("/uploads/<path:filename>")
def uploaded_asset(filename: str):
    try:
        upload_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))
        safe_path = os.path.abspath(os.path.join(upload_root, filename))
        if safe_path.startswith(upload_root) and os.path.isfile(safe_path):
            with open(safe_path, "rb") as file:
                data = file.read()
            ext = os.path.splitext(safe_path)[1].lower()
            mimetype = "image/png" if ext == ".png" else "image/webp" if ext == ".webp" else "image/jpeg"
            return Response(data, mimetype=mimetype, headers={"Cache-Control": "public, max-age=86400"})
        data = make_placeholder_png(filename)
    except Exception:
        data = make_placeholder_png("fallback")
    return Response(data, mimetype="image/png", headers={"Cache-Control": "public, max-age=86400"})


def order_status_text(status: str) -> str:
    return {
        "unpaid": "待支付",
        "paid": "待卖家确认",
        "confirmed": "待发货",
        "shipped": "待收货",
        "completed": "已完成",
        "cancelled": "已取消",
        "refunding": "售后退款中",
        "refunded": "已退款",
        "disputed": "纠纷仲裁中",
    }.get(status, status or "-")


def item_type_text(item_type: str) -> str:
    return {"goods": "二手闲置", "service": "校园服务", "errand": "跑腿任务"}.get(
        item_type, item_type or "-"
    )


def fund_status_text(status: str | None) -> str:
    return {
        "none": "未托管",
        "frozen": "资金托管中",
        "refunding": "退款处理中",
        "settled": "已结算",
        "refunded": "已退款",
    }.get(status or "none", status or "未托管")


def errand_status_text(status: str | None) -> str:
    return {
        "unpaid": "待支付",
        "waiting_accept": "待接单",
        "accepted": "已接单",
        "processing": "配送中",
        "completed": "待确认",
        "confirmed": "已完成",
        "cancelled": "已取消",
    }.get(status or "", status or "-")


def order_progress_text(status: str, item_type: str | None = None) -> str:
    if item_type == "service":
        return {
            "unpaid": "待支付",
            "paid": "待服务者确认",
            "confirmed": "待服务者履约",
            "shipped": "待用户确认完成",
            "completed": "已完成",
            "cancelled": "已取消",
            "refunding": "售后退款中",
            "refunded": "已退款",
            "disputed": "纠纷仲裁中",
        }.get(status, order_status_text(status))
    if item_type == "errand":
        return {
            "unpaid": "待支付",
            "paid": "待骑手接单",
            "confirmed": "骑手已接单",
            "shipped": "配送中，待确认完成",
            "completed": "已完成",
            "cancelled": "已取消",
            "refunding": "售后退款中",
            "refunded": "已退款",
            "disputed": "纠纷仲裁中",
        }.get(status, order_status_text(status))
    return order_status_text(status)


def workflow_steps(status: str, item_type: str | None = None) -> list[dict]:
    if item_type == "service":
        labels = [
            ("unpaid", "创建预约", "服务订单已创建，等待支付"),
            ("paid", "支付托管", "费用进入平台托管，等待服务者确认"),
            ("confirmed", "服务确认", "服务者已确认，等待履约"),
            ("shipped", "服务履约", "服务已开始或已交付，等待用户确认"),
            ("completed", "完成结算", "用户确认完成，资金结算给服务者"),
        ]
    elif item_type == "errand":
        labels = [
            ("unpaid", "发布任务", "跑腿任务已创建，等待支付"),
            ("paid", "费用托管", "跑腿费用进入平台托管，等待骑手接单"),
            ("confirmed", "骑手接单", "骑手已接单，准备配送"),
            ("shipped", "配送中", "骑手正在处理，等待发布者确认"),
            ("completed", "完成结算", "发布者确认完成，费用结算给骑手"),
        ]
    else:
        labels = [
            ("unpaid", "创建订单", "二手商品订单已创建，等待买家支付"),
            ("paid", "支付托管", "买家已支付，资金进入平台托管，等待卖家确认"),
            ("confirmed", "卖家确认", "卖家已确认订单，等待发货或当面交付"),
            ("shipped", "发货交付", "卖家已发货或完成交付，等待买家确认收货"),
            ("completed", "完成结算", "买家确认收货，资金结算给卖家"),
        ]
    order = ["unpaid", "paid", "confirmed", "shipped", "completed"]
    done_index = order.index(status) if status in order else -1
    if status in {"refunding", "refunded", "disputed"}:
        done_index = len(order) - 1
    steps = []
    for index, (step_status, title, desc) in enumerate(labels):
        done = index <= done_index
        steps.append(
            {
                "id": step_status,
                "title": title,
                "desc": desc,
                "time": "",
                "done": done,
                "className": "timeline-dot done" if done else "timeline-dot pending",
            }
        )
    if status in {"refunding", "refunded", "disputed"}:
        steps.append(
            {
                "id": "refund",
                "title": order_status_text(status),
                "desc": "订单进入售后处理，可在售后模块查看处理进度和凭证。",
                "time": "",
                "done": True,
                "className": "timeline-dot done",
            }
        )
    if status == "cancelled":
        steps.append(
            {
                "id": "cancelled",
                "title": "订单已取消",
                "desc": "订单已取消，未完成交易；如已托管资金，将按退款规则退回。",
                "time": "",
                "done": True,
                "className": "timeline-dot done",
            }
        )
    return steps


def parse_json_field(value, fallback=None):
    if value is None:
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return fallback


def json_dumps_cn(value) -> str:
    return json.dumps(value, ensure_ascii=False)


def asset_url(path: str | None) -> str:
    if not path:
        return ""
    text = str(path)
    if text.startswith("http://") or text.startswith("https://"):
        return text
    if text.startswith("/"):
        return f"http://127.0.0.1:{os.getenv('FLASK_PORT', '5000')}{text}"
    return text


def asset_urls(paths) -> list[str]:
    return [asset_url(path) for path in (paths or []) if path]


def decorate_order(row: dict, viewer_id: int | None = None) -> dict:
    item_snapshot = parse_json_field(row.get("item_snapshot"), {}) or {}
    title = item_snapshot.get("title") or row.get("item_title") or "校园交易订单"
    status = row.get("order_status")
    item_type = row.get("item_type")
    waiting_errand = row.get("item_type") == "errand" and row.get("order_status") in {
        "unpaid",
        "paid",
    }
    counterparty_label = (
        "服务者"
        if row.get("item_type") == "service"
        else "骑手"
        if row.get("item_type") == "errand"
        else "卖家"
    )
    is_seller = viewer_id is not None and int(row.get("seller_id") or 0) == int(viewer_id)
    is_buyer = viewer_id is not None and int(row.get("buyer_id") or 0) == int(viewer_id)
    role = "seller" if is_seller else "buyer" if is_buyer else "buyer"
    if item_type == "errand":
        role = "rider" if is_seller else "publisher"
    counterparty_name = row.get("buyer_name") if is_seller else ("待接单" if waiting_errand else row.get("seller_name"))
    counterparty_username = row.get("buyer_username") if is_seller else row.get("seller_username")
    counterparty_label = "买家" if is_seller and item_type == "goods" else "预约人" if is_seller and item_type == "service" else "发布者" if is_seller and item_type == "errand" else counterparty_label
    order = {
        "orderSn": row.get("order_sn"),
        "itemId": int(row.get("item_id") or 0),
        "itemType": row.get("item_type"),
        "itemTypeText": item_type_text(row.get("item_type")),
        "title": title,
        "amount": f"{Decimal(row.get('amount') or 0):.2f}",
        "status": status,
        "statusLabel": order_progress_text(status, item_type),
        "role": role,
        "counterpartyName": counterparty_name,
        "counterpartyUsername": counterparty_username or "",
        "counterpartyLabel": counterparty_label,
        "counterpartyLine": f"{counterparty_label}: {counterparty_name or '同校用户'}",
        "fundText": fund_status_text(row.get("fund_status")),
        "progressText": order_progress_text(status, item_type),
        "latestTime": datetime_filter(
            row.get("completed_at") or row.get("paid_at") or row.get("created_at")
        ),
        "hasRefund": row.get("order_status") in {"refunding", "refunded"},
        "refundStatusText": "售后处理中" if row.get("order_status") == "refunding" else "",
        "summaryEvents": [step["title"] for step in workflow_steps(status, item_type) if step["done"]][-3:],
        "workflowSteps": workflow_steps(status, item_type),
        "canChat": not waiting_errand,
    }
    return order


@app.route("/api/status")
@app.route("/v1/api/status")
def api_status():
    try:
        fetch_one("SELECT 1 AS ok")
    except pymysql.MySQLError as exc:
        return api_error("操作失败: " + str(exc), 500, 500)
    return api_ok(
        {
            "service": "campus-trade-flask-api",
            "mysql": DB_CONFIG["database"],
            "framework": "Flask",
            "auth": "jwt-hs256",
            "redis": redis_status(),
            "smtpConfigured": can_send_real_email(),
            "emailMode": "smtp" if can_send_real_email() else "mock",
            "demoApiReady": True,
        }
    )


@app.route("/api/auth/login", methods=["POST"])
@app.route("/v1/api/auth/login", methods=["POST"])
def api_auth_login():
    user = fetch_one(
        """
        SELECT id, nickname, username, role, status, is_verified, credit_score, balance
        FROM users
        WHERE id=%s
        LIMIT 1
        """,
        (int(request_json().get("userId") or 1),),
    )
    if not user:
        return api_error("用户不存在", 404, 404)
    token = jwt_sign({"sub": int(user["id"]), "role": user["role"]})
    api_user = row_to_api(user)
    api_user["verified"] = bool(user.get("is_verified"))
    api_user["creditScore"] = user.get("credit_score")
    return api_ok({"token": token, "user": api_user})


@app.route("/api/auth/logout", methods=["POST"])
@app.route("/v1/api/auth/logout", methods=["POST"])
def api_auth_logout():
    return api_ok({})


@app.route("/api/user/profile")
@app.route("/v1/api/user/profile")
def api_user_profile():
    user_id = current_user_id(1)
    user = fetch_one(
        """
        SELECT id, nickname, username, role, status, is_verified, credit_score,
               balance, frozen_balance, college, avatar_url, phone_enc, address
        FROM users
        WHERE id=%s
        LIMIT 1
        """,
        (user_id,),
    )
    if not user:
        return api_error("用户不存在", 404, 404)
    data = row_to_api(user)
    data["verified"] = bool(user.get("is_verified"))
    data["creditScore"] = user.get("credit_score")
    data["avatar"] = user.get("avatar_url") or ""
    return api_ok(data)


@app.route("/api/user/profile/update", methods=["POST"])
@app.route("/v1/api/user/profile/update", methods=["POST"])
@require_api_auth
def api_user_profile_update():
    data = request_json()
    user_id = current_user_id()
    nickname = str(data.get("nickname") or "").strip() or "鏍″洯鍚屽"
    username = str(data.get("username") or "").strip() or "campus_user"
    phone = str(data.get("phone") or "").strip()
    address = str(data.get("address") or "").strip()
    try:
        execute(
            """
            UPDATE users
            SET nickname=%s, username=%s, phone_enc=%s, address=%s, updated_at=NOW()
            WHERE id=%s
            """,
            (nickname, username, encrypt_sensitive(phone) if phone else "", address, user_id),
        )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_user_profile()


@app.route("/api/user/public")
@app.route("/v1/api/user/public")
def api_user_public():
    user_id = to_int(request.args.get("id") or request_json().get("id") or 1)
    row = fetch_one(
        """
        SELECT u.id, u.nickname, u.username, u.role, u.status, u.is_verified,
               u.credit_score, up.bio, up.completed_trade_count, up.good_rate_snapshot
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id=u.id
        WHERE u.id=%s
        LIMIT 1
        """,
        (user_id,),
    )
    if not row:
        return api_error("用户不存在", 404, 404)
    reviews = fetch_all(
        """
        SELECT c.id, c.score, c.content, c.created_at,
               u.nickname AS fromName, u.username AS fromUsername
        FROM comments c
        JOIN users u ON u.id=c.evaluator_id
        WHERE c.target_user_id=%s AND c.status='normal'
        ORDER BY c.created_at DESC
        LIMIT 20
        """,
        (user_id,),
    )
    goods = fetch_all(
        "SELECT id,title,price,images FROM goods WHERE seller_id=%s AND status='on_sale' ORDER BY created_at DESC LIMIT 10",
        (user_id,),
    )
    services = fetch_all(
        "SELECT id,title,price,images FROM services WHERE provider_id=%s AND status='on_sale' ORDER BY created_at DESC LIMIT 10",
        (user_id,),
    )
    user = row_to_api(row)
    user["verified"] = bool(row.get("is_verified"))
    user["creditScore"] = row.get("credit_score")
    user["goodRate"] = float(row.get("good_rate_snapshot") or 100)
    return api_ok({
        "user": user,
        "reviews": [row_to_api(item) for item in reviews],
        "goods": [row_to_api(item) for item in goods],
        "services": [row_to_api(item) for item in services],
    })


@app.route("/api/user/credit")
@app.route("/v1/api/user/credit")
def api_user_credit():
    user_id = current_user_id(1)
    user = fetch_one("SELECT credit_score FROM users WHERE id=%s", (user_id,))
    rows = fetch_all(
        "SELECT change_value, reason_type, reason_detail, score_after, created_at FROM credit_logs WHERE user_id=%s ORDER BY created_at DESC LIMIT 20",
        (user_id,),
    )
    return api_ok({"score": (user or {}).get("credit_score", 100), "records": [row_to_api(row) for row in rows]})


@app.route("/api/user/role", methods=["POST"])
@app.route("/v1/api/user/role", methods=["POST"])
@require_api_auth
def api_user_role():
    user_id = current_user_id()
    data = request_json()
    role = str(data.get("role") or "user").strip()
    if role not in {"user", "provider", "rider"}:
        return api_error("角色不合法")
    if role == "user":
        execute("UPDATE users SET role='user', updated_at=NOW() WHERE id=%s", (user_id,))
        return api_ok({"role": "user", "status": "approved"})
    user = fetch_one("SELECT is_verified FROM users WHERE id=%s", (user_id,))
    if not user or not int(user.get("is_verified") or 0):
        return api_error("请先完成实名认证")
    existing = fetch_one(
        """
        SELECT id, status
        FROM user_verifications
        WHERE user_id=%s
          AND student_id_enc=%s
          AND status='pending'
        ORDER BY id DESC
        LIMIT 1
        """,
        (user_id, f"ROLE_{role.upper()}"),
    )
    if existing:
        return api_ok({"role": role, "status": "pending", "verificationId": existing["id"]})
    verification_id = None
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_verifications
                  (user_id, student_id_enc, real_name_enc, college, status, review_note)
                VALUES (%s,%s,%s,%s,'pending',%s)
                """,
                (
                    user_id,
                    f"ROLE_{role.upper()}",
                    data.get("emergencyContact") or data.get("serviceCategory") or "role_application",
                    data.get("campusArea") or data.get("serviceCategory") or "role_application",
                    f"角色申请：{role}",
                ),
            )
            verification_id = cur.lastrowid
    return api_ok({"role": role, "status": "pending", "verificationId": verification_id}, "角色申请已提交，等待管理员审核")


@app.route("/api/account/logs")
@app.route("/v1/api/account/logs")
def api_account_logs():
    user_id = current_user_id(1)
    rows = fetch_all(
        """
        SELECT id, type, direction, amount, balance_after, title, note, created_at
        FROM wallet_logs
        WHERE user_id=%s
        ORDER BY created_at DESC,id DESC
        LIMIT 100
        """,
        (user_id,),
    )
    return api_ok({"list": [row_to_api(row) for row in rows]})


@app.route("/api/rider/earnings")
@app.route("/v1/api/rider/earnings")
def api_rider_earnings():
    user_id = current_user_id(1)
    rows = fetch_all(
        """
        SELECT order_sn, amount, status, settled_at, created_at
        FROM order_funds
        WHERE order_sn IN (SELECT order_sn FROM orders WHERE seller_id=%s AND item_type='errand')
        ORDER BY created_at DESC
        """,
        (user_id,),
    )
    total = sum(Decimal(row["amount"]) for row in rows if row["status"] in {"settled", "frozen"})
    return api_ok({"total": str(total), "list": [row_to_api(row) for row in rows]})


@app.route("/api/rider/withdraw", methods=["POST"])
@app.route("/v1/api/rider/withdraw", methods=["POST"])
@require_api_auth
def api_rider_withdraw():
    user_id = current_user_id()
    amount = Decimal(str(request_json().get("amount") or "0"))
    if amount <= 0:
        return api_error("鎻愮幇閲戦蹇呴』澶т簬0")
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO withdraw_requests (user_id, amount, reason) VALUES (%s,%s,%s)",
                    (user_id, amount, request_json().get("reason") or "withdraw request"),
                )
                withdraw_id = cur.lastrowid
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({"id": withdraw_id, "status": "pending"})


@app.route("/api/account/recharge", methods=["POST"])
@app.route("/v1/api/account/recharge", methods=["POST"])
@require_api_auth
def api_account_recharge():
    user_id = current_user_id()
    amount = Decimal(str(request_json().get("amount") or "0"))
    if amount <= 0:
        return api_error("鍏呭€奸噾棰濆繀椤诲ぇ浜?")
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT balance FROM users WHERE id=%s FOR UPDATE", (user_id,))
                user = cur.fetchone()
                if not user:
                    return api_error("用户不存在")
                balance_after = Decimal(user["balance"]) + amount
                cur.execute("UPDATE users SET balance=%s, updated_at=NOW() WHERE id=%s", (balance_after, user_id))
                cur.execute(
                    """
                    INSERT INTO wallet_logs
                      (user_id, type, direction, amount, balance_after, title, note)
                    VALUES (%s,'recharge','in',%s,%s,'閽卞寘鍏呭€?,'鏈湴婕旂ず鍏呭€?)
                    """,
                    (user_id, amount, balance_after),
                )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({"balance": str(balance_after)})


@app.route("/api/oss/sts", methods=["POST"])
@app.route("/v1/api/oss/sts", methods=["POST"])
@require_api_auth
def api_oss_sts():
    scene = str(request_json().get("scene") or "goods")
    return api_ok({
        "host": f"http://127.0.0.1:{os.getenv('FLASK_PORT', '5000')}/uploads/{scene}",
        "expire": int(time.time()) + 900,
        "policy": "local-demo",
    })


@app.route("/api/user/email-code", methods=["POST"])
@app.route("/v1/api/user/email-code", methods=["POST"])
@require_api_auth
def api_user_email_code():
    data = request_json()
    email = str(data.get("email") or "").strip().lower()
    if not re.match(r"^[a-zA-Z0-9._%+-]+@cau\.edu\.cn$", email):
        return api_error("璇蜂娇鐢?@cau.edu.cn 瀛︽牎閭")
    user_id = int(getattr(request, "api_user_id", 1) or 1)
    if redis_rate_limited(f"campus_trade:rate:email-code:{email}", 5, 3600):
        return api_error("验证码发送过于频繁，请稍后再试", 429, 429)
    lock_key = f"campus_trade:lock:email-code:{email}"
    if not redis_lock(lock_key, 60):
        return api_error("楠岃瘉鐮佹鍦ㄥ彂閫佷腑锛岃绋嶅悗鍐嶈瘯", 429, 429)
    code = f"{random.randint(0, 999999):06d}"
    expires_at = datetime.now() + timedelta(seconds=EMAIL_CODE_TTL_SECONDS)
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE email_verification_codes
                    SET status='expired'
                    WHERE user_id=%s AND email=%s AND status='pending'
                    """,
                    (user_id, email),
                )
                cur.execute(
                    """
                    INSERT INTO email_verification_codes
                      (user_id, email, code_hash, purpose, status, expires_at)
                    VALUES (%s,%s,%s,'campus_verify','pending',%s)
                    """,
                    (user_id, email, code_hash(email, code), expires_at),
                )
        send_email_code(email, code)
    except (pymysql.MySQLError, smtplib.SMTPException, OSError) as exc:
        return api_error("验证码发送失败: " + str(exc), 500, 500)
    finally:
        redis_unlock(lock_key)
    payload = {"sent": True, "expiresIn": EMAIL_CODE_TTL_SECONDS}
    if not can_send_real_email():
        payload["demoCode"] = code
    return api_ok(payload)


@app.route("/api/user/verify", methods=["POST"])
@app.route("/v1/api/user/verify", methods=["POST"])
@require_api_auth
def api_user_verify():
    data = request_json()
    email = str(data.get("email") or "").strip().lower()
    code = str(data.get("emailCode") or data.get("code") or "").strip()
    student_id = str(data.get("studentId") or "").strip()
    real_name = str(data.get("realName") or "").strip()
    college = str(data.get("college") or "").strip()
    if not re.match(r"^[a-zA-Z0-9._%+-]+@cau\.edu\.cn$", email):
        return api_error("璇蜂娇鐢?@cau.edu.cn 瀛︽牎閭")
    if not re.match(r"^\d{8,12}$", student_id):
        return api_error("姓名格式不正确")
    if not valid_real_name(real_name):
        return api_error("请选择学院")
    if not college:
        return api_error("璇烽€夋嫨瀛﹂櫌")
    user_id = int(getattr(request, "api_user_id", 1) or 1)
    record = fetch_one(
        """
        SELECT id, code_hash, attempt_count, expires_at
        FROM email_verification_codes
        WHERE user_id=%s AND email=%s AND status='pending'
        ORDER BY created_at DESC,id DESC
        LIMIT 1
        """,
        (user_id, email),
    )
    if not record:
        return api_error("验证码已过期，请重新获取")
    if record["expires_at"] < datetime.now():
        execute("UPDATE email_verification_codes SET status='expired' WHERE id=%s", (record["id"],))
        return api_error("楠岃瘉鐮佸凡杩囨湡锛岃閲嶆柊鑾峰彇")
    if int(record["attempt_count"] or 0) >= 5:
        execute("UPDATE email_verification_codes SET status='locked' WHERE id=%s", (record["id"],))
        return api_error("验证码尝试次数过多，请重新获取")
    if not hmac.compare_digest(record["code_hash"], code_hash(email, code)):
        execute(
            "UPDATE email_verification_codes SET attempt_count=attempt_count+1 WHERE id=%s",
            (record["id"],),
        )
        return api_error("邮箱验证码错误")
    student_enc = hashlib.sha256(f"{student_id}:{CODE_SECRET}".encode("utf-8")).hexdigest()
    name_enc = hashlib.sha256(f"{real_name}:{CODE_SECRET}".encode("utf-8")).hexdigest()
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE email_verification_codes SET status='verified', verified_at=NOW() WHERE id=%s",
                    (record["id"],),
                )
                cur.execute(
                    """
                    UPDATE users
                    SET student_id_enc=%s, real_name_enc=%s, college=%s, is_verified=1, status='active'
                    WHERE id=%s
                    """,
                    (student_enc, name_enc, college, user_id),
                )
                cur.execute(
                    """
                    INSERT INTO user_verifications
                      (user_id, student_id_enc, real_name_enc, college, school_email,
                       email_verified_at, status, reviewer_id, review_note, reviewed_at)
                    VALUES (%s,%s,%s,%s,%s,NOW(),'approved',%s,'瀛︽牎閭楠岃瘉鐮佽嚜鍔ㄩ€氳繃',NOW())
                    """,
                    (user_id, student_enc, name_enc, college, email, ADMIN_ID),
                )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({"status": "approved", "email": email, "verified": True})


@app.route("/api/goods/list")
@app.route("/v1/api/goods/list")
def api_goods_list():
    cache_key = "campus_trade:goods:list:on_sale:all:1"
    cached = redis_get_json(cache_key)
    if cached:
        return api_ok(cached)
    rows = fetch_all(
        """
        SELECT id, title, price, condition_level AS conditionText,
               description AS `desc`, location, images, favorite_count,
               view_count, seller_id, seller_name, seller_username,
               seller_credit_score AS creditScore, category_name
        FROM v_goods_public_list
        ORDER BY created_at DESC, id DESC
        LIMIT 100
        """
    )
    categories = fetch_all(
        "SELECT name FROM categories WHERE type='goods' AND status='active' ORDER BY sort_order,id"
    )
    goods = []
    for row in rows:
        item = row_to_api(row)
        images = asset_urls(parse_json_field(row.get("images"), []))
        item["price"] = float(row["price"])
        item["images"] = images
        item["image"] = images[0] if images else ""
        item["condition"] = row.get("conditionText") or row.get("condition_level") or ""
        item["category"] = row.get("category_name") or ""
        item["sellerId"] = row.get("seller_id")
        item["sellerName"] = row.get("seller_name")
        item["username"] = row.get("seller_username")
        item["favoriteCount"] = row.get("favorite_count") or 0
        item["viewCount"] = row.get("view_count") or 0
        item["favorite"] = False
        item["status"] = "on_sale"
        item["verified"] = True
        item["seller"] = {
            "id": row.get("seller_id"),
            "nickname": row.get("seller_name"),
            "username": row.get("seller_username"),
            "creditScore": row.get("creditScore"),
        }
        goods.append(item)
    payload = {"list": goods, "categories": [r["name"] for r in categories]}
    redis_set_json(cache_key, payload, 60)
    return api_ok(payload)


@app.route("/api/goods/detail")
@app.route("/v1/api/goods/detail")
def api_goods_detail():
    goods_id = request.args.get("id", type=int)
    cache_key = f"campus_trade:goods:detail:{goods_id}"
    cached = redis_get_json(cache_key)
    if cached:
        return api_ok(cached)
    row = fetch_one(
        """
        SELECT id, title, price, condition_level AS conditionText,
               description AS `desc`, location, images, favorite_count,
               view_count, seller_id, seller_name, seller_username,
               seller_credit_score AS creditScore, category_name
        FROM v_goods_public_list
        WHERE id=%s
        LIMIT 1
        """,
        (goods_id,),
    )
    if not row:
        return api_error("商品不存在", 404, 404)
    item = row_to_api(row)
    images = asset_urls(parse_json_field(row.get("images"), []))
    item["price"] = float(row["price"])
    item["images"] = images
    item["image"] = images[0] if images else ""
    item["condition"] = row.get("conditionText") or row.get("condition_level") or ""
    item["category"] = row.get("category_name") or ""
    item["sellerId"] = row.get("seller_id")
    item["sellerName"] = row.get("seller_name")
    item["username"] = row.get("seller_username")
    item["favoriteCount"] = row.get("favorite_count") or 0
    item["viewCount"] = row.get("view_count") or 0
    item["favorite"] = False
    item["status"] = "on_sale"
    item["verified"] = True
    item["seller"] = {
        "id": row.get("seller_id"),
        "nickname": row.get("seller_name"),
        "username": row.get("seller_username"),
        "creditScore": row.get("creditScore"),
    }
    redis_set_json(cache_key, item, 300)
    return api_ok(item)


@app.route("/api/goods/favorite", methods=["POST"])
@app.route("/v1/api/goods/favorite", methods=["POST"])
@require_api_auth
def api_goods_favorite():
    goods_id = to_int(request_json().get("id") or request_json().get("goodsId"))
    user_id = int(getattr(request, "api_user_id", 1) or 1)
    if goods_id <= 0:
        return api_error("缂哄皯鍟嗗搧ID")
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id FROM favorites WHERE user_id=%s AND target_type='goods' AND target_id=%s",
                    (user_id, goods_id),
                )
                existed = cur.fetchone()
                if existed:
                    cur.execute("DELETE FROM favorites WHERE id=%s", (existed["id"],))
                    favorite = False
                    delta = -1
                else:
                    cur.execute(
                        "INSERT INTO favorites (user_id, target_type, target_id) VALUES (%s,'goods',%s)",
                        (user_id, goods_id),
                    )
                    favorite = True
                    delta = 1
                cur.execute(
                    "UPDATE goods SET favorite_count=GREATEST(0, favorite_count + %s) WHERE id=%s",
                    (delta, goods_id),
                )
                cur.execute("SELECT favorite_count FROM goods WHERE id=%s", (goods_id,))
                row = cur.fetchone() or {"favorite_count": 0}
    except pymysql.MySQLError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:goods:list:on_sale:*")
    redis_delete_pattern(f"campus_trade:goods:detail:{goods_id}")
    return api_ok({"favorite": favorite, "favoriteCount": row.get("favorite_count") or 0})


@app.route("/api/goods/favorites")
@app.route("/v1/api/goods/favorites")
def api_goods_favorites():
    user_id = 1
    rows = fetch_all(
        """
        SELECT g.id, g.title, g.price, g.condition_level AS conditionText,
               g.description AS `desc`, g.location, g.images, g.favorite_count,
               g.view_count, g.seller_id, u.nickname AS sellerName,
               u.username, c.name AS category
        FROM favorites f
        JOIN goods g ON g.id = f.target_id
        JOIN users u ON u.id = g.seller_id
        JOIN categories c ON c.id = g.category_id
        WHERE f.user_id=%s AND f.target_type='goods' AND g.status <> 'removed'
        ORDER BY f.created_at DESC
        """,
        (user_id,),
    )
    items = []
    for row in rows:
        item = row_to_api(row)
        images = asset_urls(parse_json_field(row.get("images"), []))
        item["price"] = float(row["price"])
        item["images"] = images
        item["image"] = images[0] if images else ""
        item["favorite"] = True
        item["favoriteCount"] = row.get("favorite_count") or 0
        items.append(item)
    return api_ok({"list": items})


@app.route("/api/goods/mine")
@app.route("/v1/api/goods/mine")
def api_goods_mine():
    rows = fetch_all(
        """
        SELECT g.id, g.title, g.price, g.condition_level AS conditionText,
               g.description AS `desc`, g.location, g.images, g.favorite_count,
               g.view_count, g.status, c.name AS category
        FROM goods g
        JOIN categories c ON c.id = g.category_id
        WHERE g.seller_id=%s
        ORDER BY g.created_at DESC
        """,
        (1,),
    )
    items = []
    for row in rows:
        item = row_to_api(row)
        images = asset_urls(parse_json_field(row.get("images"), []))
        item["price"] = float(row["price"])
        item["images"] = images
        item["image"] = images[0] if images else ""
        item["favoriteCount"] = row.get("favorite_count") or 0
        items.append(item)
    return api_ok({"list": items})


@app.route("/api/goods/remove", methods=["POST"])
@app.route("/v1/api/goods/remove", methods=["POST"])
@require_api_auth
def api_goods_remove():
    goods_id = to_int(request_json().get("id"))
    if goods_id <= 0:
        return api_error("缂哄皯鍟嗗搧ID")
    execute("UPDATE goods SET status='removed', updated_at=NOW() WHERE id=%s AND seller_id=%s", (goods_id, current_user_id()))
    redis_delete_pattern("campus_trade:goods:list:on_sale:*")
    redis_delete_pattern(f"campus_trade:goods:detail:{goods_id}")
    return api_ok({"id": goods_id, "status": "removed"})


@app.route("/api/goods/relist", methods=["POST"])
@app.route("/v1/api/goods/relist", methods=["POST"])
@require_api_auth
def api_goods_relist():
    goods_id = to_int(request_json().get("id"))
    if goods_id <= 0:
        return api_error("缂哄皯鍟嗗搧ID")
    execute("UPDATE goods SET status='on_sale', updated_at=NOW() WHERE id=%s AND seller_id=%s", (goods_id, current_user_id()))
    redis_delete_pattern("campus_trade:goods:list:on_sale:*")
    redis_delete_pattern(f"campus_trade:goods:detail:{goods_id}")
    return api_ok({"id": goods_id, "status": "on_sale"})


@app.route("/api/goods/save", methods=["POST"])
@app.route("/api/goods/publish", methods=["POST"])
@app.route("/v1/api/goods/save", methods=["POST"])
@app.route("/v1/api/goods/publish", methods=["POST"])
@require_api_auth
def api_goods_save():
    data = request_json()
    title = str(data.get("title") or "").strip()
    desc = str(data.get("desc") or data.get("description") or "").strip()
    price = Decimal(str(data.get("price") or "0"))
    if not title or not desc or price <= 0:
        return api_error("璇疯ˉ鍏ㄥ晢鍝佹爣棰樸€佹弿杩板拰浠锋牸")
    category = fetch_one("SELECT id FROM categories WHERE type='goods' AND status='active' ORDER BY sort_order,id LIMIT 1")
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO goods
                      (seller_id, category_id, title, price, condition_level,
                       description, images, location, status, audit_note)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'on_sale','AI瑙勫垯瀹℃牳閫氳繃')
                    """,
                    (
                        1,
                        category["id"] if category else 1,
                        title,
                        price,
                        data.get("condition") or data.get("conditionText") or "八成新",
                        desc,
                        json.dumps(data.get("images") or [], ensure_ascii=False),
                        data.get("location") or "",
                    ),
                )
                goods_id = cur.lastrowid
                cur.execute(
                    """
                    INSERT INTO ai_audit_records
                      (target_type, target_id, audit_type, provider, risk_level, reason, raw_result)
                    VALUES ('goods', %s, 'text_audit', 'rule', 'pass', '鍙戝竷鍐呭瑙勫垯瀹℃牳閫氳繃', JSON_OBJECT('title', %s))
                    """,
                    (goods_id, title),
                )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:goods:list:on_sale:*")
    return api_ok({"id": goods_id, "status": "on_sale"})


@app.route("/api/service/list")
@app.route("/v1/api/service/list")
def api_service_list():
    cache_key = "campus_trade:service:list:on_sale:1"
    cached = redis_get_json(cache_key)
    if cached:
        return api_ok(cached)
    rows = fetch_all(
        """
        SELECT id, provider_id, title, price, description AS `desc`, images,
               avg_score, provider_name, provider_username,
               provider_credit_score, category_name
        FROM v_service_public_list
        ORDER BY created_at DESC, id DESC
        LIMIT 100
        """
    )
    items = []
    for row in rows:
        item = row_to_api(row)
        images = asset_urls(parse_json_field(row.get("images"), []))
        item["price"] = float(row["price"])
        item["images"] = images
        item["image"] = images[0] if images else ""
        item["type"] = "service"
        item["provider"] = row.get("provider_name")
        item["username"] = row.get("provider_username")
        item["providerId"] = row.get("provider_id")
        item["status"] = "on_sale"
        item["statusText"] = "可预约"
        item["providerInfo"] = {
            "id": row.get("provider_id"),
            "nickname": row.get("provider_name"),
            "username": row.get("provider_username"),
            "creditScore": row.get("provider_credit_score"),
        }
        items.append(item)
    errands = fetch_all(
        """
        SELECT id, title, description AS `desc`, pickup_location,
               delivery_location, fee AS price, status, created_at,
               publisher_id, publisher_name, publisher_username, rider_name
        FROM v_errand_hall
        ORDER BY created_at DESC, id DESC
        LIMIT 50
        """
    )
    for row in errands:
        item = row_to_api(row)
        item["type"] = "errand"
        item["price"] = float(row["price"])
        # repaired damaged text literal
        item["username"] = row.get("publisher_username") or "user"
        item["provider"] = row.get("publisher_name") or "发布者"
        item["providerId"] = row.get("publisher_id")
        item["publisherId"] = row.get("publisher_id")
        item["pickupLocation"] = row.get("pickup_location")
        item["deliveryLocation"] = row.get("delivery_location")
        item["location"] = " -> ".join([v for v in [row.get("pickup_location"), row.get("delivery_location")] if v])
        item["images"] = []
        item["image"] = ""
        item["statusText"] = errand_status_text(row.get("status"))
        items.append(item)
    payload = {"list": items}
    redis_set_json(cache_key, payload, 60)
    return api_ok(payload)


@app.route("/api/service/detail")
@app.route("/v1/api/service/detail")
def api_service_detail():
    service_id = request.args.get("id", type=int)
    cache_key = f"campus_trade:service:detail:{service_id}"
    cached = redis_get_json(cache_key)
    if cached:
        return api_ok(cached)
    row = fetch_one(
        """
        SELECT id, provider_id, title, price, description AS `desc`, images,
               avg_score, provider_name, provider_username,
               provider_credit_score, category_name
        FROM v_service_public_list
        WHERE id=%s
        LIMIT 1
        """,
        (service_id,),
    )
    if not row:
        errand = fetch_one(
            """
            SELECT id, publisher_id, title, description AS `desc`,
                   pickup_location, delivery_location, fee AS price,
                   status, created_at, publisher_name, publisher_username
            FROM v_errand_hall
            WHERE id=%s
            LIMIT 1
            """,
            (service_id,),
        )
        if not errand:
            return api_error("资源不存在", 404, 404)
        item = row_to_api(errand)
        item["type"] = "errand"
        item["price"] = float(errand["price"])
        item["provider"] = errand.get("publisher_name") or "发布者"
        item["username"] = errand.get("publisher_username") or "user"
        item["providerId"] = errand.get("publisher_id")
        item["publisherId"] = errand.get("publisher_id")
        item["pickupLocation"] = errand.get("pickup_location")
        item["deliveryLocation"] = errand.get("delivery_location")
        item["location"] = " -> ".join([v for v in [errand.get("pickup_location"), errand.get("delivery_location")] if v])
        item["images"] = []
        item["image"] = ""
        item["statusText"] = errand_status_text(errand.get("status"))
        item["owner"] = {
            "id": errand.get("publisher_id"),
            "nickname": errand.get("publisher_name"),
            "username": errand.get("publisher_username"),
            "role": "user",
            "creditScore": 100,
            "reviewCount": 0,
            "completedCount": 0,
            "goodRate": 100,
            "verified": True,
        }
        redis_set_json(cache_key, item, 120)
        return api_ok(item)
    item = row_to_api(row)
    images = asset_urls(parse_json_field(row.get("images"), []))
    item["price"] = float(row["price"])
    item["images"] = images
    item["image"] = images[0] if images else ""
    item["type"] = "service"
    item["provider"] = row.get("provider_name")
    item["username"] = row.get("provider_username")
    item["providerId"] = row.get("provider_id")
    item["status"] = "on_sale"
    item["statusText"] = "可预约"
    item["providerInfo"] = {
        "id": row.get("provider_id"),
        "nickname": row.get("provider_name"),
        "username": row.get("provider_username"),
        "creditScore": row.get("provider_credit_score"),
    }
    item["owner"] = item["providerInfo"]
    redis_set_json(cache_key, item, 300)
    return api_ok(item)


@app.route("/api/service/save", methods=["POST"])
@app.route("/api/services/publish", methods=["POST"])
@app.route("/api/errands/publish", methods=["POST"])
@app.route("/v1/api/service/save", methods=["POST"])
@app.route("/v1/api/services/publish", methods=["POST"])
@app.route("/v1/api/errands/publish", methods=["POST"])
@require_api_auth
def api_service_save():
    data = request_json()
    user_id = current_user_id()
    kind = str(data.get("type") or "service").strip()
    title = str(data.get("title") or "").strip()
    desc = str(data.get("desc") or data.get("description") or "").strip()
    price = Decimal(str(data.get("price") or data.get("fee") or "0"))
    if not title or not desc or price <= 0:
        return api_error("璇疯ˉ鍏ㄦ爣棰樸€佹弿杩板拰浠锋牸")
    category = fetch_one("SELECT id FROM categories WHERE type=%s AND status='active' ORDER BY sort_order,id LIMIT 1", ("errand" if kind == "errand" else "service",))
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                if kind == "errand":
                    pickup = data.get("pickupLocation") or data.get("pickup_location") or data.get("location") or "校内取件点"
                    delivery = data.get("deliveryLocation") or data.get("delivery_location") or "校内送达点"
                    cur.execute(
                        """
                        INSERT INTO errand_orders
                          (publisher_id, title, description, pickup_location, delivery_location, fee, status)
                        VALUES (%s,%s,%s,%s,%s,%s,'waiting_accept')
                        """,
                        (user_id, title, desc, pickup, delivery, price),
                    )
                    errand_id = cur.lastrowid
                    order_sn = "ER" + datetime.now().strftime("%Y%m%d%H%M%S%f")
                    cur.execute(
                        """
                        INSERT INTO orders
                          (order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot,
                           amount, status, remark, paid_at)
                        VALUES (%s,%s,%s,'errand',%s,%s,%s,'paid',%s,NOW())
                        """,
                        (
                            order_sn,
                            user_id,
                            user_id,
                            errand_id,
                            json.dumps({"title": title, "pickup_location": pickup, "delivery_location": delivery}, ensure_ascii=False),
                            price,
                            desc,
                        ),
                    )
                    cur.execute(
                        "INSERT INTO order_funds (order_sn, amount, status, frozen_at) VALUES (%s,%s,'frozen',NOW())",
                        (order_sn, price),
                    )
                    cur.execute(
                        "INSERT INTO order_events (order_sn, to_status, operator_id, event_type, note) VALUES (%s,'paid',%s,'errand_publish','发布跑腿并托管费用')",
                        (order_sn, user_id),
                    )
                    cur.execute(
                        "INSERT INTO errand_events (errand_id, operator_id, event_type, to_status, remark) VALUES (%s,%s,'create','waiting_accept',%s)",
                        (errand_id, user_id, "发布跑腿订单，等待骑手抢单"),
                    )
                    result = {"id": errand_id, "orderSn": order_sn, "status": "waiting_accept"}
                else:
                    cur.execute(
                        """
                        INSERT INTO services
                          (provider_id, category_id, title, price, description, images, status)
                        VALUES (%s,%s,%s,%s,%s,%s,'on_sale')
                        """,
                        (
                            user_id,
                            category["id"] if category else 1,
                            title,
                            price,
                            desc,
                            json.dumps(data.get("images") or [], ensure_ascii=False),
                        ),
                    )
                    service_id = cur.lastrowid
                    result = {"id": service_id, "status": "on_sale"}
                cur.execute(
                    """
                    INSERT INTO ai_audit_records
                      (target_type, target_id, audit_type, provider, risk_level, reason, raw_result)
                    VALUES (%s, %s, 'text_audit', 'rule', 'pass', '鍙戝竷鍐呭瑙勫垯瀹℃牳閫氳繃', JSON_OBJECT('title', %s))
                    """,
                    ("service", result["id"], title),
                )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:service:list:on_sale:*")
    redis_delete_pattern("campus_trade:service:detail:*")
    return api_ok(result)


@app.route("/api/service/order", methods=["POST"])
@app.route("/api/services/orders/create", methods=["POST"])
@app.route("/v1/api/service/order", methods=["POST"])
@app.route("/v1/api/services/orders/create", methods=["POST"])
@require_api_auth
def api_service_order():
    user_id = current_user_id()
    order_sn = "SV" + datetime.now().strftime("%Y%m%d%H%M%S%f")
    service_id = to_int(request_json().get("id") or request_json().get("serviceId"))
    lock_key = f"campus_trade:lock:service:order:{service_id}:{user_id}"
    if not redis_lock(lock_key, 8):
        return api_error("预约正在处理中，请稍后刷新", 409, 409)
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, provider_id, title, price, description, status
                    FROM services
                    WHERE id=%s
                    FOR UPDATE
                    """,
                    (service_id,),
                )
                row = cur.fetchone()
                if not row or row["status"] != "on_sale":
                    return api_error("服务不存在或不可预约")
                if int(row["provider_id"]) == user_id:
                    return api_error("不能预约自己发布的服务")
                cur.execute(
                    """
                    SELECT order_sn
                    FROM orders
                    WHERE buyer_id=%s
                      AND item_type='service'
                      AND item_id=%s
                      AND status IN ('unpaid','paid','confirmed','shipped')
                    ORDER BY created_at DESC
                    LIMIT 1
                    FOR UPDATE
                    """,
                    (user_id, service_id),
                )
                existing = cur.fetchone()
                if existing:
                    return api_error("你已预约该服务，请到订单页继续支付或处理", 409, 409)
                cur.execute(
                    """
                    INSERT INTO orders
                      (order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot,
                       amount, status, remark)
                    VALUES (%s,%s,%s,'service',%s,%s,%s,'unpaid',%s)
                    """,
                    (
                        order_sn,
                        user_id,
                        row["provider_id"],
                        row["id"],
                        json.dumps({"title": row["title"], "price": str(row["price"])}, ensure_ascii=False),
                        row["price"],
                        row["description"],
                    ),
                )
                cur.execute(
                    "INSERT INTO order_events (order_sn, to_status, operator_id, event_type, note) VALUES (%s,'unpaid',%s,'service_order','棰勭害鏈嶅姟')",
                    (order_sn, user_id),
                )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    finally:
        redis_unlock(lock_key)
    return api_ok({"orderSn": order_sn, "status": "unpaid"})


@app.route("/api/order/list")
@app.route("/api/orders/list")
@app.route("/v1/api/order/list")
@app.route("/v1/api/orders/list")
def api_order_list():
    user_id = current_user_id()
    rows = fetch_all(
        """
        SELECT order_sn,item_type,item_id,item_title,amount,
               order_status,fund_status,created_at,paid_at,completed_at,
               buyer_id,seller_id,buyer_name,seller_name,buyer_username,seller_username
        FROM v_admin_order_summary
        WHERE buyer_id=%s OR seller_id=%s
        ORDER BY created_at DESC
        LIMIT 100
        """,
        (user_id, user_id),
    )
    return api_ok({"list": [decorate_order(row, user_id) for row in rows]})


@app.route("/api/order/detail")
@app.route("/api/orders/detail")
@app.route("/v1/api/order/detail")
@app.route("/v1/api/orders/detail")
def api_order_detail():
    user_id = current_user_id()
    order_sn = request.args.get("orderSn", "")
    row = fetch_one(
        """
        SELECT order_sn,item_type,item_id,item_title,amount,
               order_status,fund_status,created_at,paid_at,completed_at,
               buyer_id,seller_id,buyer_name,seller_name,buyer_username,seller_username
        FROM v_admin_order_summary
        WHERE order_sn=%s
        LIMIT 1
        """,
        (order_sn,),
    )
    if not row:
        return api_error("订单不存在", 404, 404)
    order = decorate_order(row, user_id)
    events = fetch_all(
        """
        SELECT event_type, from_status, to_status, note, created_at
        FROM order_events
        WHERE order_sn=%s
        ORDER BY created_at,id
        """,
        (order_sn,),
    )
    event_timeline = [
        {
            "id": f"{order_sn}-{index}",
            "title": event.get("event_type") or event.get("to_status"),
            "desc": event.get("note") or f"{event.get('from_status') or ''} -> {event.get('to_status') or ''}",
            "time": datetime_filter(event.get("created_at")),
            "done": True,
            "className": "timeline-dot done",
        }
        for index, event in enumerate(events)
    ]
    event_time_map = {}
    for event in events:
        to_status = event.get("to_status")
        if to_status and to_status not in event_time_map:
            event_time_map[to_status] = datetime_filter(event.get("created_at"))
    timeline = order.get("workflowSteps") or workflow_steps(order.get("status"), order.get("itemType"))
    for item in timeline:
        if item.get("id") in event_time_map:
            item["time"] = event_time_map[item["id"]]
    if event_timeline:
        order["rawEvents"] = event_timeline
    order["timeline"] = timeline
    order["summaryEvents"] = [item["title"] for item in timeline if item.get("done")][-3:]
    return api_ok(order)


def call_proc(proc_sql: str, params: tuple):
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(proc_sql, params)


def call_proc_rows(proc_sql: str, params: tuple) -> list[dict]:
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(proc_sql, params)
            return list(cur.fetchall())


@app.route("/api/order/create", methods=["POST"])
@app.route("/api/orders/create", methods=["POST"])
@app.route("/v1/api/order/create", methods=["POST"])
@app.route("/v1/api/orders/create", methods=["POST"])
@require_api_auth
def api_order_create():
    data = request_json()
    user_id = current_user_id()
    goods_id = int(data.get("goodsId") or data.get("id") or 0)
    if goods_id <= 0:
        return api_error("缂哄皯鍟嗗搧ID")
    owner = fetch_one("SELECT seller_id FROM goods WHERE id=%s LIMIT 1", (goods_id,))
    if not owner:
        return api_error("商品不存在", 404, 404)
    if int(owner["seller_id"]) == user_id:
        return api_error("不能购买自己发布的商品")
    lock_key = f"campus_trade:lock:goods:order:{goods_id}"
    if not redis_lock(lock_key, 8):
        return api_error("该商品正在被下单，请稍后刷新", 409, 409)
    order_sn = "CT" + datetime.now().strftime("%Y%m%d%H%M%S%f")
    remark = (data.get("remark") or "").strip()
    try:
        call_proc("CALL sp_create_goods_order(%s,%s,%s,%s)", (order_sn, user_id, goods_id, remark))
    except pymysql.MySQLError as exc:
        return api_error(exc)
    finally:
        redis_unlock(lock_key)
    return api_ok({"orderSn": order_sn})


@app.route("/api/order/pay", methods=["POST"])
@app.route("/v1/api/order/pay", methods=["POST"])
@require_api_auth
def api_order_pay():
    user_id = current_user_id()
    order_sn = request_json().get("orderSn")
    if not order_sn:
        return api_error("缺少订单号")
    try:
        call_proc("CALL sp_pay_order(%s,%s)", (order_sn, user_id))
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({"orderSn": order_sn, "status": "paid"})


@app.route("/api/order/cancel", methods=["POST"])
@app.route("/v1/api/order/cancel", methods=["POST"])
@require_api_auth
def api_order_cancel():
    user_id = current_user_id()
    order_sn = request_json().get("orderSn")
    if not order_sn:
        return api_error("缺少订单号")
    try:
        call_proc("CALL sp_cancel_order(%s,%s,%s)", (order_sn, user_id, "用户取消订单"))
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({"orderSn": order_sn, "status": "cancelled"})


@app.route("/api/order/receive", methods=["POST"])
@app.route("/api/orders/confirm", methods=["POST"])
@app.route("/v1/api/order/receive", methods=["POST"])
@app.route("/v1/api/orders/confirm", methods=["POST"])
@require_api_auth
def api_order_receive():
    user_id = current_user_id()
    order_sn = request_json().get("orderSn")
    if not order_sn:
        return api_error("缺少订单号")
    try:
        call_proc("CALL sp_confirm_receive(%s,%s)", (order_sn, user_id))
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({"orderSn": order_sn, "status": "completed"})


@app.route("/api/order/refund", methods=["POST"])
@app.route("/v1/api/order/refund", methods=["POST"])
@require_api_auth
def api_order_refund():
    data = request_json()
    user_id = current_user_id()
    order_sn = data.get("orderSn")
    if not order_sn:
        return api_error("缺少订单号")
    try:
        call_proc(
            "CALL sp_apply_refund(%s,%s,%s,%s)",
            (order_sn, user_id, data.get("reason") or "用户申请售后", json.dumps(data.get("evidenceUrls") or [])),
        )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({"orderSn": order_sn, "status": "refunding"})


@app.route("/api/order/confirm", methods=["POST"])
@app.route("/v1/api/order/confirm", methods=["POST"])
@require_api_auth
def api_order_confirm():
    user_id = current_user_id()
    order_sn = request_json().get("orderSn")
    if not order_sn:
        return api_error("缺少订单号")
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT order_sn, seller_id, status, lock_version
                    FROM orders
                    WHERE order_sn=%s
                    FOR UPDATE
                    """,
                    (order_sn,),
                )
                order = cur.fetchone()
                if not order:
                    return api_error("订单不存在", 404, 404)
                if int(order["seller_id"]) != user_id:
                    return api_error("只能由卖家/服务者确认订单", 403, 403)
                if order["status"] != "paid":
                    return api_error("当前订单状态不能确认")
                cur.execute(
                    """
                    UPDATE orders
                    SET status='confirmed',
                        lock_version=lock_version+1,
                        updated_at=NOW()
                    WHERE order_sn=%s AND lock_version=%s
                    """,
                    (order_sn, order["lock_version"]),
                )
                if cur.rowcount != 1:
                    return api_error("订单状态已变化，请刷新后重试", 409, 409)
                cur.execute(
                    """
                    INSERT INTO order_events
                      (order_sn, from_status, to_status, operator_id, event_type, note)
                    VALUES (%s,'paid','confirmed',%s,'seller_confirm','卖家/服务者确认订单')
                    """,
                    (order_sn, user_id),
                )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({"orderSn": order_sn, "status": "confirmed"})


@app.route("/api/order/ship", methods=["POST"])
@app.route("/v1/api/order/ship", methods=["POST"])
@require_api_auth
def api_order_ship():
    user_id = current_user_id()
    order_sn = request_json().get("orderSn")
    if not order_sn:
        return api_error("缺少订单号")
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT order_sn, seller_id, status, lock_version
                    FROM orders
                    WHERE order_sn=%s
                    FOR UPDATE
                    """,
                    (order_sn,),
                )
                order = cur.fetchone()
                if not order:
                    return api_error("订单不存在", 404, 404)
                if int(order["seller_id"]) != user_id:
                    return api_error("只能由卖家/服务者发货或确认履约", 403, 403)
                if order["status"] != "confirmed":
                    return api_error("当前订单状态不能发货或履约")
                cur.execute(
                    """
                    UPDATE orders
                    SET status='shipped',
                        lock_version=lock_version+1,
                        updated_at=NOW()
                    WHERE order_sn=%s AND lock_version=%s
                    """,
                    (order_sn, order["lock_version"]),
                )
                if cur.rowcount != 1:
                    return api_error("订单状态已变化，请刷新后重试", 409, 409)
                cur.execute(
                    """
                    INSERT INTO order_events
                      (order_sn, from_status, to_status, operator_id, event_type, note)
                    VALUES (%s,%s,'shipped',%s,'ship','卖家/服务者发货或开始履约')
                    """,
                    (order_sn, order["status"], user_id),
                )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({"orderSn": order_sn, "status": "shipped"})


@app.route("/api/order/complaint", methods=["POST"])
@app.route("/v1/api/order/complaint", methods=["POST"])
@require_api_auth
def api_order_complaint():
    data = request_json()
    user_id = current_user_id()
    order_sn = data.get("orderSn")
    content = str(data.get("content") or data.get("reason") or "").strip()
    if not order_sn or not content:
        return api_error("请填写投诉内容")
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT order_sn, buyer_id, seller_id, item_type, item_id, status
                    FROM orders
                    WHERE order_sn=%s
                    FOR UPDATE
                    """,
                    (order_sn,),
                )
                order = cur.fetchone()
                if not order:
                    return api_error("订单不存在")
                if user_id not in {int(order["buyer_id"]), int(order["seller_id"])}:
                    return api_error("只有订单双方可以提交投诉", 403, 403)
                cur.execute(
                    """
                    SELECT
                      c.id AS conversation_id,
                      COUNT(m.id) AS message_count,
                      MAX(m.id) AS latest_message_id
                    FROM conversations c
                    LEFT JOIN messages m ON m.conversation_id = c.id
                    WHERE c.business_type=%s
                      AND c.business_id=%s
                      AND %s IN (c.user_a_id, c.user_b_id)
                    GROUP BY c.id
                    ORDER BY c.last_message_at DESC, c.id DESC
                    LIMIT 1
                    """,
                    (order["item_type"], order["item_id"], user_id),
                )
                evidence = cur.fetchone() or {}
                latest_hash = ""
                if evidence.get("latest_message_id"):
                    cur.execute(
                        "SELECT content_hash FROM messages WHERE id=%s LIMIT 1",
                        (evidence["latest_message_id"],),
                    )
                    latest_message = cur.fetchone() or {}
                    latest_hash = latest_message.get("content_hash") or ""
                evidence_payload = {
                    "source": "complaint",
                    "complaintText": content,
                    "autoLinkedChat": bool(evidence.get("conversation_id")),
                    "conversationId": evidence.get("conversation_id"),
                    "messageCount": int(evidence.get("message_count") or 0),
                    "latestMessageHash": latest_hash,
                    "orderStatusBefore": order["status"],
                }
                cur.execute(
                    """
                    INSERT INTO refund_requests
                      (order_sn, applicant_id, seller_id, reason, evidence_urls, status)
                    VALUES (%s,%s,%s,%s,%s,'arbitrating')
                    """,
                    (order_sn, user_id, order["seller_id"], content, json_dumps_cn(evidence_payload)),
                )
                complaint_id = cur.lastrowid
                cur.execute(
                    "INSERT INTO order_events (order_sn, from_status, to_status, operator_id, event_type, note) VALUES (%s,%s,%s,%s,'complaint',%s)",
                    (order_sn, order["status"], "disputed", user_id, content),
                )
                cur.execute("UPDATE orders SET status='disputed', updated_at=NOW() WHERE order_sn=%s", (order_sn,))
                cur.execute(
                    "UPDATE order_funds SET status='refunding', updated_at=NOW() WHERE order_sn=%s AND status='frozen'",
                    (order_sn,),
                )
                cur.execute(
                    """
                    INSERT INTO notifications
                      (user_id, business_type, business_id, title, content)
                    VALUES
                      (%s,'refund',%s,'投诉已提交','平台管理员将结合订单事件与聊天证据链处理。'),
                      (%s,'refund',%s,'订单进入投诉仲裁','对方提交投诉，平台管理员将介入处理。')
                    """,
                    (user_id, order_sn, order["seller_id"] if user_id == int(order["buyer_id"]) else order["buyer_id"], order_sn),
                )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({"id": complaint_id, "status": "arbitrating", "evidence": evidence_payload})


@app.route("/api/comment", methods=["POST"])
@app.route("/v1/api/comment", methods=["POST"])
@require_api_auth
def api_comment():
    data = request_json()
    user_id = current_user_id()
    order_sn = data.get("orderSn")
    content = str(data.get("content") or "").strip()
    score = max(1, min(5, to_int(data.get("score"), 5)))
    if not order_sn or not content:
        return api_error("请填写评价内容")
    order = fetch_one(
        """
        SELECT order_sn, seller_id, item_type, item_id
        FROM orders
        WHERE order_sn=%s
        LIMIT 1
        """,
        (order_sn,),
    )
    if not order:
        return api_error("订单不存在")
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO comments
                      (order_sn, evaluator_id, target_user_id, target_type, target_id, score, content)
                    VALUES (%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (order_sn, user_id, order["seller_id"], order["item_type"], order["item_id"], score, content),
                )
                comment_id = cur.lastrowid
                cur.execute(
                    """
                    INSERT INTO ai_audit_records
                      (target_type, target_id, audit_type, provider, risk_level, reason, raw_result)
                    VALUES ('comment', %s, 'text_audit', 'rule', 'pass', '璇勪环鍐呭瑙勫垯瀹℃牳閫氳繃', JSON_OBJECT('score', %s))
                    """,
                    (comment_id, score),
                )
                cur.execute(
                    "INSERT INTO order_events (order_sn, to_status, operator_id, event_type, note) VALUES (%s,'completed',%s,'comment',%s)",
                    (order_sn, user_id, "用户已评价"),
                )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({"id": comment_id, "status": "created"})


@app.route("/api/rider/take", methods=["POST"])
@app.route("/api/errands/accept", methods=["POST"])
@app.route("/v1/api/rider/take", methods=["POST"])
@app.route("/v1/api/errands/accept", methods=["POST"])
@require_api_auth
def api_rider_take():
    payload = request_json()
    user_id = current_user_id()
    errand_id = int(payload.get("id") or payload.get("errandId") or 0)
    if errand_id <= 0:
        return api_error("缺少跑腿任务ID")
    owner = fetch_one("SELECT publisher_id FROM errand_orders WHERE id=%s LIMIT 1", (errand_id,))
    if not owner:
        return api_error("任务不存在", 404, 404)
    if int(owner["publisher_id"]) == user_id:
        return api_error("不能抢自己发布的跑腿任务")
    lock_key = f"campus_trade:lock:errand:take:{errand_id}"
    if not redis_lock(lock_key, 8):
        return api_error("该跑腿任务正在被抢单，请稍后重试", 409, 409)
    try:
        call_proc("CALL sp_take_errand(%s,%s)", (errand_id, user_id))
    except pymysql.MySQLError as exc:
        return api_error(exc)
    finally:
        redis_unlock(lock_key)
    return api_ok({"id": errand_id, "status": "accepted"})


@app.route("/api/rider/status", methods=["POST"])
@app.route("/v1/api/rider/status", methods=["POST"])
@require_api_auth
def api_rider_status():
    user_id = current_user_id()
    data = request_json()
    errand_id = to_int(data.get("id") or data.get("errandId"))
    new_status = str(data.get("status") or "").strip()
    allowed = {
        "accepted": {"processing", "cancelled"},
        "processing": {"completed"},
        "completed": {"confirmed"},
    }
    if errand_id <= 0 or not new_status:
        return api_error("缺少跑腿任务ID或状态")
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, rider_id, publisher_id, status
                    FROM errand_orders
                    WHERE id=%s
                    FOR UPDATE
                    """,
                    (errand_id,),
                )
                errand = cur.fetchone()
                if not errand:
                    return api_error("跑腿任务不存在", 404, 404)
                old_status = errand["status"]
                if new_status not in allowed.get(old_status, set()):
                    return api_error("跑腿状态流转不合法")
                if new_status in {"processing", "completed"} and int(errand["rider_id"] or 0) != user_id:
                    return api_error("只能由接单骑手更新配送进度", 403, 403)
                if new_status == "confirmed" and int(errand["publisher_id"]) != user_id:
                    return api_error("只能由发布者确认完成", 403, 403)
                cur.execute(
                    "UPDATE errand_orders SET status=%s, updated_at=NOW() WHERE id=%s",
                    (new_status, errand_id),
                )
                cur.execute(
                    """
                    INSERT INTO errand_events
                      (errand_id, operator_id, event_type, from_status, to_status, remark)
                    VALUES (%s,%s,'status_change',%s,%s,%s)
                    """,
                    (errand_id, user_id, old_status, new_status, "小程序更新跑腿进度"),
                )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({"id": errand_id, "status": new_status, "statusText": errand_status_text(new_status)})


@app.route("/api/chat/list")
@app.route("/v1/api/chat/list")
def api_chat_list():
    rows = fetch_all(
        """
        SELECT
          c.id AS conversation_id,
          c.business_type,
          c.business_id,
          CASE WHEN c.user_a_id = 1 THEN c.user_b_id ELSE c.user_a_id END AS peer_id,
          peer.nickname AS peer_name,
          peer.username AS peer_username,
          (
            SELECT m.content
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
          ) AS last_message,
          c.last_message_at AS last_time,
          0 AS unread_count
        FROM conversations c
        JOIN users peer ON peer.id = CASE WHEN c.user_a_id = 1 THEN c.user_b_id ELSE c.user_a_id END
        WHERE c.user_a_id = 1 OR c.user_b_id = 1
        ORDER BY c.last_message_at DESC, c.created_at DESC
        LIMIT 100
        """
    )
    items = []
    for row in rows:
        latest_hash = fetch_one(
            """
            SELECT content_hash
            FROM messages
            WHERE conversation_id=%s
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            (row["conversation_id"],),
        )
        item = row_to_api(row)
        item["id"] = row.get("conversation_id")
        item["peer"] = row.get("peer_name")
        item["peerUsername"] = row.get("peer_username")
        item["businessType"] = row.get("business_type")
        item["businessId"] = row.get("business_id")
        item["messages"] = [
            {
                "content": row.get("last_message") or "",
                "hash": latest_hash["content_hash"] if latest_hash else "SHA256-EMPTY",
            }
        ] if row.get("last_message") else []
        items.append(item)
    return api_ok({"list": items})


@app.route("/api/chat/messages")
@app.route("/v1/api/chat/messages")
def api_chat_messages():
    conversation_id = request.args.get("conversationId", "")
    conversation = fetch_one(
        """
        SELECT
          c.id,
          c.business_type,
          c.business_id,
          CASE WHEN c.user_a_id = 1 THEN c.user_b_id ELSE c.user_a_id END AS peer_id,
          peer.nickname AS peer,
          peer.username AS peer_username
        FROM conversations c
        JOIN users peer ON peer.id = CASE WHEN c.user_a_id = 1 THEN c.user_b_id ELSE c.user_a_id END
        WHERE c.id=%s
        LIMIT 1
        """,
        (conversation_id,),
    )
    rows = fetch_all(
        """
        SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id,
               m.message_type, m.content, m.content_hash, m.previous_hash,
               m.status, m.created_at,
               sender.nickname AS sender_name,
               sender.username AS sender_username
        FROM messages m
        JOIN users sender ON sender.id = m.sender_id
        WHERE m.conversation_id=%s
        ORDER BY created_at,id
        LIMIT 200
        """,
        (conversation_id,),
    )
    messages = []
    for row in rows:
        item = row_to_api(row)
        item["from"] = "me" if int(row.get("sender_id") or 0) == 1 else "other"
        item["hash"] = row.get("content_hash")
        item["contentHash"] = row.get("content_hash")
        item["previousHash"] = row.get("previous_hash")
        item["time"] = datetime_filter(row.get("created_at"))
        item["senderName"] = row.get("sender_name")
        item["senderUsername"] = row.get("sender_username")
        messages.append(item)
    if conversation:
        conv = row_to_api(conversation)
        conv["businessType"] = conversation.get("business_type")
        conv["businessId"] = conversation.get("business_id")
        conv["peerUsername"] = conversation.get("peer_username")
        conv["title"] = item_type_text(conversation.get("business_type"))
    else:
        conv = {"id": conversation_id, "title": "浼氳瘽", "peer": "浜ゆ槗瀵硅薄", "peerUsername": "user"}
    return api_ok({"conversation": conv, "list": messages})


def find_chat_target(data: dict, current_user_id: int) -> dict | None:
    business_type = str(data.get("businessType") or data.get("business_type") or "").strip()
    business_id = to_int(data.get("businessId") or data.get("business_id") or data.get("goodsId"))
    order_sn = str(data.get("orderSn") or "").strip()
    if order_sn and (not business_type or not business_id):
        order = fetch_one(
            """
            SELECT item_type, item_id, buyer_id, seller_id
            FROM orders
            WHERE order_sn=%s
            LIMIT 1
            """,
            (order_sn,),
        )
        if order:
            business_type = order["item_type"]
            business_id = to_int(order["item_id"])
            peer_id = to_int(order["seller_id"] if to_int(order["buyer_id"]) == current_user_id else order["buyer_id"])
            return {"business_type": business_type, "business_id": business_id, "peer_id": peer_id}
    if not business_type and data.get("goodsId"):
        business_type = "goods"
    if business_type == "goods_chat":
        business_type = "goods"
    if business_type == "service_chat":
        business_type = "service"
    if business_type == "task_chat":
        business_type = "errand"
    if not business_type or not business_id:
        return None
    table_map = {
        "goods": ("goods", "seller_id"),
        "service": ("services", "provider_id"),
        "errand": ("errand_orders", "publisher_id"),
    }
    if business_type not in table_map:
        return None
    table, owner_col = table_map[business_type]
    row = fetch_one(f"SELECT {owner_col} AS peer_id FROM {table} WHERE id=%s LIMIT 1", (business_id,))
    if not row:
        return None
    peer_id = to_int(row["peer_id"])
    if peer_id == current_user_id:
        peer_id = to_int(data.get("peerId") or data.get("receiverId"))
    if peer_id <= 0:
        return None
    return {"business_type": business_type, "business_id": business_id, "peer_id": peer_id}


def ensure_conversation(data: dict, current_user_id: int) -> dict | None:
    conversation_id = data.get("conversationId") or data.get("conversation_id")
    if conversation_id:
        conversation = fetch_one(
            """
            SELECT id, business_type, business_id,
                   CASE WHEN user_a_id=%s THEN user_b_id ELSE user_a_id END AS peer_id
            FROM conversations
            WHERE id=%s AND (user_a_id=%s OR user_b_id=%s)
            LIMIT 1
            """,
            (current_user_id, conversation_id, current_user_id, current_user_id),
        )
        if conversation:
            return conversation
    target = find_chat_target(data, current_user_id)
    if not target:
        return None
    user_a = min(current_user_id, to_int(target["peer_id"]))
    user_b = max(current_user_id, to_int(target["peer_id"]))
    session_type = {"goods": "goods_chat", "service": "service_chat", "errand": "task_chat"}.get(target["business_type"], "goods_chat")
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT IGNORE INTO conversations
                  (session_type, business_type, business_id, user_a_id, user_b_id, last_message_at)
                VALUES (%s,%s,%s,%s,%s,NOW())
                """,
                (session_type, target["business_type"], target["business_id"], user_a, user_b),
            )
            cur.execute(
                """
                SELECT id, business_type, business_id,
                       CASE WHEN user_a_id=%s THEN user_b_id ELSE user_a_id END AS peer_id
                FROM conversations
                WHERE business_type=%s AND business_id=%s AND user_a_id=%s AND user_b_id=%s
                LIMIT 1
                """,
                (current_user_id, target["business_type"], target["business_id"], user_a, user_b),
            )
            return cur.fetchone()


@app.route("/api/chat/send", methods=["POST"])
@app.route("/v1/api/chat/send", methods=["POST"])
@require_api_auth
def api_chat_send():
    data = request_json()
    content = (data.get("content") or "").strip()
    if not content:
        return api_error("请输入消息内容")
    current_user_id = int(getattr(request, "api_user_id", 1) or 1)
    conversation = ensure_conversation(data, current_user_id)
    if not conversation:
        return api_error("无法确定聊天对象，请从商品、服务、订单或会话列表进入")
    conversation_id = int(conversation["id"])
    peer_id = int(conversation["peer_id"])
    previous = fetch_one(
        """
        SELECT content_hash
        FROM messages
        WHERE conversation_id=%s
        ORDER BY created_at DESC,id DESC
        LIMIT 1
        """,
        (conversation_id,),
    )
    previous_hash = previous["content_hash"] if previous else None
    content_hash = hashlib.sha256(
        f"{previous_hash or ''}|{current_user_id}|{peer_id}|text|{content}".encode("utf-8")
    ).hexdigest()
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO messages
                      (conversation_id, sender_id, receiver_id, message_type,
                       content, content_hash, previous_hash, status)
                    VALUES (%s,%s,%s,'text',%s,%s,%s,'normal')
                    """,
                    (conversation_id, current_user_id, peer_id, content, content_hash, previous_hash),
                )
                msg_id = cur.lastrowid
                cur.execute(
                    "UPDATE conversations SET last_message_at=NOW() WHERE id=%s",
                    (conversation_id,),
                )
    except pymysql.MySQLError as exc:
        return api_error(exc)
    return api_ok({
        "id": msg_id,
        "conversationId": conversation_id,
        "from": "me",
        "content": content,
        "hash": content_hash,
        "contentHash": content_hash,
        "previousHash": previous_hash,
        "time": "??",
    })


@app.route("/api/admin/stats")
@app.route("/v1/api/admin/stats")
@require_admin_api
def api_admin_stats():
    stats = fetch_one(
        """
        SELECT
          (SELECT COUNT(*) FROM users WHERE status <> 'removed') AS userCount,
          (SELECT COUNT(*) FROM goods WHERE status = 'pending') AS pendingGoods,
          (SELECT COUNT(*) FROM refund_requests WHERE status IN ('pending','seller_rejected','arbitrating')) AS refundingOrders,
          (SELECT COUNT(*) FROM withdraw_requests WHERE status='pending') AS pendingWithdraws,
          (SELECT COUNT(*) FROM orders) AS orderCount,
          (SELECT COALESCE(SUM(amount),0) FROM orders WHERE status IN ('paid','completed','refunding','refunded')) AS tradeAmount
        """
    )
    return api_ok(row_to_api(stats or {}))


@app.route("/api/admin/stats/export")
@app.route("/v1/api/admin/stats/export")
@require_admin_api
def api_admin_stats_export():
    return api_ok({"fileName": "campus-trade-stats.csv", "generatedAt": datetime_filter(datetime.now())})


@app.route("/api/admin/reconcile/run", methods=["POST"])
@app.route("/v1/api/admin/reconcile/run", methods=["POST"])
@require_admin_api
def api_admin_reconcile_run():
    data = request_json()
    stat_date = data.get("date") or date.today().isoformat()
    try:
        abnormal_rows = call_proc_rows("CALL sp_wallet_reconcile(%s)", (stat_date,))
    except pymysql.MySQLError as exc:
        return api_error(exc)
    abnormal_list = [row_to_api(row) for row in abnormal_rows]
    return api_ok({
        "date": stat_date,
        "abnormalCount": len(abnormal_list),
        "abnormalList": abnormal_list
    })


@app.route("/api/admin/goods/pending")
@app.route("/v1/api/admin/goods/pending")
@require_admin_api
def api_admin_goods_pending():
    return api_ok({"list": [row_to_api(row) for row in fetch_pending_goods()]})


@app.route("/api/admin/goods/audit", methods=["POST"])
@app.route("/v1/api/admin/goods/audit", methods=["POST"])
@require_admin_api
def api_admin_goods_audit():
    data = request_json()
    goods_id = to_int(data.get("id"))
    result = data.get("result")
    status = "rejected" if result == "reject" else "on_sale"
    note = data.get("reason") or ("瀹℃牳椹冲洖" if result == "reject" else "瀹℃牳閫氳繃")
    execute("UPDATE goods SET status=%s, audit_note=%s, updated_at=NOW() WHERE id=%s", (status, note, goods_id))
    return api_ok({"id": goods_id, "status": status})


@app.route("/api/admin/orders/refunding")
@app.route("/v1/api/admin/orders/refunding")
@require_admin_api
def api_admin_orders_refunding():
    return api_ok({"list": [row_to_api(row) for row in fetch_refunds()]})


@app.route("/api/admin/order/arbitrate", methods=["POST"])
@app.route("/v1/api/admin/order/arbitrate", methods=["POST"])
@require_admin_api
def api_admin_order_arbitrate():
    data = request_json()
    order_sn = data.get("orderSn")
    result = data.get("result") or "buyer"
    refund = fetch_one("SELECT id FROM refund_requests WHERE order_sn=%s ORDER BY id DESC LIMIT 1", (order_sn,))
    if not refund:
        return api_error("售后或投诉单不存在")
    call_proc("CALL sp_arbitrate_refund(%s,%s,%s,%s)", (refund["id"], ADMIN_ID, result, "小程序管理员仲裁"))
    return api_ok({"orderSn": order_sn, "result": result})


@app.route("/api/admin/withdraws")
@app.route("/v1/api/admin/withdraws")
@require_admin_api
def api_admin_withdraws():
    rows = fetch_all(
        """
        SELECT w.id, w.user_id, w.amount, w.reason, w.status, w.created_at,
               u.nickname, u.username, u.role
        FROM withdraw_requests w
        JOIN users u ON u.id=w.user_id
        ORDER BY FIELD(w.status,'pending','approved','rejected','cancelled'), w.created_at DESC
        LIMIT 100
        """
    )
    return api_ok({"list": [row_to_api(row) for row in rows]})


@app.route("/api/admin/withdraw/audit", methods=["POST"])
@app.route("/v1/api/admin/withdraw/audit", methods=["POST"])
@require_admin_api
def api_admin_withdraw_audit():
    data = request_json()
    withdraw_id = to_int(data.get("id"))
    result = data.get("result") or "approve"
    call_proc("CALL sp_audit_withdraw(%s,%s,%s,%s)", (withdraw_id, ADMIN_ID, result, "灏忕▼搴忕鐞嗗憳瀹℃牳鎻愮幇"))
    return api_ok({"id": withdraw_id, "result": result})


@app.route("/api/admin/users")
@app.route("/v1/api/admin/users")
@require_admin_api
def api_admin_users():
    return api_ok({"list": [row_to_api(row) for row in fetch_users()]})


@app.route("/api/admin/user/status", methods=["POST"])
@app.route("/v1/api/admin/user/status", methods=["POST"])
@require_admin_api
def api_admin_user_status():
    data = request_json()
    user_id = to_int(data.get("id"))
    status = data.get("status") or "active"
    if status not in {"active", "banned", "pending_verify", "removed"}:
        return api_error("鐢ㄦ埛鐘舵€佷笉鍚堟硶")
    execute("UPDATE users SET status=%s, updated_at=NOW() WHERE id=%s", (status, user_id))
    return api_ok({"id": user_id, "status": status})


@app.route("/api/admin/ai/rules")
@app.route("/v1/api/admin/ai/rules")
@require_admin_api
def api_admin_ai_rules():
    rule = fetch_ai_rule()
    return api_ok({
        "textAudit": bool(rule.get("text_audit_enabled")),
        "imageAudit": bool(rule.get("image_audit_enabled")),
        "manualRiskLevel": rule.get("manual_risk_level"),
        "keywords": rule.get("keywords") or "",
        "updatedAt": datetime_filter(rule.get("updated_at")),
    })


@app.route("/api/admin/ai/rules/update", methods=["POST"])
@app.route("/v1/api/admin/ai/rules/update", methods=["POST"])
@require_admin_api
def api_admin_ai_rules_update():
    data = request_json()
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_rules
                  (rule_name, text_audit_enabled, image_audit_enabled, manual_risk_level, keywords, updated_by)
                VALUES ('default_publish_audit', %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                  text_audit_enabled=VALUES(text_audit_enabled),
                  image_audit_enabled=VALUES(image_audit_enabled),
                  manual_risk_level=VALUES(manual_risk_level),
                  keywords=VALUES(keywords),
                  updated_by=VALUES(updated_by),
                  updated_at=NOW()
                """,
                (
                    1 if data.get("textAudit") else 0,
                    1 if data.get("imageAudit") else 0,
                    data.get("manualRiskLevel") or "manual",
                    data.get("keywords") or "",
                    ADMIN_ID,
                ),
            )
    return api_admin_ai_rules()


@app.route("/api/admin/audit/logs")
@app.route("/v1/api/admin/audit/logs")
@require_admin_api
def api_admin_audit_logs():
    return api_ok({"list": [row_to_api(row) for row in fetch_recent_logs()]})


@app.route("/api/admin/ops/health")
@app.route("/v1/api/admin/ops/health")
@require_admin_api
def api_admin_ops_health():
    status = fetch_one("SELECT VERSION() AS mysqlVersion")
    jobs = fetch_all("SELECT job_name, status, message, created_at FROM job_logs ORDER BY created_at DESC LIMIT 10")
    return api_ok({
        "status": "healthy",
        "mysqlVersion": (status or {}).get("mysqlVersion"),
        "redis": redis_status(),
        "checkedAt": datetime_filter(datetime.now()),
        "events": [row_to_api(row) for row in jobs],
        "latestBackup": {"fileName": "manual-demo.sql", "createdAt": datetime_filter(datetime.now())},
    })


@app.route("/api/admin/security/checks")
@app.route("/v1/api/admin/security/checks")
@require_admin_api
def api_admin_security_checks():
    checks = [
        # repaired damaged text literal
        # repaired damaged text literal
        {"name": "order_funds", "status": "healthy", "detail": "璧勯噾鎵樼琛ㄥ凡鍒涘缓"},
        {"name": "Redis", "status": redis_status(), "detail": "闄愭祦鍜屽垎甯冨紡閿佸彲鐢ㄦ垨鐢?MySQL 鍏滃簳"},
    ]
    return api_ok({"list": checks})


@app.route("/api/admin/backup/run", methods=["POST"])
@app.route("/v1/api/admin/backup/run", methods=["POST"])
@require_admin_api
def api_admin_backup_run():
    now_text = datetime.now().strftime("%Y%m%d%H%M%S")
    with db_conn() as conn:
        add_audit_log(conn, "数据库备份演练", "backup", now_text, "小程序管理员触发备份演练")
    return api_ok({"fileName": f"campus_trade_backup_{now_text}.sql", "createdAt": datetime_filter(datetime.now()), "status": "created"})


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        if username == ADMIN_WEB_USERNAME and password == ADMIN_WEB_PASSWORD:
            session["admin_logged_in"] = True
            session["admin_name"] = username
            return redirect(request.args.get("next") or url_for("dashboard"))
        flash("????", "error")
    return render_template("login.html")


@app.route("/logout")
@require_login
def logout():
    session.clear()
    flash("????", "ok")
    return redirect(url_for("login"))


@app.route("/")
@require_login
def dashboard():
    try:
        stats = fetch_one(
            """
            SELECT
              (SELECT COUNT(*) FROM users WHERE status <> 'removed') AS user_count,
              (SELECT COUNT(*) FROM goods WHERE status = 'pending') AS pending_goods,
              (SELECT COUNT(*) FROM ai_audit_records
                 WHERE risk_level IN ('manual','reject')) AS risky_ai_records,
              (SELECT COUNT(*) FROM user_verifications
                 WHERE status = 'pending') AS pending_verifications,
              (SELECT COUNT(*) FROM refund_requests
                 WHERE status IN ('pending','seller_rejected','arbitrating')) AS refund_queue,
              (SELECT COUNT(*) FROM orders) AS order_count,
              (SELECT COALESCE(SUM(amount), 0) FROM orders
                 WHERE status IN ('paid','completed','refunding','refunded')) AS trade_amount
            """
        )
        pending_goods = fetch_pending_goods()
        refunds = fetch_refunds()
        verifications = fetch_verifications()
        users = fetch_users()
        ai_rule = fetch_ai_rule()
        recent_logs = fetch_recent_logs()
    except pymysql.MySQLError as exc:
        return render_template("db_error.html", error=exc, db=DB_CONFIG), 500

    return render_template(
        "dashboard.html",
        stats=stats or {},
        pending_goods=pending_goods,
        refunds=refunds,
        verifications=verifications,
        users=users,
        ai_rule=ai_rule,
        recent_logs=recent_logs,
        today=date.today().isoformat(),
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


def fetch_refunds() -> list[dict]:
    rows = fetch_all(
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
          (SELECT COUNT(*) FROM order_events oe WHERE oe.order_sn = rr.order_sn) AS event_count,
          (SELECT GROUP_CONCAT(CONCAT(oe.event_type, ':', oe.to_status) ORDER BY oe.created_at SEPARATOR ' / ')
             FROM order_events oe WHERE oe.order_sn = rr.order_sn) AS event_summary,
          ce.conversation_id,
          ce.message_count,
          ce.latest_message_hash
        FROM refund_requests rr
        JOIN orders o ON o.order_sn = rr.order_sn
        JOIN users applicant ON applicant.id = rr.applicant_id
        JOIN users seller ON seller.id = rr.seller_id
        LEFT JOIN order_funds f ON f.order_sn = rr.order_sn
        LEFT JOIN (
          SELECT
            c.business_type,
            c.business_id,
            LEAST(c.user_a_id, c.user_b_id) AS user_low,
            GREATEST(c.user_a_id, c.user_b_id) AS user_high,
            c.id AS conversation_id,
            COUNT(m.id) AS message_count,
            SUBSTRING_INDEX(GROUP_CONCAT(m.content_hash ORDER BY m.id DESC SEPARATOR ','), ',', 1) AS latest_message_hash
          FROM conversations c
          LEFT JOIN messages m ON m.conversation_id = c.id
          GROUP BY c.id, c.business_type, c.business_id, c.user_a_id, c.user_b_id
        ) ce ON ce.business_type = o.item_type
             AND ce.business_id = o.item_id
             AND ce.user_low = LEAST(o.buyer_id, o.seller_id)
             AND ce.user_high = GREATEST(o.buyer_id, o.seller_id)
        WHERE rr.status IN ('pending','seller_rejected','arbitrating')
        ORDER BY FIELD(rr.status, 'arbitrating', 'seller_rejected', 'pending'),
                 rr.created_at ASC
        LIMIT 50
        """
    )
    for row in rows:
        evidence = parse_json_field(row.get("evidence_urls"), {}) or {}
        if isinstance(evidence, list):
            evidence = {"files": evidence}
        row["evidence"] = evidence
        row["source_text"] = "投诉举证" if evidence.get("source") == "complaint" or row.get("order_status") == "disputed" else "售后申请"
        row["evidence_message_count"] = evidence.get("messageCount") or row.get("message_count") or 0
        row["evidence_latest_hash"] = evidence.get("latestMessageHash") or row.get("latest_message_hash") or ""
        row["evidence_conversation_id"] = evidence.get("conversationId") or row.get("conversation_id") or ""
        row["auto_linked_chat"] = bool(evidence.get("autoLinkedChat") or row.get("conversation_id"))
    return rows


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
        "keywords": "??,???,??,??,????",
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
    note = request.form.get("note", "").strip() or "?????"
    mapping = {
        "pass": ("on_sale", "鍟嗗搧瀹℃牳閫氳繃"),
        "reject": ("rejected", "鍟嗗搧瀹℃牳椹冲洖"),
        "remove": ("removed", "杩濊鍟嗗搧涓嬫灦"),
    }
    if result not in mapping:
        flash("????", "error")
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
                    flash("????", "error")
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
                        f"{before['title']}: {note}",
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
        flash("????", "ok")
    except pymysql.MySQLError as exc:
        flash("商品审核失败: " + str(exc), "error")
    return redirect(url_for("dashboard") + "#goods")


@app.post("/refunds/<int:refund_id>/arbitrate")
@require_login
def arbitrate_refund(refund_id: int):
    result = request.form.get("result", "").strip()
    note = request.form.get("note", "").strip() or "?????"
    if result not in {"buyer", "seller"}:
        flash("????", "error")
        return redirect(url_for("dashboard") + "#refunds")

    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.callproc("sp_arbitrate_refund", (refund_id, ADMIN_ID, result, note))
            add_audit_log(
                conn,
                "鍞悗浠茶",
                "refund",
                refund_id,
                note,
                after_data={"result": result},
            )
        flash("????", "ok")
    except pymysql.MySQLError as exc:
        flash("????: " + str(exc), "error")
    return redirect(url_for("dashboard") + "#refunds")


@app.post("/ops/reconcile")
@require_login
def run_wallet_reconcile():
    stat_date = request.form.get("stat_date", "").strip() or date.today().isoformat()
    try:
        abnormal_rows = call_proc_rows("CALL sp_wallet_reconcile(%s)", (stat_date,))
        with db_conn() as conn:
            add_audit_log(
                conn,
                "资金日终对账",
                "wallet_reconcile",
                stat_date,
                f"管理员手动触发资金对账，异常 {len(abnormal_rows)} 项",
                after_data={"date": stat_date, "abnormal_count": len(abnormal_rows)},
            )
        flash(f"资金对账完成，异常 {len(abnormal_rows)} 项", "ok" if not abnormal_rows else "error")
    except pymysql.MySQLError as exc:
        flash("资金对账失败: " + str(exc), "error")
    return redirect(url_for("dashboard") + "#ops")


@app.post("/verifications/<int:verification_id>/audit")
@require_login
def audit_verification(verification_id: int):
    result = request.form.get("result", "").strip()
    note = request.form.get("note", "").strip() or "瀹炲悕璁よ瘉浜哄伐瀹℃牳"
    if result not in {"approve", "reject"}:
        flash("????", "error")
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
                    flash("????", "error")
                    return redirect(url_for("dashboard") + "#verifications")
                if before["status"] != "pending":
                    flash("????", "error")
                    return redirect(url_for("dashboard") + "#verifications")

                role_apply_map = {
                    "ROLE_PROVIDER": "provider",
                    "ROLE_RIDER": "rider",
                }
                target_role = role_apply_map.get(str(before.get("student_id_enc") or ""))

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
                    if target_role:
                        cur.execute(
                            """
                            UPDATE users
                            SET role = %s,
                                status = 'active',
                                updated_at = NOW()
                            WHERE id = %s
                            """,
                            (target_role, before["user_id"]),
                        )
                    else:
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
                    if not target_role:
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
                    action = "角色申请通过" if target_role else "瀹炲悕璁よ瘉閫氳繃"
                    after = {"status": "approved", "role": target_role} if target_role else {"status": "approved", "user_verified": 1}
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
                    action = "瀹炲悕璁よ瘉椹冲洖"
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
        flash("????", "ok")
    except pymysql.MySQLError as exc:
        flash("????: " + str(exc), "error")
    return redirect(url_for("dashboard") + "#verifications")


@app.post("/ai-rules")
@require_login
def save_ai_rules():
    text_enabled = 1 if request.form.get("text_audit_enabled") == "on" else 0
    image_enabled = 1 if request.form.get("image_audit_enabled") == "on" else 0
    manual_level = request.form.get("manual_risk_level", "manual").strip()
    keywords = request.form.get("keywords", "").strip()
    if manual_level not in {"pass", "manual", "reject"}:
        flash("????", "error")
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
                    "AI瀹℃牳瑙勫垯鏇存柊",
                    "ai_rules",
                    "default_publish_audit",
                    "鏇存柊鍙戝竷瀹℃牳瑙勫垯",
                    after_data={
                        "text_audit_enabled": text_enabled,
                        "image_audit_enabled": image_enabled,
                        "manual_risk_level": manual_level,
                        "keywords": keywords,
                    },
                )
        flash("????", "ok")
    except pymysql.MySQLError as exc:
        flash("????: " + str(exc), "error")
    return redirect(url_for("dashboard") + "#ai-rules")


@app.post("/users/<int:user_id>/status")
@require_login
def change_user_status(user_id: int):
    action = request.form.get("action", "").strip()
    note = request.form.get("note", "").strip() or "?????"
    if user_id == ADMIN_ID:
        flash("????", "error")
        return redirect(url_for("dashboard") + "#users")
    if action not in {"ban", "unban"}:
        flash("????", "error")
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
                    flash("????", "error")
                    return redirect(url_for("dashboard") + "#users")

                if action == "ban":
                    new_status = "banned"
                    new_score = min(int(before["credit_score"]), 60)
                    action_name = "灏佺鐢ㄦ埛"
                else:
                    new_status = "active"
                    new_score = int(before["credit_score"])
                    action_name = "瑙ｅ皝鐢ㄦ埛"

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
        flash("????", "ok")
    except pymysql.MySQLError as exc:
        flash("????: " + str(exc), "error")
    return redirect(url_for("dashboard") + "#users")


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
    writer.writerow(["ID", "??", "???", "??", "????", "??ID", "??", "IP"])
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

