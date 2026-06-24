from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ADMIN_WEB_DIR = PROJECT_ROOT / "admin_web"
if str(ADMIN_WEB_DIR) not in sys.path:
    sys.path.insert(0, str(ADMIN_WEB_DIR))

from campus_trade.config import load_config
from campus_trade.database import configure_database, session_scope
from sqlalchemy import text


CHECKS = {
    "missing_order": """
        SELECT COUNT(1)
        FROM errand_orders e
        LEFT JOIN orders o ON o.item_type = 'errand' AND o.item_id = e.id
        WHERE o.order_sn IS NULL
    """,
    "accepted_bad_status": """
        SELECT COUNT(1)
        FROM errand_orders e
        JOIN orders o ON o.item_type = 'errand' AND o.item_id = e.id
        WHERE e.status IN ('accepted', 'processing', 'completed')
          AND o.status IN ('unpaid', 'paid')
    """,
    "waiting_self_seller": """
        SELECT COUNT(1)
        FROM errand_orders e
        JOIN orders o ON o.item_type = 'errand' AND o.item_id = e.id
        WHERE e.rider_id IS NULL
          AND o.seller_id = e.publisher_id
    """,
}


def main() -> None:
    configure_database(load_config())
    with session_scope() as session:
        for name, sql in CHECKS.items():
            print(f"{name}={session.execute(text(sql)).scalar()}")


if __name__ == "__main__":
    main()
