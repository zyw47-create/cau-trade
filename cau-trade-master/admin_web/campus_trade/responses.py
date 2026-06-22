from __future__ import annotations

from flask import g, jsonify


def api_ok(data=None, msg: str = "success"):
    return jsonify(
        {
            "code": 200,
            "msg": msg,
            "data": data or {},
            "trace_id": getattr(g, "trace_id", ""),
        }
    )


def api_error(msg, code: int = 400, status: int = 200):
    return (
        jsonify(
            {
                "code": code,
                "msg": str(msg),
                "data": {},
                "trace_id": getattr(g, "trace_id", ""),
            }
        ),
        status,
    )
