# Campus Trade MySQL Schema

This directory contains the MySQL 8 schema, seed data, procedures, events, and operational scripts used by the Flask backend. The mini-program never connects to MySQL directly; it calls the Flask `/api/*` or `/v1/api/*` endpoints.

## Files

- `schema.sql`: tables, constraints, indexes, and evidence-chain columns.
- `seed.sql` and `seed_more.sql`: local demonstration data.
- `business_procedures.sql`: transactional procedures for orders, funds, refunds, errands, withdrawals, and idempotency.
- `views_and_routines.sql`: query views, triggers, and routine helpers.
- `security.sql`: least-privilege MySQL roles and users.
- `ops_events.sql`: disabled-by-default scheduled maintenance events.
- `security_checks.sql`: verification queries for accounts, permissions, triggers, funds, and pending sensitive work.
- `verify.sql`: smoke checks after initialization.
- `seed_integrity_patch.sql` and `verify_integrity.sql`: idempotent fixes/checks for demo orders, counterpart users, business items, and chat evidence links.
- `insert-demo-data.bat`: Windows helper that reads `admin_web\.env.local`, applies the integrity patch, and runs the integrity checks.
- `scripts/*.ps1`: backup, restore, health check, and scheduled-task helpers.

## Initialization

For normal local repair after pulling code, run the idempotent patch:

```bat
database\mysql\insert-demo-data.bat
```

If your local `campus_app` password differs from `admin_web\.env.local`, pass a MySQL account explicitly and the script will prompt for that account's password:

```bat
database\mysql\insert-demo-data.bat root
```

For a full local rebuild, run:

```bat
database\mysql\insert-demo-data.bat /reset
```

`/reset` defaults to the local `root` account because it recreates schema objects and database users. To use another privileged account:

```bat
database\mysql\insert-demo-data.bat /reset campus_migration
```

Use a local secret from your shell, password manager, or `mysql_config_editor`; do not commit it.

```powershell
$env:MYSQL_PWD = "<your-local-mysql-password>"
$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$root = "D:\大三下\软件工程\cau-trade-master\database\mysql"

cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 < `"$root\schema.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\seed.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\seed_more.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\views_and_routines.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\business_procedures.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\security.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\ops_events.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\verify.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\security_checks.sql`""
Remove-Item Env:\MYSQL_PWD
```

## Security

Production must not use `root` as the application account. Use the least-privilege accounts from `security.sql`, rotate the local placeholder passwords, and store real credentials outside the repository.

Sensitive identifiers are written as keyed hashes or encrypted values by the backend. Tokens, WeChat AppSecret, DeepSeek API keys, SMTP secrets, and database passwords belong in environment variables or `.env.local`, not in SQL files or mini-program code.

## Operations

Back up with:

```powershell
$env:MYSQL_PWD = "<backup-account-password>"
.\scripts\backup.ps1 -User campus_backup -RetentionDays 30
Remove-Item Env:\MYSQL_PWD
```

Restore drills require explicit confirmation:

```powershell
$env:MYSQL_PWD = "<restore-account-password>"
.\scripts\restore.ps1 -BackupFile .\backups\campus_trade-full-YYYYMMDD_HHMMSS.sql -User campus_migration -ConfirmRestore
Remove-Item Env:\MYSQL_PWD
```

Health checks:

```powershell
$env:MYSQL_PWD = "<ops-account-password>"
.\scripts\healthcheck.ps1 -User campus_ops
Remove-Item Env:\MYSQL_PWD
```

Enable scheduled events only after deployment review:

```sql
SET GLOBAL event_scheduler = ON;
ALTER EVENT ev_campus_daily_stats ENABLE;
ALTER EVENT ev_campus_cancel_unpaid_orders ENABLE;
```
