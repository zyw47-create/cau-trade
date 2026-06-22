from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation

from ..ai_gateway import ai_audit, generate_listing_metadata, image_audit
from ..config import load_config
from ..repositories import content as content_repository
from ..repositories import users as user_repository


class BusinessError(ValueError):
    pass


def _decimal(value, field: str) -> Decimal:
    try:
        amount = Decimal(str(value or "0"))
    except (InvalidOperation, ValueError):
        raise BusinessError(f"{field} is invalid")
    if amount <= 0:
        raise BusinessError(f"{field} must be greater than 0")
    return amount


def _assert_publish_user(user_id: int) -> dict:
    user = content_repository.assert_publish_user(user_id)
    if not user:
        raise BusinessError("user does not exist")
    if user.get("status") != "active":
        raise BusinessError("account is not active")
    if not int(user.get("is_verified") or 0):
        raise BusinessError("real-name verification is required before publishing")
    return user


def _audit_status(result) -> str:
    if result.risk_level == "pass":
        return "on_sale"
    if result.risk_level == "manual":
        return "pending"
    return "rejected"


def _merge_audit_status(text_audit, media_audit) -> str:
    if text_audit.risk_level == "reject" or media_audit.risk_level == "reject":
        return "rejected"
    if text_audit.risk_level == "manual" or media_audit.risk_level == "manual":
        return "pending"
    return "on_sale"


def _load_ai_rule() -> dict:
    return content_repository.load_default_ai_rule()


def _order_sn(prefix: str) -> str:
    return prefix + datetime.now().strftime("%Y%m%d%H%M%S%f")


def _image_references(data: dict) -> list[str]:
    refs = [str(item) for item in data.get("images") or [] if item]
    for item in data.get("imageObjects") or []:
        if not isinstance(item, dict):
            continue
        for key in ("url", "uploadedUrl", "localUrl", "objectKey", "name"):
            value = item.get(key)
            if value:
                refs.append(str(value))
    return refs


def publish_goods(user_id: int, data: dict) -> dict:
    _assert_publish_user(user_id)
    title = str(data.get("title") or "").strip()
    desc = str(data.get("desc") or data.get("description") or "").strip()
    price = _decimal(data.get("price"), "price")
    if not title or not desc:
        raise BusinessError("title and description are required")
    category_id = content_repository.first_active_category_id("goods")
    rule = _load_ai_rule()
    audit = ai_audit(f"title: {title}\ndescription: {desc}", rule)
    media_audit = image_audit(_image_references(data), rule)
    status = _merge_audit_status(audit, media_audit)
    goods_id = content_repository.create_goods_with_audit(
        user_id,
        {
            "title": title,
            "price": price,
            "condition_level": data.get("condition") or data.get("conditionText") or "normal",
            "description": desc,
            "images": data.get("images") or [],
            "location": data.get("location") or "",
        },
        audit,
        media_audit,
        status,
        category_id,
    )
    return {
        "id": goods_id,
        "status": status,
        "audit": {
            "provider": audit.provider,
            "riskLevel": audit.risk_level,
            "reason": audit.reason,
            "generated": audit.generated,
            "imageRiskLevel": media_audit.risk_level,
        },
    }


def publish_service_or_errand(user_id: int, data: dict) -> dict:
    _assert_publish_user(user_id)
    kind = str(data.get("type") or "service").strip()
    if kind not in {"service", "errand"}:
        kind = "service"
    role = user_repository.get_user_role(user_id)
    if kind == "service" and role not in {"provider", "admin"}:
        raise BusinessError("provider role is required before publishing services")
    title = str(data.get("title") or "").strip()
    desc = str(data.get("desc") or data.get("description") or "").strip()
    price = _decimal(data.get("price") or data.get("fee"), "price")
    if not title or not desc:
        raise BusinessError("title and description are required")
    category_id = content_repository.first_active_category_id("errand" if kind == "errand" else "service")
    rule = _load_ai_rule()
    audit = ai_audit(f"type: {kind}\ntitle: {title}\ndescription: {desc}", rule)
    media_audit = image_audit(_image_references(data), rule)
    status = _merge_audit_status(audit, media_audit)
    if kind == "errand":
        if status == "rejected":
            raise BusinessError(audit.reason)
        pickup = data.get("pickupLocation") or data.get("pickup_location") or data.get("location")
        delivery = data.get("deliveryLocation") or data.get("delivery_location")
        if not pickup or not delivery:
            raise BusinessError("pickup and delivery locations are required")
        task_status = "unpaid"
        order_sn = _order_sn("ER")
        created = content_repository.create_errand_with_order_and_audit(
            user_id,
            {
                "title": title,
                "description": desc,
                "pickup_location": pickup,
                "delivery_location": delivery,
                "price": price,
            },
            audit,
            media_audit,
            task_status,
            order_sn,
            load_config().admin_id,
        )
        result = {"id": created["id"], "orderSn": created["orderSn"], "status": task_status}
    else:
        target_id = content_repository.create_service_with_audit(
            user_id,
            {
                "title": title,
                "price": price,
                "description": desc,
                "images": data.get("images") or [],
            },
            audit,
            media_audit,
            status,
            category_id,
        )
        result = {"id": target_id, "status": status}
    result["audit"] = {
        "provider": audit.provider,
        "riskLevel": audit.risk_level,
        "reason": audit.reason,
        "generated": audit.generated,
        "imageRiskLevel": media_audit.risk_level,
    }
    return result


def moderate_message(content: str) -> None:
    audit = ai_audit(content, _load_ai_rule())
    if audit.risk_level == "reject":
        raise BusinessError("消息包含平台禁发内容，请修改后再发送")


def generate_metadata(data: dict, user_id: int | None = None) -> dict:
    text = "\n".join(
        [
            str(data.get("title") or ""),
            str(data.get("desc") or data.get("description") or ""),
            str(data.get("category") or data.get("type") or ""),
        ]
    ).strip()
    if not text:
        raise BusinessError("source text is required")
    metadata = generate_listing_metadata(text)
    rule = _load_ai_rule()
    generated_text = "\n".join(
        [
            str(metadata.get("title") or ""),
            str(metadata.get("description") or ""),
            ",".join([str(tag) for tag in metadata.get("tags") or []]),
        ]
    ).strip() or text
    audit = ai_audit(generated_text, rule)
    metadata["audit"] = {
        "provider": audit.provider,
        "riskLevel": audit.risk_level,
        "reason": audit.reason,
        "requestId": audit.request_id,
    }
    if user_id:
        content_repository.record_draft_audit(int(user_id), audit)
    return metadata
