from __future__ import annotations

import hashlib
import os
import re
import struct
import uuid
import zlib
from datetime import datetime
from decimal import Decimal

from flask import Response, current_app, g, request, session

from .ai_gateway import configure_ai
from .audit import add_audit_log as service_add_audit_log, configure_audit
from .cache import configure_cache
from .config import ADMIN_WEB_DIR, AppConfig
from .crypto_utils import configure_crypto
from .database import configure_database
from .mailer import configure_mailer
from .security import configure_security, csrf_token, verify_csrf_token
from .services import auth_service


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


def configure_extensions(config: AppConfig) -> None:
    configure_database(config)
    configure_security(config)
    configure_cache(config)
    configure_crypto(config)
    configure_mailer(config)
    configure_ai(config)
    configure_audit(config)
    auth_service.configure_auth_service(config)


def app_config() -> AppConfig:
    return current_app.config["APP_CONFIG"]


def upload_root() -> str:
    return os.path.abspath(os.path.join(str(ADMIN_WEB_DIR), "uploads"))


def client_ip() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return request.remote_addr or "127.0.0.1"


def to_int(value, default=0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def add_audit_log(
    conn,
    action: str,
    target_type: str,
    target_id: str | int,
    reason: str,
    before_data=None,
    after_data=None,
):
    return service_add_audit_log(
        conn,
        action,
        target_type,
        target_id,
        reason,
        before_data=before_data,
        after_data=after_data,
        ip_address=client_ip(),
    )


def require_admin_csrf() -> bool:
    token = request.form.get("_csrf_token") or request.headers.get("X-CSRF-Token")
    return verify_csrf_token(token)


def money_filter(value) -> str:
    if value is None:
        return "0.00"
    return f"{Decimal(value):.2f}"


def datetime_filter(value) -> str:
    if not value:
        return "-"
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    return str(value)


def label_filter(value) -> str:
    return STATUS_LABELS.get(value, RISK_LABELS.get(value, value or "-"))


def brief_filter(value, size=72) -> str:
    text = "" if value is None else str(value)
    return text if len(text) <= size else text[:size] + "..."


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
        green = int(color_a[1] * (1 - ratio) + color_b[1] * ratio)
        blue = int(color_a[2] * (1 - ratio) + color_b[2] * ratio)
        row.extend(bytes((r, green, blue)) * width)
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


def safe_upload_scene(value: str) -> str:
    scene = re.sub(r"[^a-zA-Z0-9_-]", "", value or "goods")[:32]
    return scene or "goods"


def upload_url_for(scene: str, filename: str) -> str:
    return f"/uploads/{safe_upload_scene(scene)}/{filename}"


def path_inside(child: str, parent: str) -> bool:
    try:
        return os.path.commonpath([os.path.abspath(child), os.path.abspath(parent)]) == os.path.abspath(parent)
    except ValueError:
        return False


def register_runtime(app, config: AppConfig) -> None:
    @app.before_request
    def attach_trace_id():
        g.trace_id = request.headers.get("X-Trace-Id") or uuid.uuid4().hex

    @app.after_request
    def attach_trace_header(response):
        response.headers["X-Trace-Id"] = getattr(g, "trace_id", "")
        return response

    @app.context_processor
    def common_context():
        return {
            "status_labels": STATUS_LABELS,
            "risk_labels": RISK_LABELS,
            "admin_username": config.admin_web_username,
            "csrf_token": csrf_token,
        }

    app.add_template_filter(money_filter, "money")
    app.add_template_filter(datetime_filter, "dt")
    app.add_template_filter(label_filter, "label")
    app.add_template_filter(brief_filter, "brief")
