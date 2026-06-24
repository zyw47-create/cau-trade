from __future__ import annotations

import json

from .config import AppConfig
from .serialization import to_json


redis_client = None
_redis_url = ""


def configure_cache(config: AppConfig) -> None:
    global redis_client, _redis_url
    _redis_url = config.redis_url
    redis_client = None
    if not config.redis_url:
        return
    try:
        import redis  # type: ignore

        redis_client = redis.Redis.from_url(config.redis_url, decode_responses=True)
        redis_client.ping()
    except Exception:
        redis_client = None


def redis_status() -> str:
    if not _redis_url:
        return "not_configured"
    return "connected" if redis_client else "fallback_mysql"


def redis_rate_limited(key: str, limit: int, ttl_seconds: int) -> bool:
    if not redis_client:
        return False
    try:
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, ttl_seconds)
        return int(count) > limit
    except Exception:
        return False


def redis_lock(key: str, ttl_seconds: int) -> bool:
    if not redis_client:
        return True
    try:
        return bool(redis_client.set(key, "1", nx=True, ex=ttl_seconds))
    except Exception:
        return True


def redis_unlock(key: str):
    if not redis_client:
        return
    try:
        redis_client.delete(key)
    except Exception:
        return


def redis_get_json(key: str):
    if not redis_client:
        return None
    try:
        raw = redis_client.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


def redis_set_json(key: str, value, ttl_seconds: int):
    if not redis_client:
        return
    try:
        redis_client.setex(key, ttl_seconds, to_json(value))
    except Exception:
        return


def redis_delete_pattern(pattern: str):
    if not redis_client:
        return
    try:
        cursor = 0
        while True:
            cursor, keys = redis_client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                redis_client.delete(*keys)
            if cursor == 0:
                break
    except Exception:
        return
