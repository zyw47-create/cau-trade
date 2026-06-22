# Backend API Contract

The Flask app started by `admin_web/app.py` is the only current backend entrypoint for mini-program and admin integration. Routes are registered through `campus_trade/app_factory.py` and implemented in `campus_trade/controllers/`.

## Prefixes

- `/api/*` is the primary API prefix.
- `/v1/api/*` is registered as a versioned compatibility prefix with the same contract.
- Canonical routes are resource-oriented REST paths. Old mini-program action paths remain registered only as legacy aliases, and current mini-program pages call the canonical paths.

## Authentication

- `POST /api/auth/login` accepts a WeChat `code`.
- A verified WeChat `code` resolves to an `openid`; new WeChat users are created through the ORM user repository before JWT issuance.
- Local `devOpenid` is accepted only when `ALLOW_DEV_LOGIN=1` and the mini-program explicitly opts in with `allowDevLogin: true`.
- Bare `userId` and bare `openid` login are rejected.
- Protected APIs require `Authorization: Bearer <JWT>`.
- API JWTs must include `sub`, `role`, and `openid`; protected requests recheck the live user row and reject missing or mismatched `openid` bindings.
- API bearer JWTs carry `purpose=api`; upload JWTs carry `purpose=upload` and are rejected by protected API middleware.
- Admin APIs require JWT `role=admin`; write audit records use the authenticated admin user, not a fixed configured admin id.
- Business role APIs are checked server-side: service publishing requires `provider` or `admin`; rider earnings, withdrawal, errand acceptance, and errand progress updates require `rider` or `admin`.
- Admin HTML form POSTs use session CSRF tokens. API endpoints use bearer JWTs and do not use the admin session.

## Write Safety

- Money, order, refund, withdrawal, idempotency, and errand race-sensitive writes use SQLAlchemy ORM transactions with `SELECT ... FOR UPDATE` row locks.
- Flask runtime code does not call MySQL stored procedures or generic raw SQL helpers.
- Write endpoints use `X-Idempotency-Key`; production rejects missing keys, and keys must match `[A-Za-z0-9:_-]{8,80}`. Idempotency is checked after live JWT/openid/RBAC validation.
- Uploads require a short-lived upload token issued by `/api/files/upload-credential` or `/api/oss/sts`; upload tokens are bound to user, openid, and scene, rechecked against the live user row, and capped by `MAX_UPLOAD_BYTES`.

## Canonical Route Table

Every canonical route below is also registered under `/v1/api/*` with the same method and contract.

| Route | Method | Auth |
| --- | --- | --- |
| `/api/status` | GET | public |
| `/api/auth/login` | POST | public, WeChat code or local `devOpenid` only |
| `/api/auth/logout` | POST | bearer |
| `/api/auth/bind` | POST | bearer + idempotency |
| `/api/goods` | GET | public |
| `/api/goods` | POST | bearer + idempotency |
| `/api/goods/<int:goods_id>` | GET | public |
| `/api/goods/<int:goods_id>` | PUT | bearer + idempotency |
| `/api/goods/<int:goods_id>` | DELETE | bearer + idempotency |
| `/api/goods/<int:goods_id>/status` | PUT | bearer + idempotency |
| `/api/goods/favorite` | POST | bearer + idempotency |
| `/api/goods/favorites` | GET | bearer |
| `/api/goods/mine` | GET | bearer |
| `/api/services` | GET | public |
| `/api/services` | POST | provider/admin bearer + idempotency |
| `/api/services/<int:service_id>` | GET | public |
| `/api/services/<int:service_id>/orders` | POST | bearer + idempotency |
| `/api/errands` | POST | bearer + idempotency |
| `/api/errands/<int:errand_id>/accept` | POST | rider/admin bearer + idempotency |
| `/api/errands/<int:errand_id>/status` | PUT/POST | rider/admin bearer + idempotency |
| `/api/orders` | GET | bearer |
| `/api/orders` | POST | bearer + idempotency |
| `/api/orders/<path:order_sn>` | GET | bearer |
| `/api/orders/<path:order_sn>/pay` | POST | bearer + idempotency |
| `/api/orders/<path:order_sn>/cancel` | POST | bearer + idempotency |
| `/api/orders/<path:order_sn>/receive` | PUT/POST | bearer + idempotency |
| `/api/orders/<path:order_sn>/refunds` | POST | bearer + idempotency |
| `/api/orders/<path:order_sn>/confirm` | PUT/POST | seller/provider bearer + idempotency |
| `/api/orders/<path:order_sn>/ship` | PUT/POST | seller/provider bearer + idempotency |
| `/api/orders/<path:order_sn>/complaints` | POST | bearer + idempotency |
| `/api/comment` | POST | bearer + idempotency |
| `/api/chats` | GET | bearer |
| `/api/chats/<int:conversation_id>/messages` | GET | bearer |
| `/api/chats/messages` | POST | bearer + idempotency |
| `/api/user/profile` | GET | bearer |
| `/api/user/profile` | PUT | bearer + idempotency |
| `/api/user/public` | GET | public |
| `/api/user/credit` | GET | bearer |
| `/api/user/role` | POST | bearer + idempotency |
| `/api/account/logs` | GET | bearer |
| `/api/account/recharge` | POST | bearer + idempotency |
| `/api/rider/earnings` | GET | rider/admin bearer |
| `/api/rider/withdraw` | POST | rider/admin bearer + idempotency |
| `/api/oss/sts` | POST | bearer |
| `/api/files/upload-credential` | POST | bearer |
| `/api/files/upload` | POST | upload token |
| `/api/ai/listing/generate` | POST | bearer + idempotency |
| `/api/ai/generate` | POST | bearer + idempotency |
| `/api/user/email-code` | POST | bearer + idempotency |
| `/api/user/verify` | POST | bearer + idempotency |
| `/api/admin/stats` | GET | admin bearer |
| `/api/admin/stats/export` | GET | admin bearer |
| `/api/admin/reconciliations` | POST | admin bearer + idempotency |
| `/api/admin/goods/pending` | GET | admin bearer |
| `/api/admin/goods/<int:goods_id>/audit` | POST | admin bearer + idempotency |
| `/api/admin/orders/refunding` | GET | admin bearer |
| `/api/admin/refunds/<int:refund_id>/arbitration` | POST | admin bearer + idempotency |
| `/api/admin/withdraws` | GET | admin bearer |
| `/api/admin/withdraws/<int:withdraw_id>/audit` | POST | admin bearer + idempotency |
| `/api/admin/users` | GET | admin bearer |
| `/api/admin/users/<int:user_id>/status` | PUT | admin bearer + idempotency |
| `/api/admin/ai/rules` | GET | admin bearer |
| `/api/admin/ai/rules` | PUT | admin bearer + idempotency |
| `/api/admin/audit/logs` | GET | admin bearer |
| `/api/admin/ops/health` | GET | admin bearer |
| `/api/admin/security/checks` | GET | admin bearer |
| `/api/admin/backups` | POST | admin bearer + idempotency |
| `/api/admin/backups/latest` | GET | admin bearer |

## Legacy Aliases

The backend still registers these aliases so old clients fail gracefully during transition, but new code must not call them:

- `/api/goods/list`, `/api/goods/detail`, `/api/goods/save`, `/api/goods/publish`, `/api/goods/remove`, `/api/goods/relist`
- `/api/service/list`, `/api/service/detail`, `/api/service/save`, `/api/service/order`, `/api/service/<id>/order`, `/api/services/publish`, `/api/services/orders/create`, `/api/errands/publish`
- `/api/order/list`, `/api/orders/list`, `/api/order/detail`, `/api/orders/detail`, `/api/order/create`, `/api/orders/create`, `/api/order/pay`, `/api/order/cancel`, `/api/order/receive`, `/api/order/refund`, `/api/order/confirm`, `/api/order/ship`, `/api/order/complaint`, `/api/order/<orderSn>/*`
- `/api/rider/take`, `/api/rider/status`, `/api/rider/order/<id>/*`, `/api/errands/accept`
- `/api/chat/list`, `/api/chat/messages`, `/api/chat/history`, `/api/chat/send`
- `/api/ai/goods/title`, `/api/ai/goods/desc`, `/api/ai/goods/tags`
- `/api/admin/reconcile/run`, `/api/admin/goods/audit`, `/api/admin/order/arbitrate`, `/api/admin/withdraw/audit`, `/api/admin/user/status`, `/api/admin/ai/rules/update`, `/api/admin/backup/run`, `/api/admin/backup/latest`

## AI

- Publishing and listing generation call `campus_trade/ai_gateway.py`.
- DeepSeek is used when configured, with keyword-rule fallback and circuit breaking.
- Publish payloads that include image URLs/object keys produce `image_audit` records in `ai_audit_records`; `IMAGE_AUDIT_ENDPOINT` enables an external image moderation provider, and failures degrade to the metadata-rule fallback.
- Generated title, description, and tags are normalized before being returned or written to `ai_audit_records`.

## Legacy Node

`backend/server.js` is disabled unless `ENABLE_LEGACY_NODE=1`. When enabled, it is read-only by default and has no mock fallback:

- write APIs return a 409-style failure unless `LEGACY_ALLOW_MUTATIONS=1`;
- when `LEGACY_ALLOW_MUTATIONS=1`, this boundary service still returns 501 for writes because it intentionally has no write implementation;
- read APIs return 410 and direct callers to Flask;
- write mock fallback and database read mock fallback are not implemented.
