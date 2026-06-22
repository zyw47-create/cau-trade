from __future__ import annotations

from flask import Blueprint, request

from ..database import DatabaseError
from ..responses import api_error, api_ok
from ..runtime import datetime_filter
from ..security import current_user_id, require_api_auth, request_json
from ..services import chat_service, order_query_service
from ..services.chat_service import ChatError


bp = Blueprint("chat", __name__)


@bp.route("/api/chat/list")
@bp.route("/api/chats")
@bp.route("/v1/api/chat/list")
@bp.route("/v1/api/chats")
@require_api_auth
def api_chat_list():
    return api_ok({"list": chat_service.list_conversations(current_user_id())})


@bp.route("/api/chat/messages")
@bp.route("/api/chat/history")
@bp.route("/api/chats/messages")
@bp.route("/api/chats/<int:conversation_id>/messages")
@bp.route("/v1/api/chat/messages")
@bp.route("/v1/api/chat/history")
@bp.route("/v1/api/chats/messages")
@bp.route("/v1/api/chats/<int:conversation_id>/messages")
@require_api_auth
def api_chat_messages(conversation_id: int | None = None):
    try:
        if not conversation_id and not request.args.get("conversationId"):
            return api_ok(
                chat_service.open_messages(
                    current_user_id(),
                    request.args.to_dict(),
                    datetime_filter,
                    order_query_service.item_type_text,
                )
            )
        return api_ok(
            chat_service.get_messages(
                current_user_id(),
                str(conversation_id or request.args.get("conversationId", "")),
                datetime_filter,
                order_query_service.item_type_text,
            )
        )
    except ChatError:
        return api_error("会话不存在或无权访问", 404, 404)
    except DatabaseError as exc:
        return api_error(exc)


def find_chat_target(data: dict, user_id: int) -> dict | None:
    return chat_service.find_chat_target(data, user_id)


def ensure_conversation(data: dict, user_id: int) -> dict | None:
    return chat_service.ensure_conversation(data, user_id)


@bp.route("/api/chat/send", methods=["POST"])
@bp.route("/api/chats/messages", methods=["POST"])
@bp.route("/v1/api/chat/send", methods=["POST"])
@bp.route("/v1/api/chats/messages", methods=["POST"])
@require_api_auth
def api_chat_send():
    try:
        result = chat_service.send_message(current_user_id(), request_json())
    except ChatError as exc:
        return api_error(exc)
    except DatabaseError as exc:
        return api_error(exc)
    return api_ok(result)
