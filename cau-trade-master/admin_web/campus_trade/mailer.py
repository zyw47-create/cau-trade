from __future__ import annotations

import smtplib
import ssl

from .config import AppConfig


_config: AppConfig | None = None


def configure_mailer(config: AppConfig) -> None:
    global _config
    _config = config


def config() -> AppConfig:
    if _config is None:
        raise RuntimeError("mailer is not configured")
    return _config


def can_send_real_email() -> bool:
    cfg = config()
    if cfg.mock_email in {"1", "true", "yes"}:
        return False
    if cfg.mock_email in {"0", "false", "no"}:
        return True
    return bool(cfg.smtp_host and cfg.smtp_user and cfg.smtp_pass)


def send_email_code(email: str, code: str):
    cfg = config()
    if not can_send_real_email():
        return
    message = "\r\n".join(
        [
            f"From: {cfg.smtp_from}",
            f"To: {email}",
            "Subject: Campus Trade Email Verification Code",
            "Content-Type: text/plain; charset=utf-8",
            "",
            f"Your verification code is {code}. It expires in {cfg.email_code_ttl_seconds // 60} minutes.",
        ]
    )
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(cfg.smtp_host, cfg.smtp_port, context=context, timeout=12) as smtp:
        smtp.login(cfg.smtp_user, cfg.smtp_pass)
        smtp.sendmail(cfg.smtp_from, [email], message.encode("utf-8"))
