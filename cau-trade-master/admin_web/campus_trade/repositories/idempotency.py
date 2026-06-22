from __future__ import annotations

import json
from datetime import datetime, timedelta

from sqlalchemy import select

from models import IdempotencyKey
from ..database import session_scope


def _now() -> datetime:
    return datetime.now()


def begin_request(
    user_id: int,
    key: str,
    path: str,
    digest: str,
    lock_seconds: int = 30,
) -> tuple[str | None, int | None, str | None]:
    now = _now()
    locked_until = now + timedelta(seconds=max(int(lock_seconds or 30), 10))
    with session_scope() as session:
        record = session.execute(
            select(IdempotencyKey)
            .where(
                IdempotencyKey.user_id == user_id,
                IdempotencyKey.idempotency_key == key,
            )
            .with_for_update()
        ).scalar_one_or_none()
        if not record:
            record = IdempotencyKey(
                user_id=user_id,
                idempotency_key=key,
                request_path=path,
                request_hash=digest,
                status="processing",
                locked_until=locked_until,
                created_at=now,
                updated_at=now,
            )
            session.add(record)
            return "started", None, None
        if record.request_hash != digest:
            raise ValueError("idempotency key reused with different request")
        if record.status == "success":
            body = json.dumps(record.response_body or {}, ensure_ascii=False)
            return "replay", record.response_code, body
        if record.status == "processing" and record.locked_until and record.locked_until > now:
            return "processing", record.response_code, None
        record.status = "processing"
        record.locked_until = locked_until
        record.response_code = None
        record.response_body = None
        record.updated_at = now
        return "started", None, None


def finish_request(user_id: int, key: str, code: int, body: str, status: str) -> None:
    if status not in {"success", "failed"}:
        raise ValueError("idempotency final status must be success or failed")
    parsed_body = json.loads(body)
    with session_scope() as session:
        record = session.execute(
            select(IdempotencyKey)
            .where(
                IdempotencyKey.user_id == user_id,
                IdempotencyKey.idempotency_key == key,
            )
            .with_for_update()
        ).scalar_one_or_none()
        if not record:
            raise ValueError("idempotency key not found")
        record.response_code = code
        record.response_body = parsed_body
        record.status = status
        record.locked_until = None
        record.updated_at = _now()
