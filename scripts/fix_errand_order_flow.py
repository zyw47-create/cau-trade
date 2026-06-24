from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ADMIN_WEB_DIR = PROJECT_ROOT / "admin_web"
if str(ADMIN_WEB_DIR) not in sys.path:
    sys.path.insert(0, str(ADMIN_WEB_DIR))

from campus_trade.config import load_config
from campus_trade.database import configure_database, session_scope
from models import ErrandOrder, Order, OrderEvent, OrderFund, User
from sqlalchemy import desc, select


def now_sn(now: datetime, errand_id: int) -> str:
    return f"ER{now.strftime('%Y%m%d%H%M%S%f')}{errand_id:04d}"


def snapshot(errand: ErrandOrder) -> dict:
    return {
        "title": errand.title,
        "price": str(errand.fee),
        "pickup_location": errand.pickup_location,
        "delivery_location": errand.delivery_location,
    }


def platform_user_id(session, preferred_id: int, publisher_id: int) -> int:
    user = session.get(User, preferred_id)
    if user and int(user.id) != int(publisher_id):
        return int(user.id)
    fallback = session.execute(
        select(User.id)
        .where(User.id != publisher_id)
        .order_by(User.id)
        .limit(1)
    ).scalar_one_or_none()
    if fallback is None:
        raise RuntimeError("no platform placeholder user is available")
    return int(fallback)


def desired_order_status(errand: ErrandOrder) -> str:
    if errand.status == "unpaid":
        return "unpaid"
    if errand.status == "waiting_accept":
        return "paid"
    if errand.status == "accepted":
        return "confirmed"
    if errand.status in {"processing", "completed"}:
        return "shipped"
    if errand.status == "confirmed":
        return "completed"
    return "unpaid"


def ensure_fund(session, order: Order, status: str, now: datetime) -> None:
    if status == "unpaid":
        return
    fund = session.execute(
        select(OrderFund)
        .where(OrderFund.order_sn == order.order_sn)
        .with_for_update()
        .limit(1)
    ).scalar_one_or_none()
    if not fund:
        fund = OrderFund(
            order_sn=order.order_sn,
            amount=order.amount,
            status="settled" if status == "completed" else "frozen",
            frozen_at=order.paid_at or now,
            settled_at=now if status == "completed" else None,
            created_at=now,
            updated_at=now,
        )
        session.add(fund)
        return
    fund.amount = order.amount
    if status == "completed":
        fund.status = "settled"
        fund.settled_at = fund.settled_at or now
    elif fund.status in {"none", "refunded"}:
        fund.status = "frozen"
    fund.frozen_at = fund.frozen_at or order.paid_at or now
    fund.updated_at = now


def add_event(session, order_sn: str, from_status: str | None, to_status: str, operator_id: int, event_type: str, note: str, now: datetime) -> None:
    exists = session.execute(
        select(OrderEvent.id)
        .where(
            OrderEvent.order_sn == order_sn,
            OrderEvent.event_type == event_type,
            OrderEvent.to_status == to_status,
        )
        .limit(1)
    ).first()
    if exists:
        return
    session.add(
        OrderEvent(
            order_sn=order_sn,
            from_status=from_status,
            to_status=to_status,
            operator_id=operator_id,
            event_type=event_type,
            note=note,
            created_at=now,
        )
    )


def normalize_errand_order(session, errand: ErrandOrder, admin_id: int, now: datetime) -> bool:
    order = session.execute(
        select(Order)
        .where(Order.item_type == "errand", Order.item_id == errand.id)
        .order_by(desc(Order.created_at))
        .with_for_update()
        .limit(1)
    ).scalar_one_or_none()
    changed = False
    platform_id = platform_user_id(session, admin_id, int(errand.publisher_id))
    if order and errand.status == "waiting_accept" and order.status in {"confirmed", "shipped"}:
        errand.rider_id = order.seller_id
        errand.status = "accepted" if order.status == "confirmed" else "processing"
        errand.accepted_at = errand.accepted_at or order.paid_at or order.created_at
        errand.updated_at = now
        changed = True
    target_status = desired_order_status(errand)
    seller_id = int(errand.rider_id) if errand.rider_id else platform_id
    if not order:
        order = Order(
            order_sn=now_sn(now, int(errand.id)),
            buyer_id=errand.publisher_id,
            seller_id=seller_id,
            item_type="errand",
            item_id=errand.id,
            item_snapshot=snapshot(errand),
            amount=errand.fee,
            status=target_status,
            remark=(errand.description or "")[:255],
            paid_at=now if target_status != "unpaid" else None,
            completed_at=now if target_status == "completed" else None,
            lock_version=0,
            created_at=errand.created_at or now,
            updated_at=now,
        )
        session.add(order)
        add_event(session, order.order_sn, None, "unpaid", int(errand.publisher_id), "errand_publish", "legacy errand payment order created", now)
        if target_status != "unpaid":
            add_event(session, order.order_sn, "unpaid", "paid", int(errand.publisher_id), "pay", "errand fee escrow restored for legacy data", now)
        changed = True
    if int(order.buyer_id) != int(errand.publisher_id):
        order.buyer_id = errand.publisher_id
        changed = True
    if int(order.seller_id) != seller_id:
        order.seller_id = seller_id
        changed = True
    if order.item_snapshot != snapshot(errand):
        order.item_snapshot = snapshot(errand)
        changed = True
    if order.amount != errand.fee:
        order.amount = errand.fee
        changed = True
    if order.status != target_status:
        previous = order.status
        order.status = target_status
        add_event(session, order.order_sn, previous, target_status, seller_id, "errand_flow_fix", "normalized errand order workflow", now)
        changed = True
    if target_status != "unpaid" and not order.paid_at:
        order.paid_at = errand.accepted_at or errand.created_at or now
        changed = True
    if target_status == "completed" and not order.completed_at:
        order.completed_at = errand.completed_at or now
        changed = True
    if changed:
        order.updated_at = now
    ensure_fund(session, order, target_status, now)
    return changed


def main() -> None:
    config = load_config()
    configure_database(config)
    now = datetime.now()
    with session_scope() as session:
        rows = session.execute(
            select(ErrandOrder)
            .order_by(ErrandOrder.id)
            .with_for_update()
        ).scalars().all()
        changed = sum(1 for errand in rows if normalize_errand_order(session, errand, config.admin_id, now))
    print(f"normalized {changed} errand rows")


if __name__ == "__main__":
    main()
