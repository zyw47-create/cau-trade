from __future__ import annotations

from sqlalchemy import and_, desc, select

from models import Category, ErrandOrder, Favorite, Goods, Order, Service, User
from ..database import session_scope


def active_goods_categories() -> list[str]:
    with session_scope() as session:
        rows = session.execute(
            select(Category.name)
            .where(and_(Category.type == "goods", Category.status == "active"))
            .order_by(Category.sort_order, Category.id)
        )
        return [row[0] for row in rows]


def list_public_goods(limit: int = 100) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(
                Goods.id,
                Goods.title,
                Goods.price,
                Goods.condition_level.label("conditionText"),
                Goods.description.label("desc"),
                Goods.location,
                Goods.images,
                Goods.favorite_count,
                Goods.view_count,
                Goods.seller_id,
                User.nickname.label("seller_name"),
                User.username.label("seller_username"),
                User.credit_score.label("creditScore"),
                Category.name.label("category_name"),
            )
            .join(Category, Category.id == Goods.category_id)
            .join(User, User.id == Goods.seller_id)
            .where(and_(Goods.status == "on_sale", Category.status == "active", User.status == "active"))
            .order_by(desc(Goods.created_at), desc(Goods.id))
            .limit(limit)
        )
        return [dict(row._mapping) for row in rows]


def get_public_goods_detail(goods_id: int) -> dict | None:
    with session_scope() as session:
        row = session.execute(
            select(
                Goods.id,
                Goods.title,
                Goods.price,
                Goods.condition_level.label("conditionText"),
                Goods.description.label("desc"),
                Goods.location,
                Goods.images,
                Goods.favorite_count,
                Goods.view_count,
                Goods.seller_id,
                User.nickname.label("seller_name"),
                User.username.label("seller_username"),
                User.credit_score.label("creditScore"),
                Category.name.label("category_name"),
            )
            .join(Category, Category.id == Goods.category_id)
            .join(User, User.id == Goods.seller_id)
            .where(
                and_(
                    Goods.id == goods_id,
                    Goods.status == "on_sale",
                    Category.status == "active",
                    User.status == "active",
                )
            )
            .limit(1)
        ).first()
        return dict(row._mapping) if row else None


def list_favorite_goods(user_id: int) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(
                Goods.id,
                Goods.title,
                Goods.price,
                Goods.condition_level.label("conditionText"),
                Goods.description.label("desc"),
                Goods.location,
                Goods.images,
                Goods.favorite_count,
                Goods.view_count,
                Goods.seller_id,
                User.nickname.label("sellerName"),
                User.username,
                Category.name.label("category"),
            )
            .join(Favorite, and_(Favorite.target_id == Goods.id, Favorite.target_type == "goods"))
            .join(User, User.id == Goods.seller_id)
            .join(Category, Category.id == Goods.category_id)
            .where(and_(Favorite.user_id == user_id, Goods.status != "removed"))
            .order_by(desc(Favorite.created_at))
        )
        return [dict(row._mapping) for row in rows]


def list_my_goods(user_id: int) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(
                Goods.id,
                Goods.title,
                Goods.price,
                Goods.condition_level.label("conditionText"),
                Goods.description.label("desc"),
                Goods.location,
                Goods.images,
                Goods.favorite_count,
                Goods.view_count,
                Goods.status,
                Goods.seller_id,
                Category.name.label("category"),
            )
            .join(Category, Category.id == Goods.category_id)
            .where(Goods.seller_id == user_id)
            .order_by(desc(Goods.created_at))
        )
        return [dict(row._mapping) for row in rows]


def list_public_services(limit: int = 100) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(
                Service.id,
                Service.provider_id,
                Service.title,
                Service.price,
                Service.description.label("desc"),
                Service.images,
                Service.avg_score,
                User.nickname.label("provider_name"),
                User.username.label("provider_username"),
                User.credit_score.label("provider_credit_score"),
                Category.name.label("category_name"),
            )
            .join(Category, Category.id == Service.category_id)
            .join(User, User.id == Service.provider_id)
            .where(and_(Service.status == "on_sale", Category.status == "active", User.status == "active"))
            .order_by(desc(Service.created_at), desc(Service.id))
            .limit(limit)
        )
        return [dict(row._mapping) for row in rows]


def list_public_errands(limit: int = 50) -> list[dict]:
    with session_scope() as session:
        publisher = User.__table__.alias("publisher")
        rider = User.__table__.alias("rider")
        rows = session.execute(
            select(
                ErrandOrder.id,
                ErrandOrder.publisher_id,
                ErrandOrder.title,
                ErrandOrder.description.label("desc"),
                ErrandOrder.pickup_location,
                ErrandOrder.delivery_location,
                ErrandOrder.fee.label("price"),
                ErrandOrder.status,
                ErrandOrder.created_at,
                Order.order_sn,
                Order.status.label("order_status"),
                publisher.c.nickname.label("publisher_name"),
                publisher.c.username.label("publisher_username"),
                rider.c.nickname.label("rider_name"),
                rider.c.username.label("rider_username"),
            )
            .join(publisher, publisher.c.id == ErrandOrder.publisher_id)
            .outerjoin(rider, rider.c.id == ErrandOrder.rider_id)
            .outerjoin(Order, and_(Order.item_type == "errand", Order.item_id == ErrandOrder.id))
            .where(ErrandOrder.status == "waiting_accept")
            .order_by(desc(ErrandOrder.created_at), desc(ErrandOrder.id))
            .limit(limit)
        )
        return [dict(row._mapping) for row in rows]


def get_public_service_detail(service_id: int) -> dict | None:
    with session_scope() as session:
        row = session.execute(
            select(
                Service.id,
                Service.provider_id,
                Service.title,
                Service.price,
                Service.description.label("desc"),
                Service.images,
                Service.avg_score,
                User.nickname.label("provider_name"),
                User.username.label("provider_username"),
                User.credit_score.label("provider_credit_score"),
                Category.name.label("category_name"),
            )
            .join(Category, Category.id == Service.category_id)
            .join(User, User.id == Service.provider_id)
            .where(and_(Service.id == service_id, Service.status == "on_sale", User.status == "active"))
            .limit(1)
        ).first()
        return dict(row._mapping) if row else None


def get_public_errand_detail(service_id: int) -> dict | None:
    with session_scope() as session:
        publisher = User.__table__.alias("publisher")
        row = session.execute(
            select(
                ErrandOrder.id,
                ErrandOrder.publisher_id,
                ErrandOrder.title,
                ErrandOrder.description.label("desc"),
                ErrandOrder.pickup_location,
                ErrandOrder.delivery_location,
                ErrandOrder.fee.label("price"),
                ErrandOrder.status,
                ErrandOrder.created_at,
                Order.order_sn,
                Order.status.label("order_status"),
                publisher.c.nickname.label("publisher_name"),
                publisher.c.username.label("publisher_username"),
            )
            .join(publisher, publisher.c.id == ErrandOrder.publisher_id)
            .outerjoin(Order, and_(Order.item_type == "errand", Order.item_id == ErrandOrder.id))
            .where(ErrandOrder.id == service_id)
            .limit(1)
        ).first()
        return dict(row._mapping) if row else None
