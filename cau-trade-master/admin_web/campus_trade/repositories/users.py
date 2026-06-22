from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import and_, desc, func, select
from sqlalchemy.exc import IntegrityError

from models import (
    AiAuditRecord,
    Comment,
    CreditLog,
    EmailVerificationCode,
    Favorite,
    Goods,
    Order,
    OrderEvent,
    Service,
    User,
    UserProfile,
    UserVerification,
)
from ..database import session_scope


def _now() -> datetime:
    return datetime.now()


def _to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "openid": user.openid,
        "nickname": user.nickname,
        "username": user.username,
        "role": user.role,
        "status": user.status,
        "is_verified": user.is_verified,
        "credit_score": user.credit_score,
        "balance": user.balance,
        "avatar_url": user.avatar_url or "",
    }


def get_user_by_openid(openid: str) -> dict | None:
    with session_scope() as session:
        user = session.execute(select(User).where(User.openid == openid)).scalar_one_or_none()
        return _to_dict(user) if user else None


def get_auth_principal(user_id: int) -> dict | None:
    with session_scope() as session:
        user = session.get(User, user_id)
        if not user:
            return None
        return {
            "id": user.id,
            "role": user.role,
            "status": user.status,
            "openid": user.openid,
        }


def create_dev_user(openid: str, nickname: str, username: str) -> dict:
    with session_scope() as session:
        user = session.execute(select(User).where(User.openid == openid)).scalar_one_or_none()
        if not user:
            now = _now()
            unique_username = _unique_username(session, username)
            user = User(
                openid=openid,
                nickname=nickname,
                username=unique_username,
                role="user",
                status="active",
                is_verified=0,
                credit_score=100,
                balance=0,
                frozen_balance=0,
                created_at=now,
                updated_at=now,
            )
            session.add(user)
            session.flush()
        else:
            user.updated_at = _now()
        return _to_dict(user)


def create_wechat_user(openid: str, nickname: str, avatar_url: str = "") -> dict:
    with session_scope() as session:
        user = session.execute(select(User).where(User.openid == openid)).scalar_one_or_none()
        now = _now()
        if not user:
            username = _unique_username(session, "wx_" + openid.replace("-", "_")[-24:])
            user = User(
                openid=openid,
                nickname=(nickname or "Campus User")[:64],
                username=username,
                avatar_url=(avatar_url or "")[:255] or None,
                role="user",
                status="active",
                is_verified=0,
                credit_score=100,
                balance=0,
                frozen_balance=0,
                created_at=now,
                updated_at=now,
            )
            session.add(user)
            session.flush()
        else:
            if nickname:
                user.nickname = str(nickname)[:64]
            if avatar_url:
                user.avatar_url = str(avatar_url)[:255]
            user.updated_at = now
        return _to_dict(user)


def _unique_username(session, username: str) -> str:
    base = (username or "dev_user").strip()[:48] or "dev_user"
    candidate = base
    suffix = 1
    while session.execute(select(User.id).where(User.username == candidate).limit(1)).first():
        suffix += 1
        candidate = f"{base}_{suffix}"[:64]
    return candidate


def get_profile(user_id: int) -> dict | None:
    with session_scope() as session:
        user = session.get(User, user_id)
        if not user:
            return None
        return {
            "id": user.id,
            "nickname": user.nickname,
            "username": user.username,
            "role": user.role,
            "status": user.status,
            "is_verified": user.is_verified,
            "credit_score": user.credit_score,
            "balance": user.balance,
            "frozen_balance": user.frozen_balance,
            "college": user.college,
            "avatar_url": user.avatar_url,
            "phone_enc": user.phone_enc,
            "address": user.address,
        }


def list_role_certifications(user_id: int, current_role: str | None = None) -> dict:
    role_markers = {"ROLE_PROVIDER": "provider", "ROLE_RIDER": "rider"}
    certifications: dict[str, dict] = {}
    with session_scope() as session:
        rows = session.execute(
            select(
                UserVerification.id,
                UserVerification.student_id_enc,
                UserVerification.status,
                UserVerification.review_note,
                UserVerification.reviewed_at,
                UserVerification.created_at,
            )
            .where(
                and_(
                    UserVerification.user_id == user_id,
                    UserVerification.student_id_enc.in_(role_markers.keys()),
                )
            )
            .order_by(desc(UserVerification.created_at), desc(UserVerification.id))
        )
        for row in rows:
            item = dict(row._mapping)
            role = role_markers.get(str(item.get("student_id_enc") or ""))
            if not role or role in certifications:
                continue
            certifications[role] = {
                "role": role,
                "status": item.get("status") or "pending",
                "verificationId": item.get("id"),
                "reviewNote": item.get("review_note") or "",
                "reviewedAt": item.get("reviewed_at"),
                "appliedAt": item.get("created_at"),
            }
    if current_role in {"provider", "rider"}:
        certifications[current_role] = {
            **certifications.get(current_role, {"role": current_role}),
            "status": "approved",
        }
    return certifications


def update_profile(user_id: int, nickname: str, username: str, phone_enc: str, address: str) -> None:
    with session_scope() as session:
        user = session.get(User, user_id)
        if user:
            user.nickname = nickname
            user.username = username
            user.phone_enc = phone_enc
            user.address = address
            user.updated_at = _now()


def update_phone(user_id: int, phone_enc: str) -> None:
    with session_scope() as session:
        user = session.get(User, user_id)
        if user:
            user.phone_enc = phone_enc
            user.updated_at = _now()


def get_public_profile(user_id: int) -> dict | None:
    with session_scope() as session:
        review_count = int(
            session.scalar(
                select(func.count())
                .select_from(Comment)
                .where(and_(Comment.target_user_id == user_id, Comment.status == "normal"))
            )
            or 0
        )
        good_count = int(
            session.scalar(
                select(func.count())
                .select_from(Comment)
                .where(
                    and_(
                        Comment.target_user_id == user_id,
                        Comment.status == "normal",
                        Comment.score >= 4,
                    )
                )
            )
            or 0
        )
        completed_count = int(
            session.scalar(
                select(func.count())
                .select_from(Order)
                .where(
                    and_(
                        Order.status == "completed",
                        (Order.buyer_id == user_id) | (Order.seller_id == user_id),
                    )
                )
            )
            or 0
        )
        active_goods_count = int(
            session.scalar(
                select(func.count())
                .select_from(Goods)
                .where(and_(Goods.seller_id == user_id, Goods.status == "on_sale"))
            )
            or 0
        )
        active_service_count = int(
            session.scalar(
                select(func.count())
                .select_from(Service)
                .where(and_(Service.provider_id == user_id, Service.status == "on_sale"))
            )
            or 0
        )
        row = session.execute(
            select(User, UserProfile)
            .outerjoin(UserProfile, UserProfile.user_id == User.id)
            .where(User.id == user_id)
        ).first()
        if not row:
            return None
        user, profile = row
        return {
            "id": user.id,
            "nickname": user.nickname,
            "username": user.username,
            "role": user.role,
            "status": user.status,
            "is_verified": user.is_verified,
            "credit_score": user.credit_score,
            "college": user.college or "",
            "bio": profile.bio if profile else "",
            "completed_trade_count": completed_count,
            "good_rate_snapshot": round(good_count * 100 / review_count, 1) if review_count else 100,
            "review_count": review_count,
            "active_goods_count": active_goods_count,
            "active_service_count": active_service_count,
        }


def list_public_reviews(user_id: int) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(
                Comment.id,
                Comment.score,
                Comment.content,
                Comment.created_at,
                User.nickname.label("fromName"),
                User.username.label("fromUsername"),
            )
            .join(User, User.id == Comment.evaluator_id)
            .where(and_(Comment.target_user_id == user_id, Comment.status == "normal"))
            .order_by(desc(Comment.created_at))
            .limit(20)
        )
        return [dict(row._mapping) for row in rows]


def has_comment_for_order(order_sn: str, evaluator_id: int) -> bool:
    with session_scope() as session:
        return bool(
            session.execute(
                select(Comment.id)
                .where(
                    and_(
                        Comment.order_sn == order_sn,
                        Comment.evaluator_id == evaluator_id,
                        Comment.status == "normal",
                    )
                )
                .limit(1)
            ).first()
        )


def list_public_goods(user_id: int) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(Goods.id, Goods.title, Goods.price, Goods.images)
            .where(and_(Goods.seller_id == user_id, Goods.status == "on_sale"))
            .order_by(desc(Goods.created_at))
            .limit(10)
        )
        return [dict(row._mapping) for row in rows]


def list_public_services(user_id: int) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(Service.id, Service.title, Service.price, Service.images)
            .where(and_(Service.provider_id == user_id, Service.status == "on_sale"))
            .order_by(desc(Service.created_at))
            .limit(10)
        )
        return [dict(row._mapping) for row in rows]


def get_credit_summary(user_id: int) -> dict:
    with session_scope() as session:
        user = session.get(User, user_id)
        rows = session.execute(
            select(
                CreditLog.change_value,
                CreditLog.reason_type,
                CreditLog.reason_detail,
                CreditLog.score_after,
                CreditLog.created_at,
            )
            .where(CreditLog.user_id == user_id)
            .order_by(desc(CreditLog.created_at))
            .limit(20)
        )
        return {
            "score": user.credit_score if user else 100,
            "records": [dict(row._mapping) for row in rows],
        }


def set_user_role(user_id: int, role: str) -> bool:
    with session_scope() as session:
        user = session.get(User, user_id)
        if not user:
            return False
        user.role = role
        user.updated_at = _now()
        return True


def approve_role_application(user_id: int, role: str, admin_id: int | None = None, note: str = "Local development auto approval") -> dict:
    if role not in {"provider", "rider"}:
        return {"role": role, "status": "approved"}
    marker = f"ROLE_{role.upper()}"
    with session_scope() as session:
        now = _now()
        user = session.get(User, user_id)
        if not user:
            return {"role": role, "status": "missing"}
        reviewer_id = admin_id if admin_id and session.get(User, admin_id) else None
        record = session.execute(
            select(UserVerification)
            .where(
                and_(
                    UserVerification.user_id == user_id,
                    UserVerification.student_id_enc == marker,
                )
            )
            .order_by(desc(UserVerification.created_at), desc(UserVerification.id))
            .limit(1)
            .with_for_update()
        ).scalar_one_or_none()
        if not record:
            record = UserVerification(
                user_id=user_id,
                student_id_enc=marker,
                real_name_enc=marker,
                college=user.college or "role_application",
                status="approved",
                reviewer_id=reviewer_id,
                review_note=note,
                reviewed_at=now,
                email_verified_at=now,
                created_at=now,
            )
            session.add(record)
        else:
            record.status = "approved"
            record.reviewer_id = reviewer_id
            record.review_note = note
            record.reviewed_at = now
            record.email_verified_at = record.email_verified_at or now
        user.role = role
        user.status = "active"
        user.updated_at = now
        session.flush()
        return {"role": role, "status": "approved", "verificationId": int(record.id)}


def is_user_verified(user_id: int) -> bool:
    with session_scope() as session:
        user = session.get(User, user_id)
        return bool(user and int(user.is_verified or 0))


def get_user_role(user_id: int) -> str | None:
    with session_scope() as session:
        user = session.get(User, user_id)
        return str(user.role) if user else None


def find_pending_role_application(user_id: int, marker: str) -> dict | None:
    with session_scope() as session:
        record = session.execute(
            select(UserVerification)
            .where(
                and_(
                    UserVerification.user_id == user_id,
                    UserVerification.student_id_enc == marker,
                    UserVerification.status == "pending",
                )
            )
            .order_by(desc(UserVerification.id))
            .limit(1)
        ).scalar_one_or_none()
        return {"id": record.id, "status": record.status} if record else None


def create_role_application(
    user_id: int,
    marker: str,
    encrypted_contact: str,
    college: str,
    role: str,
) -> int:
    with session_scope() as session:
        record = UserVerification(
            user_id=user_id,
            student_id_enc=marker,
            real_name_enc=encrypted_contact,
            college=college,
            status="pending",
            review_note=f"Role application: {role}",
            created_at=_now(),
        )
        session.add(record)
        session.flush()
        return int(record.id)


def create_email_code(user_id: int, email: str, hashed_code: str, ttl_seconds: int) -> datetime:
    expires_at = _now() + timedelta(seconds=ttl_seconds)
    with session_scope() as session:
        pending = session.execute(
            select(EmailVerificationCode).where(
                and_(
                    EmailVerificationCode.user_id == user_id,
                    EmailVerificationCode.email == email,
                    EmailVerificationCode.status == "pending",
                )
            )
        ).scalars()
        now = _now()
        for record in pending:
            record.status = "expired"
            record.updated_at = now
        session.add(
            EmailVerificationCode(
                user_id=user_id,
                email=email,
                code_hash=hashed_code,
                purpose="campus_verify",
                status="pending",
                attempt_count=0,
                expires_at=expires_at,
                created_at=now,
                updated_at=now,
            )
        )
    return expires_at


def latest_pending_email_code(user_id: int, email: str) -> dict | None:
    with session_scope() as session:
        record = session.execute(
            select(EmailVerificationCode)
            .where(
                and_(
                    EmailVerificationCode.user_id == user_id,
                    EmailVerificationCode.email == email,
                    EmailVerificationCode.status == "pending",
                )
            )
            .order_by(desc(EmailVerificationCode.created_at), desc(EmailVerificationCode.id))
            .limit(1)
        ).scalar_one_or_none()
        if not record:
            return None
        return {
            "id": record.id,
            "code_hash": record.code_hash,
            "attempt_count": record.attempt_count,
            "expires_at": record.expires_at,
        }


def update_email_code_status(record_id: int, status: str) -> None:
    with session_scope() as session:
        record = session.get(EmailVerificationCode, record_id)
        if record:
            record.status = status
            record.verified_at = _now() if status == "verified" else record.verified_at
            record.updated_at = _now()


def increment_email_code_attempts(record_id: int) -> None:
    with session_scope() as session:
        record = session.get(EmailVerificationCode, record_id)
        if record:
            record.attempt_count = int(record.attempt_count or 0) + 1
            record.updated_at = _now()


def student_hash_owner(student_hash: str) -> int | None:
    with session_scope() as session:
        return session.scalar(select(User.id).where(User.student_id_enc == student_hash).limit(1))


def approve_campus_identity(
    user_id: int,
    record_id: int,
    student_hash: str,
    real_name_hash: str,
    college: str,
    email: str,
    admin_id: int,
) -> None:
    with session_scope() as session:
        now = _now()
        code_record = session.get(EmailVerificationCode, record_id)
        if code_record:
            code_record.status = "verified"
            code_record.verified_at = now
            code_record.updated_at = now
        user = session.get(User, user_id)
        if user:
            user.student_id_enc = student_hash
            user.real_name_enc = real_name_hash
            user.college = college
            user.is_verified = 1
            user.status = "active"
            user.updated_at = now
        session.add(
            UserVerification(
                user_id=user_id,
                student_id_enc=student_hash,
                real_name_enc=real_name_hash,
                college=college,
                school_email=email,
                email_verified_at=now,
                status="approved",
                reviewer_id=admin_id,
                review_note="Campus email code verified automatically",
                reviewed_at=now,
                created_at=now,
            )
        )


def toggle_goods_favorite(user_id: int, goods_id: int) -> dict | None:
    with session_scope() as session:
        goods = session.execute(
            select(Goods).where(and_(Goods.id == goods_id, Goods.status != "removed")).with_for_update()
        ).scalar_one_or_none()
        if not goods:
            return None
        favorite = session.execute(
            select(Favorite).where(
                and_(
                    Favorite.user_id == user_id,
                    Favorite.target_type == "goods",
                    Favorite.target_id == goods_id,
                )
            )
        ).scalar_one_or_none()
        if favorite:
            session.delete(favorite)
            is_favorite = False
            delta = -1
        else:
            session.add(Favorite(user_id=user_id, target_type="goods", target_id=goods_id, created_at=_now()))
            is_favorite = True
            delta = 1
        goods.favorite_count = max(0, int(goods.favorite_count or 0) + delta)
        goods.updated_at = _now()
        return {"favorite": is_favorite, "favoriteCount": goods.favorite_count}


def update_goods_status(user_id: int, goods_id: int, status: str) -> bool:
    with session_scope() as session:
        goods = session.execute(
            select(Goods).where(and_(Goods.id == goods_id, Goods.seller_id == user_id))
        ).scalar_one_or_none()
        if not goods:
            return False
        goods.status = status
        goods.updated_at = _now()
        return True


def get_order_for_comment(order_sn: str) -> dict | None:
    with session_scope() as session:
        order = session.get(Order, order_sn)
        if not order:
            return None
        return {
            "order_sn": order.order_sn,
            "buyer_id": order.buyer_id,
            "seller_id": order.seller_id,
            "item_type": order.item_type,
            "item_id": order.item_id,
            "status": order.status,
        }


def create_comment_with_audit_event(
    order_sn: str,
    evaluator_id: int,
    target_user_id: int,
    target_type: str,
    target_id: int,
    score: int,
    content: str,
    request_id: str,
) -> int:
    with session_scope() as session:
        now = _now()
        exists = session.execute(
            select(Comment.id)
            .where(
                and_(
                    Comment.order_sn == order_sn,
                    Comment.evaluator_id == evaluator_id,
                    Comment.status == "normal",
                )
            )
            .limit(1)
            .with_for_update()
        ).first()
        if exists:
            raise IntegrityError("duplicate comment", None, None)
        comment = Comment(
            order_sn=order_sn,
            evaluator_id=evaluator_id,
            target_user_id=target_user_id,
            target_type=target_type,
            target_id=target_id,
            score=score,
            content=content,
            status="normal",
            created_at=now,
        )
        session.add(comment)
        session.flush()
        session.add(
            AiAuditRecord(
                target_type="comment",
                target_id=comment.id,
                audit_type="text_audit",
                provider="rule",
                request_id=request_id,
                risk_level="pass",
                reason="Comment passed rule audit",
                raw_result={"score": score},
                created_at=now,
            )
        )
        session.add(
            OrderEvent(
                order_sn=order_sn,
                to_status="completed",
                operator_id=evaluator_id,
                event_type="comment",
                note="User submitted a trade comment",
                created_at=now,
            )
        )
        return int(comment.id)


def count_users_excluding_removed(session) -> int:
    return int(session.scalar(select(func.count()).select_from(User).where(User.status != "removed")) or 0)
