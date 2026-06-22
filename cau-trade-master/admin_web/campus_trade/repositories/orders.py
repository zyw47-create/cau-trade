from __future__ import annotations

import json
from datetime import datetime

from sqlalchemy import and_, desc, func, or_, select

from models import Conversation, ErrandEvent, ErrandOrder, Message, Notification, Order, OrderEvent, OrderFund, RefundRequest, Service, User, WalletLog
from models import Goods
from ..database import session_scope


def _now() -> datetime:
    return datetime.now()


def _event(order_sn: str, from_status: str | None, to_status: str, operator_id: int, event_type: str, note: str, now: datetime) -> OrderEvent:
    return OrderEvent(
        order_sn=order_sn,
        from_status=from_status,
        to_status=to_status,
        operator_id=operator_id,
        event_type=event_type,
        note=note,
        created_at=now,
    )


def create_goods_order(order_sn: str, buyer_id: int, goods_id: int, remark: str) -> None:
    with session_scope() as session:
        goods = session.execute(select(Goods).where(Goods.id == goods_id).with_for_update()).scalar_one_or_none()
        if not goods:
            raise ValueError("goods not found")
        if goods.status != "on_sale":
            raise ValueError("goods is not available")
        if int(goods.seller_id) == buyer_id:
            raise ValueError("buyer cannot buy own goods")
        now = _now()
        session.add(
            Order(
                order_sn=order_sn,
                buyer_id=buyer_id,
                seller_id=goods.seller_id,
                item_type="goods",
                item_id=goods_id,
                item_snapshot={"title": goods.title, "price": str(goods.price), "location": goods.location or ""},
                amount=goods.price,
                status="unpaid",
                remark=remark,
                lock_version=0,
                created_at=now,
                updated_at=now,
            )
        )
        session.add(_event(order_sn, None, "unpaid", buyer_id, "create", "创建订单", now))
        goods.status = "reserved"
        goods.updated_at = now


def create_service_order(order_sn: str, buyer_id: int, service_id: int, remark: str) -> None:
    with session_scope() as session:
        service = session.execute(select(Service).where(Service.id == service_id).with_for_update()).scalar_one_or_none()
        if not service:
            raise ValueError("service not found")
        if service.status != "on_sale":
            raise ValueError("service is not available")
        if int(service.provider_id) == buyer_id:
            raise ValueError("buyer cannot order own service")
        existing = session.execute(
            select(Order.order_sn)
            .where(
                Order.buyer_id == buyer_id,
                Order.item_type == "service",
                Order.item_id == service_id,
                Order.status.in_(["unpaid", "paid", "confirmed", "shipped"]),
            )
            .with_for_update()
            .limit(1)
        ).first()
        if existing:
            raise ValueError("service order already exists")
        now = _now()
        session.add(
            Order(
                order_sn=order_sn,
                buyer_id=buyer_id,
                seller_id=service.provider_id,
                item_type="service",
                item_id=service_id,
                item_snapshot={"title": service.title, "price": str(service.price)},
                amount=service.price,
                status="unpaid",
                remark=remark or service.description,
                lock_version=0,
                created_at=now,
                updated_at=now,
            )
        )
        session.add(_event(order_sn, None, "unpaid", buyer_id, "service_order", "预约校园服务", now))


def pay_order(order_sn: str, user_id: int) -> None:
    with session_scope() as session:
        order = session.execute(select(Order).where(Order.order_sn == order_sn).with_for_update()).scalar_one_or_none()
        if not order:
            raise ValueError("order not found")
        if int(order.buyer_id) != user_id:
            raise ValueError("order does not belong to buyer")
        if order.status != "unpaid":
            raise ValueError("order status cannot be paid")
        user = session.execute(select(User).where(User.id == user_id).with_for_update()).scalar_one_or_none()
        if not user:
            raise ValueError("buyer not found")
        if user.balance < order.amount:
            raise ValueError("insufficient balance")
        now = _now()
        balance_after = user.balance - order.amount
        user.balance = balance_after
        user.updated_at = now
        order.status = "paid"
        order.paid_at = now
        order.updated_at = now
        if order.item_type == "errand":
            errand = session.execute(select(ErrandOrder).where(ErrandOrder.id == order.item_id).with_for_update()).scalar_one_or_none()
            if errand and errand.status == "unpaid":
                errand.status = "waiting_accept"
                errand.updated_at = now
        session.add(
            OrderFund(
                order_sn=order_sn,
                amount=order.amount,
                status="frozen",
                frozen_at=now,
                created_at=now,
                updated_at=now,
            )
        )
        session.add(
            WalletLog(
                user_id=user_id,
                order_sn=order_sn,
                type="pay",
                direction="out",
                amount=order.amount,
                balance_after=balance_after,
                title=f"支付订单 {order_sn}",
                note="资金进入订单托管账户",
                created_at=now,
            )
        )
        session.add(_event(order_sn, "unpaid", "paid", user_id, "pay", "买家支付，资金托管", now))


def cancel_order(order_sn: str, user_id: int, reason: str) -> None:
    with session_scope() as session:
        order = session.execute(select(Order).where(Order.order_sn == order_sn).with_for_update()).scalar_one_or_none()
        if not order:
            raise ValueError("order not found")
        if user_id not in {int(order.buyer_id), int(order.seller_id)}:
            raise ValueError("operator is not order participant")
        can_cancel_paid = (
            order.status == "paid"
            and order.item_type in {"service", "errand"}
            and int(order.buyer_id) == user_id
        )
        if order.status != "unpaid" and not can_cancel_paid:
            raise ValueError("only unpaid or unaccepted paid service/errand orders can be cancelled directly")
        now = _now()
        old_status = order.status
        order.status = "cancelled"
        order.updated_at = now
        if can_cancel_paid:
            buyer = session.execute(select(User).where(User.id == order.buyer_id).with_for_update()).scalar_one_or_none()
            fund = session.execute(select(OrderFund).where(OrderFund.order_sn == order_sn).with_for_update()).scalar_one_or_none()
            if not buyer:
                raise ValueError("buyer not found")
            if not fund or fund.status != "frozen":
                raise ValueError("order fund cannot be refunded")
            balance_after = buyer.balance + order.amount
            buyer.balance = balance_after
            buyer.updated_at = now
            fund.status = "refunded"
            fund.refunded_at = now
            fund.updated_at = now
            session.add(
                WalletLog(
                    user_id=order.buyer_id,
                    order_sn=order_sn,
                    type="refund",
                    direction="in",
                    amount=order.amount,
                    balance_after=balance_after,
                    title=f"取消订单退款 {order_sn}",
                    note=reason or "Paid service/errand order cancelled before acceptance",
                    created_at=now,
                )
            )
        if order.item_type == "goods":
            goods = session.execute(select(Goods).where(Goods.id == order.item_id).with_for_update()).scalar_one_or_none()
            if goods and goods.status == "reserved":
                goods.status = "on_sale"
                goods.updated_at = now
        elif order.item_type == "errand":
            errand = session.execute(select(ErrandOrder).where(ErrandOrder.id == order.item_id).with_for_update()).scalar_one_or_none()
            if errand and errand.status in {"unpaid", "waiting_accept"}:
                errand.status = "cancelled"
                errand.updated_at = now
        session.add(_event(order_sn, old_status, "cancelled", user_id, "cancel", reason or "用户取消订单", now))


def receive_order(order_sn: str, user_id: int) -> None:
    with session_scope() as session:
        order = session.execute(select(Order).where(Order.order_sn == order_sn).with_for_update()).scalar_one_or_none()
        if not order:
            raise ValueError("order not found")
        if int(order.buyer_id) != user_id:
            raise ValueError("order does not belong to buyer")
        if order.status != "shipped":
            raise ValueError("order status cannot be completed")
        seller = session.execute(select(User).where(User.id == order.seller_id).with_for_update()).scalar_one_or_none()
        if not seller:
            raise ValueError("seller not found")
        now = _now()
        balance_after = seller.balance + order.amount
        seller.balance = balance_after
        seller.updated_at = now
        fund = session.execute(select(OrderFund).where(OrderFund.order_sn == order_sn).with_for_update()).scalar_one_or_none()
        if fund and fund.status == "frozen":
            fund.status = "settled"
            fund.settled_at = now
            fund.updated_at = now
        order.status = "completed"
        order.completed_at = now
        order.updated_at = now
        if order.item_type == "goods":
            goods = session.execute(select(Goods).where(Goods.id == order.item_id).with_for_update()).scalar_one_or_none()
            if goods:
                goods.status = "sold"
                goods.updated_at = now
        elif order.item_type == "errand":
            errand = session.execute(select(ErrandOrder).where(ErrandOrder.id == order.item_id).with_for_update()).scalar_one_or_none()
            if errand:
                errand.status = "confirmed"
                errand.completed_at = errand.completed_at or now
                errand.updated_at = now
        session.add(
            WalletLog(
                user_id=order.seller_id,
                order_sn=order_sn,
                type="income",
                direction="in",
                amount=order.amount,
                balance_after=balance_after,
                title=f"订单收入 {order_sn}",
                note="买家确认收货后结算",
                created_at=now,
            )
        )
        session.add(_event(order_sn, "shipped", "completed", user_id, "receive", "买家确认收货，资金结算", now))


def apply_refund(order_sn: str, user_id: int, reason: str, evidence_json: str) -> None:
    with session_scope() as session:
        order = session.execute(select(Order).where(Order.order_sn == order_sn).with_for_update()).scalar_one_or_none()
        if not order:
            raise ValueError("order not found")
        if int(order.buyer_id) != user_id:
            raise ValueError("only buyer can apply refund")
        if order.status not in {"paid", "confirmed", "shipped", "completed"}:
            raise ValueError("order status cannot request refund")
        existing = session.scalar(
            select(func.count())
            .select_from(RefundRequest)
            .where(
                RefundRequest.order_sn == order_sn,
                RefundRequest.status.in_(["pending", "seller_rejected", "arbitrating", "buyer_win", "seller_win"]),
            )
        )
        if int(existing or 0) > 0:
            raise ValueError("refund or complaint record already exists")
        try:
            evidence = json.loads(evidence_json) if evidence_json else []
        except json.JSONDecodeError:
            evidence = []
        now = _now()
        old_status = order.status
        session.add(
            RefundRequest(
                order_sn=order_sn,
                applicant_id=user_id,
                seller_id=order.seller_id,
                reason=reason,
                evidence_urls=evidence,
                status="pending",
                created_at=now,
                updated_at=now,
            )
        )
        order.status = "refunding"
        order.updated_at = now
        fund = session.execute(select(OrderFund).where(OrderFund.order_sn == order_sn).with_for_update()).scalar_one_or_none()
        if fund and fund.status == "frozen":
            fund.status = "refunding"
            fund.updated_at = now
        session.add(_event(order_sn, old_status, "refunding", user_id, "refund_apply", reason, now))


def ship_order(order_sn: str, user_id: int) -> None:
    with session_scope() as session:
        order = session.execute(select(Order).where(Order.order_sn == order_sn).with_for_update()).scalar_one_or_none()
        if not order:
            raise ValueError("order not found")
        if int(order.seller_id) != user_id:
            raise ValueError("order does not belong to seller")
        if order.status != "confirmed":
            raise ValueError("order status cannot be shipped")
        now = _now()
        order.status = "shipped"
        order.updated_at = now
        if order.item_type == "errand":
            errand = session.execute(
                select(ErrandOrder)
                .where(ErrandOrder.id == order.item_id)
                .with_for_update()
            ).scalar_one_or_none()
            if errand and errand.status == "accepted":
                errand.status = "processing"
                errand.updated_at = now
                session.add(
                    ErrandEvent(
                        errand_id=errand.id,
                        operator_id=user_id,
                        event_type="start",
                        from_status="accepted",
                        to_status="processing",
                        remark="rider started delivery from order page",
                        created_at=now,
                    )
                )
        session.add(_event(order_sn, "confirmed", "shipped", user_id, "ship", "卖家/服务者发货或开始履约", now))


def take_errand_order(errand_id: int, rider_id: int) -> dict:
    with session_scope() as session:
        errand = session.execute(select(ErrandOrder).where(ErrandOrder.id == errand_id).with_for_update()).scalar_one_or_none()
        if not errand:
            raise ValueError("errand order not found")
        if errand.status != "waiting_accept":
            raise ValueError("errand order has been taken")
        if int(errand.publisher_id) == rider_id:
            raise ValueError("publisher cannot take own errand order")
        now = _now()
        order = session.execute(
            select(Order)
            .where(Order.item_type == "errand", Order.item_id == errand_id, Order.status == "paid")
            .order_by(desc(Order.created_at))
            .with_for_update()
            .limit(1)
        ).scalar_one_or_none()
        if not order:
            raise ValueError("publisher must pay the errand order before riders can take it")
        order_sn = order.order_sn
        order.seller_id = rider_id
        order.status = "confirmed"
        order.updated_at = now
        session.add(_event(order_sn, "paid", "confirmed", rider_id, "errand_take", "骑手已接单，等待开始配送", now))
        errand.rider_id = rider_id
        errand.status = "accepted"
        errand.accepted_at = now
        errand.updated_at = now
        session.add(
            ErrandEvent(
                errand_id=errand_id,
                operator_id=rider_id,
                event_type="take",
                from_status="waiting_accept",
                to_status="accepted",
                remark="rider accepted paid errand order",
                created_at=now,
            )
        )
        return {"orderSn": order_sn, "status": "confirmed"}


def goods_order_candidate(goods_id: int) -> dict | None:
    with session_scope() as session:
        goods = session.get(Goods, goods_id)
        if not goods:
            return None
        return {"seller_id": goods.seller_id, "status": goods.status}


def service_order_candidate(service_id: int) -> dict | None:
    with session_scope() as session:
        service = session.get(Service, service_id)
        if not service:
            return None
        return {"provider_id": service.provider_id, "status": service.status}


def errand_candidate(errand_id: int) -> dict | None:
    with session_scope() as session:
        errand = session.get(ErrandOrder, errand_id)
        if not errand:
            return None
        return {"publisher_id": errand.publisher_id, "status": errand.status}


def confirm_order_by_seller(order_sn: str, seller_id: int) -> dict | None:
    with session_scope() as session:
        order = session.execute(
            select(Order).where(Order.order_sn == order_sn).with_for_update()
        ).scalar_one_or_none()
        if not order:
            return None
        if int(order.seller_id) != seller_id:
            return {"error": "not_seller"}
        if order.status != "paid":
            return {"error": "bad_status"}
        old_version = order.lock_version
        order.status = "confirmed"
        order.lock_version = int(order.lock_version or 0) + 1
        order.updated_at = datetime.now()
        if int(old_version) + 1 != int(order.lock_version):
            return {"error": "changed"}
        session.add(
            OrderEvent(
                order_sn=order_sn,
                from_status="paid",
                to_status="confirmed",
                operator_id=seller_id,
                event_type="seller_confirm",
                note="seller/provider confirmed the order",
                created_at=datetime.now(),
            )
        )
        return {"orderSn": order_sn, "status": "confirmed"}


def complaint_order(order_sn: str, user_id: int, content: str) -> dict | None:
    with session_scope() as session:
        order = session.execute(
            select(Order).where(Order.order_sn == order_sn).with_for_update()
        ).scalar_one_or_none()
        if not order:
            return None
        if user_id not in {int(order.buyer_id), int(order.seller_id)}:
            return {"error": "not_participant"}
        existing_refund = session.execute(
            select(RefundRequest)
            .where(
                RefundRequest.order_sn == order_sn,
                RefundRequest.status.in_(["pending", "seller_rejected", "arbitrating", "buyer_win", "seller_win"]),
            )
            .order_by(desc(RefundRequest.id))
            .with_for_update()
            .limit(1)
        ).scalar_one_or_none()
        if existing_refund and existing_refund.status in {"buyer_win", "seller_win"}:
            return {"error": "closed_after_sale"}
        evidence_row = session.execute(
            select(
                Conversation.id.label("conversation_id"),
                func.count(Message.id).label("message_count"),
                func.max(Message.id).label("latest_message_id"),
            )
            .outerjoin(Message, Message.conversation_id == Conversation.id)
            .where(
                and_(
                    Conversation.business_type == order.item_type,
                    Conversation.business_id == order.item_id,
                    or_(Conversation.user_a_id == user_id, Conversation.user_b_id == user_id),
                )
            )
            .group_by(Conversation.id)
            .order_by(desc(Conversation.last_message_at), desc(Conversation.id))
            .limit(1)
        ).first()
        evidence = dict(evidence_row._mapping) if evidence_row else {}
        latest_hash = ""
        if evidence.get("latest_message_id"):
            latest = session.get(Message, evidence["latest_message_id"])
            latest_hash = latest.content_hash if latest else ""
        evidence_payload = {
            "source": "complaint",
            "complaintText": content,
            "autoLinkedChat": bool(evidence.get("conversation_id")),
            "conversationId": evidence.get("conversation_id"),
            "messageCount": int(evidence.get("message_count") or 0),
            "latestMessageHash": latest_hash,
            "orderStatusBefore": order.status,
        }
        now = datetime.now()
        if existing_refund:
            complaint = existing_refund
            complaint.applicant_id = user_id
            complaint.reason = content
            complaint.evidence_urls = evidence_payload
            complaint.status = "arbitrating"
            complaint.updated_at = now
        else:
            complaint = RefundRequest(
                order_sn=order_sn,
                applicant_id=user_id,
                seller_id=order.seller_id,
                reason=content,
                evidence_urls=evidence_payload,
                status="arbitrating",
                created_at=now,
                updated_at=now,
            )
            session.add(complaint)
            session.flush()
        session.add(
            OrderEvent(
                order_sn=order_sn,
                from_status=order.status,
                to_status="disputed",
                operator_id=user_id,
                event_type="complaint",
                note=content,
                created_at=now,
            )
        )
        order.status = "disputed"
        order.updated_at = now
        fund = session.execute(select(OrderFund).where(OrderFund.order_sn == order_sn)).scalar_one_or_none()
        if fund and fund.status == "frozen":
            fund.status = "refunding"
            fund.updated_at = now
        peer_id = order.seller_id if user_id == int(order.buyer_id) else order.buyer_id
        session.add_all(
            [
                Notification(
                    user_id=user_id,
                    business_type="refund",
                    business_id=order_sn,
                    title="Complaint submitted",
                    content="Platform admins will review the order events and chat evidence chain.",
                    is_read=0,
                    created_at=now,
                ),
                Notification(
                    user_id=peer_id,
                    business_type="refund",
                    business_id=order_sn,
                    title="Order entered complaint arbitration",
                    content="The counterparty submitted a complaint. Platform admins will intervene.",
                    is_read=0,
                    created_at=now,
                ),
            ]
        )
        return {"id": complaint.id, "status": "arbitrating", "evidence": evidence_payload}


def update_errand_status(errand_id: int, user_id: int, new_status: str, allowed: dict[str, set[str]]) -> dict | None:
    with session_scope() as session:
        errand = session.execute(
            select(ErrandOrder).where(ErrandOrder.id == errand_id).with_for_update()
        ).scalar_one_or_none()
        if not errand:
            return None
        old_status = errand.status
        if new_status not in allowed.get(old_status, set()):
            return {"error": "bad_transition"}
        if new_status in {"processing", "completed"} and int(errand.rider_id or 0) != user_id:
            return {"error": "not_rider"}
        if new_status == "confirmed" and int(errand.publisher_id) != user_id:
            return {"error": "not_publisher"}
        now = datetime.now()
        errand.status = new_status
        errand.updated_at = now
        order = session.execute(
            select(Order)
            .where(Order.item_type == "errand", Order.item_id == errand_id)
            .order_by(desc(Order.created_at))
            .with_for_update()
            .limit(1)
        ).scalar_one_or_none()
        order_status = None
        if order and new_status == "processing" and int(order.seller_id) == user_id and order.status == "confirmed":
            order.status = "shipped"
            order.updated_at = now
            order_status = "shipped"
            session.add(_event(order.order_sn, "confirmed", "shipped", user_id, "errand_start", "骑手开始配送", now))
        if new_status == "completed":
            errand.completed_at = now
        session.add(
            ErrandEvent(
                errand_id=errand_id,
                operator_id=user_id,
                event_type="status_change",
                from_status=old_status,
                to_status=new_status,
                remark="mini-program updated errand progress",
                created_at=now,
            )
        )
        result = {"id": errand_id, "status": new_status}
        if order:
            result["orderSn"] = order.order_sn
        if order_status:
            result["orderStatus"] = order_status
        return result


def list_orders_for_user(user_id: int) -> list[dict]:
    with session_scope() as session:
        buyer = User.__table__.alias("buyer")
        seller = User.__table__.alias("seller")
        rows = session.execute(
            select(
                Order.order_sn,
                Order.item_type,
                Order.item_id,
                Order.item_snapshot,
                Order.amount,
                Order.status.label("order_status"),
                OrderFund.status.label("fund_status"),
                Order.created_at,
                Order.paid_at,
                Order.completed_at,
                Order.buyer_id,
                Order.seller_id,
                buyer.c.nickname.label("buyer_name"),
                seller.c.nickname.label("seller_name"),
                buyer.c.username.label("buyer_username"),
                seller.c.username.label("seller_username"),
            )
            .join(buyer, buyer.c.id == Order.buyer_id)
            .join(seller, seller.c.id == Order.seller_id)
            .outerjoin(OrderFund, OrderFund.order_sn == Order.order_sn)
            .where(or_(Order.buyer_id == user_id, Order.seller_id == user_id))
            .order_by(desc(Order.created_at))
            .limit(100)
        )
        return [_order_row(row) for row in rows]


def list_publications_for_user(user_id: int) -> list[dict]:
    with session_scope() as session:
        goods_rows = session.execute(
            select(
                Goods.id,
                Goods.title,
                Goods.price,
                Goods.status,
                Goods.created_at,
                Goods.updated_at,
            )
            .where(Goods.seller_id == user_id, Goods.status != "removed")
            .order_by(desc(Goods.created_at), desc(Goods.id))
            .limit(100)
        )
        service_rows = session.execute(
            select(
                Service.id,
                Service.title,
                Service.price,
                Service.status,
                Service.created_at,
                Service.updated_at,
            )
            .where(Service.provider_id == user_id, Service.status != "removed")
            .order_by(desc(Service.created_at), desc(Service.id))
            .limit(100)
        )
        items: list[dict] = []
        for row in goods_rows:
            data = dict(row._mapping)
            data["item_type"] = "goods"
            items.append(data)
        for row in service_rows:
            data = dict(row._mapping)
            data["item_type"] = "service"
            items.append(data)
        return sorted(
            items,
            key=lambda item: item.get("updated_at") or item.get("created_at") or datetime.min,
            reverse=True,
        )


def get_order_detail(order_sn: str) -> dict | None:
    with session_scope() as session:
        buyer = User.__table__.alias("buyer")
        seller = User.__table__.alias("seller")
        row = session.execute(
            select(
                Order.order_sn,
                Order.item_type,
                Order.item_id,
                Order.item_snapshot,
                Order.amount,
                Order.status.label("order_status"),
                OrderFund.status.label("fund_status"),
                Order.created_at,
                Order.paid_at,
                Order.completed_at,
                Order.buyer_id,
                Order.seller_id,
                buyer.c.nickname.label("buyer_name"),
                seller.c.nickname.label("seller_name"),
                buyer.c.username.label("buyer_username"),
                seller.c.username.label("seller_username"),
            )
            .join(buyer, buyer.c.id == Order.buyer_id)
            .join(seller, seller.c.id == Order.seller_id)
            .outerjoin(OrderFund, OrderFund.order_sn == Order.order_sn)
            .where(Order.order_sn == order_sn)
            .limit(1)
        ).first()
        return _order_row(row) if row else None


def list_order_events(order_sn: str) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(
                OrderEvent.event_type,
                OrderEvent.from_status,
                OrderEvent.to_status,
                OrderEvent.note,
                OrderEvent.created_at,
            )
            .where(OrderEvent.order_sn == order_sn)
            .order_by(OrderEvent.created_at, OrderEvent.id)
        )
        return [dict(row._mapping) for row in rows]


def latest_refund_for_order(order_sn: str) -> dict | None:
    return latest_refund_detail_for_order(order_sn)


def latest_refund_detail_for_order(order_sn: str) -> dict | None:
    with session_scope() as session:
        refund = session.execute(
            select(RefundRequest)
            .where(RefundRequest.order_sn == order_sn)
            .order_by(desc(RefundRequest.id))
            .limit(1)
        ).scalar_one_or_none()
        if not refund:
            return None
        arbitration = _latest_arbitration_by_order(session, [order_sn]).get(order_sn)
        return _refund_row(refund, arbitration)


def list_latest_refunds_for_orders(order_sns: list[str]) -> dict[str, dict]:
    unique_sns = [sn for sn in dict.fromkeys(str(sn or "").strip() for sn in order_sns) if sn]
    if not unique_sns:
        return {}
    with session_scope() as session:
        arbitrations = _latest_arbitration_by_order(session, unique_sns)
        refunds = session.execute(
            select(RefundRequest)
            .where(RefundRequest.order_sn.in_(unique_sns))
            .order_by(desc(RefundRequest.created_at), desc(RefundRequest.id))
        ).scalars()
        result: dict[str, dict] = {}
        for refund in refunds:
            if refund.order_sn in result:
                continue
            result[refund.order_sn] = _refund_row(refund, arbitrations.get(refund.order_sn))
        return result


def _latest_arbitration_by_order(session, order_sns: list[str]) -> dict[str, dict]:
    rows = session.execute(
        select(
            OrderEvent.order_sn,
            OrderEvent.note,
            OrderEvent.created_at,
        )
        .where(
            OrderEvent.order_sn.in_(order_sns),
            OrderEvent.event_type == "arbitrate",
        )
        .order_by(desc(OrderEvent.created_at), desc(OrderEvent.id))
    )
    result: dict[str, dict] = {}
    for row in rows:
        data = dict(row._mapping)
        if data["order_sn"] not in result:
            result[data["order_sn"]] = data
    return result


def _refund_row(refund: RefundRequest, arbitration: dict | None = None) -> dict:
    arbitration = arbitration or {}
    return {
        "id": int(refund.id),
        "order_sn": refund.order_sn,
        "applicant_id": int(refund.applicant_id or 0),
        "seller_id": int(refund.seller_id or 0),
        "reason": refund.reason or "",
        "evidence_urls": refund.evidence_urls or [],
        "status": refund.status or "",
        "seller_reply": refund.seller_reply or "",
        "admin_id": int(refund.admin_id or 0),
        "arbitrate_result": refund.arbitrate_result or "",
        "admin_note": arbitration.get("note") or "",
        "arbitrated_at": arbitration.get("created_at"),
        "resolved_at": refund.resolved_at,
        "created_at": refund.created_at,
        "updated_at": refund.updated_at,
    }


def _order_row(row) -> dict:
    data = dict(row._mapping)
    snapshot = data.pop("item_snapshot") or {}
    data["item_title"] = snapshot.get("title") if isinstance(snapshot, dict) else None
    data["fund_status"] = data.get("fund_status") or "none"
    return data
