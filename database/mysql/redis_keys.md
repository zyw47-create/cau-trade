# Redis Key Design

This project uses MySQL as the authoritative database. Redis is an optional acceleration and concurrency layer for classroom deployment. If Redis is not installed, the backend falls back to MySQL transactions, row locks, and local request cache.

## Naming Rules

- Prefix all keys with `campus_trade:` to avoid collisions.
- Use lowercase resource names and colon-separated identifiers.
- Store cached JSON with short TTLs; never treat Redis as the source of truth.
- Use `SET key value NX PX <milliseconds>` for distributed locks.

## Cache Keys

| Key | Type | TTL | Purpose |
| --- | --- | --- | --- |
| `campus_trade:goods:list:on_sale:{category}:{page}` | string/json | 60s | Hot goods waterfall list. |
| `campus_trade:goods:detail:{goods_id}` | string/json | 120s | Goods detail page cache. |
| `campus_trade:service:list:on_sale:{category}:{page}` | string/json | 60s | Campus service list cache. |
| `campus_trade:errand:hall:{page}` | string/json | 30s | Waiting errand hall cache. |
| `campus_trade:user:profile:{user_id}` | string/json | 120s | Public seller/service-provider profile. |
| `campus_trade:chat:list:{user_id}` | string/json | 20s | Chat list cache. |

## Lock Keys

| Key | Type | TTL | Purpose |
| --- | --- | --- | --- |
| `campus_trade:lock:order:pay:{order_sn}` | lock | 10s | Prevent duplicate order payment. |
| `campus_trade:lock:order:refund:{order_sn}` | lock | 10s | Prevent duplicate refund application. |
| `campus_trade:lock:errand:take:{errand_id}` | lock | 8s | Prevent concurrent rider grabbing the same errand. |
| `campus_trade:lock:email-code:{email}` | lock | 60s | Prevent repeated email-code sends. |

## Rate Limit Keys

| Key | Type | TTL | Purpose |
| --- | --- | --- | --- |
| `campus_trade:rate:email-code:{email}` | counter | 1h | Limit verification-code sends per school email. |
| `campus_trade:rate:verify:{user_id}` | counter | 10m | Limit verification attempts. |
| `campus_trade:rate:publish:{user_id}` | counter | 10m | Limit high-frequency publishing. |
| `campus_trade:rate:chat:{user_id}` | counter | 1m | Limit chat spam. |

## Invalidation Rules

- After publishing, updating, or auditing goods, delete `campus_trade:goods:list:*` and the related `campus_trade:goods:detail:{goods_id}` key.
- After service publishing or auditing, delete `campus_trade:service:list:*` and affected service detail cache.
- After errand publishing, payment, taking, cancellation, or completion, delete `campus_trade:errand:hall:*`.
- After profile, credit, verification, or review changes, delete `campus_trade:user:profile:{user_id}`.
- After sending a message, delete `campus_trade:chat:list:{sender_id}` and `campus_trade:chat:list:{receiver_id}`.
