from __future__ import annotations

import base64
import hashlib
import hmac
import os

from .config import AppConfig


_config: AppConfig | None = None
AESGCM = None

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM as _AESGCM  # type: ignore

    AESGCM = _AESGCM
except Exception:
    AESGCM = None


def configure_crypto(config: AppConfig) -> None:
    global _config
    _config = config


def config() -> AppConfig:
    if _config is None:
        raise RuntimeError("crypto is not configured")
    return _config


def encrypt_sensitive(value: str) -> str:
    text = str(value or "")
    if not text:
        return ""
    key_text = config().pii_encryption_key
    key = hashlib.sha256(key_text.encode("utf-8")).digest()
    if AESGCM:
        nonce = os.urandom(12)
        encrypted = AESGCM(key).encrypt(nonce, text.encode("utf-8"), None)
        return "aes256gcm:v1:" + base64.urlsafe_b64encode(nonce + encrypted).decode("ascii")
    digest = hashlib.sha256((text + ":" + key_text).encode("utf-8")).hexdigest()
    return "hash:v1:" + digest


def decrypt_sensitive(value: str | None) -> str:
    text = str(value or "")
    if not text:
        return ""
    if not text.startswith("aes256gcm:v1:") or not AESGCM:
        return ""
    payload = text.split(":", 2)[2]
    try:
        raw = base64.urlsafe_b64decode(payload.encode("ascii"))
        nonce, encrypted = raw[:12], raw[12:]
        key = hashlib.sha256(config().pii_encryption_key.encode("utf-8")).digest()
        return AESGCM(key).decrypt(nonce, encrypted, None).decode("utf-8")
    except Exception:
        return ""


def stable_sensitive_hash(value: str, purpose: str) -> str:
    text = str(value or "")
    if not text:
        return ""
    digest = hmac.new(
        config().pii_encryption_key.encode("utf-8"),
        f"{purpose}:{text}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"hmac-sha256:v1:{digest}"


def code_hash(email: str, code: str) -> str:
    return hashlib.sha256(
        f"{email}:{code}:{config().email_code_secret}".encode("utf-8")
    ).hexdigest()
