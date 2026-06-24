-- Campus Trade Mini Program - optional MySQL scheduler events.
-- Events are created DISABLED so importing this file never changes orders by
-- surprise. Enable them after the deployment schedule is approved.

USE campus_trade;

SET NAMES utf8mb4;

DROP EVENT IF EXISTS ev_campus_daily_stats;
DROP EVENT IF EXISTS ev_campus_cancel_unpaid_orders;

DELIMITER $$

CREATE EVENT ev_campus_daily_stats
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 1 DAY
ON COMPLETION PRESERVE
DISABLE
DO
BEGIN
  CALL sp_daily_stats(CURRENT_DATE - INTERVAL 1 DAY);
END$$

CREATE EVENT ev_campus_cancel_unpaid_orders
ON SCHEDULE EVERY 10 MINUTE
STARTS CURRENT_TIMESTAMP + INTERVAL 10 MINUTE
ON COMPLETION PRESERVE
DISABLE
DO
BEGIN
  CALL sp_cancel_unpaid_orders(NOW() - INTERVAL 30 MINUTE);
END$$

DELIMITER ;

INSERT INTO job_logs
  (job_name, status, scanned_count, success_count, fail_count, message, started_at, finished_at)
VALUES
  ('ops_events_install', 'success', 2, 2, 0,
   'maintenance events created disabled; enable after review',
   NOW(), NOW());

-- Enable later with:
-- SET GLOBAL event_scheduler = ON;
-- ALTER EVENT ev_campus_daily_stats ENABLE;
-- ALTER EVENT ev_campus_cancel_unpaid_orders ENABLE;
