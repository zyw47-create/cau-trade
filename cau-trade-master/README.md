# Campus Trade Mini-Program

Campus Trade is a WeChat mini-program for second-hand goods, campus services, errands, wallet escrow, chat evidence, real-name verification, AI-assisted moderation, and admin operations.

The current backend entrypoint is the Flask application in `admin_web/app.py`. The legacy Node service in `backend/server.js` is disabled by default and is kept only for old compatibility experiments.

## Current Backend

- Framework: Flask.
- Persistence: MySQL 8, SQLAlchemy Engine/Session, and ORM repositories with transactional row locks for money/order critical paths.
- Layers: thin `admin_web/app.py` entrypoint, `admin_web/campus_trade/app_factory.py`, `controllers/`, `config.py`, `database.py`, `repositories/`, `services/`, `ai_gateway.py`, and `idempotency.py`.
- Persistence boundary: controllers and services contain no SQL text, cursor calls, or driver imports; repositories use SQLAlchemy ORM models and transactions, and Flask runtime code does not call MySQL stored procedures.
- API prefixes: `/api/*` is primary, `/v1/api/*` is versioned compatibility, and mini-program pages call resource-oriented canonical routes.
- Admin UI: served by the same Flask app at `http://127.0.0.1:5000`.

See [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) for the backend architecture and security baseline.
See [API_CONTRACT.md](API_CONTRACT.md) for route prefixes, authentication, idempotency, AI, and legacy compatibility boundaries.

## Security Baseline

- `POST /api/auth/login` requires a WeChat `code`; local `devOpenid` login only works when the Flask backend has `ALLOW_DEV_LOGIN=1` and the mini-program explicitly sets `allowDevLogin: true`.
- A verified WeChat `code` resolves to an `openid`; first-time WeChat users are created through the ORM user repository before a JWT is issued.
- Bare `userId` and bare `openid` login are rejected.
- Protected API calls require `Authorization: Bearer <JWT>`.
- The JWT subject, live user status, role, and token `openid` binding are rechecked on protected requests.
- API JWTs carry `purpose=api`; upload JWTs carry `purpose=upload` and cannot be reused as bearer tokens for protected APIs.
- Admin HTML forms use session CSRF tokens.
- Production must set strong `FLASK_SECRET_KEY`, `JWT_SECRET`, `EMAIL_CODE_SECRET`, `PII_ENCRYPTION_KEY`, and `ADMIN_WEB_PASSWORD_HASH`.
- Production must keep `ALLOW_DEV_LOGIN=0` and `ALLOW_DEMO_TOKEN=0`.
- File upload requires a short-lived upload token bound to the user, openid, and upload scene, plus the `MAX_UPLOAD_BYTES` size cap.
- Write endpoints use `X-Idempotency-Key`; production enforces it, and development can enforce it with `IDEMPOTENCY_REQUIRED=1`.

Local secrets belong in `admin_web/.env.local`, which is ignored by Git. Do not commit database passwords, WeChat AppSecret, SMTP credentials, JWT secrets, or DeepSeek keys.

## Project Layout

```text
miniprogram/                  WeChat mini-program source
admin_web/                    Flask API and admin console
admin_web/campus_trade/       layered backend package
database/mysql/               schema, seed data, procedures, security, ops scripts
backend/                      legacy Node compatibility service
scripts/                      local verification and demo helper scripts
tests/                        pytest backend contract tests
BACKEND_ARCHITECTURE.md       backend architecture/security baseline
```

## Start Flask Locally

Recommended entrypoint:

```powershell
cd "D:\大三下\软件工程\cau-trade-master\admin_web"
.\start-admin.bat
```

The startup wizard prompts for Flask port, MySQL host/user/password, admin account/password, and local dev-login mode. It writes the answers to `admin_web/.env.local`, checks the database connection, then starts the Flask backend.

You can also run the same wizard from the project root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-all.ps1
```

Useful URLs:

```text
http://127.0.0.1:5000
http://127.0.0.1:5000/api/status
```

The mini-program defaults to:

```js
globalData: {
  baseUrl: 'http://127.0.0.1:5000',
  verifyBaseUrl: 'http://127.0.0.1:5000',
  devOpenid: ''
}
```

The mini-program API client has no local mock fallback; all pages call the Flask API directly.

## Database

Use the SQL files in `database/mysql/` in this order for a local reset:

```text
schema.sql
seed.sql
seed_more.sql
views_and_routines.sql
business_procedures.sql
security.sql
ops_events.sql
verify.sql
security_checks.sql
```

See [database/mysql/README.md](database/mysql/README.md) for full initialization, backup, restore, and health-check commands.

## AI

The publish and generation flows call `campus_trade/ai_gateway.py`.

- DeepSeek is used when `DEEPSEEK_API_KEY` is configured.
- Keyword-rule moderation is the fallback.
- A circuit breaker degrades to rules after repeated AI failures.
- Image uploads are represented by `image_audit` records when publish payloads include images. Configure `IMAGE_AUDIT_ENDPOINT` and `IMAGE_AUDIT_API_KEY` to call an external image moderation provider; otherwise the backend records metadata-based rule audit results and keeps the provider boundary explicit.
- Generated title, description, and tag suggestions are audited before being recorded.

## Legacy Node Boundary

`backend/server.js` is not the current backend. It exits unless `ENABLE_LEGACY_NODE=1` is set. It has no mock fallback, and database acceptance must use Flask. Legacy writes are disabled unless `LEGACY_ALLOW_MUTATIONS=1`; even when enabled, the boundary service returns 501 because real writes belong to Flask.

Use it only when deliberately testing old compatibility behavior.

## Tests

Run:

```powershell
pytest -q
```

Coverage settings are stored in `.coveragerc`.

Coverage run:

```powershell
pytest --cov=admin_web/campus_trade --cov=admin_web/app.py --cov-report=term-missing
```

The contract tests cover authentication, weak-secret rejection, route compatibility, service-layer boundaries, upload tokens, AI gateway behavior, ORM transaction locking, idempotency, chat evidence chains, and the legacy Node boundary.
