from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from ..repositories import orders as order_repository
from ..repositories import users as user_repository


REFUND_STATUS_TEXT = {
    "pending": "平台处理中",
    "seller_rejected": "商家拒绝，待平台仲裁",
    "arbitrating": "平台仲裁中",
    "buyer_win": "买家胜诉，已退款",
    "seller_win": "卖家胜诉，已结算",
}

REFUND_RESULT_TEXT = {
    "buyer_win": "仲裁结果：买家胜诉，资金已退回买家余额。",
    "seller_win": "仲裁结果：卖家/服务者胜诉，资金已结算给交易对方。",
}


def datetime_text(value) -> str:
    if not value:
        return "-"
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    return str(value)


def order_status_text(status: str) -> str:
    return {
        "unpaid": "待支付",
        "paid": "待卖家确认",
        "confirmed": "待发货",
        "shipped": "待收货",
        "completed": "已完成",
        "cancelled": "已取消",
        "refunding": "售后退款中",
        "refunded": "已退款",
        "disputed": "纠纷仲裁中",
    }.get(status, status or "-")


def item_type_text(item_type: str) -> str:
    return {"goods": "二手闲置", "service": "校园服务", "errand": "跑腿任务"}.get(
        item_type, item_type or "-"
    )


def fund_status_text(status: str | None) -> str:
    return {
        "none": "未托管",
        "frozen": "资金托管中",
        "refunding": "退款处理中",
        "settled": "已结算",
        "refunded": "已退款",
    }.get(status or "none", status or "未托管")


def errand_status_text(status: str | None) -> str:
    return {
        "unpaid": "待支付",
        "waiting_accept": "待接单",
        "accepted": "已接单",
        "processing": "配送中",
        "completed": "待确认",
        "confirmed": "已完成",
        "cancelled": "已取消",
    }.get(status or "", status or "-")


def order_progress_text(status: str, item_type: str | None = None) -> str:
    if item_type == "service":
        return {
            "unpaid": "待支付",
            "paid": "待服务者确认",
            "confirmed": "待服务者履约",
            "shipped": "待用户确认完成",
            "completed": "已完成",
            "cancelled": "已取消",
            "refunding": "售后退款中",
            "refunded": "已退款",
            "disputed": "纠纷仲裁中",
        }.get(status, order_status_text(status))
    if item_type == "errand":
        return {
            "unpaid": "待支付",
            "paid": "待骑手接单",
            "confirmed": "骑手已接单",
            "shipped": "配送中，待确认完成",
            "completed": "已完成",
            "cancelled": "已取消",
            "refunding": "售后退款中",
            "refunded": "已退款",
            "disputed": "纠纷仲裁中",
        }.get(status, order_status_text(status))
    return order_status_text(status)


def order_action_hint(status: str, item_type: str | None = None, role: str | None = None, can_chat: bool = True) -> str:
    if item_type == "errand":
        if status == "unpaid":
            return "发布者待支付，支付后跑腿费进入平台托管"
        if status == "paid":
            return "跑腿费已托管，等待骑手接单"
        if status == "confirmed":
            return "骑手已接单，等待开始配送"
        if status == "shipped":
            return "骑手配送中，等待发布者确认完成"
        if status == "completed":
            return "任务已完成，跑腿费已结算给骑手"
        return order_progress_text(status, item_type)
    if not can_chat and status == "paid":
        return "等待对方确认"
    return order_progress_text(status, item_type)


def workflow_steps(status: str, item_type: str | None = None) -> list[dict]:
    if item_type == "service":
        labels = [
            ("unpaid", "创建预约", "服务订单已创建，等待支付"),
            ("paid", "支付托管", "费用进入平台托管，等待服务者确认"),
            ("confirmed", "服务确认", "服务者已确认，等待履约"),
            ("shipped", "服务履约", "服务已开始或已交付，等待用户确认"),
            ("completed", "完成结算", "用户确认完成，资金结算给服务者"),
        ]
    elif item_type == "errand":
        labels = [
            ("unpaid", "发布任务", "跑腿任务已创建，等待支付"),
            ("paid", "费用托管", "跑腿费用进入平台托管，等待骑手接单"),
            ("confirmed", "骑手接单", "骑手已接单，准备配送"),
            ("shipped", "配送中", "骑手正在处理，等待发布者确认"),
            ("completed", "完成结算", "发布者确认完成，费用结算给骑手"),
        ]
    else:
        labels = [
            ("unpaid", "创建订单", "二手商品订单已创建，等待买家支付"),
            ("paid", "支付托管", "买家已支付，资金进入平台托管，等待卖家确认"),
            ("confirmed", "卖家确认", "卖家已确认订单，等待发货或当面交付"),
            ("shipped", "发货交付", "卖家已发货或完成交付，等待买家确认收货"),
            ("completed", "完成结算", "买家确认收货，资金结算给卖家"),
        ]
    order = ["unpaid", "paid", "confirmed", "shipped", "completed"]
    done_index = order.index(status) if status in order else -1
    if status in {"refunding", "refunded", "disputed"}:
        done_index = len(order) - 1
    steps = []
    for index, (step_status, title, desc) in enumerate(labels):
        done = index <= done_index
        steps.append(
            {
                "id": step_status,
                "title": title,
                "desc": desc,
                "time": "",
                "done": done,
                "className": "timeline-dot done" if done else "timeline-dot pending",
            }
        )
    if status in {"refunding", "refunded", "disputed"}:
        steps.append(
            {
                "id": "refund",
                "title": order_status_text(status),
                "desc": "订单进入售后处理，可在售后模块查看处理进度和凭证。",
                "time": "",
                "done": True,
                "className": "timeline-dot done",
            }
        )
    if status == "cancelled":
        steps.append(
            {
                "id": "cancelled",
                "title": "订单已取消",
                "desc": "订单已取消，未完成交易；如已托管资金，将按退款规则退回。",
                "time": "",
                "done": True,
                "className": "timeline-dot done",
            }
        )
    return steps


def _refund_source_text(evidence, order_status: str | None = None) -> str:
    if isinstance(evidence, dict) and evidence.get("source") == "complaint":
        return "投诉仲裁"
    if order_status == "disputed":
        return "投诉仲裁"
    return "售后退款"


def _refund_evidence_lines(evidence) -> list[str]:
    if isinstance(evidence, dict):
        lines = []
        if evidence.get("source") == "complaint":
            lines.append(f"投诉说明：{evidence.get('complaintText') or '-'}")
            lines.append(f"聊天自动关联：{'是' if evidence.get('autoLinkedChat') else '否'}")
            if evidence.get("conversationId"):
                lines.append(f"会话 ID：{evidence.get('conversationId')}")
            lines.append(f"消息数：{int(evidence.get('messageCount') or 0)}")
            if evidence.get("latestMessageHash"):
                lines.append(f"最新消息哈希：{evidence.get('latestMessageHash')}")
            return lines
        return [f"{key}：{value}" for key, value in evidence.items() if value not in (None, "")]
    if isinstance(evidence, list):
        if not evidence:
            return ["暂无附件凭证"]
        return [str(item) for item in evidence]
    return ["暂无附件凭证"]


def _refund_progress(refund: dict, source_text: str, status_text: str) -> list[dict]:
    created_time = datetime_text(refund.get("created_at"))
    updated_time = datetime_text(refund.get("updated_at"))
    resolved_time = datetime_text(refund.get("resolved_at") or refund.get("arbitrated_at"))
    result = refund.get("arbitrate_result") or refund.get("status")
    resolved = result in {"buyer_win", "seller_win"}
    progress = [
        {
            "id": "submitted",
            "title": f"{source_text}已提交",
            "desc": refund.get("reason") or "用户已提交说明和凭证。",
            "time": created_time,
            "done": True,
            "className": "timeline-dot done",
        },
        {
            "id": "reviewing",
            "title": "平台处理中",
            "desc": "管理员可在后台查看订单事件、聊天证据链和双方说明。",
            "time": updated_time if not resolved else "",
            "done": True,
            "className": "timeline-dot done",
        },
    ]
    if resolved:
        progress.append(
            {
                "id": "resolved",
                "title": status_text,
                "desc": refund.get("admin_note") or REFUND_RESULT_TEXT.get(result, "平台已完成处理。"),
                "time": resolved_time,
                "done": True,
                "className": "timeline-dot done",
            }
        )
    else:
        progress.append(
            {
                "id": "pending",
                "title": "等待管理员仲裁",
                "desc": "处理完成后，结果会同步到订单详情和资金流水。",
                "time": "",
                "done": False,
                "className": "timeline-dot pending",
            }
        )
    return progress


def decorate_refund(refund: dict | None, order_status: str | None = None) -> dict | None:
    if not refund:
        return None
    evidence = refund.get("evidence_urls") or []
    status = refund.get("status") or ""
    source_text = _refund_source_text(evidence, order_status)
    status_text = REFUND_STATUS_TEXT.get(status, status or "处理中")
    result = refund.get("arbitrate_result") or status
    summary = REFUND_RESULT_TEXT.get(result) or refund.get("reason") or status_text
    if refund.get("admin_note") and result in {"buyer_win", "seller_win"}:
        summary = f"{summary} 平台说明：{refund.get('admin_note')}"
    return {
        "id": refund.get("id"),
        "type": "complaint" if source_text == "投诉仲裁" else "refund",
        "title": source_text,
        "status": status,
        "active": status in {"pending", "seller_rejected", "arbitrating"},
        "statusText": status_text,
        "reason": refund.get("reason") or "",
        "summary": summary,
        "sellerReply": refund.get("seller_reply") or "",
        "result": result if result in {"buyer_win", "seller_win"} else "",
        "resultText": REFUND_RESULT_TEXT.get(result, ""),
        "adminNote": refund.get("admin_note") or "",
        "createdAt": datetime_text(refund.get("created_at")),
        "updatedAt": datetime_text(refund.get("updated_at")),
        "resolvedAt": datetime_text(refund.get("resolved_at") or refund.get("arbitrated_at")) if result in {"buyer_win", "seller_win"} else "",
        "evidence": _refund_evidence_lines(evidence),
        "progress": _refund_progress(refund, source_text, status_text),
    }


def decorate_order(row: dict, viewer_id: int | None = None) -> dict:
    title = row.get("item_title") or "校园交易订单"
    status = row.get("order_status")
    item_type = row.get("item_type")
    refund = decorate_refund(row.get("refund"), status)
    waiting_errand = row.get("item_type") == "errand" and row.get("order_status") in {
        "unpaid",
        "paid",
    }
    counterparty_label = (
        "服务者"
        if row.get("item_type") == "service"
        else "骑手"
        if row.get("item_type") == "errand"
        else "卖家"
    )
    is_seller = viewer_id is not None and int(row.get("seller_id") or 0) == int(viewer_id)
    is_buyer = viewer_id is not None and int(row.get("buyer_id") or 0) == int(viewer_id)
    has_comment = (
        viewer_id is not None
        and bool(row.get("order_sn"))
        and user_repository.has_comment_for_order(str(row.get("order_sn")), int(viewer_id))
    )
    role = "seller" if is_seller else "buyer" if is_buyer else "buyer"
    if item_type == "errand":
        role = "rider" if is_seller else "publisher"
    buyer_profile = {
        "id": int(row.get("buyer_id") or 0),
        "nickname": row.get("buyer_name") or "同校用户",
        "username": row.get("buyer_username") or "",
        "avatar": row.get("buyer_avatar") or "",
        "role": row.get("buyer_role") or "user",
        "verified": bool(row.get("buyer_verified")),
        "creditScore": row.get("buyer_credit_score") or 0,
        "college": row.get("buyer_college") or "",
    }
    seller_profile = {
        "id": int(row.get("seller_id") or 0),
        "nickname": row.get("seller_name") or "同校用户",
        "username": row.get("seller_username") or "",
        "avatar": row.get("seller_avatar") or "",
        "role": row.get("seller_role") or "user",
        "verified": bool(row.get("seller_verified")),
        "creditScore": row.get("seller_credit_score") or 0,
        "college": row.get("seller_college") or "",
    }
    counterparty_profile = buyer_profile if is_seller else seller_profile
    if waiting_errand and not is_seller:
        counterparty_profile = {}
    counterparty_name = row.get("buyer_name") if is_seller else ("待接单" if waiting_errand else row.get("seller_name"))
    counterparty_username = row.get("buyer_username") if is_seller else row.get("seller_username")
    counterparty_label = "买家" if is_seller and item_type == "goods" else "预约人" if is_seller and item_type == "service" else "发布者" if is_seller and item_type == "errand" else counterparty_label
    can_chat = not waiting_errand
    summary_events = [step["title"] for step in workflow_steps(status, item_type) if step["done"]][-3:]
    if refund and refund.get("statusText") not in summary_events:
        summary_events = (summary_events + [refund["statusText"]])[-3:]
    order = {
        "orderSn": row.get("order_sn"),
        "itemId": int(row.get("item_id") or 0),
        "itemType": row.get("item_type"),
        "itemTypeText": item_type_text(row.get("item_type")),
        "title": title,
        "amount": f"{Decimal(row.get('amount') or 0):.2f}",
        "status": status,
        "statusLabel": order_progress_text(status, item_type),
        "role": role,
        "counterpartyName": counterparty_name,
        "counterpartyUsername": counterparty_username or "",
        "counterpartyLabel": counterparty_label,
        "counterpartyLine": f"{counterparty_label}: {counterparty_name or '同校用户'}",
        "counterpartyId": counterparty_profile.get("id") or 0,
        "counterpartyAvatar": counterparty_profile.get("avatar") or "",
        "counterparty": counterparty_profile,
        "participants": {
            "buyer": buyer_profile,
            "seller": seller_profile,
        },
        "fundText": fund_status_text(row.get("fund_status")),
        "progressText": order_progress_text(status, item_type),
        "latestTime": datetime_text(
            row.get("completed_at") or row.get("paid_at") or row.get("created_at")
        ),
        "hasRefund": bool(refund),
        "refund": refund,
        "refundTitle": refund.get("title") if refund else "",
        "refundStatusText": refund.get("statusText") if refund else "",
        "refundReason": refund.get("summary") if refund else "",
        "summaryEvents": summary_events,
        "workflowSteps": workflow_steps(status, item_type),
        "canChat": can_chat,
        "actionHint": order_action_hint(status, item_type, role, can_chat),
        "hasComment": has_comment,
        "canComment": status == "completed" and not has_comment,
        "errandDetail": {"description": row.get("item_desc") or row.get("remark") or "", "pickupLocation": row.get("pickup_location") or "", "deliveryLocation": row.get("delivery_location") or ""} if item_type == "errand" else None,
    }
    return order


def publication_status_text(status: str | None) -> str:
    return {
        "pending": "审核中",
        "on_sale": "在售",
        "reserved": "交易锁定",
        "sold": "已售出",
        "paused": "暂停",
        "removed": "已下架",
    }.get(status or "", status or "-")


def decorate_publication(row: dict) -> dict:
    item_type = row.get("item_type")
    status = row.get("status")
    amount = Decimal(row.get("price") or 0)
    type_text = item_type_text(item_type)
    status_label = publication_status_text(status)
    return {
        "orderSn": f"PUB-{item_type}-{row.get('id')}",
        "publicationId": f"PUB-{item_type}-{row.get('id')}",
        "itemId": int(row.get("id") or 0),
        "itemType": item_type,
        "itemTypeText": type_text,
        "title": row.get("title") or "我的发布",
        "amount": f"{amount:.2f}",
        "status": status,
        "statusLabel": status_label,
        "role": "publisher",
        "counterpartyName": "等待同校用户",
        "counterpartyUsername": "",
        "counterpartyLabel": "发布状态",
        "counterpartyLine": f"发布状态: {status_label}",
        "fundText": "未生成订单",
        "progressText": f"{type_text}已发布，当前状态：{status_label}",
        "latestTime": datetime_text(row.get("updated_at") or row.get("created_at")),
        "hasRefund": False,
        "refundStatusText": "",
        "summaryEvents": ["发布记录", status_label],
        "workflowSteps": [],
        "canChat": False,
        "actionHint": "等待买家下单" if status == "on_sale" else status_label,
        "hasComment": False,
        "canComment": False,
        "isPublication": True,
    }


def list_orders_for_user(user_id: int) -> list[dict]:
    order_rows = order_repository.list_orders_for_user(user_id)
    refunds = order_repository.list_latest_refunds_for_orders([str(row.get("order_sn") or "") for row in order_rows])
    for row in order_rows:
        row["refund"] = refunds.get(str(row.get("order_sn") or ""))
    orders = [decorate_order(row, user_id) for row in order_rows]
    publications = [decorate_publication(row) for row in order_repository.list_publications_for_user(user_id)]
    order_item_keys = {
        (item.get("itemType"), item.get("itemId"))
        for item in orders
        if item.get("role") in {"seller", "publisher"}
    }
    merged = orders + [
        item
        for item in publications
        if (item.get("itemType"), item.get("itemId")) not in order_item_keys
    ]
    return sorted(merged, key=lambda item: item.get("latestTime") or "", reverse=True)


def get_order_detail_for_user(user_id: int, order_sn: str) -> dict | None:
    row = order_repository.get_order_detail(order_sn)
    if not row:
        return None
    if user_id not in {int(row.get("buyer_id") or 0), int(row.get("seller_id") or 0)}:
        raise PermissionError("order is not owned by current user")
    row["refund"] = order_repository.latest_refund_detail_for_order(order_sn)
    order = decorate_order(row, user_id)
    events = order_repository.list_order_events(order_sn)
    event_timeline = [
        {
            "id": f"{order_sn}-{index}",
            "title": event.get("event_type") or event.get("to_status"),
            "desc": event.get("note") or f"{event.get('from_status') or ''} -> {event.get('to_status') or ''}",
            "time": datetime_text(event.get("created_at")),
            "done": True,
            "className": "timeline-dot done",
        }
        for index, event in enumerate(events)
    ]
    event_time_map = {}
    for event in events:
        to_status = event.get("to_status")
        if to_status and to_status not in event_time_map:
            event_time_map[to_status] = datetime_text(event.get("created_at"))
    timeline = order.get("workflowSteps") or workflow_steps(order.get("status"), order.get("itemType"))
    for item in timeline:
        if item.get("id") in event_time_map:
            item["time"] = event_time_map[item["id"]]
    if event_timeline:
        order["rawEvents"] = event_timeline
    order["timeline"] = timeline
    order["summaryEvents"] = [item["title"] for item in timeline if item.get("done")][-3:]
    if order.get("errandDetail"):
        detail = order["errandDetail"]
        order["summaryCards"] = [{"label": "任务说明", "value": detail["description"] or "暂无补充说明"}, {"label": "取件地点", "value": detail["pickupLocation"] or "待沟通"}, {"label": "送达地点", "value": detail["deliveryLocation"] or "待沟通"}]
    return order
