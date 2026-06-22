from __future__ import annotations

import os
import re
import sys
import time
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
ADMIN_WEB = ROOT / "admin_web"
if str(ADMIN_WEB) not in sys.path:
    sys.path.insert(0, str(ADMIN_WEB))


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("TESTING", "1")
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("ADMIN_DB_PASSWORD", "123456")
    monkeypatch.setenv("ALLOW_DEV_LOGIN", "1")
    monkeypatch.setenv("ALLOW_DEMO_TOKEN", "0")
    monkeypatch.setenv("FLASK_SECRET_KEY", "test-flask-secret")
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret")
    monkeypatch.setenv("EMAIL_CODE_SECRET", "test-email-secret")
    monkeypatch.setenv("PII_ENCRYPTION_KEY", "test-pii-secret")

    for name in list(sys.modules):
        if name == "app" or name.startswith("campus_trade."):
            sys.modules.pop(name, None)
    import app as admin_app

    admin_app.app.config.update(TESTING=True)
    return admin_app.app.test_client(), admin_app


def test_login_rejects_missing_wechat_identity(client):
    flask_client, _ = client
    response = flask_client.post("/api/auth/login", json={})
    assert response.status_code == 401
    payload = response.get_json()
    assert payload["code"] == 401


def test_login_rejects_user_id_and_bare_openid(client):
    flask_client, _ = client

    for body in [{"userId": 1}, {"openid": "mock-openid-001"}]:
        response = flask_client.post("/api/auth/login", json=body)
        assert response.status_code == 401
        assert response.get_json()["code"] == 401


def test_dev_openid_login_uses_auth_service(client, monkeypatch):
    flask_client, admin_app = client
    from campus_trade import security
    from campus_trade.services import auth_service

    monkeypatch.setattr(
        auth_service,
        "login",
        lambda data: {"token": security.jwt_sign({"sub": 1, "role": "user", "openid": data["devOpenid"], "purpose": "api"}), "user": {"id": 1, "openid": data["devOpenid"]}},
    )

    response = flask_client.post("/api/auth/login", json={"devOpenid": "mock-openid-001"})
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["code"] == 200
    token_payload = security.jwt_verify(payload["data"]["token"])
    assert token_payload["purpose"] == "api"


def test_wechat_code_login_creates_user_profile(monkeypatch):
    from campus_trade.config import AppConfig
    from campus_trade.services import auth_service
    from campus_trade import security

    cfg = AppConfig(
        app_env="development",
        testing=True,
        flask_host="127.0.0.1",
        flask_port=5000,
        flask_secret_key="test-flask-secret",
        jwt_secret="test-jwt-secret",
        email_code_secret="test-email-secret",
        pii_encryption_key="test-pii-secret",
        admin_id=99,
        admin_web_username="admin",
        admin_web_password="Admin@Local-2026!",
        admin_web_password_hash="",
        db_host="127.0.0.1",
        db_port=3306,
        db_user="root",
        db_password="local-db-password",
        db_name="campus_trade",
        redis_url="",
        smtp_host="",
        smtp_port=465,
        smtp_user="",
        smtp_pass="",
        smtp_from="campus-trade@example.com",
        mock_email="auto",
        email_code_ttl_seconds=600,
        allow_dev_login=False,
        allow_demo_token=False,
        api_demo_token="",
        wechat_appid="wx-appid",
        wechat_secret="wx-secret-value",
        deepseek_api_key="",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-chat",
        deepseek_timeout_seconds=12,
        ai_enabled=True,
        ai_circuit_fail_threshold=3,
        ai_circuit_reset_seconds=60,
        idempotency_required=False,
        max_upload_bytes=5 * 1024 * 1024,
    )
    auth_service.configure_auth_service(cfg)
    security.configure_security(cfg)
    created = {}
    monkeypatch.setattr(auth_service, "_wechat_openid", lambda code: "wx-openid-new")
    monkeypatch.setattr(auth_service, "get_user_by_openid", lambda openid: None)
    monkeypatch.setattr(
        auth_service,
        "create_wechat_user",
        lambda openid, nickname, avatar_url="": created.setdefault(
            "user",
            {
                "id": 3,
                "openid": openid,
                "nickname": nickname,
                "username": "wx_openid_new",
                "role": "user",
                "status": "active",
                "is_verified": 0,
                "credit_score": 100,
                "balance": 0,
                "avatar_url": avatar_url,
            },
        ),
    )

    result = auth_service.login({"code": "wx-code", "nickname": "New User", "avatarUrl": "https://example.test/a.png"})

    assert created["user"]["openid"] == "wx-openid-new"
    assert result["user"]["openid"] == "wx-openid-new"
    assert security.jwt_verify(result["token"])["openid"] == "wx-openid-new"


def test_plain_openid_is_not_dev_login(monkeypatch):
    from campus_trade.config import AppConfig
    from campus_trade.services import auth_service

    cfg = AppConfig(
        app_env="development",
        testing=True,
        flask_host="127.0.0.1",
        flask_port=5000,
        flask_secret_key="test-flask-secret",
        jwt_secret="test-jwt-secret",
        email_code_secret="test-email-secret",
        pii_encryption_key="test-pii-secret",
        admin_id=99,
        admin_web_username="admin",
        admin_web_password="Admin@Local-2026!",
        admin_web_password_hash="",
        db_host="127.0.0.1",
        db_port=3306,
        db_user="root",
        db_password="local-db-password",
        db_name="campus_trade",
        redis_url="",
        smtp_host="",
        smtp_port=465,
        smtp_user="",
        smtp_pass="",
        smtp_from="campus-trade@example.com",
        mock_email="auto",
        email_code_ttl_seconds=600,
        allow_dev_login=True,
        allow_demo_token=False,
        api_demo_token="",
        wechat_appid="",
        wechat_secret="",
        deepseek_api_key="",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-chat",
        deepseek_timeout_seconds=12,
        ai_enabled=True,
        ai_circuit_fail_threshold=3,
        ai_circuit_reset_seconds=60,
        idempotency_required=False,
        max_upload_bytes=5 * 1024 * 1024,
    )
    auth_service.configure_auth_service(cfg)

    with pytest.raises(auth_service.AuthError):
        auth_service.login({"openid": "plain-openid"})


def test_dev_openid_format_is_validated(monkeypatch):
    from campus_trade.config import AppConfig
    from campus_trade.services import auth_service

    cfg = AppConfig(
        app_env="development",
        testing=True,
        flask_host="127.0.0.1",
        flask_port=5000,
        flask_secret_key="test-flask-secret",
        jwt_secret="test-jwt-secret",
        email_code_secret="test-email-secret",
        pii_encryption_key="test-pii-secret",
        admin_id=99,
        admin_web_username="admin",
        admin_web_password="Admin@Local-2026!",
        admin_web_password_hash="",
        db_host="127.0.0.1",
        db_port=3306,
        db_user="root",
        db_password="local-db-password",
        db_name="campus_trade",
        redis_url="",
        smtp_host="",
        smtp_port=465,
        smtp_user="",
        smtp_pass="",
        smtp_from="campus-trade@example.com",
        mock_email="auto",
        email_code_ttl_seconds=600,
        allow_dev_login=True,
        allow_demo_token=False,
        api_demo_token="",
        wechat_appid="",
        wechat_secret="",
        deepseek_api_key="",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-chat",
        deepseek_timeout_seconds=12,
        ai_enabled=True,
        ai_circuit_fail_threshold=3,
        ai_circuit_reset_seconds=60,
        idempotency_required=False,
        max_upload_bytes=5 * 1024 * 1024,
    )
    auth_service.configure_auth_service(cfg)

    with pytest.raises(auth_service.AuthError):
        auth_service.login({"devOpenid": "../bad"})


def test_profile_requires_bearer_token(client):
    flask_client, _ = client
    response = flask_client.get("/api/user/profile")
    assert response.status_code == 401
    assert response.get_json()["code"] == 401


def test_protected_api_rejects_missing_api_token_purpose(client, monkeypatch):
    flask_client, admin_app = client
    from campus_trade import security
    from campus_trade.repositories import users as user_repository

    monkeypatch.setattr(
        security,
        "get_auth_principal",
        lambda user_id: {"id": user_id, "role": "user", "status": "active", "openid": "wx-openid-1"},
    )
    monkeypatch.setattr(
        user_repository,
        "get_profile",
        lambda user_id: {"id": user_id, "is_verified": 1, "credit_score": 100, "avatar_url": ""},
    )

    response = flask_client.get(
        "/api/user/profile",
        headers={"Authorization": "Bearer " + security.jwt_sign({"sub": 1, "role": "user", "openid": "wx-openid-1"})},
    )

    assert response.status_code == 401
    assert response.get_json()["msg"] == "missing or invalid bearer token"


def test_protected_api_requires_openid_bound_token(client, monkeypatch):
    flask_client, _ = client
    from campus_trade import security
    from campus_trade.repositories import users as user_repository

    monkeypatch.setattr(
        security,
        "get_auth_principal",
        lambda user_id: {"id": user_id, "role": "user", "status": "active", "openid": "wx-openid-1"},
    )
    monkeypatch.setattr(
        user_repository,
        "get_profile",
        lambda user_id: {"id": user_id, "is_verified": 1, "credit_score": 100, "avatar_url": ""},
    )

    response = flask_client.get(
        "/api/user/profile",
        headers={"Authorization": "Bearer " + security.jwt_sign({"sub": 1, "role": "user", "purpose": "api"})},
    )

    assert response.status_code == 401
    assert response.get_json()["msg"] == "token principal binding missing"


def test_protected_api_requires_role_bound_token(client, monkeypatch):
    flask_client, _ = client
    from campus_trade import security
    from campus_trade.repositories import users as user_repository

    monkeypatch.setattr(
        security,
        "get_auth_principal",
        lambda user_id: {"id": user_id, "role": "user", "status": "active", "openid": "wx-openid-1"},
    )
    monkeypatch.setattr(
        user_repository,
        "get_profile",
        lambda user_id: {"id": user_id, "is_verified": 1, "credit_score": 100, "avatar_url": ""},
    )

    response = flask_client.get(
        "/api/user/profile",
        headers={"Authorization": "Bearer " + security.jwt_sign({"sub": 1, "openid": "wx-openid-1", "purpose": "api"})},
    )

    assert response.status_code == 401
    assert response.get_json()["msg"] == "token role binding missing"


def test_upload_token_cannot_be_used_as_api_bearer(client, monkeypatch):
    flask_client, _ = client
    from campus_trade import security

    monkeypatch.setattr(
        security,
        "get_auth_principal",
        lambda user_id: {"id": user_id, "role": "user", "status": "active", "openid": "wx-openid-1"},
    )

    token = security.jwt_sign(
        {
            "sub": 1,
            "role": "user",
            "openid": "wx-openid-1",
            "purpose": "upload",
            "scene": "goods",
            "exp": 4_102_444_800,
        }
    )
    response = flask_client.get("/api/user/profile", headers={"Authorization": "Bearer " + token})

    assert response.status_code == 401
    assert response.get_json()["msg"] == "missing or invalid bearer token"


def test_jwt_verify_rejects_non_hs256_header(client):
    from campus_trade import security

    header = security.b64url_encode(b'{"alg":"none","typ":"JWT"}')
    payload = security.b64url_encode(
        ('{"sub":1,"role":"user","openid":"wx-openid-1","exp":%d}' % (int(time.time()) + 600)).encode("utf-8")
    )
    signing_input = f"{header}.{payload}"
    signature = security.b64url_encode(
        __import__("hmac").new(
            security.config().jwt_secret.encode("utf-8"),
            signing_input.encode("ascii"),
            __import__("hashlib").sha256,
        ).digest()
    )

    assert security.jwt_verify(f"{signing_input}.{signature}") is None


def test_wechat_transport_errors_are_auth_errors(monkeypatch):
    import urllib.error
    from campus_trade.config import AppConfig
    from campus_trade.services import auth_service

    cfg = AppConfig(
        app_env="development",
        testing=True,
        flask_host="127.0.0.1",
        flask_port=5000,
        flask_secret_key="test-flask-secret",
        jwt_secret="test-jwt-secret",
        email_code_secret="test-email-secret",
        pii_encryption_key="test-pii-secret",
        admin_id=99,
        admin_web_username="admin",
        admin_web_password="Admin@Local-2026!",
        admin_web_password_hash="",
        db_host="127.0.0.1",
        db_port=3306,
        db_user="root",
        db_password="local-db-password",
        db_name="campus_trade",
        redis_url="",
        smtp_host="",
        smtp_port=465,
        smtp_user="",
        smtp_pass="",
        smtp_from="campus-trade@example.com",
        mock_email="auto",
        email_code_ttl_seconds=600,
        allow_dev_login=False,
        allow_demo_token=False,
        api_demo_token="",
        wechat_appid="wx-appid",
        wechat_secret="wx-secret-value",
        deepseek_api_key="",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-chat",
        deepseek_timeout_seconds=12,
        ai_enabled=True,
        ai_circuit_fail_threshold=3,
        ai_circuit_reset_seconds=60,
        idempotency_required=False,
        max_upload_bytes=5 * 1024 * 1024,
    )
    auth_service.configure_auth_service(cfg)
    monkeypatch.setattr(auth_service.urllib.request, "urlopen", lambda request, timeout=8: (_ for _ in ()).throw(urllib.error.URLError("timeout")))

    with pytest.raises(auth_service.AuthError, match="wechat login request failed"):
        auth_service.login({"code": "wx-code"})


def test_ai_generate_requires_bearer_token(client):
    flask_client, _ = client
    response = flask_client.post("/api/ai/listing/generate", json={"title": "book"})
    assert response.status_code == 401
    assert response.get_json()["code"] == 401


def test_legacy_node_requires_explicit_flag():
    server_js = (ROOT / "backend" / "server.js").read_text(encoding="utf-8")
    assert "ENABLE_LEGACY_NODE" in server_js
    assert "legacy-only" in server_js
    assert "LEGACY_ALLOW_MUTATIONS" in server_js
    assert "legacy Node service is read-only by default" in server_js
    assert "legacy mutation mode is enabled only as an old compatibility experiment" in server_js
    assert "501" in server_js
    assert "legacy Node service does not handle uploads" in server_js
    assert 'dbPassword: process.env.DB_PASSWORD || ""' in server_js
    assert 'codeSecret: process.env.CODE_SECRET || ""' in server_js
    assert "LEGACY_ALLOW_MOCK_FALLBACK" not in server_js
    assert "LEGACY_ALLOW_WRITE_MOCK_FALLBACK" not in server_js
    assert "mockFallbackEnabled" not in server_js
    assert "writeMockFallbackEnabled" not in server_js
    assert "mockData" not in server_js
    assert "withMockFallback" not in server_js


def test_auth_service_uses_orm_repository():
    source = (ADMIN_WEB / "campus_trade" / "services" / "auth_service.py").read_text(encoding="utf-8")
    assert "get_user_by_openid" in source
    assert "fetch_one" not in source


def test_core_write_flows_are_in_service_layer():
    catalog_controller = (ADMIN_WEB / "campus_trade" / "controllers" / "catalog.py").read_text(encoding="utf-8")
    order_controller = (ADMIN_WEB / "campus_trade" / "controllers" / "orders.py").read_text(encoding="utf-8")
    chat_controller = (ADMIN_WEB / "campus_trade" / "controllers" / "chat.py").read_text(encoding="utf-8")
    user_controller = (ADMIN_WEB / "campus_trade" / "controllers" / "users.py").read_text(encoding="utf-8")
    order_source = (ADMIN_WEB / "campus_trade" / "services" / "order_service.py").read_text(encoding="utf-8")
    chat_source = (ADMIN_WEB / "campus_trade" / "services" / "chat_service.py").read_text(encoding="utf-8")
    account_source = (ADMIN_WEB / "campus_trade" / "services" / "account_service.py").read_text(encoding="utf-8")
    account_repo = (ADMIN_WEB / "campus_trade" / "repositories" / "accounts.py").read_text(encoding="utf-8")
    order_repo = (ADMIN_WEB / "campus_trade" / "repositories" / "orders.py").read_text(encoding="utf-8")

    assert "publish_goods" in catalog_controller
    assert "order_service.create_goods_order" in order_controller
    assert "chat_service.send_message" in chat_controller
    assert "account_service.recharge" in user_controller
    assert "def create_goods_order" in order_source and "order_repository.create_goods_order" in order_source
    assert "def create_goods_order" in order_repo and "with_for_update()" in order_repo
    assert "sp_create_goods_order" not in order_repo
    assert "def send_message" in chat_source and "content_hash" in chat_source
    assert "def recharge" in account_source and "account_repository.recharge" in account_source
    assert "def recharge" in account_repo and "with_for_update()" in account_repo


def test_goods_order_uses_lock_and_orm_repository(monkeypatch):
    from campus_trade.services import order_service

    calls = []
    monkeypatch.setattr(
        order_service.order_repository,
        "goods_order_candidate",
        lambda goods_id: {"seller_id": 2, "status": "on_sale"},
    )
    monkeypatch.setattr(order_service, "redis_lock", lambda key, seconds: calls.append(("lock", key, seconds)) or True)
    monkeypatch.setattr(order_service, "redis_unlock", lambda key: calls.append(("unlock", key)))
    monkeypatch.setattr(order_service, "_order_sn", lambda prefix: "CT202606210001")
    monkeypatch.setattr(
        order_service.order_repository,
        "create_goods_order",
        lambda order_sn, buyer_id, goods_id, remark: calls.append(("create_goods_order", order_sn, buyer_id, goods_id, remark)),
    )

    result = order_service.create_goods_order(1, {"goodsId": 7, "remark": "meet at gate"})

    assert result == {"orderSn": "CT202606210001", "status": "unpaid"}
    assert calls == [
        ("lock", "campus_trade:lock:goods:order:7", 8),
        ("create_goods_order", "CT202606210001", 1, 7, "meet at gate"),
        ("unlock", "campus_trade:lock:goods:order:7"),
    ]


def test_goods_order_unlocks_when_repository_fails(monkeypatch):
    from campus_trade.services import order_service

    calls = []
    monkeypatch.setattr(order_service.order_repository, "goods_order_candidate", lambda goods_id: {"seller_id": 2, "status": "on_sale"})
    monkeypatch.setattr(order_service, "redis_lock", lambda key, seconds: True)
    monkeypatch.setattr(order_service, "redis_unlock", lambda key: calls.append(("unlock", key)))
    monkeypatch.setattr(order_service, "_order_sn", lambda prefix: "CT202606210002")

    def fail_repository(name, params):
        raise RuntimeError("db failed")

    monkeypatch.setattr(order_service.order_repository, "create_goods_order", lambda order_sn, buyer_id, goods_id, remark: fail_repository("create_goods_order", (order_sn, buyer_id, goods_id, remark)))

    with pytest.raises(RuntimeError):
        order_service.create_goods_order(1, {"goodsId": 7})

    assert calls == [("unlock", "campus_trade:lock:goods:order:7")]


def test_account_recharge_uses_row_lock_and_wallet_log(monkeypatch):
    from campus_trade.services import account_service
    calls = []
    monkeypatch.setattr(account_service.account_repository, "recharge", lambda user_id, amount: calls.append((user_id, amount)) or "20.00")

    result = account_service.recharge(5, {"amount": "7.50"})

    assert result == {"balance": "20.00"}
    assert calls[0][0] == 5
    assert calls[0][1].__str__() == "7.50"
    repo_source = (ADMIN_WEB / "campus_trade" / "repositories" / "accounts.py").read_text(encoding="utf-8")
    assert "with_for_update()" in repo_source
    assert "WalletLog(" in repo_source


def test_identity_verification_accepts_frontend_student_id_length(monkeypatch):
    from campus_trade.services import user_service

    monkeypatch.setattr(user_service, "code_hash", lambda email, code: "hash")
    monkeypatch.setattr(user_service, "stable_sensitive_hash", lambda value, purpose: f"{purpose}:{value}")
    monkeypatch.setattr(
        user_service.user_repository,
        "latest_pending_email_code",
        lambda user_id, email: {"id": 9, "code_hash": "hash", "attempt_count": 0, "expires_at": __import__("datetime").datetime.now().replace(year=2099)},
    )
    monkeypatch.setattr(user_service.user_repository, "student_hash_owner", lambda student_hash: None)
    monkeypatch.setattr(user_service.user_repository, "approve_campus_identity", lambda *args: None)

    result = user_service.verify_campus_identity(
        1,
        {
            "email": "2026123456789@cau.edu.cn",
            "emailCode": "123456",
            "studentId": "2026123456789",
            "realName": "Test User",
            "college": "Engineering",
        },
        99,
    )

    assert result["verified"] is True


def test_student_email_must_match_student_id():
    from campus_trade.services import user_service

    assert user_service.validate_student_email_match("2023311250423", "2023311250423@cau.edu.cn") == (
        "2023311250423",
        "2023311250423@cau.edu.cn",
    )
    with pytest.raises(user_service.UserError, match="campus email must match student id"):
        user_service.validate_student_email_match("2023311250423", "1195701538@cau.edu.cn")


def test_email_code_contract_requires_student_id_and_returns_dev_demo_code():
    source = (ADMIN_WEB / "campus_trade" / "controllers" / "users.py").read_text(encoding="utf-8")
    verify_source = (ROOT / "miniprogram" / "pages" / "verify" / "verify.js").read_text(encoding="utf-8")

    assert "student_id = str(data.get(\"studentId\") or \"\").strip()" in source
    assert "raw_email = str(data.get(\"email\") or \"\").strip().lower()" in source
    assert "validate_student_email_match(student_id, raw_email)" in source
    assert "if not config.is_production:" in source
    assert "payload[\"demoCode\"] = code" in source
    assert "data: { studentId: String(this.data.form.studentId || '').trim(), email }" in verify_source
    assert "邮箱必须与学号一致" in verify_source


def test_chat_send_preserves_evidence_hash_chain(monkeypatch):
    from campus_trade.services import chat_service
    calls = []
    monkeypatch.setattr(chat_service, "moderate_message", lambda content: None)
    monkeypatch.setattr(chat_service, "ensure_conversation", lambda data, user_id: {"id": 9, "peer_id": 2})
    monkeypatch.setattr(chat_service.chat_repository, "latest_message_hash", lambda conversation_id: "prev-hash")
    monkeypatch.setattr(
        chat_service.chat_repository,
        "create_message",
        lambda conversation_id, sender_id, receiver_id, content, content_hash, previous_hash: calls.append(
            (conversation_id, sender_id, receiver_id, content, content_hash, previous_hash)
        ) or 88,
    )

    result = chat_service.send_message(1, {"conversationId": 9, "content": "hello"})

    expected_hash = __import__("hashlib").sha256(b"prev-hash|1|2|text|hello").hexdigest()
    assert result["id"] == 88
    assert result["previousHash"] == "prev-hash"
    assert result["contentHash"] == expected_hash
    assert calls[0] == (9, 1, 2, "hello", expected_hash, "prev-hash")


def test_app_py_is_route_shell_without_inline_sql_or_raw_db_connections():
    app_source = (ADMIN_WEB / "app.py").read_text(encoding="utf-8")
    app_factory_source = (ADMIN_WEB / "campus_trade" / "app_factory.py").read_text(encoding="utf-8")
    controller_sources = "\n".join(
        path.read_text(encoding="utf-8") for path in (ADMIN_WEB / "campus_trade" / "controllers").glob("*.py")
    )
    forbidden = [
        "fetch_all(",
        "fetch_one(",
        "execute(",
        "db_conn(",
        "cur.execute(",
        "SELECT ",
        "UPDATE ",
        "INSERT ",
        "DELETE ",
        "CALL ",
    ]
    for token in forbidden:
        assert token not in app_source
    assert "Flask(" not in app_source
    assert "app.route(" not in app_source
    assert "create_app" in app_source
    assert "register_controllers" in app_factory_source
    assert "register_admin_html_routes" in app_factory_source
    assert "catalog_service.list_public_goods" in controller_sources
    assert "order_query_service.list_orders_for_user" in controller_sources
    assert "admin_query_service.dashboard_snapshot" in controller_sources
    assert "status_service.api_status_payload" in controller_sources


def test_app_factory_entrypoint_returns_fresh_app_instances(client):
    _, admin_app = client

    first = admin_app.create_app()
    second = admin_app.create_app()

    assert first is not admin_app.app
    assert first is not second
    assert first.url_map is not second.url_map


def test_services_and_controllers_have_no_direct_sql_or_driver_access():
    scanned = []
    for folder in ["services", "controllers"]:
        scanned.extend((ADMIN_WEB / "campus_trade" / folder).glob("*.py"))
    scanned.append(ADMIN_WEB / "app.py")
    forbidden = [
        "pymysql",
        "db_conn(",
        "cur.execute(",
        "fetch_all(",
        "fetch_one(",
        "query_all(",
        "query_one(",
        "sql_transaction(",
        "SELECT ",
        "UPDATE ",
        "INSERT ",
        "DELETE ",
        "CALL ",
    ]
    for path in scanned:
        source = path.read_text(encoding="utf-8")
        for token in forbidden:
            assert token not in source, f"{token} leaked into {path}"


def test_database_layer_exposes_orm_sessions_not_generic_sql_helpers():
    source = (ADMIN_WEB / "campus_trade" / "database.py").read_text(encoding="utf-8")
    assert "create_engine" in source
    assert "sessionmaker" in source
    assert "def session_scope" in source
    assert "def call_proc(" not in source
    assert "def call_proc_out" not in source
    assert "PROC_NAME_RE" not in source
    assert "def db_conn" not in source
    assert "import pymysql" not in source
    for helper in ["def fetch_all", "def fetch_one", "def query_all", "def query_one", "def execute_statement", "def sql_transaction"]:
        assert helper not in source


def test_orm_boundary_is_strictly_repository_only():
    service_and_controller_paths = list((ADMIN_WEB / "campus_trade" / "services").glob("*.py"))
    service_and_controller_paths.extend((ADMIN_WEB / "campus_trade" / "controllers").glob("*.py"))
    service_and_controller_paths.extend([ADMIN_WEB / "app.py", ADMIN_WEB / "campus_trade" / "idempotency.py"])

    forbidden = re.compile(
        r"\b(SELECT|INSERT|UPDATE|DELETE|CALL)\b|cur\.execute\(|db_conn\(|pymysql|"
        r"\b(fetch_all|fetch_one|query_all|query_one|execute_text|execute_many|sql_transaction)\("
    )
    for path in service_and_controller_paths:
        source = path.read_text(encoding="utf-8")
        assert not forbidden.search(source), f"SQL boundary leak in {path}"
        assert "sp_" not in source, f"stored-procedure name leaked into service/controller layer: {path}"

    database_source = (ADMIN_WEB / "campus_trade" / "database.py").read_text(encoding="utf-8")
    assert "create_engine" in database_source
    assert "sessionmaker" in database_source
    assert "import pymysql" not in database_source
    assert "def db_conn" not in database_source
    assert "PROC_NAME_RE" not in database_source

    for path in (ADMIN_WEB / "campus_trade" / "repositories").glob("*.py"):
        if path.name == "__init__.py":
            continue
        source = path.read_text(encoding="utf-8")
        assert "session_scope" in source, f"{path} bypasses repository session boundary"
        assert "call_proc" not in source, f"{path} reintroduced stored-procedure runtime calls"
        assert "pymysql" not in source


def test_query_logic_is_split_into_orm_repositories():
    catalog_source = (ADMIN_WEB / "campus_trade" / "services" / "catalog_service.py").read_text(encoding="utf-8")
    order_query_source = (ADMIN_WEB / "campus_trade" / "services" / "order_query_service.py").read_text(encoding="utf-8")
    admin_query_source = (ADMIN_WEB / "campus_trade" / "services" / "admin_query_service.py").read_text(encoding="utf-8")
    catalog_repo = (ADMIN_WEB / "campus_trade" / "repositories" / "catalog.py").read_text(encoding="utf-8")
    order_repo = (ADMIN_WEB / "campus_trade" / "repositories" / "orders.py").read_text(encoding="utf-8")
    admin_repo = (ADMIN_WEB / "campus_trade" / "repositories" / "admin.py").read_text(encoding="utf-8")

    assert "catalog_repository.list_public_goods" in catalog_source
    assert "catalog_repository.list_public_services" in catalog_source
    assert "order_repository.list_orders_for_user" in order_query_source
    assert "admin_repository.dashboard_stats" in admin_query_source
    for repo_source in [catalog_repo, order_repo, admin_repo]:
        assert "session.execute(" in repo_source
        assert "select(" in repo_source
    assert "func.max(AiAuditRecord.id)" in admin_repo
    assert "latest_ai.c.latest_id" in admin_repo


def test_user_profile_reads_live_in_repository():
    user_controller = (ADMIN_WEB / "campus_trade" / "controllers" / "users.py").read_text(encoding="utf-8")
    repo_source = (ADMIN_WEB / "campus_trade" / "repositories" / "users.py").read_text(encoding="utf-8")

    assert "user_repository.get_profile" in user_controller
    assert "user_repository.get_public_profile" in user_controller
    assert "user_repository.get_credit_summary" in user_controller
    assert "def get_profile" in repo_source
    assert "def get_public_profile" in repo_source
    assert "def get_credit_summary" in repo_source


def test_route_contract_keeps_v1_compatibility(client):
    _, admin_app = client
    routes = {rule.rule for rule in admin_app.app.url_map.iter_rules()}
    expected_pairs = [
        ("/api/status", "/v1/api/status"),
        ("/api/auth/login", "/v1/api/auth/login"),
        ("/api/goods", "/v1/api/goods"),
        ("/api/orders", "/v1/api/orders"),
        ("/api/chats/messages", "/v1/api/chats/messages"),
        ("/api/admin/backups/latest", "/v1/api/admin/backups/latest"),
        ("/api/goods/list", "/v1/api/goods/list"),
        ("/api/order/list", "/v1/api/order/list"),
        ("/api/chat/send", "/v1/api/chat/send"),
        ("/api/admin/security/checks", "/v1/api/admin/security/checks"),
        ("/api/files/upload", "/v1/api/files/upload"),
        ("/api/files/upload-credential", "/v1/api/files/upload-credential"),
        ("/api/ai/generate", "/v1/api/ai/generate"),
        ("/api/admin/backup/latest", "/v1/api/admin/backup/latest"),
        ("/api/order/seller/list", "/v1/api/order/seller/list"),
    ]
    for legacy, versioned in expected_pairs:
        assert legacy in routes
        assert versioned in routes


def test_canonical_restful_and_legacy_documented_routes_are_registered(client):
    _, admin_app = client
    routes = {}
    for rule in admin_app.app.url_map.iter_rules():
        routes.setdefault(rule.rule, set()).update(rule.methods)
    expected = [
        ("/api/auth/bind", "POST"),
        ("/api/user/profile", "PUT"),
        ("/api/goods", "POST"),
        ("/api/goods/<int:goods_id>", "PUT"),
        ("/api/goods/<int:goods_id>", "DELETE"),
        ("/api/goods/<int:goods_id>/status", "PUT"),
        ("/api/services", "GET"),
        ("/api/services", "POST"),
        ("/api/services/<int:service_id>", "GET"),
        ("/api/services/<int:service_id>/orders", "POST"),
        ("/api/errands", "POST"),
        ("/api/errands/<int:errand_id>/accept", "POST"),
        ("/api/errands/<int:errand_id>/status", "PUT"),
        ("/api/orders", "GET"),
        ("/api/orders", "POST"),
        ("/api/orders/<path:order_sn>", "GET"),
        ("/api/orders/<path:order_sn>/pay", "POST"),
        ("/api/orders/<path:order_sn>/cancel", "POST"),
        ("/api/orders/<path:order_sn>/receive", "PUT"),
        ("/api/orders/<path:order_sn>/refunds", "POST"),
        ("/api/orders/<path:order_sn>/confirm", "PUT"),
        ("/api/orders/<path:order_sn>/ship", "PUT"),
        ("/api/orders/<path:order_sn>/complaints", "POST"),
        ("/api/order", "POST"),
        ("/api/order/<path:order_sn>/confirm", "PUT"),
        ("/api/order/<path:order_sn>/ship", "PUT"),
        ("/api/order/<path:order_sn>/receive", "PUT"),
        ("/api/order/<path:order_sn>/refund", "POST"),
        ("/api/order/<path:order_sn>/dispute", "POST"),
        ("/api/ai/goods/title", "POST"),
        ("/api/ai/goods/desc", "POST"),
        ("/api/ai/goods/tags", "POST"),
        ("/api/rider/order/<int:errand_id>/accept", "POST"),
        ("/api/rider/order/<int:errand_id>/status", "PUT"),
        ("/api/service", "POST"),
        ("/api/service/<int:service_id>/order", "PUT"),
        ("/api/chats", "GET"),
        ("/api/chats/<int:conversation_id>/messages", "GET"),
        ("/api/chats/messages", "POST"),
        ("/api/chat/history", "GET"),
        ("/api/admin/reconciliations", "POST"),
        ("/api/admin/goods/<int:goods_id>/audit", "POST"),
        ("/api/admin/refunds/<int:refund_id>/arbitration", "POST"),
        ("/api/admin/withdraws/<int:withdraw_id>/audit", "POST"),
        ("/api/admin/users/<int:user_id>/status", "PUT"),
        ("/api/admin/ai/rules", "PUT"),
        ("/api/admin/backups", "POST"),
        ("/api/admin/backups/latest", "GET"),
    ]
    for route, method in expected:
        assert route in routes
        assert method in routes[route]
        assert "/v1" + route in routes
        assert method in routes["/v1" + route]


def test_every_current_api_route_has_v1_twin_except_documented_aliases(client):
    _, admin_app = client
    routes = {rule.rule for rule in admin_app.app.url_map.iter_rules()}
    for route in sorted(item for item in routes if item.startswith("/api/")):
        assert "/v1" + route in routes, f"missing v1 compatibility route for {route}"


def test_current_write_routes_are_idempotency_protected_or_documented_exceptions(client):
    _, admin_app = client
    from campus_trade.idempotency import IDEMPOTENT_PATHS

    exempt_posts = {
        "/api/auth/login",
        "/api/auth/logout",
        "/api/files/upload",
        "/api/files/upload-credential",
        "/api/oss/sts",
    }
    write_routes = {
        (rule.rule, method)
        for rule in admin_app.app.url_map.iter_rules()
        if rule.rule.startswith("/api/")
        for method in {"POST", "PUT", "DELETE"} & rule.methods
    }
    unprotected = {
        (route, method)
        for route, method in write_routes
        if route not in IDEMPOTENT_PATHS
        and route not in exempt_posts
        and not route.startswith("/api/goods/<")
        and not route.startswith("/api/order/<")
        and not route.startswith("/api/orders/<")
        and not route.startswith("/api/rider/order/<")
        and not route.startswith("/api/service/<")
        and not route.startswith("/api/services/<")
        and not route.startswith("/api/errands/<")
        and not route.startswith("/api/admin/goods/<")
        and not route.startswith("/api/admin/refunds/<")
        and not route.startswith("/api/admin/withdraws/<")
        and not route.startswith("/api/admin/users/<")
    }
    assert not unprotected


def test_status_payload_declares_backend_contract(monkeypatch):
    from campus_trade.config import AppConfig
    from campus_trade.services import status_service

    cfg = AppConfig(
        app_env="production",
        testing=True,
        flask_host="127.0.0.1",
        flask_port=5000,
        flask_secret_key="strong-flask-secret-value",
        jwt_secret="strong-jwt-secret-value",
        email_code_secret="strong-email-secret-value",
        pii_encryption_key="strong-pii-secret-value",
        admin_id=99,
        admin_web_username="admin",
        admin_web_password="",
        admin_web_password_hash="pbkdf2_sha256$260000$c2FsdC1mb3ItdGVzdHM=$ZGlnZXN0LWZvci10ZXN0cw==",
        db_host="127.0.0.1",
        db_port=3306,
        db_user="campus_app",
        db_password="strong-db-password-value",
        db_name="campus_trade",
        redis_url="redis://127.0.0.1:6379/0",
        smtp_host="smtp.example.test",
        smtp_port=465,
        smtp_user="mailer",
        smtp_pass="strong-smtp-password",
        smtp_from="campus-trade@example.com",
        mock_email="auto",
        email_code_ttl_seconds=600,
        allow_dev_login=False,
        allow_demo_token=False,
        api_demo_token="",
        wechat_appid="wx-prod-appid",
        wechat_secret="wx-prod-secret-value",
        deepseek_api_key="deepseek-prod-secret-value",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-chat",
        deepseek_timeout_seconds=12,
        ai_enabled=True,
        ai_circuit_fail_threshold=3,
        ai_circuit_reset_seconds=60,
        idempotency_required=True,
        max_upload_bytes=5 * 1024 * 1024,
    )
    monkeypatch.setattr(status_service, "circuit_state", lambda: "closed")

    payload = status_service.api_status_payload(cfg, "campus_trade", "connected", True)

    assert payload["architecture"].startswith("Flask application factory + controller")
    assert payload["persistence"]["engine"] == "SQLAlchemy"
    assert "controllers" in payload["layers"]
    assert "thin_app_entrypoint" in payload["layers"]
    assert payload["routes"]["prefixes"] == ["/api", "/v1/api"]
    assert payload["authContract"]["bareUserIdLogin"] == "rejected"
    assert payload["authContract"]["bareOpenidLogin"] == "rejected"
    assert payload["authContract"]["bearerRequiredForProtectedApis"] is True
    assert payload["authContract"]["apiTokenPurpose"] == "purpose_api_required"
    assert payload["authContract"]["uploadTokenPurpose"] == "purpose_upload_rejected_by_api_auth"
    assert payload["authContract"]["tokenOpenidBinding"] == "required_for_api_tokens"
    assert payload["adminSession"]["csrf"] == "required_for_html_form_posts"
    assert payload["rbac"]["adminApis"] == "jwt_role_admin"
    assert payload["ai"]["generation"] == "title_description_tags"
    assert payload["ai"]["auditTrail"] == "ai_audit_records"
    assert payload["legacyNode"] == "disabled_by_default_read_only_boundary"


def test_write_api_endpoints_require_auth_decorators(client):
    _, admin_app = client
    public_posts = {"/api/auth/login", "/v1/api/auth/login", "/api/files/upload", "/v1/api/files/upload"}
    endpoints = {rule.endpoint: rule for rule in admin_app.app.url_map.iter_rules()}

    for endpoint, rule in endpoints.items():
        if not rule.rule.startswith(("/api/", "/v1/api/")):
            continue
        if "POST" not in rule.methods:
            continue
        if rule.rule in public_posts:
            continue
        view = admin_app.app.view_functions[endpoint]
        current = view
        requires_auth = False
        while current and not requires_auth:
            requires_auth = bool(getattr(current, "_requires_api_auth", False))
            current = getattr(current, "__wrapped__", None)
        assert requires_auth, f"{rule.rule} is missing auth wrapper"


def test_miniprogram_page_api_calls_exist_in_flask_routes(client):
    _, admin_app = client
    routes = {rule.rule for rule in admin_app.app.url_map.iter_rules()}
    page_sources = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore")
        for root in [ROOT / "miniprogram" / "pages", ROOT / "miniprogram" / "components"]
        for path in root.rglob("*.js")
    )
    api_paths = {
        match
        for match in re.findall(r"['\"](/api/[A-Za-z0-9_./-]+)['\"]", page_sources)
        if match != "/api/files/upload"
    }
    missing = sorted(path for path in api_paths if path not in routes)
    assert missing == []


def test_architecture_doc_declares_security_baseline():
    doc = (ROOT / "BACKEND_ARCHITECTURE.md").read_text(encoding="utf-8")
    assert "ALLOW_DEV_LOGIN=0" in doc
    assert "`backend/server.js` is legacy-only" in doc
    assert "Services contain no SQL text" in doc
    assert "SQLAlchemy ORM repositories" in doc
    assert "no generic SQL helpers and no stored-procedure runtime adapter" in doc
    assert "purpose=api" in doc
    assert "CSRF tokens" in doc
    assert "no mock fallback" in doc
    assert "LEGACY_ALLOW_MUTATIONS=1" in doc
    assert "returns 501" in doc
    assert "ADMIN_DB_PASSWORD=123456" not in doc


def test_api_contract_documents_route_and_legacy_boundaries():
    doc = (ROOT / "API_CONTRACT.md").read_text(encoding="utf-8")
    for text in [
        "/api/*",
        "/v1/api/*",
        "Bare `userId` and bare `openid` login are rejected",
        "JWTs must include `sub`, `role`, and `openid`",
        "`purpose=api`",
        "session CSRF tokens",
        "[A-Za-z0-9:_-]{8,80}",
        "X-Idempotency-Key",
        "LEGACY_ALLOW_MUTATIONS=1",
        "returns 501",
        "write mock fallback and database read mock fallback are not implemented",
        "Every canonical route below is also registered under `/v1/api/*`",
        "SQLAlchemy ORM transactions with `SELECT ... FOR UPDATE` row locks",
        "live JWT/openid/RBAC validation",
    ]:
        assert text in doc


def test_api_contract_route_table_matches_current_api_routes(client):
    _, admin_app = client
    doc = (ROOT / "API_CONTRACT.md").read_text(encoding="utf-8")
    routes = sorted(rule.rule for rule in admin_app.app.url_map.iter_rules() if rule.rule.startswith("/api/"))
    legacy_aliases = {
        "/api/goods/list",
        "/api/goods/detail",
        "/api/goods/save",
        "/api/goods/publish",
        "/api/goods/remove",
        "/api/goods/relist",
        "/api/service/list",
        "/api/service/detail",
        "/api/service/save",
        "/api/service/order",
        "/api/service",
        "/api/service/<int:service_id>/order",
        "/api/services/publish",
        "/api/services/orders/create",
        "/api/errands/publish",
        "/api/order/list",
        "/api/orders/list",
        "/api/order/detail",
        "/api/orders/detail",
        "/api/order/create",
        "/api/orders/create",
        "/api/order",
        "/api/order/pay",
        "/api/order/cancel",
        "/api/order/receive",
        "/api/orders/confirm",
        "/api/order/refund",
        "/api/order/confirm",
        "/api/order/ship",
        "/api/order/complaint",
        "/api/order/seller/list",
        "/api/order/<path:order_sn>/receive",
        "/api/order/<path:order_sn>/refund",
        "/api/order/<path:order_sn>/confirm",
        "/api/order/<path:order_sn>/ship",
        "/api/order/<path:order_sn>/dispute",
        "/api/rider/take",
        "/api/rider/status",
        "/api/rider/order/<int:errand_id>/accept",
        "/api/rider/order/<int:errand_id>/status",
        "/api/errands/accept",
        "/api/chat/list",
        "/api/chat/messages",
        "/api/chat/history",
        "/api/chat/send",
        "/api/ai/goods/title",
        "/api/ai/goods/desc",
        "/api/ai/goods/tags",
        "/api/user/profile/update",
        "/api/admin/reconcile/run",
        "/api/admin/goods/audit",
        "/api/admin/order/arbitrate",
        "/api/admin/withdraw/audit",
        "/api/admin/user/status",
        "/api/admin/ai/rules/update",
        "/api/admin/backup/run",
        "/api/admin/backup/latest",
    }

    for route in routes:
        if route in legacy_aliases:
            continue
        assert f"`{route}`" in doc


def test_readmes_do_not_recommend_weak_backend_secrets():
    docs = [
        ROOT / "README.md",
        ROOT / "admin_web" / "README.md",
        ROOT / "admin_web" / ".env.example",
        ROOT / "backend" / ".env.example",
        ROOT / "database" / "mysql" / "README.md",
        ROOT / "alembic.ini",
    ]
    combined = "\n".join(path.read_text(encoding="utf-8") for path in docs)
    assert "ADMIN_DB_PASSWORD=\"123456\"" not in combined
    assert "DB_PASSWORD=123456" not in combined
    assert "CODE_SECRET=change-this-to-a-random-local-secret" not in combined
    assert "FLASK_SECRET_KEY=change-me" not in combined
    assert "Admin@Local-2026!" not in combined
    assert "sk-your-key" not in combined
    assert "ALLOW_DEV_LOGIN=1" not in (ROOT / "admin_web" / ".env.example").read_text(encoding="utf-8")
    assert "For production, set `ADMIN_WEB_PASSWORD_HASH`" in (ROOT / "admin_web" / "README.md").read_text(encoding="utf-8")


def test_gitignore_excludes_local_secrets_and_generated_test_artifacts():
    source = (ROOT / ".gitignore").read_text(encoding="utf-8")
    for pattern in [
        ".env",
        ".env.local",
        "admin_web/.env.local",
        "backend/.env",
        "__pycache__/",
        ".pytest_cache/",
        ".coverage",
    ]:
        assert pattern in source


def test_concurrency_script_uses_dev_openid_not_user_id():
    source = (ROOT / "scripts" / "demo_concurrency.ps1").read_text(encoding="utf-8")
    assert "devOpenid" in source
    assert "@{ userId" not in source
    assert "X-Idempotency-Key" in source


def test_start_scripts_do_not_enable_dev_login_by_default():
    ps1 = (ROOT / "admin_web" / "start-admin.ps1").read_text(encoding="utf-8", errors="ignore")
    bat = (ROOT / "admin_web" / "start-admin.bat").read_text(encoding="utf-8", errors="ignore")
    assert 'Get-DefaultValue $Existing "ALLOW_DEV_LOGIN" "0"' in ps1
    assert 'Prompt-Value "SMTP_HOST"' in ps1
    assert 'Prompt-Value "SMTP_USER"' in ps1
    assert 'Prompt-Value "SMTP_PASS"' in ps1
    assert '"SMTP_HOST=$($Values.SMTP_HOST)"' in ps1
    assert '"SMTP_PASS=$($Values.SMTP_PASS)"' in ps1
    assert 'Prompt-Value "WECHAT_APPID"' in ps1
    assert 'Prompt-Value "WECHAT_SECRET"' in ps1
    assert '"WECHAT_APPID=$($Values.WECHAT_APPID)"' in ps1
    assert '"WECHAT_SECRET=$($Values.WECHAT_SECRET)"' in ps1
    assert "Read-Host" in ps1
    assert "Write-EnvFile" in ps1
    assert "Test-DatabaseConnection" in ps1
    assert "ALLOW_DEV_LOGIN=0" in bat
    assert "Import-LocalEnvFile" in ps1
    assert ".env.local" in ps1
    assert "start-admin.ps1" in bat


def test_env_file_ignores_empty_values(tmp_path, monkeypatch):
    from campus_trade import config as config_module

    env_file = tmp_path / ".env.local"
    env_file.write_text("ADMIN_DB_PASSWORD=\nALLOW_DEV_LOGIN=1\n", encoding="utf-8")

    monkeypatch.delenv("ADMIN_DB_PASSWORD", raising=False)
    monkeypatch.delenv("ALLOW_DEV_LOGIN", raising=False)
    config_module.load_env_file(env_file)

    assert os.getenv("ADMIN_DB_PASSWORD") is None
    assert os.getenv("ALLOW_DEV_LOGIN") == "1"


def test_local_config_rejects_non_root_empty_db_password(monkeypatch):
    from campus_trade.config import load_config

    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("TESTING", "0")
    monkeypatch.setenv("ADMIN_DB_USER", "campus_app")
    monkeypatch.delenv("ADMIN_DB_PASSWORD", raising=False)
    monkeypatch.setattr("campus_trade.config.load_env_file", lambda path: None)

    with pytest.raises(RuntimeError, match="ADMIN_DB_PASSWORD"):
        load_config()


def test_config_defaults_disable_dev_login_and_generate_local_secrets(monkeypatch):
    from campus_trade import config as config_module

    keys = [
        "APP_ENV",
        "FLASK_ENV",
        "ALLOW_DEV_LOGIN",
        "FLASK_SECRET_KEY",
        "JWT_SECRET",
        "EMAIL_CODE_SECRET",
        "PII_ENCRYPTION_KEY",
    ]
    for key in keys:
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("TESTING", "1")
    monkeypatch.setattr(config_module, "load_env_file", lambda path: None)

    cfg = config_module.load_config()

    assert cfg.allow_dev_login is False
    assert cfg.flask_secret_key not in config_module.WEAK_SECRET_VALUES
    assert cfg.jwt_secret not in config_module.WEAK_SECRET_VALUES
    assert cfg.email_code_secret not in config_module.WEAK_SECRET_VALUES


def test_admin_login_uses_configured_password_hash(client):
    from campus_trade import security
    from campus_trade.security import hash_password

    flask_client, admin_app = client
    password_hash = hash_password("Strong-Admin-Password-2026!")
    cfg = admin_app.APP_CONFIG.__class__(
        **{
            **admin_app.APP_CONFIG.__dict__,
            "admin_web_password": "",
            "admin_web_password_hash": password_hash,
        }
    )
    security.configure_security(cfg)

    with flask_client.session_transaction() as sess:
        sess["_csrf_token"] = "csrf-token"

    try:
        response = flask_client.post(
            "/login",
            data={
                "username": admin_app.APP_CONFIG.admin_web_username,
                "password": "Strong-Admin-Password-2026!",
                "_csrf_token": "csrf-token",
            },
            follow_redirects=False,
        )
    finally:
        security.configure_security(admin_app.APP_CONFIG)

    assert response.status_code in {302, 303}


def test_admin_login_rejects_missing_csrf(client):
    flask_client, admin_app = client
    response = flask_client.post(
        "/login",
        data={"username": admin_app.APP_CONFIG.admin_web_username, "password": "anything"},
        follow_redirects=False,
    )

    assert response.status_code == 400


def test_production_config_rejects_weak_defaults(monkeypatch):
    from campus_trade.config import load_config

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ADMIN_DB_USER", "root")
    monkeypatch.setenv("ADMIN_DB_PASSWORD", "123456")
    monkeypatch.setenv("ADMIN_WEB_PASSWORD", "Admin@Local-2026!")
    monkeypatch.setenv("FLASK_SECRET_KEY", "change-me")
    monkeypatch.setenv("JWT_SECRET", "change-me")
    monkeypatch.setenv("EMAIL_CODE_SECRET", "change-me")
    monkeypatch.setenv("PII_ENCRYPTION_KEY", "change-me")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "")
    monkeypatch.setenv("WECHAT_APPID", "")
    monkeypatch.setenv("WECHAT_SECRET", "")
    monkeypatch.setenv("ALLOW_DEV_LOGIN", "1")

    with pytest.raises(RuntimeError):
        load_config()


def test_production_config_rejects_placeholder_and_short_secrets(monkeypatch):
    from campus_trade.config import load_config

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ADMIN_DB_USER", "campus_app_role")
    monkeypatch.setenv("ADMIN_DB_PASSWORD", "<your-local-mysql-password>")
    monkeypatch.setenv("ADMIN_WEB_PASSWORD_HASH", "pbkdf2_sha256$260000$placeholder-salt$placeholder-digest")
    monkeypatch.setenv("FLASK_SECRET_KEY", "short")
    monkeypatch.setenv("JWT_SECRET", "replace-with-jwt")
    monkeypatch.setenv("EMAIL_CODE_SECRET", "example-email-secret")
    monkeypatch.setenv("PII_ENCRYPTION_KEY", "<random>")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-prod-deepseek-secret-value")
    monkeypatch.setenv("WECHAT_APPID", "wx-prod-appid")
    monkeypatch.setenv("WECHAT_SECRET", "wx-prod-secret-value")
    monkeypatch.setenv("ALLOW_DEV_LOGIN", "0")

    with pytest.raises(RuntimeError):
        load_config()


def test_production_config_requires_admin_password_hash(monkeypatch):
    from campus_trade.config import load_config

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ADMIN_DB_USER", "campus_app_role")
    monkeypatch.setenv("ADMIN_DB_PASSWORD", "strong-db-password-value")
    monkeypatch.setenv("ADMIN_WEB_PASSWORD", "Strong-Admin-Password-2026!")
    monkeypatch.delenv("ADMIN_WEB_PASSWORD_HASH", raising=False)
    monkeypatch.setenv("FLASK_SECRET_KEY", "strong-flask-secret-value")
    monkeypatch.setenv("JWT_SECRET", "strong-jwt-secret-value")
    monkeypatch.setenv("EMAIL_CODE_SECRET", "strong-email-secret-value")
    monkeypatch.setenv("PII_ENCRYPTION_KEY", "strong-pii-secret-value")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "deepseek-prod-secret-value")
    monkeypatch.setenv("WECHAT_APPID", "wx-prod-appid")
    monkeypatch.setenv("WECHAT_SECRET", "wx-prod-secret-value")
    monkeypatch.setenv("ALLOW_DEV_LOGIN", "0")
    monkeypatch.setenv("ALLOW_DEMO_TOKEN", "0")

    with pytest.raises(RuntimeError, match="ADMIN_WEB_PASSWORD"):
        load_config()


def test_stable_sensitive_hash_is_deterministic(monkeypatch):
    from campus_trade.config import AppConfig
    from campus_trade import crypto_utils

    cfg = AppConfig(
        app_env="development",
        testing=True,
        flask_host="127.0.0.1",
        flask_port=5000,
        flask_secret_key="test-flask-secret",
        jwt_secret="test-jwt-secret",
        email_code_secret="test-email-secret",
        pii_encryption_key="stable-pii-secret-for-tests",
        admin_id=99,
        admin_web_username="admin",
        admin_web_password="Admin@Local-2026!",
        admin_web_password_hash="",
        db_host="127.0.0.1",
        db_port=3306,
        db_user="root",
        db_password="local-db-password",
        db_name="campus_trade",
        redis_url="",
        smtp_host="",
        smtp_port=465,
        smtp_user="",
        smtp_pass="",
        smtp_from="campus-trade@example.com",
        mock_email="auto",
        email_code_ttl_seconds=600,
        allow_dev_login=False,
        allow_demo_token=False,
        api_demo_token="",
        wechat_appid="",
        wechat_secret="",
        deepseek_api_key="",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-chat",
        deepseek_timeout_seconds=12,
        ai_enabled=True,
        ai_circuit_fail_threshold=3,
        ai_circuit_reset_seconds=60,
        idempotency_required=False,
        max_upload_bytes=5 * 1024 * 1024,
    )
    crypto_utils.configure_crypto(cfg)

    first = crypto_utils.stable_sensitive_hash("2023000123", "student_id")
    second = crypto_utils.stable_sensitive_hash("2023000123", "student_id")

    assert first == second
    assert first.startswith("hmac-sha256:v1:")
    assert "2023000123" not in first


def test_ai_gateway_contract_has_adapter_circuit_breaker_and_generation():
    source = (ADMIN_WEB / "campus_trade" / "ai_gateway.py").read_text(encoding="utf-8")
    content_source = (ADMIN_WEB / "campus_trade" / "services" / "content_service.py").read_text(encoding="utf-8")
    content_repo = (ADMIN_WEB / "campus_trade" / "repositories" / "content.py").read_text(encoding="utf-8")
    assert "class DeepSeekAdapter" in source
    assert "def adapter" in source
    assert "def _deepseek_chat" in source
    assert "def circuit_state" in source
    assert "def ai_audit" in source
    assert "def image_audit" in source
    assert "def generate_listing_metadata" in source
    assert "deepseek_fallback_rule" in source
    assert "rule_image_metadata" in source
    assert "generate_title" in content_repo
    assert "recommend_tags" in content_repo
    assert "ai_audit(generated_text" in content_source
    assert "image_audit(" in content_source
    assert '"image_audit"' in content_repo
    assert '"draft"' in content_repo
    assert "record_draft_audit" in content_source


def test_publish_goods_combines_text_and_image_audit(monkeypatch):
    from campus_trade.services import content_service

    calls = []
    monkeypatch.setattr(content_service, "_assert_publish_user", lambda user_id: {"id": user_id, "status": "active", "is_verified": 1})
    monkeypatch.setattr(content_service.user_repository, "get_user_role", lambda user_id: "user")
    monkeypatch.setattr(content_service.content_repository, "first_active_category_id", lambda category_type: 1)
    monkeypatch.setattr(content_service, "_load_ai_rule", lambda: {"image_audit_enabled": 1})

    class Result:
        def __init__(self, provider, risk_level, reason):
            self.provider = provider
            self.risk_level = risk_level
            self.reason = reason
            self.request_id = provider + "-1"
            self.raw_result = {}
            self.generated = {}

    monkeypatch.setattr(content_service, "ai_audit", lambda text, rule: Result("deepseek", "pass", "text ok"))
    monkeypatch.setattr(content_service, "image_audit", lambda images, rule: Result("rule_image", "manual", "image review"))
    monkeypatch.setattr(
        content_service.content_repository,
        "create_goods_with_audit",
        lambda user_id, data, audit, media_audit, status, category_id: calls.append((data["images"], audit.risk_level, media_audit.risk_level, status)) or 9,
    )

    result = content_service.publish_goods(
        1,
        {"title": "Book", "desc": "Clean textbook", "price": "12.00", "images": ["/uploads/goods/forbidden.jpg"]},
    )

    assert result["status"] == "pending"
    assert result["audit"]["imageRiskLevel"] == "manual"
    assert calls == [(["/uploads/goods/forbidden.jpg"], "pass", "manual", "pending")]


def test_service_publish_requires_provider_role(monkeypatch):
    from campus_trade.services import content_service

    monkeypatch.setattr(content_service, "_assert_publish_user", lambda user_id: {"id": user_id, "status": "active", "is_verified": 1})
    monkeypatch.setattr(content_service.user_repository, "get_user_role", lambda user_id: "user")

    with pytest.raises(content_service.BusinessError, match="provider role"):
        content_service.publish_service_or_errand(
            1,
            {"type": "service", "title": "Tutoring", "desc": "Math tutoring", "price": "20"},
        )


def test_errand_take_requires_rider_role(monkeypatch):
    from campus_trade.services import order_service

    monkeypatch.setattr(order_service.user_repository, "get_user_role", lambda user_id: "user")

    with pytest.raises(order_service.OrderError, match="rider role"):
        order_service.take_errand(1, {"errandId": 7})


def test_image_object_metadata_is_audited(monkeypatch):
    from campus_trade.services import content_service

    seen = []
    monkeypatch.setattr(content_service, "_assert_publish_user", lambda user_id: {"id": user_id, "status": "active", "is_verified": 1})
    monkeypatch.setattr(content_service.user_repository, "get_user_role", lambda user_id: "user")
    monkeypatch.setattr(content_service.content_repository, "first_active_category_id", lambda category_type: 1)
    monkeypatch.setattr(content_service, "_load_ai_rule", lambda: {"image_audit_enabled": 1})

    class Result:
        provider = "rule"
        risk_level = "pass"
        reason = "ok"
        request_id = "rule-1"
        raw_result = {}
        generated = {}

    monkeypatch.setattr(content_service, "ai_audit", lambda text, rule: Result())
    monkeypatch.setattr(content_service, "image_audit", lambda images, rule: seen.extend(images) or Result())
    monkeypatch.setattr(content_service.content_repository, "create_goods_with_audit", lambda *args, **kwargs: 9)

    content_service.publish_goods(
        1,
        {
            "title": "Book",
            "desc": "Clean textbook",
            "price": "12.00",
            "images": ["/uploads/goods/a.jpg"],
            "imageObjects": [{"uploadedUrl": "/uploads/goods/weapon.jpg", "objectKey": "weapon.jpg"}],
        },
    )

    assert "/uploads/goods/a.jpg" in seen
    assert "/uploads/goods/weapon.jpg" in seen
    assert "weapon.jpg" in seen


def test_ai_gateway_normalizes_generated_metadata(monkeypatch):
    from campus_trade.config import AppConfig
    from campus_trade import ai_gateway

    cfg = AppConfig(
        app_env="development",
        testing=True,
        flask_host="127.0.0.1",
        flask_port=5000,
        flask_secret_key="test-flask-secret",
        jwt_secret="test-jwt-secret",
        email_code_secret="test-email-secret",
        pii_encryption_key="test-pii-secret",
        admin_id=99,
        admin_web_username="admin",
        admin_web_password="Admin@Local-2026!",
        admin_web_password_hash="",
        db_host="127.0.0.1",
        db_port=3306,
        db_user="root",
        db_password="local-db-password",
        db_name="campus_trade",
        redis_url="",
        smtp_host="",
        smtp_port=465,
        smtp_user="",
        smtp_pass="",
        smtp_from="campus-trade@example.com",
        mock_email="auto",
        email_code_ttl_seconds=600,
        allow_dev_login=False,
        allow_demo_token=False,
        api_demo_token="",
        wechat_appid="",
        wechat_secret="",
        deepseek_api_key="deepseek-test-key",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-chat",
        deepseek_timeout_seconds=12,
        ai_enabled=True,
        ai_circuit_fail_threshold=3,
        ai_circuit_reset_seconds=60,
        idempotency_required=False,
        max_upload_bytes=5 * 1024 * 1024,
    )
    ai_gateway.configure_ai(cfg)
    monkeypatch.setattr(
        ai_gateway,
        "_deepseek_chat",
        lambda messages, response_format=None: {
            "choices": [
                {
                    "message": {
                        "content": (
                            '{"title":"%s","description":"%s","tags":["Book","book","  campus  ","%s",123]}'
                            % ("T" * 120, "D" * 1200, "x" * 40)
                        )
                    }
                }
            ]
        },
    )

    metadata = ai_gateway.generate_listing_metadata("book")

    assert metadata["provider"] == "deepseek"
    assert len(metadata["title"]) == 100
    assert len(metadata["description"]) == 1000
    assert metadata["tags"] == ["Book", "campus", "x" * 24, "123"]


def test_external_image_audit_adapter_normalizes_provider_response(monkeypatch):
    from campus_trade.config import AppConfig
    from campus_trade import ai_gateway

    cfg = AppConfig(
        app_env="development",
        testing=True,
        flask_host="127.0.0.1",
        flask_port=5000,
        flask_secret_key="test-flask-secret",
        jwt_secret="test-jwt-secret",
        email_code_secret="test-email-secret",
        pii_encryption_key="test-pii-secret",
        admin_id=99,
        admin_web_username="admin",
        admin_web_password="Admin@Local-2026!",
        admin_web_password_hash="",
        db_host="127.0.0.1",
        db_port=3306,
        db_user="root",
        db_password="local-db-password",
        db_name="campus_trade",
        redis_url="",
        smtp_host="",
        smtp_port=465,
        smtp_user="",
        smtp_pass="",
        smtp_from="campus-trade@example.com",
        mock_email="auto",
        email_code_ttl_seconds=600,
        allow_dev_login=False,
        allow_demo_token=False,
        api_demo_token="",
        wechat_appid="",
        wechat_secret="",
        deepseek_api_key="",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-chat",
        deepseek_timeout_seconds=12,
        ai_enabled=True,
        ai_circuit_fail_threshold=3,
        ai_circuit_reset_seconds=60,
        image_audit_endpoint="https://image-audit.example.test/check",
        image_audit_api_key="image-key",
        image_audit_timeout_seconds=8,
        idempotency_required=False,
        max_upload_bytes=5 * 1024 * 1024,
    )
    ai_gateway.configure_ai(cfg)
    monkeypatch.setattr(
        ai_gateway,
        "_external_image_audit",
        lambda images: ai_gateway.AuditResult(
            provider="external_image",
            risk_level="reject",
            reason="unsafe image",
            request_id="img-1",
            raw_result={"images": images},
            generated={},
        ),
    )

    result = ai_gateway.image_audit(["/uploads/goods/a.jpg"], {"image_audit_enabled": 1})

    assert result.provider == "external_image"
    assert result.risk_level == "reject"
    assert result.request_id == "img-1"


def test_external_image_audit_failure_falls_back_to_metadata(monkeypatch):
    from campus_trade.config import AppConfig
    from campus_trade import ai_gateway

    cfg = AppConfig(
        app_env="development",
        testing=True,
        flask_host="127.0.0.1",
        flask_port=5000,
        flask_secret_key="test-flask-secret",
        jwt_secret="test-jwt-secret",
        email_code_secret="test-email-secret",
        pii_encryption_key="test-pii-secret",
        admin_id=99,
        admin_web_username="admin",
        admin_web_password="Admin@Local-2026!",
        admin_web_password_hash="",
        db_host="127.0.0.1",
        db_port=3306,
        db_user="root",
        db_password="local-db-password",
        db_name="campus_trade",
        redis_url="",
        smtp_host="",
        smtp_port=465,
        smtp_user="",
        smtp_pass="",
        smtp_from="campus-trade@example.com",
        mock_email="auto",
        email_code_ttl_seconds=600,
        allow_dev_login=False,
        allow_demo_token=False,
        api_demo_token="",
        wechat_appid="",
        wechat_secret="",
        deepseek_api_key="",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-chat",
        deepseek_timeout_seconds=12,
        ai_enabled=True,
        ai_circuit_fail_threshold=3,
        ai_circuit_reset_seconds=60,
        image_audit_endpoint="https://image-audit.example.test/check",
        image_audit_api_key="image-key",
        image_audit_timeout_seconds=8,
        idempotency_required=False,
        max_upload_bytes=5 * 1024 * 1024,
    )
    ai_gateway.configure_ai(cfg)
    monkeypatch.setattr(ai_gateway, "_external_image_audit", lambda images: (_ for _ in ()).throw(OSError("offline")))

    result = ai_gateway.image_audit(["/uploads/goods/weapon.jpg"], {"image_audit_enabled": 1})

    assert result.provider == "rule_image_metadata"
    assert result.risk_level == "manual"
    assert result.raw_result["providerError"] == "offline"


def test_upload_contract_uses_short_lived_token():
    asset_controller = (ADMIN_WEB / "campus_trade" / "controllers" / "assets.py").read_text(encoding="utf-8")
    user_controller = (ADMIN_WEB / "campus_trade" / "controllers" / "users.py").read_text(encoding="utf-8")
    assert "/api/files/upload" in asset_controller
    assert "uploadToken" in asset_controller
    assert "purpose\") != \"upload\"" in asset_controller
    assert "verify_live_token_principal" in asset_controller
    assert "upload token subject mismatch" in asset_controller
    assert "upload token scene mismatch" in asset_controller
    assert "max_upload_bytes" in asset_controller
    assert "upload file is too large" in asset_controller
    assert "uuid.uuid4().hex" in asset_controller
    assert "safe_upload_scene" in asset_controller
    assert '"purpose": "upload"' in user_controller


def test_upload_endpoint_rechecks_live_user_and_openid(client, monkeypatch):
    flask_client, _ = client
    from campus_trade import security

    monkeypatch.setattr(
        security,
        "get_auth_principal",
        lambda user_id: {"id": user_id, "role": "user", "status": "active", "openid": "wx-openid-1"},
    )

    token = security.jwt_sign(
        {
            "sub": 1,
            "role": "user",
            "purpose": "upload",
            "scene": "goods",
            "exp": 4_102_444_800,
        }
    )
    response = flask_client.post(
        "/api/files/upload",
        data={"uploadToken": token, "scene": "goods", "userId": "1"},
    )
    assert response.status_code == 401
    assert response.get_json()["msg"] == "token principal binding missing"


def test_upload_endpoint_rejects_wrong_subject(client, monkeypatch):
    flask_client, _ = client
    from campus_trade import security

    monkeypatch.setattr(
        security,
        "get_auth_principal",
        lambda user_id: {"id": user_id, "role": "user", "status": "active", "openid": "wx-openid-1"},
    )

    token = security.jwt_sign(
        {
            "sub": 1,
            "role": "user",
            "openid": "wx-openid-1",
            "purpose": "upload",
            "scene": "goods",
            "exp": 4_102_444_800,
        }
    )
    response = flask_client.post(
        "/api/files/upload",
        data={"uploadToken": token, "scene": "goods", "userId": "2"},
    )
    assert response.status_code == 401
    assert response.get_json()["code"] == 401


def test_upload_endpoint_requires_token_from_form_or_header(client, monkeypatch):
    flask_client, _ = client
    from campus_trade import security

    monkeypatch.setattr(
        security,
        "get_auth_principal",
        lambda user_id: {"id": user_id, "role": "user", "status": "active", "openid": "wx-openid-1"},
    )

    token = security.jwt_sign(
        {
            "sub": 1,
            "role": "user",
            "openid": "wx-openid-1",
            "purpose": "upload",
            "scene": "goods",
            "exp": 4_102_444_800,
        }
    )
    response = flask_client.post("/api/files/upload", data={"scene": "goods", "userId": "1"})

    assert response.status_code == 401
    assert response.get_json()["msg"] == "missing or invalid upload token"
    header_response = flask_client.post(
        "/api/files/upload",
        data={"scene": "goods", "userId": "1"},
        headers={"X-Upload-Token": token},
    )
    assert header_response.status_code == 200
    assert header_response.get_json()["msg"] == "missing upload file"


def test_write_endpoints_are_idempotency_protected():
    source = (ADMIN_WEB / "campus_trade" / "idempotency.py").read_text(encoding="utf-8")
    repo_source = (ADMIN_WEB / "campus_trade" / "repositories" / "idempotency.py").read_text(encoding="utf-8")
    for path in [
        "/api/orders",
        "/api/order/create",
        "/api/order/pay",
        "/api/order/refund",
        "/api/errands",
        "/api/rider/take",
        "/api/chats/messages",
        "/api/goods/save",
        "/api/goods/publish",
        "/api/user/profile/update",
        "/api/user/verify",
        "/api/comment",
        "/api/admin/reconciliations",
        "/api/admin/backups",
    ]:
        assert path in source
    for pattern in [
        r"^/api/goods/\d+$",
        r"^/api/goods/\d+/status$",
        r"^/api/services/\d+/orders$",
        r"^/api/orders/[^/]+/(pay|cancel|receive|refunds|confirm|ship|complaints)$",
        r"^/api/errands/\d+/(accept|status)$",
        r"^/api/admin/goods/\d+/audit$",
        r"^/api/admin/refunds/\d+/arbitration$",
        r"^/api/admin/withdraws/\d+/audit$",
        r"^/api/admin/users/\d+/status$",
    ]:
        assert pattern in source
    assert "missing X-Idempotency-Key" in source
    assert "IDEMPOTENCY_KEY_RE" in source
    assert "invalid X-Idempotency-Key" in source
    assert "verify_live_token_principal" in source
    assert "permission denied" in source
    assert "_requires_idempotency" in source
    assert "_route_requires_api_auth" in source
    assert "idempotency_repository.begin_request" in source
    assert "sp_begin_idempotency" not in source
    assert "sp_finish_idempotency" not in source
    assert "IdempotencyKey" in repo_source
    assert "with_for_update()" in repo_source
    assert "sp_begin_idempotency" not in repo_source
    assert "sp_finish_idempotency" not in repo_source


def test_invalid_idempotency_key_is_rejected_before_service(client, monkeypatch):
    flask_client, _ = client
    from campus_trade import security
    from campus_trade.services import order_service

    monkeypatch.setattr(
        security,
        "get_auth_principal",
        lambda user_id: {"id": user_id, "role": "user", "status": "active", "openid": "wx-openid-1"},
    )
    monkeypatch.setattr(order_service, "pay_order", lambda user_id, data: pytest.fail("service should not run"))
    token = security.jwt_sign({"sub": 1, "role": "user", "openid": "wx-openid-1", "purpose": "api"})

    response = flask_client.post(
        "/api/order/pay",
        json={"orderSn": "CT1"},
        headers={"Authorization": "Bearer " + token, "X-Idempotency-Key": "bad key with spaces"},
    )

    assert response.status_code == 400
    assert response.get_json()["msg"] == "invalid X-Idempotency-Key"


def test_idempotency_auto_protects_new_authenticated_post_route(client, monkeypatch):
    flask_client, admin_app = client
    from campus_trade import security
    from campus_trade.responses import api_ok

    monkeypatch.setattr(
        security,
        "get_auth_principal",
        lambda user_id: {"id": user_id, "role": "user", "status": "active", "openid": "wx-openid-1"},
    )

    @admin_app.app.route("/api/probe/write", methods=["POST"])
    @security.require_api_auth
    def probe_write():
        return api_ok({"ran": True})

    token = security.jwt_sign({"sub": 1, "role": "user", "openid": "wx-openid-1", "purpose": "api"})
    response = flask_client.post(
        "/api/probe/write",
        json={"value": 1},
        headers={"Authorization": "Bearer " + token, "X-Idempotency-Key": "bad key with spaces"},
    )

    assert response.status_code == 400
    assert response.get_json()["msg"] == "invalid X-Idempotency-Key"


def test_admin_write_idempotency_rejects_non_admin_before_service(client, monkeypatch):
    flask_client, _ = client
    from campus_trade import security
    from campus_trade.services import admin_service

    monkeypatch.setattr(
        security,
        "get_auth_principal",
        lambda user_id: {"id": user_id, "role": "user", "status": "active", "openid": "wx-openid-1"},
    )
    monkeypatch.setattr(admin_service, "audit_withdraw", lambda *args, **kwargs: pytest.fail("admin service should not run"))
    token = security.jwt_sign({"sub": 1, "role": "user", "openid": "wx-openid-1", "purpose": "api"})

    response = flask_client.post(
        "/api/admin/withdraw/audit",
        json={"id": 1, "result": "approve"},
        headers={"Authorization": "Bearer " + token, "X-Idempotency-Key": "admin-write-1"},
    )

    assert response.status_code == 403
    assert response.get_json()["msg"] == "permission denied"


def test_miniprogram_sends_idempotency_keys_for_write_endpoints():
    source = (ROOT / "miniprogram" / "utils" / "api.js").read_text(encoding="utf-8")
    assert "const IDEMPOTENCY_ENDPOINTS" in source
    assert "makeIdempotencyKey" in source
    assert "headers['X-Idempotency-Key']" in source
    assert "requiresIdempotency(options.url)" in source
    assert "/^\\/api\\/goods\\/\\d+\\/status$/" in source
    assert "/^\\/api\\/orders\\/[^/]+\\/(pay|cancel|receive|refunds|confirm|ship|complaints)$/" in source
    assert "/^\\/api\\/admin\\/refunds\\/\\d+\\/arbitration$/" in source


def test_miniprogram_uses_remote_wechat_login_without_mock_or_dev_identity():
    app_source = (ROOT / "miniprogram" / "app.js").read_text(encoding="utf-8")
    api_source = (ROOT / "miniprogram" / "utils" / "api.js").read_text(encoding="utf-8")
    store_source = (ROOT / "miniprogram" / "utils" / "store.js").read_text(encoding="utf-8")

    assert "allowDevLogin: false" in app_source
    assert "devOpenid: ''" in app_source
    assert "apiMode" not in app_source
    assert "allowMockApi" not in app_source
    assert "useMock" not in app_source
    assert not (ROOT / "miniprogram" / "utils" / "mock.js").exists()
    assert "wx.login" in api_source
    assert "allowDevLogin" in api_source
    assert "isLocalBackend" not in api_source
    assert "mock-openid-001" not in api_source
    assert "if (devOpenid && !data.code && !data.devOpenid)" in api_source
    assert "require('./mock')" not in api_source
    assert "allowMock" not in api_source
    assert "function login()" not in store_source
    assert "dev-${Date.now()}" not in store_source


def test_miniprogram_publish_calls_backend_ai_generation():
    source = (ROOT / "miniprogram" / "pages" / "publish" / "publish.js").read_text(encoding="utf-8")
    assert "url: '/api/ai/listing/generate'" in source
    assert "localGeneratedMetadata" in source
    assert "AI 服务暂不可用" in source


def test_component_wxss_avoids_disallowed_selectors():
    selector_pattern = re.compile(r"(?m)^([^{@}]+)\{")
    tag_pattern = re.compile(r"(^|[\s>+~,(])(?:view|text|image|button|input|textarea|picker|scroll-view|swiper|navigator)(?=$|[\s.#[:>{,+~])")
    id_pattern = re.compile(r"(^|[\s>+~,(])#[A-Za-z_][\w-]*")
    attr_pattern = re.compile(r"\[[^\]]+\]")

    for path in (ROOT / "miniprogram" / "components").rglob("*.wxss"):
        source = path.read_text(encoding="utf-8")
        for match in selector_pattern.finditer(source):
            selectors = match.group(1)
            if ":" in selectors and selectors.strip().startswith(":host"):
                selectors = selectors.replace(":host", "")
            for selector in selectors.split(","):
                selector = selector.strip()
                if not selector:
                    continue
                assert not id_pattern.search(selector), f"ID selector is not allowed in component WXSS: {path}: {selector}"
                assert not attr_pattern.search(selector), f"attribute selector is not allowed in component WXSS: {path}: {selector}"
                assert not tag_pattern.search(selector), f"tag selector is not allowed in component WXSS: {path}: {selector}"


def test_miniprogram_upload_sends_upload_token_in_form_data():
    publish_source = (ROOT / "miniprogram" / "pages" / "publish" / "publish.js").read_text(encoding="utf-8")
    api_source = (ROOT / "miniprogram" / "utils" / "api.js").read_text(encoding="utf-8")
    assert "uploadToken: credential.uploadToken" in publish_source
    assert "mock-upload-token" not in api_source
    assert "item.uploadedUrl || item.url || item.tempFilePath" in publish_source
    assert "cleanDraftImage" in publish_source
    assert "restoreDraftImage" in publish_source
    assert "isTemporaryImageUrl" in publish_source
    assert "url.indexOf('/__tmp__/') >= 0" in publish_source
    assert "form.images = (form.images || []).map(restoreDraftImage).filter(Boolean)" in publish_source
    assert "tempFilePath: ''" in publish_source


def test_mysql_security_grants_cover_orm_write_tables():
    security_sql = (ROOT / "database" / "mysql" / "security.sql").read_text(encoding="utf-8")
    required_grants = [
        "GRANT INSERT, UPDATE ON campus_trade.users TO 'campus_app_role';",
        "GRANT INSERT, UPDATE ON campus_trade.goods TO 'campus_app_role';",
        "GRANT INSERT, UPDATE ON campus_trade.errand_orders TO 'campus_app_role';",
        "GRANT INSERT ON campus_trade.errand_events TO 'campus_app_role';",
        "GRANT INSERT, UPDATE ON campus_trade.orders TO 'campus_app_role';",
        "GRANT INSERT ON campus_trade.order_events TO 'campus_app_role';",
        "GRANT INSERT, UPDATE ON campus_trade.order_funds TO 'campus_app_role';",
        "GRANT INSERT ON campus_trade.wallet_logs TO 'campus_app_role';",
        "GRANT INSERT, UPDATE ON campus_trade.refund_requests TO 'campus_app_role';",
        "GRANT INSERT, UPDATE ON campus_trade.withdraw_requests TO 'campus_app_role';",
        "GRANT INSERT ON campus_trade.admin_audit_logs TO 'campus_app_role';",
        "GRANT INSERT ON campus_trade.job_logs TO 'campus_app_role';",
        "GRANT INSERT, UPDATE ON campus_trade.idempotency_keys TO 'campus_app_role';",
        "GRANT INSERT, UPDATE ON campus_trade.notifications TO 'campus_app_role';",
    ]
    for grant in required_grants:
        assert grant in security_sql

    assert "GRANT SELECT, INSERT, UPDATE, DELETE" not in security_sql.split("TO 'campus_app_role'")[0]
    assert "Financial append-only" in security_sql


def test_profile_does_not_request_rider_earnings_for_plain_user():
    source = (ROOT / "miniprogram" / "pages" / "profile" / "profile.js").read_text(encoding="utf-8")
    assert "const canRequestEarnings = user && user.canWithdraw" in source
    assert "canRequestEarnings ? api({ url: '/api/rider/earnings' })" in source


def test_wallet_does_not_request_rider_earnings_for_plain_user():
    source = (ROOT / "miniprogram" / "pages" / "wallet" / "wallet.js").read_text(encoding="utf-8")
    assert "const canWithdraw = user.role === 'rider' || user.role === 'provider'" in source
    assert "canWithdraw ? api({ url: '/api/rider/earnings' })" in source
    assert "api({ url: '/api/user/profile' })" in source
    assert "const latestUser = store.updateUser(profileRes.data || {})" in source
    assert "syncUserBalance(res.data && res.data.balance)" in source


def test_miniprogram_localizes_http_upload_images_before_rendering():
    helper = (ROOT / "miniprogram" / "utils" / "image-cache.js").read_text(encoding="utf-8")
    home = (ROOT / "miniprogram" / "pages" / "home" / "home.js").read_text(encoding="utf-8")
    category = (ROOT / "miniprogram" / "pages" / "category" / "category.js").read_text(encoding="utf-8")
    assert "wx.downloadFile" in helper
    assert "127\\.0\\.0\\.1" in helper
    assert "localizeGoodsImages" in home
    assert "localizeGoodsImages" in category


def test_security_checks_cover_rbac_idempotency_ai_and_legacy_boundary(monkeypatch):
    from campus_trade.config import AppConfig
    from campus_trade.services import security_checks

    cfg = AppConfig(
        app_env="production",
        testing=True,
        flask_host="127.0.0.1",
        flask_port=5000,
        flask_secret_key="strong-flask-secret-value",
        jwt_secret="strong-jwt-secret-value",
        email_code_secret="strong-email-secret-value",
        pii_encryption_key="strong-pii-secret-value",
        admin_id=99,
        admin_web_username="admin",
        admin_web_password="",
        admin_web_password_hash="pbkdf2_sha256$260000$c2FsdC1mb3ItdHM=$ZGlnZXN0LWZvci10ZXN0cw==",
        db_host="127.0.0.1",
        db_port=3306,
        db_user="campus_app",
        db_password="strong-db-password-value",
        db_name="campus_trade",
        redis_url="redis://127.0.0.1:6379/0",
        smtp_host="smtp.example.test",
        smtp_port=465,
        smtp_user="mailer",
        smtp_pass="strong-smtp-password",
        smtp_from="campus-trade@example.com",
        mock_email="auto",
        email_code_ttl_seconds=600,
        allow_dev_login=False,
        allow_demo_token=False,
        api_demo_token="",
        wechat_appid="wx-prod-appid",
        wechat_secret="wx-prod-secret-value",
        deepseek_api_key="deepseek-prod-secret-value",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-chat",
        deepseek_timeout_seconds=12,
        ai_enabled=True,
        ai_circuit_fail_threshold=3,
        ai_circuit_reset_seconds=60,
        idempotency_required=True,
        max_upload_bytes=5 * 1024 * 1024,
    )
    monkeypatch.setattr(security_checks, "redis_status", lambda: "connected")
    monkeypatch.setattr(security_checks, "circuit_state", lambda: "closed")

    names = {item["name"]: item for item in security_checks.run_security_checks(cfg)}

    for name in ["RBAC enforcement", "Admin CSRF", "Idempotency", "DeepSeek gateway", "Legacy Node boundary", "Layered Flask backend"]:
        assert name in names
        assert names[name]["status"] == "healthy"


def test_money_and_order_orm_repositories_use_row_locks():
    sources = "\n".join(
        (ADMIN_WEB / "campus_trade" / "repositories" / name).read_text(encoding="utf-8")
        for name in ["orders.py", "admin.py", "accounts.py", "idempotency.py"]
    )
    for function in [
        "def create_goods_order",
        "def pay_order",
        "def receive_order",
        "def apply_refund",
        "def take_errand_order",
        "def audit_withdraw",
        "def arbitrate_refund",
    ]:
        assert function in sources
    assert sources.count("with_for_update()") >= 18
    assert "call_proc" not in sources
    assert "sp_" not in sources


def test_withdraw_audit_translates_ui_result_to_repository(monkeypatch):
    from campus_trade.services import admin_service

    calls = []
    monkeypatch.setattr(admin_service.admin_repository, "audit_withdraw", lambda withdraw_id, admin_id, status, note: calls.append((withdraw_id, admin_id, status, note)) or True)

    result = admin_service.audit_withdraw(7, "approve", 99)

    assert result == {"id": 7, "result": "approve"}
    assert calls == [(7, 99, "approved", "Mini-program admin withdrawal audit")]


def test_business_procedure_text_is_readable():
    sql = (ROOT / "database" / "mysql" / "business_procedures.sql").read_text(encoding="utf-8")
    for text in ["创建订单", "支付订单", "资金进入订单托管账户", "订单仲裁"]:
        assert text in sql
    assert "提现审核通过" in sql
    assert "提现驳回" in sql


def test_chat_evidence_chain_is_implemented():
    chat_controller = (ADMIN_WEB / "campus_trade" / "controllers" / "chat.py").read_text(encoding="utf-8")
    chat_source = (ADMIN_WEB / "campus_trade" / "services" / "chat_service.py").read_text(encoding="utf-8")
    schema = (ROOT / "database" / "mysql" / "schema.sql").read_text(encoding="utf-8")
    views = (ROOT / "database" / "mysql" / "views_and_routines.sql").read_text(encoding="utf-8")

    assert "previous_hash" in schema
    assert "content_hash" in schema
    assert "chat_service.send_message" in chat_controller
    assert "previousHash" in chat_source
    assert "hashlib.sha256" in chat_source
    assert "OLD.content_hash" in views and "OLD.previous_hash" in views
