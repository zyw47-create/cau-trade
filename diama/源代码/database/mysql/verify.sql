-- Campus Trade Mini Program - MySQL verification queries
-- Read-only checks after schema.sql, seed.sql, views_and_routines.sql and
-- business_procedures.sql have been imported.

USE campus_trade;

SET NAMES utf8mb4;

SELECT 'users' AS object_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'goods', COUNT(*) FROM goods
UNION ALL SELECT 'services', COUNT(*) FROM services
UNION ALL SELECT 'errand_orders', COUNT(*) FROM errand_orders
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_funds', COUNT(*) FROM order_funds
UNION ALL SELECT 'wallet_logs', COUNT(*) FROM wallet_logs
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'admin_audit_logs', COUNT(*) FROM admin_audit_logs
UNION ALL SELECT 'idempotency_keys', COUNT(*) FROM idempotency_keys
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;

SELECT
  order_sn,
  order_amount,
  fund_amount,
  order_status,
  fund_status,
  buyer_out_amount,
  user_in_amount,
  is_abnormal
FROM v_wallet_reconcile_source
ORDER BY is_abnormal DESC, order_sn;

SELECT
  user_id,
  nickname,
  balance,
  total_in,
  total_out,
  wallet_log_count
FROM v_user_wallet_summary
ORDER BY user_id;

SELECT
  TABLE_NAME AS view_name
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;

SELECT
  ROUTINE_NAME AS procedure_name
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
  AND ROUTINE_TYPE = 'PROCEDURE'
ORDER BY ROUTINE_NAME;

SELECT
  TRIGGER_NAME AS trigger_name,
  EVENT_OBJECT_TABLE AS table_name,
  ACTION_TIMING,
  EVENT_MANIPULATION
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
ORDER BY TRIGGER_NAME;
