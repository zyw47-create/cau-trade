from __future__ import annotations

import os

from campus_trade.app_factory import create_app as _create_app
from campus_trade.config import AppConfig, load_config


APP_CONFIG = load_config()
ADMIN_ID = APP_CONFIG.admin_id
EMAIL_CODE_TTL_SECONDS = APP_CONFIG.email_code_ttl_seconds
DB_CONFIG = APP_CONFIG.db_config()

app = _create_app(APP_CONFIG)


def create_app(config: AppConfig | None = None):
    """Application factory entrypoint for WSGI, tests, and scripts."""
    return _create_app(config or load_config())


if __name__ == "__main__":
    app.run(
        host=os.getenv("FLASK_HOST", APP_CONFIG.flask_host),
        port=int(os.getenv("FLASK_PORT", str(APP_CONFIG.flask_port))),
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
    )
