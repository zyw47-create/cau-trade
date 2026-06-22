from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import desc, select

from models import Order, OrderFund, User, WalletLog, WithdrawRequest
from ..database import session_scope


def _now() -> datetime:
    return datetime.now()


def list_wallet_logs(user_id: int) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(
                WalletLog.id,
                WalletLog.type,
                WalletLog.direction,
                WalletLog.amount,
                WalletLog.balance_after,
                WalletLog.title,
                WalletLog.note,
                WalletLog.created_at,
            )
            .where(WalletLog.user_id == user_id)
            .order_by(desc(WalletLog.created_at), desc(WalletLog.id))
            .limit(100)
        )
        return [dict(row._mapping) for row in rows]


def list_rider_earnings(user_id: int) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(
                Order.item_type,
                Order.item_id,
                Order.item_snapshot,
                OrderFund.order_sn,
                OrderFund.amount,
                OrderFund.status,
                OrderFund.settled_at,
                OrderFund.created_at,
            )
            .join(Order, Order.order_sn == OrderFund.order_sn)
            .where(
                Order.seller_id == user_id,
                Order.item_type.in_(["goods", "service", "errand"]),
            )
            .order_by(desc(OrderFund.created_at))
        )
        result = []
        for row in rows:
            item = dict(row._mapping)
            snapshot = item.pop("item_snapshot", None) or {}
            if not isinstance(snapshot, dict):
                snapshot = {}
            item["title"] = snapshot.get("title") or "收益订单"
            item["type_text"] = {"goods": "商品", "service": "服务", "errand": "跑腿"}.get(item.get("item_type"), "订单")
            result.append(item)
        return result


def list_withdraw_requests(user_id: int) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(
                WithdrawRequest.id,
                WithdrawRequest.amount,
                WithdrawRequest.reason,
                WithdrawRequest.status,
                WithdrawRequest.created_at,
                WithdrawRequest.reviewed_at,
            )
            .where(WithdrawRequest.user_id == user_id)
            .order_by(desc(WithdrawRequest.created_at), desc(WithdrawRequest.id))
            .limit(50)
        )
        return [dict(row._mapping) for row in rows]


def request_withdraw(user_id: int, amount: Decimal, reason: str) -> int:
    with session_scope() as session:
        now = _now()
        record = WithdrawRequest(
            user_id=user_id,
            amount=amount,
            reason=reason,
            status="pending",
            created_at=now,
            updated_at=now,
        )
        session.add(record)
        session.flush()
        return int(record.id)


def recharge(user_id: int, amount: Decimal) -> Decimal | None:
    with session_scope() as session:
        user = session.execute(select(User).where(User.id == user_id).with_for_update()).scalar_one_or_none()
        if not user:
            return None
        balance_after = Decimal(user.balance) + amount
        user.balance = balance_after
        user.updated_at = _now()
        session.add(
            WalletLog(
                user_id=user_id,
                type="recharge",
                direction="in",
                amount=amount,
                balance_after=balance_after,
                title="Wallet recharge",
                note="Local development recharge",
                created_at=_now(),
            )
        )
        return balance_after
