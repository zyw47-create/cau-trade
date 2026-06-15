-- Campus Trade Mini Program - MySQL 8.0 views, triggers and routines
-- Run after schema.sql and seed.sql.

USE campus_trade;

SET NAMES utf8mb4;

DROP VIEW IF EXISTS v_admin_refund_queue;
DROP VIEW IF EXISTS v_admin_pending_goods;
DROP VIEW IF EXISTS v_user_public_profile;
DROP VIEW IF EXISTS v_user_review_summary;
DROP VIEW IF EXISTS v_user_wallet_summary;
DROP VIEW IF EXISTS v_chat_evidence_chain;
DROP VIEW IF EXISTS v_errand_hall;
DROP VIEW IF EXISTS v_service_public_list;
DROP VIEW IF EXISTS v_user_notifications;
DROP VIEW IF EXISTS v_wallet_reconcile_source;
DROP VIEW IF EXISTS v_order_trace;
DROP VIEW IF EXISTS v_admin_order_summary;
DROP VIEW IF EXISTS v_goods_public_list;

DROP PROCEDURE IF EXISTS sp_daily_stats;
DROP PROCEDURE IF EXISTS sp_cancel_unpaid_orders;

DROP TRIGGER IF EXISTS trg_wallet_logs_no_update;
DROP TRIGGER IF EXISTS trg_wallet_logs_no_delete;
DROP TRIGGER IF EXISTS trg_admin_audit_logs_no_update;
DROP TRIGGER IF EXISTS trg_admin_audit_logs_no_delete;
DROP TRIGGER IF EXISTS trg_order_events_no_update;
DROP TRIGGER IF EXISTS trg_order_events_no_delete;
DROP TRIGGER IF EXISTS trg_messages_no_update_content;
DROP TRIGGER IF EXISTS trg_messages_no_delete;

CREATE VIEW v_goods_public_list AS
SELECT
  g.id,
  g.title,
  g.price,
  g.condition_level,
  g.description,
  g.images,
  g.location,
  g.favorite_count,
  g.view_count,
  g.created_at,
  c.name AS category_name,
  u.id AS seller_id,
  u.nickname AS seller_name,
  u.username AS seller_username,
  u.credit_score AS seller_credit_score
FROM goods g
JOIN categories c ON c.id = g.category_id
JOIN users u ON u.id = g.seller_id
WHERE g.status = 'on_sale'
  AND c.status = 'active'
  AND u.status = 'active';

CREATE VIEW v_service_public_list AS
SELECT
  s.id,
  s.title,
  s.price,
  s.description,
  s.images,
  s.avg_score,
  s.created_at,
  c.name AS category_name,
  u.id AS provider_id,
  u.nickname AS provider_name,
  u.username AS provider_username,
  u.credit_score AS provider_credit_score
FROM services s
JOIN categories c ON c.id = s.category_id
JOIN users u ON u.id = s.provider_id
WHERE s.status = 'on_sale'
  AND c.status = 'active'
  AND u.status = 'active';

CREATE VIEW v_errand_hall AS
SELECT
  e.id,
  e.title,
  e.description,
  e.pickup_location,
  e.delivery_location,
  e.fee,
  e.status,
  e.created_at,
  publisher.nickname AS publisher_name,
  publisher.username AS publisher_username,
  rider.nickname AS rider_name
FROM errand_orders e
JOIN users publisher ON publisher.id = e.publisher_id
LEFT JOIN users rider ON rider.id = e.rider_id
WHERE e.status IN ('waiting_accept','accepted','processing');

CREATE VIEW v_admin_order_summary AS
SELECT
  o.order_sn,
  o.item_type,
  o.item_id,
  JSON_UNQUOTE(JSON_EXTRACT(o.item_snapshot, '$.title')) AS item_title,
  o.amount,
  o.status AS order_status,
  COALESCE(f.status, 'none') AS fund_status,
  o.created_at,
  o.paid_at,
  o.completed_at,
  buyer.nickname AS buyer_name,
  seller.nickname AS seller_name
FROM orders o
JOIN users buyer ON buyer.id = o.buyer_id
JOIN users seller ON seller.id = o.seller_id
LEFT JOIN order_funds f ON f.order_sn = o.order_sn;

CREATE VIEW v_order_trace AS
SELECT
  o.order_sn,
  o.item_type,
  JSON_UNQUOTE(JSON_EXTRACT(o.item_snapshot, '$.title')) AS item_title,
  o.status AS current_status,
  e.event_type,
  e.from_status,
  e.to_status,
  e.note,
  operator.nickname AS operator_name,
  e.created_at AS event_at
FROM orders o
LEFT JOIN order_events e ON e.order_sn = o.order_sn
LEFT JOIN users operator ON operator.id = e.operator_id;

CREATE VIEW v_wallet_reconcile_source AS
SELECT
  o.order_sn,
  o.amount AS order_amount,
  o.status AS order_status,
  COALESCE(f.amount, 0.00) AS fund_amount,
  COALESCE(f.status, 'missing') AS fund_status,
  COALESCE(SUM(CASE WHEN wl.direction = 'out' THEN wl.amount ELSE 0 END), 0.00) AS buyer_out_amount,
  COALESCE(SUM(CASE WHEN wl.direction = 'in' THEN wl.amount ELSE 0 END), 0.00) AS user_in_amount,
  CASE
    WHEN f.id IS NULL THEN 1
    WHEN f.amount <> o.amount THEN 1
    WHEN o.status IN ('paid','confirmed','shipped','refunding','disputed') AND f.status <> 'frozen' THEN 1
    WHEN o.status = 'completed' AND f.status <> 'settled' THEN 1
    WHEN o.status = 'refunded' AND f.status <> 'refunded' THEN 1
    ELSE 0
  END AS is_abnormal
FROM orders o
LEFT JOIN order_funds f ON f.order_sn = o.order_sn
LEFT JOIN wallet_logs wl ON wl.order_sn = o.order_sn
GROUP BY o.order_sn, o.amount, o.status, f.id, f.amount, f.status;

CREATE VIEW v_admin_refund_queue AS
SELECT
  rr.id AS refund_id,
  rr.order_sn,
  rr.reason,
  rr.evidence_urls,
  rr.status AS refund_status,
  rr.created_at,
  o.amount,
  o.status AS order_status,
  applicant.nickname AS applicant_name,
  seller.nickname AS seller_name,
  admin.nickname AS admin_name
FROM refund_requests rr
JOIN orders o ON o.order_sn = rr.order_sn
JOIN users applicant ON applicant.id = rr.applicant_id
JOIN users seller ON seller.id = rr.seller_id
LEFT JOIN users admin ON admin.id = rr.admin_id
WHERE rr.status IN ('pending','seller_rejected','arbitrating');

CREATE VIEW v_admin_pending_goods AS
SELECT
  g.id,
  g.title,
  g.price,
  g.condition_level,
  g.description,
  g.audit_note,
  g.created_at,
  c.name AS category_name,
  u.nickname AS seller_name,
  u.credit_score AS seller_credit_score
FROM goods g
JOIN categories c ON c.id = g.category_id
JOIN users u ON u.id = g.seller_id
WHERE g.status = 'pending';

CREATE VIEW v_chat_evidence_chain AS
SELECT
  c.id AS conversation_id,
  c.business_type,
  c.business_id,
  m.id AS message_id,
  sender.nickname AS sender_name,
  sender.username AS sender_username,
  receiver.nickname AS receiver_name,
  receiver.username AS receiver_username,
  m.message_type,
  m.content,
  m.content_hash,
  m.previous_hash,
  m.status,
  m.created_at
FROM conversations c
JOIN messages m ON m.conversation_id = c.id
JOIN users sender ON sender.id = m.sender_id
JOIN users receiver ON receiver.id = m.receiver_id;

CREATE VIEW v_user_review_summary AS
SELECT
  u.id AS user_id,
  u.nickname,
  u.username,
  u.role,
  u.credit_score,
  COUNT(c.id) AS review_count,
  COALESCE(ROUND(AVG(c.score), 2), 5.00) AS avg_score,
  COALESCE(ROUND(SUM(CASE WHEN c.score >= 4 THEN 1 ELSE 0 END) / NULLIF(COUNT(c.id), 0) * 100, 0), 100) AS good_rate
FROM users u
LEFT JOIN comments c ON c.target_user_id = u.id AND c.status = 'normal'
GROUP BY u.id, u.nickname, u.username, u.role, u.credit_score;

CREATE VIEW v_user_public_profile AS
SELECT
  u.id AS user_id,
  u.nickname,
  u.username,
  u.role,
  u.status,
  u.is_verified,
  u.college,
  u.credit_score,
  p.campus_area,
  p.major,
  p.grade_label,
  p.bio,
  p.response_time_minutes,
  p.last_active_at,
  p.trade_tags,
  COALESCE(rs.review_count, 0) AS review_count,
  COALESCE(rs.avg_score, 5.00) AS avg_score,
  COALESCE(rs.good_rate, p.good_rate_snapshot, 100) AS good_rate,
  COALESCE(p.completed_trade_count, 0) AS completed_trade_count,
  (SELECT COUNT(*) FROM goods g WHERE g.seller_id = u.id AND g.status = 'on_sale') AS active_goods_count,
  (SELECT COUNT(*) FROM services s WHERE s.provider_id = u.id AND s.status = 'on_sale') AS active_service_count
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
LEFT JOIN v_user_review_summary rs ON rs.user_id = u.id;

CREATE VIEW v_user_wallet_summary AS
SELECT
  u.id AS user_id,
  u.nickname,
  u.balance,
  u.frozen_balance,
  COUNT(wl.id) AS wallet_log_count,
  COALESCE(SUM(CASE WHEN wl.direction = 'in' THEN wl.amount ELSE 0 END), 0.00) AS total_in,
  COALESCE(SUM(CASE WHEN wl.direction = 'out' THEN wl.amount ELSE 0 END), 0.00) AS total_out,
  MAX(wl.created_at) AS last_wallet_log_at
FROM users u
LEFT JOIN wallet_logs wl ON wl.user_id = u.id
GROUP BY u.id, u.nickname, u.balance, u.frozen_balance;

CREATE VIEW v_user_notifications AS
SELECT
  n.id,
  n.user_id,
  u.nickname,
  n.business_type,
  n.business_id,
  n.title,
  n.content,
  n.is_read,
  n.created_at,
  n.read_at
FROM notifications n
JOIN users u ON u.id = n.user_id;

DELIMITER $$

CREATE TRIGGER trg_wallet_logs_no_update
BEFORE UPDATE ON wallet_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'wallet_logs is append-only; create an adjusting log instead';
END$$

CREATE TRIGGER trg_wallet_logs_no_delete
BEFORE DELETE ON wallet_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'wallet_logs is append-only and cannot be deleted';
END$$

CREATE TRIGGER trg_admin_audit_logs_no_delete
BEFORE DELETE ON admin_audit_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'admin audit logs cannot be deleted';
END$$

CREATE TRIGGER trg_admin_audit_logs_no_update
BEFORE UPDATE ON admin_audit_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'admin audit logs are append-only and cannot be updated';
END$$

CREATE TRIGGER trg_order_events_no_delete
BEFORE DELETE ON order_events
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'order event trace cannot be deleted';
END$$

CREATE TRIGGER trg_order_events_no_update
BEFORE UPDATE ON order_events
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'order event trace is append-only and cannot be updated';
END$$

CREATE TRIGGER trg_messages_no_delete
BEFORE DELETE ON messages
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'chat evidence messages cannot be deleted';
END$$

CREATE TRIGGER trg_messages_no_update_content
BEFORE UPDATE ON messages
FOR EACH ROW
BEGIN
  IF NOT (OLD.conversation_id <=> NEW.conversation_id)
     OR NOT (OLD.sender_id <=> NEW.sender_id)
     OR NOT (OLD.receiver_id <=> NEW.receiver_id)
     OR NOT (OLD.message_type <=> NEW.message_type)
     OR NOT (OLD.content <=> NEW.content)
     OR NOT (OLD.content_hash <=> NEW.content_hash)
     OR NOT (OLD.previous_hash <=> NEW.previous_hash) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'chat evidence content and hash chain cannot be updated';
  END IF;
END$$

CREATE PROCEDURE sp_daily_stats(IN p_stat_date DATE)
BEGIN
  DECLARE v_started_at DATETIME DEFAULT NOW();
  DECLARE v_order_count INT DEFAULT 0;
  DECLARE v_abnormal_count INT DEFAULT 0;

  SELECT COUNT(*)
    INTO v_order_count
  FROM orders
  WHERE DATE(created_at) = p_stat_date;

  SELECT COUNT(*)
    INTO v_abnormal_count
  FROM v_wallet_reconcile_source v
  JOIN orders o ON o.order_sn = v.order_sn
  WHERE DATE(o.created_at) = p_stat_date
    AND v.is_abnormal = 1;

  INSERT INTO stats_daily
    (stat_date, total_users, active_users, goods_on_sale, order_count, total_amount, abnormal_order_count)
  SELECT
    p_stat_date,
    (SELECT COUNT(*) FROM users),
    (SELECT COUNT(*) FROM users WHERE status = 'active'),
    (SELECT COUNT(*) FROM goods WHERE status = 'on_sale'),
    v_order_count,
    COALESCE(SUM(amount), 0.00),
    v_abnormal_count
  FROM orders
  WHERE DATE(created_at) = p_stat_date
  ON DUPLICATE KEY UPDATE
    total_users = VALUES(total_users),
    active_users = VALUES(active_users),
    goods_on_sale = VALUES(goods_on_sale),
    order_count = VALUES(order_count),
    total_amount = VALUES(total_amount),
    abnormal_order_count = VALUES(abnormal_order_count),
    updated_at = CURRENT_TIMESTAMP;

  INSERT INTO job_logs
    (job_name, status, scanned_count, success_count, fail_count, message, started_at, finished_at)
  VALUES
    ('sp_daily_stats', 'success', v_order_count, 1, v_abnormal_count,
     CONCAT('daily stats generated for ', DATE_FORMAT(p_stat_date, '%Y-%m-%d')),
     v_started_at, NOW());
END$$

CREATE PROCEDURE sp_cancel_unpaid_orders(IN p_before DATETIME)
BEGIN
  DECLARE v_started_at DATETIME DEFAULT NOW();
  DECLARE v_cancel_count INT DEFAULT 0;

  CREATE TEMPORARY TABLE IF NOT EXISTS tmp_cancel_orders (
    order_sn VARCHAR(64) NOT NULL PRIMARY KEY
  ) ENGINE=MEMORY;

  DELETE FROM tmp_cancel_orders;

  INSERT INTO tmp_cancel_orders (order_sn)
  SELECT order_sn
  FROM orders
  WHERE status = 'unpaid'
    AND created_at < p_before;

  SELECT COUNT(*) INTO v_cancel_count FROM tmp_cancel_orders;

  UPDATE orders o
  JOIN tmp_cancel_orders t ON t.order_sn = o.order_sn
  SET o.status = 'cancelled',
      o.updated_at = NOW();

  UPDATE goods g
  JOIN orders o ON o.item_type = 'goods' AND o.item_id = g.id
  JOIN tmp_cancel_orders t ON t.order_sn = o.order_sn
  SET g.status = 'on_sale',
      g.updated_at = NOW()
  WHERE g.status = 'reserved';

  INSERT INTO order_events
    (order_sn, from_status, to_status, operator_id, event_type, note, created_at)
  SELECT
    t.order_sn,
    'unpaid',
    'cancelled',
    NULL,
    'timeout_cancel',
    '超时未支付自动取消',
    NOW()
  FROM tmp_cancel_orders t;

  INSERT INTO job_logs
    (job_name, status, scanned_count, success_count, fail_count, message, started_at, finished_at)
  VALUES
    ('sp_cancel_unpaid_orders', 'success', v_cancel_count, v_cancel_count, 0,
     CONCAT('cancelled unpaid orders before ', DATE_FORMAT(p_before, '%Y-%m-%d %H:%i:%s')),
     v_started_at, NOW());

  DROP TEMPORARY TABLE IF EXISTS tmp_cancel_orders;
END$$

DELIMITER ;
