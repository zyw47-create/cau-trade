from __future__ import annotations

from ..ai_gateway import circuit_state
from ..config import AppConfig


def api_status_payload(
    config: AppConfig,
    mysql_name: str,
    redis_state: str,
    smtp_configured: bool,
) -> dict:
    ai_provider = "deepseek" if config.deepseek_api_key else "rule_fallback"
    return {
        "service": "campus-trade-flask-api",
        "mysql": mysql_name,
        "framework": "Flask",
        "architecture": "Flask application factory + controller/service/repository layers + SQLAlchemy engine",
        "persistence": {
            "engine": "SQLAlchemy",
            "access": "ORM sessions via repositories",
            "criticalWrites": "orm_transactions_with_row_locks",
        },
        "layers": [
            "config",
            "database",
            "repositories",
            "controllers",
            "services",
            "ai_gateway",
            "idempotency",
            "thin_app_entrypoint",
        ],
        "routes": {
            "prefixes": ["/api", "/v1/api"],
            "canonical": "resource-oriented REST paths",
            "compatibility": "legacy mini-program action paths remain aliases only",
        },
        "auth": "jwt-hs256",
        "authContract": {
            "wechatCodeRequired": not config.allow_dev_login,
            "bareUserIdLogin": "rejected",
            "bareOpenidLogin": "rejected",
            "bearerRequiredForProtectedApis": True,
            "apiTokenPurpose": "purpose_api_required",
            "uploadTokenPurpose": "purpose_upload_rejected_by_api_auth",
            "liveUserStatusRoleRecheck": True,
            "tokenOpenidBinding": "required_for_api_tokens",
        },
        "adminSession": {
            "login": "password_hash_preferred",
            "csrf": "required_for_html_form_posts",
        },
        "rbac": {
            "adminApis": "jwt_role_admin",
            "miniProgramApis": "live_user_status_openid_binding_and_business_role_checks",
            "businessRoles": {
                "provider": "required_for_service_publish",
                "rider": "required_for_errand_take_status_earnings_withdraw",
            },
        },
        "redis": redis_state,
        "smtpConfigured": smtp_configured,
        "emailMode": "smtp" if smtp_configured else "mock",
        "devLoginEnabled": config.allow_dev_login,
        "demoTokenEnabled": config.allow_demo_token,
        "idempotencyRequired": config.idempotency_required or config.is_production,
        "upload": {
            "maxBytes": config.max_upload_bytes,
            "token": "short_lived_user_scene_bound_upload_token",
            "livePrincipalRecheck": True,
        },
        "aiProvider": ai_provider,
        "ai": {
            "provider": ai_provider,
            "circuit": circuit_state(),
            "moderation": "deepseek_with_keyword_rule_fallback",
            "imageModeration": "local_image_metadata_rule_audit_recorded_when_images_present",
            "generation": "title_description_tags",
            "auditTrail": "ai_audit_records",
        },
        "legacyNode": "disabled_by_default_read_only_boundary",
    }
