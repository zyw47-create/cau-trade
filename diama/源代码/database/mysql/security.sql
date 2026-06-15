-- Campus Trade Mini Program - MySQL 8.0 least-privilege security setup.
-- Run after schema.sql, views_and_routines.sql and business_procedures.sql.
-- Demo passwords are for local coursework use; rotate them before production.

USE campus_trade;

SET NAMES utf8mb4;

CREATE ROLE IF NOT EXISTS 'campus_app_role';
CREATE ROLE IF NOT EXISTS 'campus_readonly_role';
CREATE ROLE IF NOT EXISTS 'campus_backup_role';
CREATE ROLE IF NOT EXISTS 'campus_ops_role';
CREATE ROLE IF NOT EXISTS 'campus_migration_role';

CREATE USER IF NOT EXISTS 'campus_app'@'localhost'
  IDENTIFIED BY 'CampusApp_ChangeMe_2026!';
CREATE USER IF NOT EXISTS 'campus_app'@'127.0.0.1'
  IDENTIFIED BY 'CampusApp_ChangeMe_2026!';
CREATE USER IF NOT EXISTS 'campus_readonly'@'localhost'
  IDENTIFIED BY 'CampusReadonly_ChangeMe_2026!';
CREATE USER IF NOT EXISTS 'campus_readonly'@'127.0.0.1'
  IDENTIFIED BY 'CampusReadonly_ChangeMe_2026!';
CREATE USER IF NOT EXISTS 'campus_backup'@'localhost'
  IDENTIFIED BY 'CampusBackup_ChangeMe_2026!';
CREATE USER IF NOT EXISTS 'campus_backup'@'127.0.0.1'
  IDENTIFIED BY 'CampusBackup_ChangeMe_2026!';
CREATE USER IF NOT EXISTS 'campus_ops'@'localhost'
  IDENTIFIED BY 'CampusOps_ChangeMe_2026!';
CREATE USER IF NOT EXISTS 'campus_ops'@'127.0.0.1'
  IDENTIFIED BY 'CampusOps_ChangeMe_2026!';
CREATE USER IF NOT EXISTS 'campus_migration'@'localhost'
  IDENTIFIED BY 'CampusMigration_ChangeMe_2026!';
CREATE USER IF NOT EXISTS 'campus_migration'@'127.0.0.1'
  IDENTIFIED BY 'CampusMigration_ChangeMe_2026!';

-- Application account: read public/admin DTO views and write only normal
-- business input tables. Financial and evidence tables are mainly changed by
-- stored procedures and immutable triggers.
GRANT SELECT ON campus_trade.* TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.users TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.user_profiles TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.user_verifications TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.email_verification_codes TO 'campus_app_role';
GRANT INSERT ON campus_trade.credit_logs TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.goods TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.services TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.errand_orders TO 'campus_app_role';
GRANT INSERT ON campus_trade.errand_events TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.conversations TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.messages TO 'campus_app_role';
GRANT INSERT, DELETE ON campus_trade.favorites TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.comments TO 'campus_app_role';
GRANT INSERT ON campus_trade.ai_audit_records TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.ai_rules TO 'campus_app_role';
GRANT INSERT ON campus_trade.admin_audit_logs TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.idempotency_keys TO 'campus_app_role';
GRANT INSERT, UPDATE ON campus_trade.notifications TO 'campus_app_role';

GRANT EXECUTE ON PROCEDURE campus_trade.sp_begin_idempotency TO 'campus_app_role';
GRANT EXECUTE ON PROCEDURE campus_trade.sp_finish_idempotency TO 'campus_app_role';
GRANT EXECUTE ON PROCEDURE campus_trade.sp_create_goods_order TO 'campus_app_role';
GRANT EXECUTE ON PROCEDURE campus_trade.sp_pay_order TO 'campus_app_role';
GRANT EXECUTE ON PROCEDURE campus_trade.sp_ship_order TO 'campus_app_role';
GRANT EXECUTE ON PROCEDURE campus_trade.sp_confirm_receive TO 'campus_app_role';
GRANT EXECUTE ON PROCEDURE campus_trade.sp_apply_refund TO 'campus_app_role';
GRANT EXECUTE ON PROCEDURE campus_trade.sp_arbitrate_refund TO 'campus_app_role';
GRANT EXECUTE ON PROCEDURE campus_trade.sp_take_errand TO 'campus_app_role';
GRANT EXECUTE ON PROCEDURE campus_trade.sp_audit_withdraw TO 'campus_app_role';

-- Read-only account for acceptance checks, dashboards and teacher inspection.
GRANT SELECT ON campus_trade.* TO 'campus_readonly_role';

-- Backup account for mysqldump. It can read schema/data, views, triggers and
-- events, but cannot write business data.
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES ON campus_trade.* TO 'campus_backup_role';

-- Operations account for health checks and scheduled maintenance.
GRANT SELECT ON campus_trade.* TO 'campus_ops_role';
GRANT INSERT ON campus_trade.job_logs TO 'campus_ops_role';
GRANT EVENT ON campus_trade.* TO 'campus_ops_role';
GRANT EXECUTE ON PROCEDURE campus_trade.sp_daily_stats TO 'campus_ops_role';
GRANT EXECUTE ON PROCEDURE campus_trade.sp_cancel_unpaid_orders TO 'campus_ops_role';

-- Migration account is intentionally broader, but still scoped to this schema.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES,
      CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, EXECUTE,
      CREATE TEMPORARY TABLES, TRIGGER, EVENT, LOCK TABLES
ON campus_trade.* TO 'campus_migration_role';

GRANT 'campus_app_role' TO 'campus_app'@'localhost';
GRANT 'campus_app_role' TO 'campus_app'@'127.0.0.1';
GRANT 'campus_readonly_role' TO 'campus_readonly'@'localhost';
GRANT 'campus_readonly_role' TO 'campus_readonly'@'127.0.0.1';
GRANT 'campus_backup_role' TO 'campus_backup'@'localhost';
GRANT 'campus_backup_role' TO 'campus_backup'@'127.0.0.1';
GRANT 'campus_ops_role' TO 'campus_ops'@'localhost';
GRANT 'campus_ops_role' TO 'campus_ops'@'127.0.0.1';
GRANT 'campus_migration_role' TO 'campus_migration'@'localhost';
GRANT 'campus_migration_role' TO 'campus_migration'@'127.0.0.1';

SET DEFAULT ROLE 'campus_app_role' TO 'campus_app'@'localhost';
SET DEFAULT ROLE 'campus_app_role' TO 'campus_app'@'127.0.0.1';
SET DEFAULT ROLE 'campus_readonly_role' TO 'campus_readonly'@'localhost';
SET DEFAULT ROLE 'campus_readonly_role' TO 'campus_readonly'@'127.0.0.1';
SET DEFAULT ROLE 'campus_backup_role' TO 'campus_backup'@'localhost';
SET DEFAULT ROLE 'campus_backup_role' TO 'campus_backup'@'127.0.0.1';
SET DEFAULT ROLE 'campus_ops_role' TO 'campus_ops'@'localhost';
SET DEFAULT ROLE 'campus_ops_role' TO 'campus_ops'@'127.0.0.1';
SET DEFAULT ROLE 'campus_migration_role' TO 'campus_migration'@'localhost';
SET DEFAULT ROLE 'campus_migration_role' TO 'campus_migration'@'127.0.0.1';

INSERT INTO admin_audit_logs
  (admin_id, action, target_type, target_id, after_data, reason, ip_address)
SELECT
  NULL,
  'security_roles_initialized',
  'database',
  DATABASE(),
  JSON_OBJECT(
    'roles', JSON_ARRAY('campus_app_role', 'campus_readonly_role', 'campus_backup_role', 'campus_ops_role', 'campus_migration_role'),
    'accounts', JSON_ARRAY('campus_app', 'campus_readonly', 'campus_backup', 'campus_ops', 'campus_migration'),
    'hosts', JSON_ARRAY('localhost', '127.0.0.1')
  ),
  'least privilege database accounts created',
  '127.0.0.1'
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_audit_logs
  WHERE action = 'security_roles_initialized'
    AND target_type = 'database'
    AND target_id = DATABASE()
);
