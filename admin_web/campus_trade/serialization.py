from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal


def json_default(value):
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def to_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, default=json_default)


def row_to_api(row: dict | None) -> dict | None:
    if row is None:
        return None
    return json.loads(to_json(row))


def parse_json_field(value, fallback=None):
    if value is None:
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return fallback
