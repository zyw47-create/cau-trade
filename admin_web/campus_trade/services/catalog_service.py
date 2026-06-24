from __future__ import annotations

import os

from ..repositories import catalog as catalog_repository
from ..serialization import parse_json_field, row_to_api
from .order_query_service import errand_status_text


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


def _decorate_goods(row: dict, favorite: bool = False) -> dict:
    item = row_to_api(row)
    images = asset_urls(parse_json_field(row.get("images"), []))
    item["price"] = float(row["price"])
    item["images"] = images
    item["image"] = images[0] if images else ""
    item["condition"] = row.get("conditionText") or row.get("condition_level") or ""
    item["category"] = row.get("category_name") or row.get("category") or ""
    item["sellerId"] = row.get("seller_id")
    item["sellerName"] = row.get("seller_name") or row.get("sellerName")
    item["username"] = row.get("seller_username") or row.get("username")
    item["favoriteCount"] = row.get("favorite_count") or 0
    item["viewCount"] = row.get("view_count") or 0
    item["favorite"] = favorite
    item.setdefault("status", row.get("status") or "on_sale")
    item["verified"] = True
    item["seller"] = {
        "id": row.get("seller_id"),
        "nickname": row.get("seller_name") or row.get("sellerName"),
        "username": row.get("seller_username") or row.get("username"),
        "creditScore": row.get("creditScore") or row.get("seller_credit_score"),
    }
    return item


def list_public_goods() -> dict:
    return {
        "list": [_decorate_goods(row) for row in catalog_repository.list_public_goods()],
        "categories": catalog_repository.active_goods_categories(),
    }


def get_public_goods_detail(goods_id: int) -> dict | None:
    row = catalog_repository.get_public_goods_detail(goods_id)
    return _decorate_goods(row) if row else None


def list_favorite_goods(user_id: int) -> list[dict]:
    return [_decorate_goods(row, favorite=True) for row in catalog_repository.list_favorite_goods(user_id)]


def list_my_goods(user_id: int) -> list[dict]:
    return [_decorate_goods(row) for row in catalog_repository.list_my_goods(user_id)]


def _decorate_service(row: dict) -> dict:
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
    return item


def _decorate_errand(row: dict, include_owner: bool = False) -> dict:
    item = row_to_api(row)
    item["type"] = "errand"
    item["price"] = float(row["price"])
    item["provider"] = row.get("publisher_name") or "发布者"
    item["username"] = row.get("publisher_username") or "user"
    item["providerId"] = row.get("publisher_id")
    item["publisherId"] = row.get("publisher_id")
    item["publisherName"] = row.get("publisher_name") or "发布者"
    item["publisherUsername"] = row.get("publisher_username") or "user"
    item["pickupLocation"] = row.get("pickup_location")
    item["deliveryLocation"] = row.get("delivery_location")
    item["location"] = " -> ".join(
        [value for value in [row.get("pickup_location"), row.get("delivery_location")] if value]
    )
    item["images"] = []
    item["image"] = ""
    item["statusText"] = errand_status_text(row.get("status"))
    item["orderSn"] = row.get("order_sn") or ""
    item["orderStatus"] = row.get("order_status") or ""
    item["riderName"] = row.get("rider_name") or ""
    item["riderUsername"] = row.get("rider_username") or ""
    if include_owner:
        item["owner"] = {
            "id": row.get("publisher_id"),
            "nickname": row.get("publisher_name"),
            "username": row.get("publisher_username"),
            "role": "user",
            "creditScore": 100,
            "reviewCount": 0,
            "completedCount": 0,
            "goodRate": 100,
            "verified": True,
        }
    return item


def list_public_services() -> dict:
    rows = catalog_repository.list_public_services()
    return {"list": [_decorate_service(row) for row in rows]}


def list_public_errands() -> dict:
    rows = catalog_repository.list_public_errands()
    return {"list": [_decorate_errand(row) for row in rows]}


def get_public_service_detail(service_id: int) -> dict | None:
    row = catalog_repository.get_public_service_detail(service_id)
    if row:
        item = _decorate_service(row)
        item["owner"] = item["providerInfo"]
        return item
    return None


def get_public_errand_detail(errand_id: int) -> dict | None:
    errand = catalog_repository.get_public_errand_detail(errand_id)
    return _decorate_errand(errand, include_owner=True) if errand else None
