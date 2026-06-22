from __future__ import annotations

from flask import Blueprint, request

from ..cache import redis_delete_pattern, redis_get_json, redis_set_json
from ..database import DatabaseError
from ..responses import api_error, api_ok
from ..runtime import to_int
from ..security import current_user_id, require_api_auth, request_json
from ..services import catalog_service, order_service, user_service
from ..services.content_service import BusinessError, publish_goods, publish_service_or_errand
from ..services.order_service import OrderError
from ..services.user_service import UserError


bp = Blueprint("catalog", __name__)


def _database_unavailable():
    return api_error("database unavailable; check ADMIN_DB_USER, ADMIN_DB_PASSWORD and MySQL service", 500, 500)


@bp.route("/api/goods/list")
@bp.route("/api/goods")
@bp.route("/v1/api/goods/list")
@bp.route("/v1/api/goods")
def api_goods_list():
    cache_key = "campus_trade:goods:list:on_sale:all:1"
    cached = redis_get_json(cache_key)
    if cached:
        return api_ok(cached)
    try:
        payload = catalog_service.list_public_goods()
    except DatabaseError:
        return _database_unavailable()
    redis_set_json(cache_key, payload, 60)
    return api_ok(payload)


@bp.route("/api/goods/detail")
@bp.route("/api/goods/<int:goods_id>")
@bp.route("/v1/api/goods/detail")
@bp.route("/v1/api/goods/<int:goods_id>")
def api_goods_detail(goods_id: int | None = None):
    goods_id = goods_id or request.args.get("id", type=int)
    cache_key = f"campus_trade:goods:detail:{goods_id}"
    cached = redis_get_json(cache_key)
    if cached:
        return api_ok(cached)
    try:
        item = catalog_service.get_public_goods_detail(goods_id)
    except DatabaseError:
        return _database_unavailable()
    if not item:
        return api_error("商品不存在", 404, 404)
    redis_set_json(cache_key, item, 300)
    return api_ok(item)


@bp.route("/api/goods/favorite", methods=["POST"])
@bp.route("/v1/api/goods/favorite", methods=["POST"])
@require_api_auth
def api_goods_favorite():
    goods_id = to_int(request_json().get("id") or request_json().get("goodsId"))
    try:
        result = user_service.toggle_goods_favorite(current_user_id(), goods_id)
    except UserError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:goods:list:on_sale:*")
    redis_delete_pattern(f"campus_trade:goods:detail:{goods_id}")
    return api_ok(result)


@bp.route("/api/goods/favorites")
@bp.route("/v1/api/goods/favorites")
@require_api_auth
def api_goods_favorites():
    try:
        return api_ok({"list": catalog_service.list_favorite_goods(current_user_id())})
    except DatabaseError:
        return _database_unavailable()


@bp.route("/api/goods/mine")
@bp.route("/v1/api/goods/mine")
@require_api_auth
def api_goods_mine():
    try:
        return api_ok({"list": catalog_service.list_my_goods(current_user_id())})
    except DatabaseError:
        return _database_unavailable()


@bp.route("/api/goods/remove", methods=["POST"])
@bp.route("/v1/api/goods/remove", methods=["POST"])
@require_api_auth
def api_goods_remove():
    goods_id = to_int(request_json().get("id"))
    try:
        result = user_service.update_goods_status(current_user_id(), goods_id, "removed")
    except UserError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:goods:list:on_sale:*")
    redis_delete_pattern(f"campus_trade:goods:detail:{goods_id}")
    return api_ok(result)


@bp.route("/api/goods/relist", methods=["POST"])
@bp.route("/v1/api/goods/relist", methods=["POST"])
@require_api_auth
def api_goods_relist():
    goods_id = to_int(request_json().get("id"))
    try:
        result = user_service.update_goods_status(current_user_id(), goods_id, "on_sale")
    except UserError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:goods:list:on_sale:*")
    redis_delete_pattern(f"campus_trade:goods:detail:{goods_id}")
    return api_ok(result)


@bp.route("/api/goods/<int:goods_id>/status", methods=["PUT"])
@bp.route("/v1/api/goods/<int:goods_id>/status", methods=["PUT"])
@require_api_auth
def api_goods_status(goods_id: int):
    data = request_json()
    status = str(data.get("status") or "").strip()
    if status not in {"on_sale", "removed"}:
        return api_error("invalid goods status", 400, 400)
    try:
        result = user_service.update_goods_status(current_user_id(), goods_id, status)
    except UserError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:goods:list:on_sale:*")
    redis_delete_pattern(f"campus_trade:goods:detail:{goods_id}")
    return api_ok(result)


@bp.route("/api/goods/save", methods=["POST"])
@bp.route("/api/goods/publish", methods=["POST"])
@bp.route("/api/goods", methods=["POST"])
@bp.route("/api/goods/<int:goods_id>", methods=["PUT"])
@bp.route("/v1/api/goods/save", methods=["POST"])
@bp.route("/v1/api/goods/publish", methods=["POST"])
@bp.route("/v1/api/goods", methods=["POST"])
@bp.route("/v1/api/goods/<int:goods_id>", methods=["PUT"])
@require_api_auth
def api_goods_save(goods_id: int | None = None):
    try:
        data = request_json()
        if goods_id:
            data = dict(data)
            data.setdefault("id", goods_id)
        result = publish_goods(current_user_id(), data)
    except BusinessError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:goods:list:on_sale:*")
    return api_ok(result)


@bp.route("/api/goods/<int:goods_id>", methods=["delete"])
@bp.route("/v1/api/goods/<int:goods_id>", methods=["delete"])
@require_api_auth
def api_goods_delete(goods_id: int):
    try:
        result = user_service.update_goods_status(current_user_id(), goods_id, "removed")
    except UserError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:goods:list:on_sale:*")
    redis_delete_pattern(f"campus_trade:goods:detail:{goods_id}")
    return api_ok(result)


@bp.route("/api/service/list")
@bp.route("/api/services")
@bp.route("/v1/api/service/list")
@bp.route("/v1/api/services")
def api_service_list():
    cache_key = "campus_trade:service:list:on_sale:1"
    cached = redis_get_json(cache_key)
    if cached:
        return api_ok(cached)
    try:
        payload = catalog_service.list_public_services()
    except DatabaseError:
        return _database_unavailable()
    redis_set_json(cache_key, payload, 60)
    return api_ok(payload)


@bp.route("/api/errands")
@bp.route("/api/errands/list")
@bp.route("/v1/api/errands")
@bp.route("/v1/api/errands/list")
def api_errand_list():
    cache_key = "campus_trade:errand:list:public:1"
    cached = redis_get_json(cache_key)
    if cached:
        return api_ok(cached)
    try:
        payload = catalog_service.list_public_errands()
    except DatabaseError:
        return _database_unavailable()
    redis_set_json(cache_key, payload, 30)
    return api_ok(payload)


@bp.route("/api/service/detail")
@bp.route("/api/services/<int:service_id>")
@bp.route("/v1/api/service/detail")
@bp.route("/v1/api/services/<int:service_id>")
def api_service_detail(service_id: int | None = None):
    service_id = service_id or request.args.get("id", type=int)
    cache_key = f"campus_trade:service:detail:{service_id}"
    cached = redis_get_json(cache_key)
    if cached:
        return api_ok(cached)
    try:
        item = catalog_service.get_public_service_detail(service_id)
    except DatabaseError:
        return _database_unavailable()
    if not item:
        return api_error("资源不存在", 404, 404)
    redis_set_json(cache_key, item, 300)
    return api_ok(item)


@bp.route("/api/errands/<int:errand_id>")
@bp.route("/api/errands/detail")
@bp.route("/v1/api/errands/<int:errand_id>")
@bp.route("/v1/api/errands/detail")
def api_errand_detail(errand_id: int | None = None):
    errand_id = errand_id or request.args.get("id", type=int)
    cache_key = f"campus_trade:errand:detail:{errand_id}"
    cached = redis_get_json(cache_key)
    if cached:
        return api_ok(cached)
    try:
        item = catalog_service.get_public_errand_detail(errand_id)
    except DatabaseError:
        return _database_unavailable()
    if not item:
        return api_error("跑腿任务不存在", 404, 404)
    redis_set_json(cache_key, item, 120)
    return api_ok(item)


@bp.route("/api/service/save", methods=["POST"])
@bp.route("/api/services/publish", methods=["POST"])
@bp.route("/api/errands/publish", methods=["POST"])
@bp.route("/api/services", methods=["POST"])
@bp.route("/api/errands", methods=["POST"])
@bp.route("/api/service", methods=["POST"])
@bp.route("/v1/api/service/save", methods=["POST"])
@bp.route("/v1/api/services/publish", methods=["POST"])
@bp.route("/v1/api/errands/publish", methods=["POST"])
@bp.route("/v1/api/services", methods=["POST"])
@bp.route("/v1/api/errands", methods=["POST"])
@bp.route("/v1/api/service", methods=["POST"])
@require_api_auth
def api_service_save():
    try:
        result = publish_service_or_errand(current_user_id(), request_json())
    except BusinessError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    redis_delete_pattern("campus_trade:service:list:on_sale:*")
    redis_delete_pattern("campus_trade:service:detail:*")
    redis_delete_pattern("campus_trade:errand:list:*")
    redis_delete_pattern("campus_trade:errand:detail:*")
    return api_ok(result)


@bp.route("/api/service/order", methods=["POST"])
@bp.route("/api/services/orders/create", methods=["POST"])
@bp.route("/api/services/<int:service_id>/orders", methods=["POST"])
@bp.route("/api/service/<int:service_id>/order", methods=["PUT", "POST"])
@bp.route("/v1/api/service/order", methods=["POST"])
@bp.route("/v1/api/services/orders/create", methods=["POST"])
@bp.route("/v1/api/services/<int:service_id>/orders", methods=["POST"])
@bp.route("/v1/api/service/<int:service_id>/order", methods=["PUT", "POST"])
@require_api_auth
def api_service_order(service_id: int | None = None):
    try:
        data = request_json()
        if service_id:
            data = dict(data)
            data.setdefault("serviceId", service_id)
        return api_ok(order_service.create_service_order(current_user_id(), data))
    except OrderError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
