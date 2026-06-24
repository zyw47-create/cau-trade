# Campus Trade Flask Backend

`admin_web` is the current backend for the mini-program and admin console. It uses Flask, SQLAlchemy ORM, MySQL, Redis-compatible locks/cache, and the service/repository package under `campus_trade/`.

Controllers and services must not contain SQL text, cursor calls, or direct driver imports. Data access lives in ORM repositories backed by `admin_web/models.py`; money, order, refund, withdrawal, idempotency, and errand writes use SQLAlchemy transactions with row locks instead of stored-procedure runtime calls.

## Start Locally

Recommended entrypoint:

```powershell
cd "D:\大三下\软件工程\cau-trade-master\admin_web"
.\start-admin.bat
```

The startup wizard prompts for Flask port, MySQL host/user/password, admin account/password, and local dev-login mode. It writes the answers to `admin_web/.env.local`, checks the database connection, then starts `python app.py`.

For production, set `ADMIN_WEB_PASSWORD_HASH`; plaintext `ADMIN_WEB_PASSWORD` is accepted only for local development.

```powershell
python - <<'PY'
import sys
sys.path.insert(0, "admin_web")
from campus_trade.security import hash_password
print(hash_password("replace-with-a-strong-password"))
PY
```

Then visit:

```text
http://127.0.0.1:5000
```

## Authentication

`POST /api/auth/login` accepts a WeChat `code` and creates first-time WeChat users through the ORM repository after resolving `openid`. Local `devOpenid` login only works when `ALLOW_DEV_LOGIN=1`; bare `userId` and bare `openid` login are rejected.

Mini-program API calls use `Authorization: Bearer <JWT>`. Protected requests recheck the live user status, role, and token `openid` binding.
Uploads use short-lived upload JWTs that are also rechecked against the live user row and limited by `MAX_UPLOAD_BYTES`. Publish payloads with images produce `image_audit` records alongside text audit records.

## Architecture

- `app.py`: thin WSGI/local startup entrypoint.
- `campus_trade/app_factory.py`: Flask application factory and route registration.
- `campus_trade/controllers/`: HTTP controllers for `/api/*`, `/v1/api/*`, uploads, admin APIs, and admin HTML pages.
- `campus_trade/config.py`: environment loading and production unsafe-config validation.
- `campus_trade/database.py`: SQLAlchemy Engine/Session factory.
- `campus_trade/repositories/`: ORM-backed repositories.
- `campus_trade/services/`: auth, user verification, account, publishing, order, chat, admin, AI, and security-check workflows without SQL or driver access.

`../backend/server.js` is legacy-only and must not be used as the integration entrypoint.
