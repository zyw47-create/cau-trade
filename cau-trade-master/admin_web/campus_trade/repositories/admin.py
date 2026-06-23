from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, desc, func, or_, select

from models import (
    AdminAuditLog,
    AiAuditRecord,
    AiRule,
    Category,
    CreditLog,
    Goods,
    JobLog,
    Notification,
    Order,
    OrderEvent,
    OrderFund,
    RefundRequest,
    User,
    UserProfile,
    UserVerification,
    WalletLog,
    WithdrawRequest,
)
from ..database import engine, session_scope


def _now() -> datetime:
    return datetime.now()


def _nullable_admin_id(admin_id: int | None) -> int | None:
    value = int(admin_id or 0)
    return value if value > 0 else None


def wallet_reconcile(stat_date: str) -> list[dict]:
    with session_scope() as session:
        rows = list(
            session.execute(
                select(Order, OrderFund)
                .outerjoin(OrderFund, OrderFund.order_sn == Order.order_sn)
                .where(func.date(func.coalesce(Order.paid_at, Order.created_at)) <= stat_date)
            )
        )
        abnormal = []
        for order, fund in rows:
            buyer_out = session.scalar(
                select(func.coalesce(func.sum(WalletLog.amount), 0)).where(
                    WalletLog.order_sn == order.order_sn,
                    WalletLog.user_id == order.buyer_id,
                    WalletLog.direction == "out",
                )
            )
            user_in = session.scalar(
                select(func.coalesce(func.sum(WalletLog.amount), 0)).where(
                    WalletLog.order_sn == order.order_sn,
                    WalletLog.user_id == order.seller_id,
                    WalletLog.direction == "in",
                )
            )
            expected_fund = order.status in {"paid", "confirmed", "shipped", "refunding", "refunded", "completed"}
            fund_amount = fund.amount if fund else None
            fund_status = fund.status if fund else "none"
            is_abnormal = int((expected_fund and not fund) or (fund_amount is not None and fund_amount != order.amount))
            data = {
                "order_sn": order.order_sn,
                "order_amount": order.amount,
                "order_status": order.status,
                "fund_amount": fund_amount,
                "fund_status": fund_status,
                "buyer_out_amount": buyer_out or 0,
                "user_in_amount": user_in or 0,
                "is_abnormal": is_abnormal,
            }
            if is_abnormal:
                abnormal.append(data)
        now = _now()
        session.add(
            JobLog(
                job_name="wallet_reconcile",
                status="success" if not abnormal else "partial",
                scanned_count=len(rows),
                success_count=max(0, len(rows) - len(abnormal)),
                fail_count=len(abnormal),
                message=f"reconcile_date={stat_date}, abnormal_count={len(abnormal)}",
                started_at=now,
                finished_at=now,
                created_at=now,
            )
        )
        return abnormal


def arbitrate_refund(refund_id: int, admin_id: int, result: str, note: str) -> bool:
    if result not in {"buyer", "seller"}:
        raise ValueError("arbitrate result must be buyer or seller")
    with session_scope() as session:
        refund = session.execute(select(RefundRequest).where(RefundRequest.id == refund_id).with_for_update()).scalar_one_or_none()
        if not refund:
            return False
        if refund.status not in {"pending", "seller_rejected", "arbitrating"}:
            raise ValueError("refund request is not arbitrable")
        order = session.execute(select(Order).where(Order.order_sn == refund.order_sn).with_for_update()).scalar_one_or_none()
        if not order:
            return False
        now = _now()
        buyer = session.execute(select(User).where(User.id == order.buyer_id).with_for_update()).scalar_one_or_none()
        seller = session.execute(select(User).where(User.id == order.seller_id).with_for_update()).scalar_one_or_none()
        if not buyer or not seller:
            return False
        fund = session.execute(select(OrderFund).where(OrderFund.order_sn == order.order_sn).with_for_update()).scalar_one_or_none()
        if not fund:
            raise ValueError("order fund is missing")
        wallet_logs = []

        def credit(user: User, wallet_type: str, title: str) -> None:
            balance_after = user.balance + order.amount
            user.balance = balance_after
            user.updated_at = now
            wallet_logs.append(
                WalletLog(
                    user_id=user.id,
                    order_sn=order.order_sn,
                    type=wallet_type,
                    direction="in",
                    amount=order.amount,
                    balance_after=balance_after,
                    title=title,
                    note=note,
                    created_at=now,
                )
            )

        def debit(user: User, wallet_type: str, title: str) -> None:
            balance_after = user.balance - order.amount
            user.balance = balance_after
            user.updated_at = now
            wallet_logs.append(
                WalletLog(
                    user_id=user.id,
                    order_sn=order.order_sn,
                    type=wallet_type,
                    direction="out",
                    amount=order.amount,
                    balance_after=balance_after,
                    title=title,
                    note=note,
                    created_at=now,
                )
            )

        if result == "buyer":
            final_status = "refunded"
            refund.status = "buyer_win"
            refund.arbitrate_result = "buyer_win"
            if fund.status in {"frozen", "refunding"}:
                credit(buyer, "refund", f"订单退款 {order.order_sn}")
            elif fund.status == "settled":
                debit(seller, "refund_debit", f"仲裁扣回 {order.order_sn}")
                credit(buyer, "refund", f"订单退款 {order.order_sn}")
            elif fund.status != "refunded":
                raise ValueError("order fund cannot be refunded")
            fund.status = "refunded"
            fund.refunded_at = now
            fund.updated_at = now
            order.status = "refunded"
            if order.item_type == "goods":
                goods = session.execute(select(Goods).where(Goods.id == order.item_id).with_for_update()).scalar_one_or_none()
                if goods:
                    goods.status = "on_sale"
                    goods.updated_at = now
        else:
            final_status = "completed"
            refund.status = "seller_win"
            refund.arbitrate_result = "seller_win"
            if fund.status in {"frozen", "refunding"}:
                credit(seller, "income", f"仲裁结算 {order.order_sn}")
                fund.status = "settled"
                fund.settled_at = now
                fund.updated_at = now
            elif fund.status == "settled":
                fund.settled_at = fund.settled_at or now
                fund.updated_at = now
            elif fund.status == "refunded":
                raise ValueError("order fund has already been refunded")
            else:
                raise ValueError("order fund cannot be settled")
            order.status = "completed"
            order.completed_at = order.completed_at or now
            if order.item_type == "goods":
                goods = session.execute(select(Goods).where(Goods.id == order.item_id).with_for_update()).scalar_one_or_none()
                if goods:
                    goods.status = "sold"
                    goods.updated_at = now
        order.updated_at = now
        refund.admin_id = _nullable_admin_id(admin_id)
        refund.resolved_at = now
        refund.updated_at = now
        session.add_all(wallet_logs)
        session.add(
            OrderEvent(
                order_sn=order.order_sn,
                from_status="refunding",
                to_status=final_status,
                operator_id=_nullable_admin_id(admin_id),
                event_type="arbitrate",
                note=note,
                created_at=now,
            )
        )
        result_text = "买家胜诉，款项已退回买家余额" if result == "buyer" else "卖家/服务者胜诉，款项已结算给交易对方"
        notice_content = f"{result_text}。平台说明：{note or '平台已完成仲裁'}"
        session.add_all(
            [
                Notification(
                    user_id=order.buyer_id,
                    business_type="refund",
                    business_id=order.order_sn,
                    title="售后/投诉已处理",
                    content=notice_content,
                    is_read=0,
                    created_at=now,
                ),
                Notification(
                    user_id=order.seller_id,
                    business_type="refund",
                    business_id=order.order_sn,
                    title="售后/投诉已处理",
                    content=notice_content,
                    is_read=0,
                    created_at=now,
                ),
            ]
        )
        session.add(
            AdminAuditLog(
                admin_id=_nullable_admin_id(admin_id),
                action="refund arbitrated",
                target_type="refund",
                target_id=str(refund_id),
                before_data={"status": "refunding"},
                after_data={"result": result, "order_sn": order.order_sn},
                reason=note,
                created_at=now,
            )
        )
        return True


def audit_withdraw(withdraw_id: int, admin_id: int, status: str, note: str) -> bool:
    if status not in {"approved", "rejected"}:
        raise ValueError("withdraw result must be approved or rejected")
    with session_scope() as session:
        record = session.execute(select(WithdrawRequest).where(WithdrawRequest.id == withdraw_id).with_for_update()).scalar_one_or_none()
        if not record:
            return False
        if record.status != "pending":
            raise ValueError("withdraw request already reviewed")
        now = _now()
        before = {"status": record.status}
        if status == "approved":
            user = session.execute(select(User).where(User.id == record.user_id).with_for_update()).scalar_one_or_none()
            if not user:
                return False
            if user.balance < record.amount:
                raise ValueError("insufficient withdraw balance")
            balance_after = user.balance - record.amount
            user.balance = balance_after
            user.updated_at = now
            session.add(
                WalletLog(
                    user_id=record.user_id,
                    order_sn=None,
                    type="withdraw",
                    direction="out",
                    amount=record.amount,
                    balance_after=balance_after,
                    title=f"提现审核通过 {withdraw_id}",
                    note=note,
                    created_at=now,
                )
            )
        record.status = status
        record.reviewer_id = _nullable_admin_id(admin_id)
        record.review_note = note
        record.reviewed_at = now
        record.updated_at = now
        session.add(
            AdminAuditLog(
                admin_id=_nullable_admin_id(admin_id),
                action="withdraw approved" if status == "approved" else "withdraw rejected",
                target_type="withdraw",
                target_id=str(withdraw_id),
                before_data=before,
                after_data={"status": status},
                reason=note,
                created_at=now,
            )
        )
        return True


def add_audit_log(
    admin_id: int,
    action: str,
    target_type: str,
    target_id: str | int,
    reason: str,
    before_data=None,
    after_data=None,
    ip_address: str = "",
) -> None:
    with session_scope() as session:
        session.add(
            AdminAuditLog(
                admin_id=_nullable_admin_id(admin_id),
                action=action,
                target_type=target_type,
                target_id=str(target_id),
                before_data=before_data,
                after_data=after_data,
                reason=reason,
                ip_address=ip_address,
                created_at=_now(),
            )
        )


def stats_snapshot() -> dict:
    with session_scope() as session:
        return {
            "userCount": int(session.scalar(select(func.count()).select_from(User).where(User.status != "removed")) or 0),
            "pendingGoods": int(session.scalar(select(func.count()).select_from(Goods).where(Goods.status == "pending")) or 0),
            "refundingOrders": int(
                session.scalar(
                    select(func.count()).select_from(RefundRequest).where(RefundRequest.status.in_(["pending", "seller_rejected", "arbitrating"]))
                )
                or 0
            ),
            "pendingWithdraws": int(session.scalar(select(func.count()).select_from(WithdrawRequest).where(WithdrawRequest.status == "pending")) or 0),
            "orderCount": int(session.scalar(select(func.count()).select_from(Order)) or 0),
            "tradeAmount": session.scalar(
                select(func.coalesce(func.sum(Order.amount), 0)).where(Order.status.in_(["paid", "completed", "refunding", "refunded"]))
            )
            or 0,
        }


def dashboard_stats() -> dict:
    stats = stats_snapshot()
    with session_scope() as session:
        stats.update(
            {
                "user_count": stats["userCount"],
                "pending_goods": stats["pendingGoods"],
                "risky_ai_records": int(
                    session.scalar(select(func.count()).select_from(AiAuditRecord).where(AiAuditRecord.risk_level.in_(["manual", "reject"])))
                    or 0
                ),
                "pending_verifications": int(
                    session.scalar(select(func.count()).select_from(UserVerification).where(UserVerification.status == "pending")) or 0
                ),
                "refund_queue": stats["refundingOrders"],
                "order_count": stats["orderCount"],
                "trade_amount": stats["tradeAmount"],
            }
        )
    return stats


def fetch_pending_goods() -> list[dict]:
    with session_scope() as session:
        seller = User.__table__.alias("seller")
        latest_ai = (
            select(
                AiAuditRecord.target_id.label("target_id"),
                func.max(AiAuditRecord.id).label("latest_id"),
            )
            .where(
                and_(
                    AiAuditRecord.target_type == "goods",
                    AiAuditRecord.audit_type.in_(["text_audit", "image_audit"]),
                )
            )
            .group_by(AiAuditRecord.target_id)
            .subquery()
        )
        rows = session.execute(
            select(
                Goods.id,
                Goods.title,
                Goods.price,
                Goods.condition_level,
                Goods.description,
                Goods.location,
                Goods.status,
                Goods.audit_note,
                Goods.created_at,
                Category.name.label("category_name"),
                seller.c.id.label("seller_id"),
                seller.c.nickname.label("seller_name"),
                seller.c.username.label("seller_username"),
                seller.c.credit_score.label("seller_credit_score"),
                seller.c.status.label("seller_status"),
                AiAuditRecord.risk_level.label("ai_risk_level"),
                AiAuditRecord.reason.label("ai_reason"),
                AiAuditRecord.provider.label("ai_provider"),
                AiAuditRecord.created_at.label("ai_created_at"),
            )
            .join(seller, seller.c.id == Goods.seller_id)
            .outerjoin(Category, Category.id == Goods.category_id)
            .outerjoin(latest_ai, latest_ai.c.target_id == Goods.id)
            .outerjoin(AiAuditRecord, AiAuditRecord.id == latest_ai.c.latest_id)
            .where(or_(Goods.status == "pending", AiAuditRecord.risk_level.in_(["manual", "reject"])))
            .order_by(desc(Goods.created_at))
            .limit(50)
        )
        return [dict(row._mapping) for row in rows]


def fetch_refunds() -> list[dict]:
    with session_scope() as session:
        applicant = User.__table__.alias("applicant")
        seller = User.__table__.alias("seller")
        rows = session.execute(
            select(
                RefundRequest.id,
                RefundRequest.order_sn,
                RefundRequest.reason,
                RefundRequest.evidence_urls,
                RefundRequest.status.label("refund_status"),
                RefundRequest.seller_reply,
                RefundRequest.arbitrate_result,
                RefundRequest.created_at,
                RefundRequest.updated_at,
                RefundRequest.resolved_at,
                Order.amount,
                Order.status.label("order_status"),
                Order.item_type,
                Order.item_id,
                Order.item_snapshot,
                Order.remark.label("order_remark"),
                applicant.c.id.label("applicant_id"),
                applicant.c.nickname.label("applicant_name"),
                applicant.c.username.label("applicant_username"),
                applicant.c.credit_score.label("applicant_credit_score"),
                seller.c.id.label("seller_id"),
                seller.c.nickname.label("seller_name"),
                seller.c.username.label("seller_username"),
                seller.c.credit_score.label("seller_credit_score"),
                OrderFund.status.label("fund_status"),
                OrderFund.amount.label("fund_amount"),
            )
            .join(Order, Order.order_sn == RefundRequest.order_sn)
            .join(applicant, applicant.c.id == RefundRequest.applicant_id)
            .join(seller, seller.c.id == RefundRequest.seller_id)
            .outerjoin(OrderFund, OrderFund.order_sn == RefundRequest.order_sn)
            .where(RefundRequest.status.in_(["pending", "seller_rejected", "arbitrating"]))
            .order_by(desc(RefundRequest.created_at))
            .limit(50)
        )
        result = []
        for row in rows:
            data = dict(row._mapping)
            events = session.execute(select(OrderEvent).where(OrderEvent.order_sn == data["order_sn"]))
            event_list = list(events.scalars())
            data["event_count"] = len(event_list)
            data["event_summary"] = " / ".join(f"{event.event_type}:{event.to_status}" for event in event_list)
            data["conversation_id"] = None
            data["message_count"] = None
            data["latest_message_hash"] = None
            result.append(data)
        return result


def fetch_verifications() -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(
                UserVerification.id,
                UserVerification.user_id,
                UserVerification.student_id_enc,
                UserVerification.real_name_enc,
                UserVerification.college,
                UserVerification.school_email,
                UserVerification.email_verified_at,
                UserVerification.student_card_image_url,
                UserVerification.ocr_match_score,
                UserVerification.status,
                UserVerification.review_note,
                UserVerification.reviewed_at,
                UserVerification.created_at,
                User.nickname,
                User.username,
                User.role,
                User.status.label("user_status"),
                User.is_verified,
                User.credit_score,
            )
            .join(User, User.id == UserVerification.user_id)
            .where(UserVerification.status.in_(["pending", "rejected"]))
            .order_by(desc(UserVerification.created_at))
            .limit(50)
        )
        return [dict(row._mapping) for row in rows]


def fetch_users() -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(
                User.id,
                User.nickname,
                User.username,
                User.role,
                User.status,
                User.is_verified,
                User.credit_score,
                User.balance,
                User.frozen_balance,
                User.created_at,
                UserProfile.campus_area,
                UserProfile.major,
                UserProfile.completed_trade_count,
                UserProfile.good_rate_snapshot,
                UserProfile.last_active_at,
            )
            .outerjoin(UserProfile, UserProfile.user_id == User.id)
            .order_by(User.id)
            .limit(80)
        )
        return [dict(row._mapping) for row in rows]


def fetch_ai_rule() -> dict:
    with session_scope() as session:
        rule = session.execute(
            select(AiRule).where(AiRule.rule_name == "default_publish_audit").limit(1)
        ).scalar_one_or_none()
        if not rule:
            return {
                "rule_name": "default_publish_audit",
                "text_audit_enabled": 1,
                "image_audit_enabled": 1,
                "manual_risk_level": "manual",
                "keywords": "violation,fraud,scalping,agent,dangerous goods",
                "updated_at": None,
            }
        return {
            "id": rule.id,
            "rule_name": rule.rule_name,
            "text_audit_enabled": rule.text_audit_enabled,
            "image_audit_enabled": rule.image_audit_enabled,
            "manual_risk_level": rule.manual_risk_level,
            "keywords": rule.keywords,
            "updated_at": rule.updated_at,
        }


def fetch_recent_logs(limit: int = 35) -> list[dict]:
    with session_scope() as session:
        admin = User.__table__.alias("admin_user")
        rows = session.execute(
            select(
                AdminAuditLog.id,
                AdminAuditLog.admin_id,
                AdminAuditLog.action,
                AdminAuditLog.target_type,
                AdminAuditLog.target_id,
                AdminAuditLog.reason,
                AdminAuditLog.ip_address,
                AdminAuditLog.created_at,
                admin.c.nickname.label("admin_name"),
                admin.c.username.label("admin_username"),
            )
            .outerjoin(admin, admin.c.id == AdminAuditLog.admin_id)
            .order_by(desc(AdminAuditLog.created_at), desc(AdminAuditLog.id))
            .limit(limit)
        )
        return [dict(row._mapping) for row in rows]


def fetch_withdraws() -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(
                WithdrawRequest.id,
                WithdrawRequest.user_id,
                WithdrawRequest.amount,
                WithdrawRequest.reason,
                WithdrawRequest.status,
                WithdrawRequest.created_at,
                User.nickname,
                User.username,
                User.role,
            )
            .join(User, User.id == WithdrawRequest.user_id)
            .order_by(desc(WithdrawRequest.created_at))
            .limit(100)
        )
        return [dict(row._mapping) for row in rows]


def fetch_audit_log_export_rows() -> list[dict]:
    with session_scope() as session:
        admin = User.__table__.alias("admin_user")
        rows = session.execute(
            select(
                AdminAuditLog.id,
                AdminAuditLog.created_at,
                func.coalesce(admin.c.username, "system").label("admin_username"),
                AdminAuditLog.action,
                AdminAuditLog.target_type,
                AdminAuditLog.target_id,
                AdminAuditLog.reason,
                AdminAuditLog.ip_address,
            )
            .outerjoin(admin, admin.c.id == AdminAuditLog.admin_id)
            .order_by(desc(AdminAuditLog.created_at), desc(AdminAuditLog.id))
            .limit(500)
        )
        return [dict(row._mapping) for row in rows]


def audit_goods(goods_id: int, status: str, note: str, action: str, admin_id: int, ip_address: str) -> bool:
    with session_scope() as session:
        normalized_admin_id = _nullable_admin_id(admin_id)
        goods = session.execute(select(Goods).where(Goods.id == goods_id).with_for_update()).scalar_one_or_none()
        if not goods:
            return False
        before = {
            "id": goods.id,
            "title": goods.title,
            "seller_id": goods.seller_id,
            "status": goods.status,
            "audit_note": goods.audit_note,
        }
        goods.status = status
        goods.audit_note = note
        goods.updated_at = _now()
        session.add(
            Notification(
                user_id=goods.seller_id,
                business_type="goods",
                business_id=str(goods_id),
                title=action,
                content=f"{goods.title}: {note}",
                is_read=0,
                created_at=_now(),
            )
        )
        session.add(
            AdminAuditLog(
                admin_id=normalized_admin_id,
                action=action,
                target_type="goods",
                target_id=str(goods_id),
                before_data=before,
                after_data={"status": status, "audit_note": note},
                reason=note,
                ip_address=ip_address,
                created_at=_now(),
            )
        )
        return True


def update_user_status(user_id: int, status: str) -> bool:
    with session_scope() as session:
        user = session.get(User, user_id)
        if not user:
            return False
        user.status = status
        user.updated_at = _now()
        return True


def upsert_ai_rule(data: dict, admin_id: int, ip_address: str) -> None:
    with session_scope() as session:
        normalized_admin_id = _nullable_admin_id(admin_id)
        rule = session.execute(
            select(AiRule).where(AiRule.rule_name == "default_publish_audit").limit(1)
        ).scalar_one_or_none()
        now = _now()
        if not rule:
            rule = AiRule(
                rule_name="default_publish_audit",
                text_audit_enabled=data["text_enabled"],
                image_audit_enabled=data["image_enabled"],
                manual_risk_level=data["manual_level"],
                keywords=data["keywords"],
                updated_by=normalized_admin_id,
                created_at=now,
                updated_at=now,
            )
            session.add(rule)
        else:
            rule.text_audit_enabled = data["text_enabled"]
            rule.image_audit_enabled = data["image_enabled"]
            rule.manual_risk_level = data["manual_level"]
            rule.keywords = data["keywords"]
            rule.updated_by = normalized_admin_id
            rule.updated_at = now
        session.add(
            AdminAuditLog(
                admin_id=normalized_admin_id,
                action="AI audit rule updated",
                target_type="ai_rules",
                target_id="default_publish_audit",
                before_data=None,
                after_data=data,
                reason="updated publish audit rule",
                ip_address=ip_address,
                created_at=now,
            )
        )


def audit_verification(verification_id: int, result: str, note: str, admin_id: int, ip_address: str) -> dict | None:
    role_apply_map = {"ROLE_PROVIDER": "provider", "ROLE_RIDER": "rider"}
    with session_scope() as session:
        normalized_admin_id = _nullable_admin_id(admin_id)
        verification = session.execute(
            select(UserVerification).where(UserVerification.id == verification_id).with_for_update()
        ).scalar_one_or_none()
        if not verification:
            return None
        user = session.get(User, verification.user_id)
        if not user:
            return None
        if verification.status != "pending":
            return {"error": "reviewed"}
        before = {
            "id": verification.id,
            "user_id": verification.user_id,
            "status": verification.status,
            "student_id_enc": verification.student_id_enc,
        }
        now = _now()
        target_role = role_apply_map.get(str(verification.student_id_enc or ""))
        if result == "approve":
            verification.status = "approved"
            verification.reviewer_id = normalized_admin_id
            verification.review_note = note
            verification.reviewed_at = now
            verification.email_verified_at = verification.email_verified_at or now
            if target_role:
                user.role = target_role
                user.status = "active"
                after = {"status": "approved", "role": target_role}
                action = "role application approved"
            else:
                user.is_verified = 1
                user.status = "active"
                user.student_id_enc = verification.student_id_enc
                user.real_name_enc = verification.real_name_enc
                user.college = verification.college
                next_score = min(100, int(user.credit_score) + 5)
                change = max(0, next_score - int(user.credit_score))
                user.credit_score = next_score
                session.add(
                    CreditLog(
                        user_id=user.id,
                        change_value=change,
                        reason_type="verify_approved",
                        reason_detail=note,
                        related_type="verification",
                        related_id=str(verification_id),
                        operator_id=normalized_admin_id,
                        score_after=next_score,
                        created_at=now,
                    )
                )
                after = {"status": "approved", "user_verified": 1}
                action = "real-name verification approved"
        else:
            verification.status = "rejected"
            verification.reviewer_id = normalized_admin_id
            verification.review_note = note
            verification.reviewed_at = now
            approved_count = session.scalar(
                select(func.count()).select_from(UserVerification).where(
                    and_(
                        UserVerification.user_id == user.id,
                        UserVerification.status == "approved",
                        ~UserVerification.student_id_enc.in_(["ROLE_PROVIDER", "ROLE_RIDER"]),
                    )
                )
            )
            if int(approved_count or 0) == 0:
                user.is_verified = 0
                user.status = "pending_verify"
            after = {"status": "rejected", "note": note}
            action = "real-name verification rejected"
        user.updated_at = now
        session.add(
            AdminAuditLog(
                admin_id=normalized_admin_id,
                action=action,
                target_type="verification",
                target_id=str(verification_id),
                before_data=before,
                after_data=after,
                reason=note,
                ip_address=ip_address,
                created_at=now,
            )
        )
        return {"id": verification_id, **after}


def change_user_status(user_id: int, action: str, note: str, admin_id: int, ip_address: str) -> dict | None:
    with session_scope() as session:
        normalized_admin_id = _nullable_admin_id(admin_id)
        user = session.execute(select(User).where(User.id == user_id).with_for_update()).scalar_one_or_none()
        if not user:
            return None
        before = {"id": user.id, "username": user.username, "nickname": user.nickname, "status": user.status, "credit_score": user.credit_score}
        if action == "ban":
            new_status = "banned"
            new_score = min(int(user.credit_score), 60)
            action_name = "user banned"
        else:
            new_status = "active"
            new_score = int(user.credit_score)
            action_name = "user unbanned"
        user.status = new_status
        user.credit_score = new_score
        user.updated_at = _now()
        if new_score != int(before["credit_score"]):
            session.add(
                CreditLog(
                    user_id=user_id,
                    change_value=new_score - int(before["credit_score"]),
                    reason_type="violation",
                    reason_detail=note,
                    related_type="admin_action",
                    related_id=f"user-{user_id}",
                    operator_id=normalized_admin_id,
                    score_after=new_score,
                    created_at=_now(),
                )
            )
        session.add(
            AdminAuditLog(
                admin_id=normalized_admin_id,
                action=action_name,
                target_type="user",
                target_id=str(user_id),
                before_data=before,
                after_data={"status": new_status, "credit_score": new_score},
                reason=note,
                ip_address=ip_address,
                created_at=_now(),
            )
        )
        return {"id": user_id, "status": new_status, "creditScore": new_score}


def latest_backup() -> dict:
    with session_scope() as session:
        row = session.execute(
            select(AdminAuditLog)
            .where(AdminAuditLog.target_type == "backup")
            .order_by(desc(AdminAuditLog.created_at), desc(AdminAuditLog.id))
            .limit(1)
        ).scalar_one_or_none()
        if not row:
            return {"fileName": "", "createdAt": "", "status": "none"}
        return {
            "fileName": f"campus_trade_backup_{row.target_id}.sql",
            "createdAt": row.created_at,
            "status": "created",
        }


def ops_health_events() -> dict:
    with session_scope() as session:
        jobs = session.execute(
            select(JobLog.job_name, JobLog.status, JobLog.message, JobLog.created_at)
            .order_by(desc(JobLog.created_at))
            .limit(10)
        )
        return {
            "mysqlVersion": engine().dialect.server_version_info,
            "events": [dict(row._mapping) for row in jobs],
            "latestBackup": latest_backup(),
        }
