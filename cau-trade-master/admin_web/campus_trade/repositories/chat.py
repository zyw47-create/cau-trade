from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, case, desc, or_, select

from models import Conversation, ErrandOrder, Goods, Message, Order, Service, User
from ..database import session_scope


def order_chat_target(order_sn: str, current_user_id: int) -> dict | None:
    with session_scope() as session:
        order = session.get(Order, order_sn)
        if not order:
            return None
        peer_id = order.seller_id if int(order.buyer_id) == current_user_id else order.buyer_id
        return {"business_type": order.item_type, "business_id": int(order.item_id), "peer_id": int(peer_id)}


def business_owner(business_type: str, business_id: int) -> int | None:
    with session_scope() as session:
        if business_type == "goods":
            row = session.get(Goods, business_id)
            return int(row.seller_id) if row else None
        if business_type == "service":
            row = session.get(Service, business_id)
            return int(row.provider_id) if row else None
        if business_type == "errand":
            row = session.get(ErrandOrder, business_id)
            return int(row.publisher_id) if row else None
        return None


def get_conversation_for_user(conversation_id: int, current_user_id: int) -> dict | None:
    with session_scope() as session:
        conversation = session.execute(
            select(Conversation).where(
                and_(
                    Conversation.id == conversation_id,
                    or_(Conversation.user_a_id == current_user_id, Conversation.user_b_id == current_user_id),
                )
            )
        ).scalar_one_or_none()
        if not conversation:
            return None
        return _conversation_dict(conversation, current_user_id)


def ensure_conversation(target: dict, current_user_id: int) -> dict:
    peer_id = int(target["peer_id"])
    user_a = min(current_user_id, peer_id)
    user_b = max(current_user_id, peer_id)
    session_type = {"goods": "goods_chat", "service": "service_chat", "errand": "task_chat"}.get(
        target["business_type"], "goods_chat"
    )
    with session_scope() as session:
        conversation = session.execute(
            select(Conversation).where(
                and_(
                    Conversation.business_type == target["business_type"],
                    Conversation.business_id == target["business_id"],
                    Conversation.user_a_id == user_a,
                    Conversation.user_b_id == user_b,
                )
            )
        ).scalar_one_or_none()
        if not conversation:
            conversation = Conversation(
                session_type=session_type,
                business_type=target["business_type"],
                business_id=target["business_id"],
                user_a_id=user_a,
                user_b_id=user_b,
                last_message_at=datetime.now(),
                created_at=datetime.now(),
            )
            session.add(conversation)
            session.flush()
        return _conversation_dict(conversation, current_user_id)


def list_conversations(user_id: int) -> list[dict]:
    with session_scope() as session:
        peer = User.__table__.alias("peer")
        last_content = (
            select(Message.content)
            .where(Message.conversation_id == Conversation.id, Message.status == "normal")
            .order_by(desc(Message.created_at), desc(Message.id))
            .limit(1)
            .scalar_subquery()
        )
        last_message_id = (
            select(Message.id)
            .where(Message.conversation_id == Conversation.id, Message.status == "normal")
            .order_by(desc(Message.created_at), desc(Message.id))
            .limit(1)
            .scalar_subquery()
        )
        last_sender_id = (
            select(Message.sender_id)
            .where(Message.conversation_id == Conversation.id, Message.status == "normal")
            .order_by(desc(Message.created_at), desc(Message.id))
            .limit(1)
            .scalar_subquery()
        )
        latest_hash = (
            select(Message.content_hash)
            .where(Message.conversation_id == Conversation.id, Message.status == "normal")
            .order_by(desc(Message.created_at), desc(Message.id))
            .limit(1)
            .scalar_subquery()
        )
        peer_id_expr = case(
            (Conversation.user_a_id == user_id, Conversation.user_b_id),
            else_=Conversation.user_a_id,
        )
        rows = session.execute(
            select(
                Conversation.id.label("conversation_id"),
                Conversation.business_type,
                Conversation.business_id,
                peer_id_expr.label("peer_id"),
                peer.c.nickname.label("peer_name"),
                peer.c.username.label("peer_username"),
                last_message_id.label("last_message_id"),
                last_sender_id.label("last_sender_id"),
                last_content.label("last_message"),
                latest_hash.label("latest_hash"),
                Conversation.last_message_at.label("last_time"),
            )
            .join(peer, peer.c.id == peer_id_expr)
            .where(or_(Conversation.user_a_id == user_id, Conversation.user_b_id == user_id))
            .order_by(desc(Conversation.last_message_at), desc(Conversation.created_at))
            .limit(100)
        )
        return [dict(row._mapping) | {"unread_count": 0} for row in rows]


def get_messages(user_id: int, conversation_id: int) -> tuple[dict, list[dict]] | None:
    with session_scope() as session:
        peer = User.__table__.alias("peer")
        peer_id_expr = case(
            (Conversation.user_a_id == user_id, Conversation.user_b_id),
            else_=Conversation.user_a_id,
        )
        conv_row = session.execute(
            select(
                Conversation.id,
                Conversation.business_type,
                Conversation.business_id,
                peer_id_expr.label("peer_id"),
                peer.c.nickname.label("peer"),
                peer.c.username.label("peer_username"),
            )
            .join(peer, peer.c.id == peer_id_expr)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    or_(Conversation.user_a_id == user_id, Conversation.user_b_id == user_id),
                )
            )
            .limit(1)
        ).first()
        if not conv_row:
            return None
        sender = User.__table__.alias("sender")
        rows = session.execute(
            select(
                Message.id,
                Message.conversation_id,
                Message.sender_id,
                Message.receiver_id,
                Message.message_type,
                Message.content,
                Message.content_hash,
                Message.previous_hash,
                Message.status,
                Message.created_at,
                sender.c.nickname.label("sender_name"),
                sender.c.username.label("sender_username"),
            )
            .join(sender, sender.c.id == Message.sender_id)
            .where(Message.conversation_id == conversation_id, Message.status == "normal")
            .order_by(Message.created_at, Message.id)
            .limit(200)
        )
        return dict(conv_row._mapping), [dict(row._mapping) for row in rows]


def latest_message_hash(conversation_id: int) -> str | None:
    with session_scope() as session:
        row = session.execute(
            select(Message.content_hash)
            .where(Message.conversation_id == conversation_id, Message.status == "normal")
            .order_by(desc(Message.created_at), desc(Message.id))
            .limit(1)
        ).first()
        return row[0] if row else None


def create_message(conversation_id: int, sender_id: int, receiver_id: int, content: str, content_hash: str, previous_hash: str | None) -> int:
    with session_scope() as session:
        now = datetime.now()
        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            receiver_id=receiver_id,
            message_type="text",
            content=content,
            content_hash=content_hash,
            previous_hash=previous_hash,
            status="normal",
            created_at=now,
        )
        session.add(message)
        conversation = session.get(Conversation, conversation_id)
        if conversation:
            conversation.last_message_at = now
        session.flush()
        return int(message.id)


def soft_delete_message(message_id: int) -> dict | None:
    with session_scope() as session:
        message = session.get(Message, message_id)
        if not message:
            return None
        conversation_id = int(message.conversation_id)
        message.status = "hidden"
        session.flush()
        conversation = session.get(Conversation, conversation_id)
        latest = session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id, Message.status == "normal")
            .order_by(desc(Message.created_at), desc(Message.id))
            .limit(1)
        ).scalar_one_or_none()
        if conversation:
            conversation.last_message_at = latest.created_at if latest else conversation.created_at
        return {
            "id": int(message.id),
            "conversation_id": conversation_id,
            "latest_message_id": int(latest.id) if latest else None,
        }


def _conversation_dict(conversation: Conversation, current_user_id: int) -> dict:
    peer_id = conversation.user_b_id if int(conversation.user_a_id) == current_user_id else conversation.user_a_id
    return {
        "id": conversation.id,
        "business_type": conversation.business_type,
        "business_id": conversation.business_id,
        "peer_id": peer_id,
    }
