from __future__ import annotations

import hashlib

from ..repositories import chat as chat_repository
from ..serialization import row_to_api
from .content_service import BusinessError, moderate_message


class ChatError(ValueError):
    pass


def _to_int(value, default: int = 0) -> int:
    try:
        return int(value or default)
    except (TypeError, ValueError):
        return default


def find_chat_target(data: dict, current_user_id: int) -> dict | None:
    business_type = str(data.get("businessType") or data.get("business_type") or "").strip()
    business_id = _to_int(data.get("businessId") or data.get("business_id") or data.get("goodsId"))
    order_sn = str(data.get("orderSn") or "").strip()
    if order_sn and (not business_type or not business_id):
        target = chat_repository.order_chat_target(order_sn, current_user_id)
        if target:
            return target
    if not business_type and data.get("goodsId"):
        business_type = "goods"
    business_type = {
        "goods_chat": "goods",
        "service_chat": "service",
        "task_chat": "errand",
    }.get(business_type, business_type)
    if not business_type or not business_id:
        return None
    peer_id = chat_repository.business_owner(business_type, business_id)
    if peer_id == current_user_id:
        peer_id = _to_int(data.get("peerId") or data.get("receiverId"))
    if not peer_id:
        return None
    return {"business_type": business_type, "business_id": business_id, "peer_id": peer_id}


def ensure_conversation(data: dict, current_user_id: int) -> dict | None:
    conversation_id = _to_int(data.get("conversationId") or data.get("conversation_id"))
    if conversation_id:
        conversation = chat_repository.get_conversation_for_user(conversation_id, current_user_id)
        if conversation:
            return conversation
    target = find_chat_target(data, current_user_id)
    if not target:
        return None
    return chat_repository.ensure_conversation(target, current_user_id)


def list_conversations(user_id: int) -> list[dict]:
    items = []
    for row in chat_repository.list_conversations(user_id):
        item = row_to_api(row)
        item["id"] = row.get("conversation_id")
        item["peer"] = row.get("peer_name")
        item["peerUsername"] = row.get("peer_username")
        item["businessType"] = row.get("business_type")
        item["businessId"] = row.get("business_id")
        item["messages"] = [
            {
                "content": row.get("last_message") or "",
                "hash": row.get("latest_hash") or "SHA256-EMPTY",
            }
        ] if row.get("last_message") else []
        items.append(item)
    return items


def get_messages(user_id: int, conversation_id: str, datetime_filter, item_type_text) -> dict:
    payload = chat_repository.get_messages(user_id, _to_int(conversation_id))
    if not payload:
        raise ChatError("conversation not found or inaccessible")
    conversation, rows = payload
    messages = []
    for row in rows:
        item = row_to_api(row)
        item["from"] = "me" if int(row.get("sender_id") or 0) == user_id else "other"
        item["hash"] = row.get("content_hash")
        item["contentHash"] = row.get("content_hash")
        item["previousHash"] = row.get("previous_hash")
        item["time"] = datetime_filter(row.get("created_at"))
        item["senderName"] = row.get("sender_name")
        item["senderUsername"] = row.get("sender_username")
        messages.append(item)
    conv = row_to_api(conversation)
    conv["businessType"] = conversation.get("business_type")
    conv["businessId"] = conversation.get("business_id")
    conv["peerUsername"] = conversation.get("peer_username")
    conv["title"] = item_type_text(conversation.get("business_type"))
    return {"conversation": conv, "list": messages}


def open_messages(user_id: int, data: dict, datetime_filter, item_type_text) -> dict:
    conversation = ensure_conversation(data, user_id)
    if not conversation:
        raise ChatError("unable to resolve chat target")
    return get_messages(user_id, str(conversation["id"]), datetime_filter, item_type_text)


def send_message(user_id: int, data: dict) -> dict:
    content = str(data.get("content") or "").strip()
    if not content:
        raise ChatError("message content is required")
    try:
        moderate_message(content)
    except BusinessError as exc:
        raise ChatError(str(exc))
    conversation = ensure_conversation(data, user_id)
    if not conversation:
        raise ChatError("unable to resolve chat target")
    conversation_id = int(conversation["id"])
    peer_id = int(conversation["peer_id"])
    previous_hash = chat_repository.latest_message_hash(conversation_id)
    content_hash = hashlib.sha256(
        f"{previous_hash or ''}|{user_id}|{peer_id}|text|{content}".encode("utf-8")
    ).hexdigest()
    msg_id = chat_repository.create_message(
        conversation_id,
        user_id,
        peer_id,
        content,
        content_hash,
        previous_hash,
    )
    return {
        "id": msg_id,
        "conversationId": conversation_id,
        "from": "me",
        "content": content,
        "hash": content_hash,
        "contentHash": content_hash,
        "previousHash": previous_hash,
        "time": "",
    }
