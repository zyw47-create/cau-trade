from __future__ import annotations

import json
from datetime import datetime

from ..cache import redis_lock, redis_unlock
from ..repositories import orders as order_repository
from ..repositories import users as user_repository
from . import user_service


class OrderError(ValueError):
    pass


def _order_sn(prefix: str) -> str:
    return prefix + datetime.now().strftime("%Y%m%d%H%M%S%f")


def _to_int(value, default: int = 0) -> int:
    try:
        return int(value or default)
    except (TypeError, ValueError):
        return default


def _require_order_sn(data: dict) -> str:
    order_sn = str(data.get("orderSn") or "").strip()
    if not order_sn:
        raise OrderError("missing orderSn")
    return order_sn


def _repo_call(action, *args, **kwargs):
    try:
        return action(*args, **kwargs)
    except ValueError as exc:
        raise OrderError(str(exc)) from exc


def create_goods_order(user_id: int, data: dict) -> dict:
    goods_id = _to_int(data.get("goodsId") or data.get("id"))
    if goods_id <= 0:
        raise OrderError("missing goodsId")
    goods = order_repository.goods_order_candidate(goods_id)
    if not goods:
        raise OrderError("goods not found")
    if goods.get("status") != "on_sale":
        raise OrderError("goods is not available for order")
    if int(goods["seller_id"]) == user_id:
        raise OrderError("buyer cannot buy own goods")
    lock_key = f"campus_trade:lock:goods:order:{goods_id}"
    if not redis_lock(lock_key, 8):
        raise OrderError("goods is being ordered, please retry later")
    order_sn = _order_sn("CT")
    try:
        _repo_call(order_repository.create_goods_order, order_sn, user_id, goods_id, str(data.get("remark") or "").strip())
    finally:
        redis_unlock(lock_key)
    return {"orderSn": order_sn, "status": "unpaid"}


def create_service_order(user_id: int, data: dict) -> dict:
    service_id = _to_int(data.get("id") or data.get("serviceId"))
    if service_id <= 0:
        raise OrderError("missing serviceId")
    service = order_repository.service_order_candidate(service_id)
    if not service:
        raise OrderError("service not found")
    if service.get("status") != "on_sale":
        raise OrderError("service is not available for order")
    if int(service["provider_id"]) == user_id:
        raise OrderError("buyer cannot order own service")
    lock_key = f"campus_trade:lock:service:order:{service_id}:{user_id}"
    if not redis_lock(lock_key, 8):
        raise OrderError("service order is processing, please retry later")
    order_sn = _order_sn("SV")
    try:
        _repo_call(order_repository.create_service_order, order_sn, user_id, service_id, str(data.get("remark") or ""))
    finally:
        redis_unlock(lock_key)
    return {"orderSn": order_sn, "status": "unpaid"}


def pay_order(user_id: int, data: dict) -> dict:
    order_sn = _require_order_sn(data)
    _repo_call(order_repository.pay_order, order_sn, user_id)
    return {"orderSn": order_sn, "status": "paid"}


def cancel_order(user_id: int, data: dict) -> dict:
    order_sn = _require_order_sn(data)
    _repo_call(order_repository.cancel_order, order_sn, user_id, data.get("reason") or "user cancelled order")
    return {"orderSn": order_sn, "status": "cancelled"}


def receive_order(user_id: int, data: dict) -> dict:
    order_sn = _require_order_sn(data)
    _repo_call(order_repository.receive_order, order_sn, user_id)
    return {"orderSn": order_sn, "status": "completed"}


def refund_order(user_id: int, data: dict) -> dict:
    order_sn = _require_order_sn(data)
    reason = str(data.get("reason") or "").strip() or "user requested refund"
    _repo_call(order_repository.apply_refund, order_sn, user_id, reason, json.dumps(data.get("evidenceUrls") or [], ensure_ascii=False))
    return {"orderSn": order_sn, "status": "refunding"}


def confirm_order(user_id: int, data: dict) -> dict:
    order_sn = _require_order_sn(data)
    result = order_repository.confirm_order_by_seller(order_sn, user_id)
    if not result:
        raise OrderError("order not found")
    if result.get("error") == "not_seller":
        raise OrderError("only seller can confirm the order")
    if result.get("error") == "bad_status":
        raise OrderError("order status cannot be confirmed")
    if result.get("error") == "changed":
        raise OrderError("order state changed, please refresh")
    return {"orderSn": order_sn, "status": "confirmed"}


def ship_order(user_id: int, data: dict) -> dict:
    order_sn = _require_order_sn(data)
    _repo_call(order_repository.ship_order, order_sn, user_id)
    return {"orderSn": order_sn, "status": "shipped"}


def complaint_order(user_id: int, data: dict) -> dict:
    order_sn = _require_order_sn(data)
    content = str(data.get("content") or data.get("reason") or "").strip()
    if not content:
        raise OrderError("complaint content is required")
    result = order_repository.complaint_order(order_sn, user_id, content)
    if not result:
        raise OrderError("order not found")
    if result.get("error") == "not_participant":
        raise OrderError("only order participants can complain")
    if result.get("error") == "closed_after_sale":
        raise OrderError("after-sale or complaint has already been resolved")
    if result.get("error") == "bad_status":
        raise OrderError("order status cannot be complained")
    return result


def take_errand(user_id: int, data: dict) -> dict:
    if user_repository.get_user_role(user_id) not in {"rider", "admin"}:
        raise OrderError("rider role is required before taking errands")
    if not user_service.is_trusted_for_business(user_id):
        raise OrderError("credit score is below 60; taking errands is temporarily restricted")
    errand_id = _to_int(data.get("id") or data.get("errandId"))
    if errand_id <= 0:
        raise OrderError("missing errandId")
    owner = order_repository.errand_candidate(errand_id)
    if not owner:
        raise OrderError("errand not found")
    if owner.get("status") != "waiting_accept":
        raise OrderError("errand is not available")
    if int(owner["publisher_id"]) == user_id:
        raise OrderError("publisher cannot take own errand")
    lock_key = f"campus_trade:lock:errand:take:{errand_id}"
    if not redis_lock(lock_key, 8):
        raise OrderError("errand is being taken, please retry later")
    try:
        result = _repo_call(order_repository.take_errand_order, errand_id, user_id)
    finally:
        redis_unlock(lock_key)
    return {"id": errand_id, "status": "accepted", "orderSn": result.get("orderSn"), "orderStatus": result.get("status")}


def update_errand_status(user_id: int, data: dict) -> dict:
    if user_repository.get_user_role(user_id) not in {"rider", "admin"}:
        raise OrderError("rider role is required before updating errand progress")
    errand_id = _to_int(data.get("id") or data.get("errandId"))
    new_status = str(data.get("status") or "").strip()
    allowed = {
        "accepted": {"processing", "cancelled"},
        "processing": {"completed"},
        "completed": {"confirmed"},
    }
    if errand_id <= 0 or not new_status:
        raise OrderError("missing errandId or status")
    result = order_repository.update_errand_status(errand_id, user_id, new_status, allowed)
    if not result:
        raise OrderError("errand not found")
    if result.get("error") == "bad_transition":
        raise OrderError("errand status transition is invalid")
    if result.get("error") == "not_rider":
        raise OrderError("only rider can update delivery progress")
    if result.get("error") == "not_publisher":
        raise OrderError("only publisher can confirm completion")
    payload = {"id": errand_id, "status": new_status}
    if result.get("orderSn"):
        payload["orderSn"] = result["orderSn"]
    if result.get("orderStatus"):
        payload["orderStatus"] = result["orderStatus"]
    return payload
