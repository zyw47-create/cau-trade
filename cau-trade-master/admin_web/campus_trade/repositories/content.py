from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import and_, select

from models import AiAuditRecord, AiRule, Category, ErrandEvent, ErrandOrder, Goods, Order, OrderEvent, Service, User
from ..database import session_scope


DEFAULT_RULE = {
    "manual_risk_level": "manual",
    "keywords": "",
    "text_audit_enabled": 1,
    "image_audit_enabled": 1,
}


def _now() -> datetime:
    return datetime.now()


def assert_publish_user(user_id: int) -> dict | None:
    with session_scope() as session:
        user = session.get(User, user_id)
        if not user:
            return None
        return {
            "id": user.id,
            "status": user.status,
            "is_verified": user.is_verified,
            "role": user.role,
        }


def load_default_ai_rule() -> dict:
    with session_scope() as session:
        rule = session.execute(
            select(AiRule).where(AiRule.rule_name == "default_publish_audit").limit(1)
        ).scalar_one_or_none()
        if not rule:
            return dict(DEFAULT_RULE)
        return {
            "id": rule.id,
            "rule_name": rule.rule_name,
            "text_audit_enabled": rule.text_audit_enabled,
            "image_audit_enabled": rule.image_audit_enabled,
            "manual_risk_level": rule.manual_risk_level,
            "keywords": rule.keywords,
            "updated_at": rule.updated_at,
        }


def first_active_category_id(category_type: str) -> int:
    with session_scope() as session:
        category = session.execute(
            select(Category)
            .where(and_(Category.type == category_type, Category.status == "active"))
            .order_by(Category.sort_order, Category.id)
            .limit(1)
        ).scalar_one_or_none()
        return int(category.id) if category else 1


def create_goods_with_audit(user_id: int, data: dict, audit, media_audit, status: str, category_id: int) -> int:
    with session_scope() as session:
        now = _now()
        goods = Goods(
            seller_id=user_id,
            category_id=category_id,
            title=data["title"],
            price=data["price"],
            condition_level=data["condition_level"],
            description=data["description"],
            images=data["images"],
            location=data["location"],
            status=status,
            audit_note=audit.reason,
            is_ai_generated=1 if audit.generated else 0,
            favorite_count=0,
            view_count=0,
            created_at=now,
            updated_at=now,
        )
        session.add(goods)
        session.flush()
        session.add(_audit_record("goods", goods.id, "text_audit", audit, now))
        if data["images"]:
            session.add(_audit_record("goods", goods.id, "image_audit", media_audit, now))
        return int(goods.id)


def create_service_with_audit(user_id: int, data: dict, audit, media_audit, status: str, category_id: int) -> int:
    with session_scope() as session:
        now = _now()
        service = Service(
            provider_id=user_id,
            category_id=category_id,
            title=data["title"],
            price=data["price"],
            description=data["description"],
            images=data["images"],
            status=status,
            avg_score=Decimal("5.00"),
            created_at=now,
            updated_at=now,
        )
        session.add(service)
        session.flush()
        session.add(_audit_record("service", service.id, "text_audit", audit, now))
        if data["images"]:
            session.add(_audit_record("service", service.id, "image_audit", media_audit, now))
        return int(service.id)


def create_errand_with_audit(user_id: int, data: dict, audit, media_audit, status: str) -> int:
    with session_scope() as session:
        now = _now()
        errand = ErrandOrder(
            publisher_id=user_id,
            title=data["title"],
            description=data["description"],
            pickup_location=data["pickup_location"],
            delivery_location=data["delivery_location"],
            fee=data["price"],
            status=status,
            created_at=now,
            updated_at=now,
        )
        session.add(errand)
        session.flush()
        session.add(_audit_record("service", errand.id, "text_audit", audit, now))
        if data.get("images"):
            session.add(_audit_record("service", errand.id, "image_audit", media_audit, now))
        return int(errand.id)


def create_errand_with_order_and_audit(
    user_id: int,
    data: dict,
    audit,
    media_audit,
    status: str,
    order_sn: str,
    platform_user_id: int,
) -> dict:
    with session_scope() as session:
        now = _now()
        platform_user = _platform_user(session, platform_user_id, user_id)
        if not platform_user:
            raise ValueError("platform settlement user not found")
        errand = ErrandOrder(
            publisher_id=user_id,
            title=data["title"],
            description=data["description"],
            pickup_location=data["pickup_location"],
            delivery_location=data["delivery_location"],
            fee=data["price"],
            status=status,
            created_at=now,
            updated_at=now,
        )
        session.add(errand)
        session.flush()
        session.add(
            Order(
                order_sn=order_sn,
                buyer_id=user_id,
                seller_id=platform_user.id,
                item_type="errand",
                item_id=errand.id,
                item_snapshot={
                    "title": errand.title,
                    "price": str(errand.fee),
                    "pickup_location": errand.pickup_location,
                    "delivery_location": errand.delivery_location,
                },
                amount=errand.fee,
                status="unpaid",
                remark=(errand.description or "")[:255],
                lock_version=0,
                created_at=now,
                updated_at=now,
            )
        )
        session.add(
            OrderEvent(
                order_sn=order_sn,
                from_status=None,
                to_status="unpaid",
                operator_id=user_id,
                event_type="errand_publish",
                note="发布跑腿任务，等待发布者支付托管费用",
                created_at=now,
            )
        )
        session.add(
            ErrandEvent(
                errand_id=errand.id,
                operator_id=user_id,
                event_type="publish",
                from_status=None,
                to_status=status,
                remark="publisher created errand and pending payment order",
                created_at=now,
            )
        )
        session.add(_audit_record("service", errand.id, "text_audit", audit, now))
        if data.get("images"):
            session.add(_audit_record("service", errand.id, "image_audit", media_audit, now))
        return {"id": int(errand.id), "orderSn": order_sn}


def record_draft_audit(user_id: int, audit) -> None:
    with session_scope() as session:
        now = _now()
        for audit_type in ("generate_title", "generate_desc", "recommend_tags"):
            session.add(_audit_record("draft", int(user_id), audit_type, audit, now))


def _audit_record(target_type: str, target_id: int, audit_type: str, result, created_at: datetime) -> AiAuditRecord:
    return AiAuditRecord(
        target_type=target_type,
        target_id=target_id,
        audit_type=audit_type,
        provider=result.provider,
        request_id=result.request_id,
        risk_level=result.risk_level,
        reason=result.reason[:255],
        raw_result=result.raw_result,
        created_at=created_at,
        )


def _platform_user(session, preferred_id: int, publisher_id: int) -> User | None:
    user = session.get(User, preferred_id)
    if user and int(user.id) != int(publisher_id):
        return user
    return session.execute(
        select(User)
        .where(User.id != publisher_id)
        .order_by(User.id)
        .limit(1)
    ).scalar_one_or_none()
