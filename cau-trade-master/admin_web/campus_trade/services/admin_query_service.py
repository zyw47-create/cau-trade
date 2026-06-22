from __future__ import annotations

from datetime import date

from ..repositories import admin as admin_repository
from ..serialization import parse_json_field


def stats_snapshot() -> dict:
    return admin_repository.stats_snapshot()


def dashboard_snapshot() -> dict:
    return {
        "stats": admin_repository.dashboard_stats(),
        "pending_goods": fetch_pending_goods(),
        "refunds": fetch_refunds(),
        "verifications": fetch_verifications(),
        "users": fetch_users(),
        "ai_rule": fetch_ai_rule(),
        "recent_logs": fetch_recent_logs(),
        "today": date.today().isoformat(),
    }


def fetch_pending_goods() -> list[dict]:
    return admin_repository.fetch_pending_goods()


def fetch_refunds() -> list[dict]:
    rows = admin_repository.fetch_refunds()
    for row in rows:
        evidence = parse_json_field(row.get("evidence_urls"), {}) or {}
        if isinstance(evidence, list):
            evidence = {"files": evidence}
        row["evidence"] = evidence
        row["source_text"] = "complaint evidence" if evidence.get("source") == "complaint" or row.get("order_status") == "disputed" else "refund request"
        row["evidence_message_count"] = evidence.get("messageCount") or row.get("message_count") or 0
        row["evidence_latest_hash"] = evidence.get("latestMessageHash") or row.get("latest_message_hash") or ""
        row["evidence_conversation_id"] = evidence.get("conversationId") or row.get("conversation_id") or ""
        row["auto_linked_chat"] = bool(evidence.get("autoLinkedChat") or row.get("conversation_id"))
    return rows


def fetch_verifications() -> list[dict]:
    return admin_repository.fetch_verifications()


def fetch_users() -> list[dict]:
    return admin_repository.fetch_users()


def fetch_ai_rule() -> dict:
    return admin_repository.fetch_ai_rule()


def fetch_recent_logs(limit: int = 35) -> list[dict]:
    return admin_repository.fetch_recent_logs(limit)


def fetch_withdraws() -> list[dict]:
    return admin_repository.fetch_withdraws()


def fetch_audit_log_export_rows() -> list[dict]:
    return admin_repository.fetch_audit_log_export_rows()
