from __future__ import annotations

from flask import Blueprint, request

from ..cache import redis_delete_pattern
from ..database import DatabaseError
from ..responses import api_error, api_ok
from ..runtime import to_int
from ..security import current_user_id, require_api_auth, request_json
from ..services import order_query_service, order_service, user_service
from ..services.order_service import OrderError
from ..services.user_service import UserError


bp = Blueprint("orders", __name__)


@bp.route("/api/order/list")
@bp.route("/api/orders/list")
@bp.route("/api/orders")
@bp.route("/api/order/seller/list")
@bp.route("/v1/api/order/list")
@bp.route("/v1/api/orders/list")
@bp.route("/v1/api/orders")
@bp.route("/v1/api/order/seller/list")
@require_api_auth
def api_order_list():
    return api_ok({"list": order_query_service.list_orders_for_user(current_user_id())})


@bp.route("/api/order/detail")
@bp.route("/api/orders/detail")
@bp.route("/api/orders/<path:order_sn>")
@bp.route("/v1/api/order/detail")
@bp.route("/v1/api/orders/detail")
@bp.route("/v1/api/orders/<path:order_sn>")
@require_api_auth
def api_order_detail(order_sn: str | None = None):
    order_sn = order_sn or request.args.get("orderSn", "")
    try:
        order = order_query_service.get_order_detail_for_user(current_user_id(), order_sn)
    except PermissionError:
        return api_error("无权访问该订单", 403, 403)
    if not order:
        return api_error("订单不存在", 404, 404)
    return api_ok(order)


@bp.route("/api/order/create", methods=["POST"])
@bp.route("/api/orders/create", methods=["POST"])
@bp.route("/api/orders", methods=["POST"])
@bp.route("/api/order", methods=["POST"])
@bp.route("/v1/api/order/create", methods=["POST"])
@bp.route("/v1/api/orders/create", methods=["POST"])
@bp.route("/v1/api/orders", methods=["POST"])
@bp.route("/v1/api/order", methods=["POST"])
@require_api_auth
def api_order_create():
    try:
        return api_ok(order_service.create_goods_order(current_user_id(), request_json()))
    except OrderError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)


@bp.route("/api/order/pay", methods=["POST"])
@bp.route("/api/orders/<path:order_sn>/pay", methods=["POST"])
@bp.route("/v1/api/order/pay", methods=["POST"])
@bp.route("/v1/api/orders/<path:order_sn>/pay", methods=["POST"])
@require_api_auth
def api_order_pay(order_sn: str | None = None):
    try:
        data = request_json()
        if order_sn:
            data = dict(data)
            data.setdefault("orderSn", order_sn)
        result = order_service.pay_order(current_user_id(), data)
        redis_delete_pattern("campus_trade:service:list:on_sale:*")
        redis_delete_pattern("campus_trade:service:detail:*")
        redis_delete_pattern("campus_trade:errand:list:*")
        redis_delete_pattern("campus_trade:errand:detail:*")
        return api_ok(result)
    except OrderError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)


@bp.route("/api/order/cancel", methods=["POST"])
@bp.route("/api/orders/<path:order_sn>/cancel", methods=["POST"])
@bp.route("/v1/api/order/cancel", methods=["POST"])
@bp.route("/v1/api/orders/<path:order_sn>/cancel", methods=["POST"])
@require_api_auth
def api_order_cancel(order_sn: str | None = None):
    try:
        data = request_json()
        if order_sn:
            data = dict(data)
            data.setdefault("orderSn", order_sn)
        result = order_service.cancel_order(current_user_id(), data)
        redis_delete_pattern("campus_trade:service:list:on_sale:*")
        redis_delete_pattern("campus_trade:service:detail:*")
        redis_delete_pattern("campus_trade:errand:list:*")
        redis_delete_pattern("campus_trade:errand:detail:*")
        return api_ok(result)
    except OrderError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)


@bp.route("/api/order/receive", methods=["POST"])
@bp.route("/api/orders/confirm", methods=["POST"])
@bp.route("/api/order/<path:order_sn>/receive", methods=["PUT", "POST"])
@bp.route("/api/orders/<path:order_sn>/receive", methods=["PUT", "POST"])
@bp.route("/v1/api/order/receive", methods=["POST"])
@bp.route("/v1/api/orders/confirm", methods=["POST"])
@bp.route("/v1/api/order/<path:order_sn>/receive", methods=["PUT", "POST"])
@bp.route("/v1/api/orders/<path:order_sn>/receive", methods=["PUT", "POST"])
@require_api_auth
def api_order_receive(order_sn: str | None = None):
    try:
        data = request_json()
        if order_sn:
            data = dict(data)
            data.setdefault("orderSn", order_sn)
        result = order_service.receive_order(current_user_id(), data)
        redis_delete_pattern("campus_trade:service:list:on_sale:*")
        redis_delete_pattern("campus_trade:service:detail:*")
        redis_delete_pattern("campus_trade:errand:list:*")
        redis_delete_pattern("campus_trade:errand:detail:*")
        return api_ok(result)
    except OrderError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)


@bp.route("/api/order/refund", methods=["POST"])
@bp.route("/api/order/<path:order_sn>/refund", methods=["POST"])
@bp.route("/api/orders/<path:order_sn>/refunds", methods=["POST"])
@bp.route("/v1/api/order/refund", methods=["POST"])
@bp.route("/v1/api/order/<path:order_sn>/refund", methods=["POST"])
@bp.route("/v1/api/orders/<path:order_sn>/refunds", methods=["POST"])
@require_api_auth
def api_order_refund(order_sn: str | None = None):
    try:
        data = request_json()
        if order_sn:
            data = dict(data)
            data.setdefault("orderSn", order_sn)
        return api_ok(order_service.refund_order(current_user_id(), data))
    except OrderError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)


@bp.route("/api/order/confirm", methods=["POST"])
@bp.route("/api/order/<path:order_sn>/confirm", methods=["PUT", "POST"])
@bp.route("/api/orders/<path:order_sn>/confirm", methods=["PUT", "POST"])
@bp.route("/v1/api/order/confirm", methods=["POST"])
@bp.route("/v1/api/order/<path:order_sn>/confirm", methods=["PUT", "POST"])
@bp.route("/v1/api/orders/<path:order_sn>/confirm", methods=["PUT", "POST"])
@require_api_auth
def api_order_confirm(order_sn: str | None = None):
    try:
        data = request_json()
        if order_sn:
            data = dict(data)
            data.setdefault("orderSn", order_sn)
        result = order_service.confirm_order(current_user_id(), data)
        redis_delete_pattern("campus_trade:service:list:on_sale:*")
        redis_delete_pattern("campus_trade:service:detail:*")
        redis_delete_pattern("campus_trade:errand:list:*")
        redis_delete_pattern("campus_trade:errand:detail:*")
        return api_ok(result)
    except OrderError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)


@bp.route("/api/order/ship", methods=["POST"])
@bp.route("/api/order/<path:order_sn>/ship", methods=["PUT", "POST"])
@bp.route("/api/orders/<path:order_sn>/ship", methods=["PUT", "POST"])
@bp.route("/v1/api/order/ship", methods=["POST"])
@bp.route("/v1/api/order/<path:order_sn>/ship", methods=["PUT", "POST"])
@bp.route("/v1/api/orders/<path:order_sn>/ship", methods=["PUT", "POST"])
@require_api_auth
def api_order_ship(order_sn: str | None = None):
    try:
        data = request_json()
        if order_sn:
            data = dict(data)
            data.setdefault("orderSn", order_sn)
        result = order_service.ship_order(current_user_id(), data)
        redis_delete_pattern("campus_trade:service:list:on_sale:*")
        redis_delete_pattern("campus_trade:service:detail:*")
        redis_delete_pattern("campus_trade:errand:list:*")
        redis_delete_pattern("campus_trade:errand:detail:*")
        return api_ok(result)
    except OrderError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)


@bp.route("/api/order/complaint", methods=["POST"])
@bp.route("/api/order/<path:order_sn>/dispute", methods=["POST"])
@bp.route("/api/orders/<path:order_sn>/complaints", methods=["POST"])
@bp.route("/v1/api/order/complaint", methods=["POST"])
@bp.route("/v1/api/order/<path:order_sn>/dispute", methods=["POST"])
@bp.route("/v1/api/orders/<path:order_sn>/complaints", methods=["POST"])
@require_api_auth
def api_order_complaint(order_sn: str | None = None):
    try:
        data = request_json()
        if order_sn:
            data = dict(data)
            data.setdefault("orderSn", order_sn)
        result = order_service.complaint_order(current_user_id(), data)
    except OrderError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:service:list:on_sale:*")
    redis_delete_pattern("campus_trade:service:detail:*")
    redis_delete_pattern("campus_trade:errand:list:*")
    redis_delete_pattern("campus_trade:errand:detail:*")
    return api_ok(result)


@bp.route("/api/comment", methods=["POST"])
@bp.route("/v1/api/comment", methods=["POST"])
@require_api_auth
def api_comment():
    try:
        result = user_service.create_comment(current_user_id(), request_json())
    except UserError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:service:list:on_sale:*")
    redis_delete_pattern("campus_trade:service:detail:*")
    redis_delete_pattern("campus_trade:errand:list:*")
    redis_delete_pattern("campus_trade:errand:detail:*")
    return api_ok(result)


@bp.route("/api/rider/take", methods=["POST"])
@bp.route("/api/errands/accept", methods=["POST"])
@bp.route("/api/errands/<int:errand_id>/accept", methods=["POST"])
@bp.route("/api/rider/order/<int:errand_id>/accept", methods=["POST"])
@bp.route("/v1/api/rider/take", methods=["POST"])
@bp.route("/v1/api/errands/accept", methods=["POST"])
@bp.route("/v1/api/errands/<int:errand_id>/accept", methods=["POST"])
@bp.route("/v1/api/rider/order/<int:errand_id>/accept", methods=["POST"])
@require_api_auth
def api_rider_take(errand_id: int | None = None):
    try:
        data = request_json()
        if errand_id:
            data = dict(data)
            data.setdefault("errandId", errand_id)
        result = order_service.take_errand(current_user_id(), data)
    except OrderError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    return api_ok(result)


@bp.route("/api/rider/status", methods=["POST"])
@bp.route("/api/errands/<int:errand_id>/status", methods=["PUT", "POST"])
@bp.route("/api/rider/order/<int:errand_id>/status", methods=["PUT", "POST"])
@bp.route("/v1/api/rider/status", methods=["POST"])
@bp.route("/v1/api/errands/<int:errand_id>/status", methods=["PUT", "POST"])
@bp.route("/v1/api/rider/order/<int:errand_id>/status", methods=["PUT", "POST"])
@require_api_auth
def api_rider_status(errand_id: int | None = None):
    try:
        data = request_json()
        if errand_id:
            data = dict(data)
            data.setdefault("errandId", errand_id)
        result = order_service.update_errand_status(current_user_id(), data)
    except OrderError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    result["statusText"] = order_query_service.errand_status_text(result["status"])
    return api_ok(result)
