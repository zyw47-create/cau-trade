# Backend Architecture And Security Baseline

The default backend is the Flask API started by `admin_web/app.py`, backed by the layered package `admin_web/campus_trade/`.

## Layers

- `admin_web/app.py`: thin WSGI/local startup entrypoint; no route bodies, SQL, or business logic.
- `campus_trade/app_factory.py`: Flask application factory, extension setup, controller registration, and legacy endpoint compatibility.
- `campus_trade/controllers/`: HTTP/controller layer for `/api/*`, `/v1/api/*`, file upload, admin APIs, and admin HTML forms.
- `campus_trade/config.py`: environment loading, `.env.local` support, production weak-secret validation.
- `campus_trade/database.py`: SQLAlchemy Engine/Session factory; it exposes no generic SQL helpers and no stored-procedure runtime adapter.
- `campus_trade/repositories/`: SQLAlchemy ORM repositories. Repository read/write logic uses mapped models and SQLAlchemy expressions, not raw controller/service SQL.
- `campus_trade/services/`: authentication, account/wallet actions, order and errand workflows, chat evidence chains, publish workflows, AI generation/moderation, and security checks. Services contain no SQL text, no cursor calls, and no database driver access.
- `campus_trade/ai_gateway.py`: DeepSeek adapter, keyword-rule fallback, and circuit breaking.
- `campus_trade/idempotency.py`: `X-Idempotency-Key` handling for write endpoints.

## Secrets

Local secrets belong in `admin_web/.env.local`, which is ignored by Git. The repository only keeps `admin_web/.env.example` placeholders.

Local development should use local-only secrets stored outside Git:

```text
ADMIN_DB_PASSWORD=<your-local-mysql-password>
DEEPSEEK_API_KEY=<optional-local-ai-key>
```

Production must set strong values for `FLASK_SECRET_KEY`, `JWT_SECRET`, `EMAIL_CODE_SECRET`, `PII_ENCRYPTION_KEY`, and `ADMIN_WEB_PASSWORD_HASH`; it must also set `ALLOW_DEV_LOGIN=0` and keep `ALLOW_DEMO_TOKEN=0`.

## Persistence Boundary

Controllers may only parse HTTP input, enforce auth decorators, and call services. Services may validate and orchestrate business workflows, but they must not contain SQL, cursor calls, raw driver imports, or generic query helpers. Data access lives in `campus_trade/repositories/` and is implemented with SQLAlchemy ORM models from `admin_web/models.py`.

Money, order, refund, withdrawal, idempotency, and errand race-sensitive writes are implemented in ORM repositories with SQLAlchemy transactions and row locks. Services reach those routines through domain-named repository functions such as `order_repository.create_goods_order()`, `admin_repository.wallet_reconcile()`, and `idempotency_repository.begin_request()`. Stored-procedure names and raw SQL helpers do not appear in Flask runtime code.

## Auth Contract

`POST /api/auth/login` no longer accepts a bare `userId`. It requires either:

- a WeChat `code`, verified through `WECHAT_APPID` and `WECHAT_SECRET`; first-time WeChat users are created through the ORM repository before token issuance; or
- `devOpenid` only when `ALLOW_DEV_LOGIN=1` for local development and the mini-program explicitly opts in with `allowDevLogin: true`.

Protected mini-program endpoints require `Authorization: Bearer <JWT>`.
Every protected request rechecks the live user record, role, status, and token openid binding, so a banned or removed account cannot keep using an old token. Business role checks are enforced in services: service publishing requires `provider` or `admin`, and rider earnings, withdrawal, errand acceptance, and errand progress updates require `rider` or `admin`.
API bearer tokens are marked with `purpose=api`; upload tokens are marked with `purpose=upload` and cannot be reused as API bearer tokens.

Admin HTML pages use session login plus CSRF tokens on every form POST. The browser admin session is separate from mini-program API bearer authentication.

File upload uses `POST /api/oss/sts` or `/api/files/upload-credential` to obtain a short-lived `uploadToken`; `POST /api/files/upload` rejects uploads without that token. Upload tokens are bound to user, openid, and scene, rechecked against the live user row, and request size is limited by `MAX_UPLOAD_BYTES`.

## AI Contract

Publish flows call the AI gateway. DeepSeek is used when `DEEPSEEK_API_KEY` is configured; otherwise the gateway falls back to keyword rules. AI failures open a circuit breaker and degrade to rules instead of blocking the whole backend.

Listing generation is also routed through the AI gateway. The generated title, description, and tag recommendations are audited and recorded in `ai_audit_records` before the user publishes.

When a publish payload contains images, the content service also records an `image_audit` row in `ai_audit_records`. If `IMAGE_AUDIT_ENDPOINT` is configured, `ai_gateway.image_audit()` calls that external provider with image URLs/object keys and normalizes `risk_level`, `reason`, and `request_id`; provider failure degrades to the local metadata-rule fallback. Without an external provider, suspicious image URLs/object keys are marked for manual review.

The current backend uses canonical resource-oriented routes such as `/api/orders`, `/api/orders/<orderSn>/pay`, `/api/services/<id>/orders`, `/api/errands/<id>/accept`, and `/api/admin/goods/<id>/audit`. Older action-style mini-program routes remain registered only as compatibility aliases during transition.

## Legacy Node Boundary

`backend/server.js` is legacy-only and disabled by default. It requires `ENABLE_LEGACY_NODE=1` to start and must not be used for mini-program or database acceptance. It has no mock fallback. Legacy writes remain blocked unless `LEGACY_ALLOW_MUTATIONS=1`; even then the boundary service returns 501 because real writes live only in Flask.
