-- Campus Trade Mini Program - security and reliability checks.
-- Run with a DBA/root account because mysql.user is inspected.

USE campus_trade;

SET NAMES utf8mb4;

SELECT
  'campus_accounts' AS check_name,
  user,
  host,
  plugin,
  account_locked,
  password_expired
FROM mysql.user
WHERE user LIKE 'campus\_%'
ORDER BY user, host;

SELECT
  'app_role_ddl_privilege_violations' AS check_name,
  COUNT(*) AS violation_count
FROM information_schema.SCHEMA_PRIVILEGES
WHERE TABLE_SCHEMA = DATABASE()
  AND GRANTEE LIKE '%campus_app_role%'
  AND PRIVILEGE_TYPE IN (
    'CREATE', 'ALTER', 'DROP', 'CREATE VIEW', 'CREATE ROUTINE',
    'ALTER ROUTINE', 'TRIGGER', 'EVENT', 'LOCK TABLES'
  );

SELECT
  'app_role_required_orm_write_grants' AS check_name,
  COUNT(*) AS actual_count,
  24 AS expected_count,
  CASE WHEN COUNT(*) = 24 THEN 'OK' ELSE 'MISSING' END AS result
FROM information_schema.TABLE_PRIVILEGES
WHERE TABLE_SCHEMA = DATABASE()
  AND GRANTEE LIKE '%campus_app_role%'
  AND (
    (TABLE_NAME = 'users' AND PRIVILEGE_TYPE IN ('INSERT', 'UPDATE')) OR
    (TABLE_NAME = 'goods' AND PRIVILEGE_TYPE IN ('INSERT', 'UPDATE')) OR
    (TABLE_NAME = 'errand_orders' AND PRIVILEGE_TYPE IN ('INSERT', 'UPDATE')) OR
    (TABLE_NAME = 'orders' AND PRIVILEGE_TYPE IN ('INSERT', 'UPDATE')) OR
    (TABLE_NAME = 'order_events' AND PRIVILEGE_TYPE = 'INSERT') OR
    (TABLE_NAME = 'order_funds' AND PRIVILEGE_TYPE IN ('INSERT', 'UPDATE')) OR
    (TABLE_NAME = 'wallet_logs' AND PRIVILEGE_TYPE = 'INSERT') OR
    (TABLE_NAME = 'refund_requests' AND PRIVILEGE_TYPE IN ('INSERT', 'UPDATE')) OR
    (TABLE_NAME = 'withdraw_requests' AND PRIVILEGE_TYPE IN ('INSERT', 'UPDATE')) OR
    (TABLE_NAME = 'admin_audit_logs' AND PRIVILEGE_TYPE = 'INSERT') OR
    (TABLE_NAME = 'job_logs' AND PRIVILEGE_TYPE = 'INSERT') OR
    (TABLE_NAME = 'idempotency_keys' AND PRIVILEGE_TYPE IN ('INSERT', 'UPDATE')) OR
    (TABLE_NAME = 'notifications' AND PRIVILEGE_TYPE IN ('INSERT', 'UPDATE'))
  );

SELECT
  'required_immutable_triggers' AS check_name,
  COUNT(*) AS actual_count,
  8 AS expected_count,
  CASE WHEN COUNT(*) = 8 THEN 'OK' ELSE 'MISSING' END AS result
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
  AND TRIGGER_NAME IN (
    'trg_wallet_logs_no_update',
    'trg_wallet_logs_no_delete',
    'trg_admin_audit_logs_no_update',
    'trg_admin_audit_logs_no_delete',
    'trg_order_events_no_update',
    'trg_order_events_no_delete',
    'trg_messages_no_update_content',
    'trg_messages_no_delete'
  );

SELECT
  'abnormal_wallet_reconcile_orders' AS check_name,
  COUNT(*) AS abnormal_count
FROM v_wallet_reconcile_source
WHERE is_abnormal = 1;

SELECT
  'stale_idempotency_locks' AS check_name,
  COUNT(*) AS stale_count
FROM idempotency_keys
WHERE status = 'processing'
  AND locked_until < NOW();

SELECT
  'pending_sensitive_work' AS check_name,
  (SELECT COUNT(*) FROM refund_requests WHERE status IN ('pending','arbitrating')) AS pending_refunds,
  (SELECT COUNT(*) FROM withdraw_requests WHERE status = 'pending') AS pending_withdraws,
  (SELECT COUNT(*) FROM goods WHERE status = 'pending') AS pending_goods;

SELECT
  EVENT_NAME,
  STATUS,
  INTERVAL_VALUE,
  INTERVAL_FIELD,
  STARTS,
  LAST_EXECUTED
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = DATABASE()
ORDER BY EVENT_NAME;

SHOW GRANTS FOR 'campus_app'@'localhost';
SHOW GRANTS FOR 'campus_app'@'127.0.0.1';
SHOW GRANTS FOR 'campus_backup'@'localhost';
SHOW GRANTS FOR 'campus_backup'@'127.0.0.1';
