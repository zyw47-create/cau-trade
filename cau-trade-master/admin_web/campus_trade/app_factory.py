from __future__ import annotations

from flask import Flask
from werkzeug.exceptions import RequestEntityTooLarge

from .config import ADMIN_WEB_DIR, AppConfig, load_config
from .idempotency import init_idempotency
from .responses import api_error
from .runtime import configure_extensions, register_runtime


def create_app(config: AppConfig | None = None) -> Flask:
    config = config or load_config()
    app = Flask(
        __name__,
        template_folder=str(ADMIN_WEB_DIR / "templates"),
        static_folder=str(ADMIN_WEB_DIR / "static"),
        static_url_path="/static",
    )
    app.config["SECRET_KEY"] = config.flask_secret_key
    app.config["SQLALCHEMY_DATABASE_URI"] = config.database_uri()
    app.config["APP_CONFIG"] = config
    app.config["MAX_CONTENT_LENGTH"] = config.max_upload_bytes

    configure_extensions(config)
    register_runtime(app, config)
    register_controllers(app)
    init_idempotency(app, config)
    register_error_handlers(app)
    return app


def register_controllers(app: Flask) -> None:
    from .controllers import (
        admin_api,
        admin_html,
        assets,
        auth,
        catalog,
        chat,
        orders,
        users,
    )

    for module in (assets, auth, users, catalog, orders, chat, admin_api):
        app.register_blueprint(module.bp)
    register_admin_html_routes(app, admin_html)


def register_admin_html_routes(app: Flask, admin_html) -> None:
    routes = [
        ("/login", "login", admin_html.login, ("GET", "POST")),
        ("/logout", "logout", admin_html.logout, ("GET",)),
        ("/", "dashboard", admin_html.dashboard, ("GET",)),
        ("/goods/<int:goods_id>/audit", "audit_goods", admin_html.audit_goods, ("POST",)),
        ("/refunds/<int:refund_id>/arbitrate", "arbitrate_refund", admin_html.arbitrate_refund, ("POST",)),
        ("/ops/reconcile", "run_wallet_reconcile", admin_html.run_wallet_reconcile, ("POST",)),
        ("/verifications/<int:verification_id>/audit", "audit_verification", admin_html.audit_verification, ("POST",)),
        ("/ai-rules", "save_ai_rules", admin_html.save_ai_rules, ("POST",)),
        ("/users/<int:user_id>/status", "change_user_status", admin_html.change_user_status, ("POST",)),
        ("/exports/audit-logs.csv", "export_audit_logs", admin_html.export_audit_logs, ("GET",)),
    ]
    for rule, endpoint, view_func, methods in routes:
        app.add_url_rule(rule, endpoint=endpoint, view_func=view_func, methods=list(methods))


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(RequestEntityTooLarge)
    def request_entity_too_large(_error):
        return api_error("upload file is too large", 413, 413)
