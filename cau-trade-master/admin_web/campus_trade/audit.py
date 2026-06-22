from __future__ import annotations

from .config import AppConfig
from .repositories import admin as admin_repository


_config: AppConfig | None = None


def configure_audit(config: AppConfig) -> None:
    global _config
    _config = config


def add_audit_log(
    conn,
    action: str,
    target_type: str,
    target_id: str | int,
    reason: str,
    before_data=None,
    after_data=None,
    ip_address: str = "",
):
    if _config is None:
        raise RuntimeError("audit is not configured")
    admin_repository.add_audit_log(
        _config.admin_id,
        action,
        target_type,
        target_id,
        reason,
        before_data=before_data,
        after_data=after_data,
        ip_address=ip_address,
    )
