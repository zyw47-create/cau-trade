-- Campus Trade Mini Program - MySQL 8.0 transactional business procedures
-- These procedures are optional helpers for the Flask service layer. They keep
-- order, wallet, fund and audit updates in one database transaction.

USE campus_trade;

SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS sp_create_goods_order;
DROP PROCEDURE IF EXISTS sp_begin_idempotency;
DROP PROCEDURE IF EXISTS sp_finish_idempotency;
DROP PROCEDURE IF EXISTS sp_pay_order;
DROP PROCEDURE IF EXISTS sp_ship_order;
DROP PROCEDURE IF EXISTS sp_confirm_receive;
DROP PROCEDURE IF EXISTS sp_apply_refund;
DROP PROCEDURE IF EXISTS sp_arbitrate_refund;
DROP PROCEDURE IF EXISTS sp_take_errand;
DROP PROCEDURE IF EXISTS sp_audit_withdraw;

DELIMITER $$

CREATE PROCEDURE sp_begin_idempotency(
  IN p_user_id BIGINT UNSIGNED,
  IN p_idempotency_key VARCHAR(80),
  IN p_request_path VARCHAR(120),
  IN p_request_hash CHAR(64),
  IN p_lock_seconds INT,
  OUT p_state VARCHAR(20),
  OUT p_response_code INT,
  OUT p_response_body_text LONGTEXT
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_request_hash CHAR(64) DEFAULT NULL;
  DECLARE v_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_locked_until DATETIME DEFAULT NULL;
  DECLARE v_not_found TINYINT DEFAULT 0;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_not_found = 1;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_state = 'started';
  SET p_response_code = NULL;
  SET p_response_body_text = NULL;

  START TRANSACTION;

  SELECT id, request_hash, status, locked_until, response_code, CAST(response_body AS CHAR)
    INTO v_id, v_request_hash, v_status, v_locked_until, p_response_code, p_response_body_text
  FROM idempotency_keys
  WHERE user_id = p_user_id
    AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF v_not_found = 1 THEN
    INSERT INTO idempotency_keys
      (user_id, idempotency_key, request_path, request_hash, status, locked_until)
    VALUES
      (p_user_id, p_idempotency_key, p_request_path, p_request_hash, 'processing',
       DATE_ADD(NOW(), INTERVAL GREATEST(COALESCE(p_lock_seconds, 10), 10) SECOND));
    SET p_state = 'started';
  ELSE
    IF v_request_hash <> p_request_hash THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'idempotency key reused with different request';
    END IF;

    IF v_status = 'success' THEN
      SET p_state = 'replay';
    ELSEIF v_status = 'processing' AND v_locked_until > NOW() THEN
      SET p_state = 'processing';
    ELSE
      UPDATE idempotency_keys
      SET status = 'processing',
          locked_until = DATE_ADD(NOW(), INTERVAL GREATEST(COALESCE(p_lock_seconds, 10), 10) SECOND),
          response_code = NULL,
          response_body = NULL,
          updated_at = NOW()
      WHERE id = v_id;
      SET p_state = 'started';
      SET p_response_code = NULL;
      SET p_response_body_text = NULL;
    END IF;
  END IF;

  COMMIT;
END$$

CREATE PROCEDURE sp_finish_idempotency(
  IN p_user_id BIGINT UNSIGNED,
  IN p_idempotency_key VARCHAR(80),
  IN p_response_code INT,
  IN p_response_body_text LONGTEXT,
  IN p_final_status VARCHAR(20)
)
BEGIN
  IF p_final_status NOT IN ('success','failed') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'idempotency final status must be success or failed';
  END IF;

  IF NOT JSON_VALID(p_response_body_text) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'idempotency response body must be valid JSON';
  END IF;

  UPDATE idempotency_keys
  SET response_code = p_response_code,
      response_body = JSON_EXTRACT(p_response_body_text, '$'),
      status = p_final_status,
      locked_until = NULL,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND idempotency_key = p_idempotency_key;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'idempotency key not found';
  END IF;
END$$

CREATE PROCEDURE sp_create_goods_order(
  IN p_order_sn VARCHAR(64),
  IN p_buyer_id BIGINT UNSIGNED,
  IN p_goods_id BIGINT UNSIGNED,
  IN p_remark VARCHAR(255)
)
BEGIN
  DECLARE v_goods_count INT DEFAULT 0;
  DECLARE v_seller_id BIGINT UNSIGNED;
  DECLARE v_price DECIMAL(10,2);
  DECLARE v_title VARCHAR(100);
  DECLARE v_location VARCHAR(120);
  DECLARE v_status VARCHAR(20);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_goods_count
  FROM goods
  WHERE id = p_goods_id;

  IF v_goods_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'goods not found';
  END IF;

  SELECT seller_id, price, title, location, status
    INTO v_seller_id, v_price, v_title, v_location, v_status
  FROM goods
  WHERE id = p_goods_id
  FOR UPDATE;

  IF v_status <> 'on_sale' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'goods is not available';
  END IF;

  IF v_seller_id = p_buyer_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'buyer cannot buy own goods';
  END IF;

  INSERT INTO orders
    (order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot, amount, status, remark)
  VALUES
    (p_order_sn, p_buyer_id, v_seller_id, 'goods', p_goods_id,
     JSON_OBJECT('title', v_title, 'price', v_price, 'location', v_location),
     v_price, 'unpaid', p_remark);

  INSERT INTO order_events
    (order_sn, from_status, to_status, operator_id, event_type, note)
  VALUES
    (p_order_sn, NULL, 'unpaid', p_buyer_id, 'create', '创建订单');

  UPDATE goods
  SET status = 'reserved',
      updated_at = NOW()
  WHERE id = p_goods_id;

  COMMIT;
END$$

CREATE PROCEDURE sp_pay_order(
  IN p_order_sn VARCHAR(64),
  IN p_buyer_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_order_count INT DEFAULT 0;
  DECLARE v_amount DECIMAL(10,2);
  DECLARE v_status VARCHAR(30);
  DECLARE v_buyer_id BIGINT UNSIGNED;
  DECLARE v_balance DECIMAL(10,2);
  DECLARE v_next_balance DECIMAL(10,2);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_order_count
  FROM orders
  WHERE order_sn = p_order_sn;

  IF v_order_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order not found';
  END IF;

  SELECT buyer_id, amount, status
    INTO v_buyer_id, v_amount, v_status
  FROM orders
  WHERE order_sn = p_order_sn
  FOR UPDATE;

  IF v_buyer_id <> p_buyer_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order does not belong to buyer';
  END IF;

  IF v_status <> 'unpaid' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order status cannot be paid';
  END IF;

  SELECT balance INTO v_balance
  FROM users
  WHERE id = p_buyer_id
  FOR UPDATE;

  IF v_balance < v_amount THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'insufficient balance';
  END IF;

  SET v_next_balance = v_balance - v_amount;

  UPDATE users
  SET balance = v_next_balance
  WHERE id = p_buyer_id;

  UPDATE orders
  SET status = 'paid',
      paid_at = NOW(),
      updated_at = NOW()
  WHERE order_sn = p_order_sn;

  INSERT INTO order_funds
    (order_sn, amount, status, frozen_at)
  VALUES
    (p_order_sn, v_amount, 'frozen', NOW());

  INSERT INTO wallet_logs
    (user_id, order_sn, type, direction, amount, balance_after, title, note)
  VALUES
    (p_buyer_id, p_order_sn, 'pay', 'out', v_amount, v_next_balance,
     CONCAT('支付订单 ', p_order_sn), '资金进入订单托管账户');

  INSERT INTO order_events
    (order_sn, from_status, to_status, operator_id, event_type, note)
  VALUES
    (p_order_sn, 'unpaid', 'paid', p_buyer_id, 'pay', '买家支付，资金托管');

  COMMIT;
END$$

CREATE PROCEDURE sp_ship_order(
  IN p_order_sn VARCHAR(64),
  IN p_seller_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_order_count INT DEFAULT 0;
  DECLARE v_owner_id BIGINT UNSIGNED;
  DECLARE v_status VARCHAR(30);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_order_count
  FROM orders
  WHERE order_sn = p_order_sn;

  IF v_order_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order not found';
  END IF;

  SELECT seller_id, status INTO v_owner_id, v_status
  FROM orders
  WHERE order_sn = p_order_sn
  FOR UPDATE;

  IF v_owner_id <> p_seller_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order does not belong to seller';
  END IF;

  IF v_status <> 'paid' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order status cannot be shipped';
  END IF;

  UPDATE orders
  SET status = 'shipped',
      updated_at = NOW()
  WHERE order_sn = p_order_sn;

  INSERT INTO order_events
    (order_sn, from_status, to_status, operator_id, event_type, note)
  VALUES
    (p_order_sn, 'paid', 'shipped', p_seller_id, 'ship', '卖家确认发货/服务者开始履约');

  COMMIT;
END$$

CREATE PROCEDURE sp_confirm_receive(
  IN p_order_sn VARCHAR(64),
  IN p_buyer_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_order_count INT DEFAULT 0;
  DECLARE v_buyer_id BIGINT UNSIGNED;
  DECLARE v_seller_id BIGINT UNSIGNED;
  DECLARE v_item_type VARCHAR(20);
  DECLARE v_item_id BIGINT UNSIGNED;
  DECLARE v_amount DECIMAL(10,2);
  DECLARE v_status VARCHAR(30);
  DECLARE v_seller_balance DECIMAL(10,2);
  DECLARE v_next_seller_balance DECIMAL(10,2);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_order_count
  FROM orders
  WHERE order_sn = p_order_sn;

  IF v_order_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order not found';
  END IF;

  SELECT buyer_id, seller_id, item_type, item_id, amount, status
    INTO v_buyer_id, v_seller_id, v_item_type, v_item_id, v_amount, v_status
  FROM orders
  WHERE order_sn = p_order_sn
  FOR UPDATE;

  IF v_buyer_id <> p_buyer_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order does not belong to buyer';
  END IF;

  IF v_status NOT IN ('paid','shipped') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order status cannot be completed';
  END IF;

  SELECT balance INTO v_seller_balance
  FROM users
  WHERE id = v_seller_id
  FOR UPDATE;

  SET v_next_seller_balance = v_seller_balance + v_amount;

  UPDATE users
  SET balance = v_next_seller_balance
  WHERE id = v_seller_id;

  UPDATE order_funds
  SET status = 'settled',
      settled_at = NOW(),
      updated_at = NOW()
  WHERE order_sn = p_order_sn
    AND status = 'frozen';

  UPDATE orders
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE order_sn = p_order_sn;

  IF v_item_type = 'goods' THEN
    UPDATE goods
    SET status = 'sold',
        updated_at = NOW()
    WHERE id = v_item_id;
  END IF;

  IF v_item_type = 'errand' THEN
    UPDATE errand_orders
    SET status = 'confirmed',
        completed_at = COALESCE(completed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_item_id;
  END IF;

  INSERT INTO wallet_logs
    (user_id, order_sn, type, direction, amount, balance_after, title, note)
  VALUES
    (v_seller_id, p_order_sn, 'income', 'in', v_amount, v_next_seller_balance,
     CONCAT('订单收入 ', p_order_sn), '买家确认收货后结算');

  INSERT INTO order_events
    (order_sn, from_status, to_status, operator_id, event_type, note)
  VALUES
    (p_order_sn, v_status, 'completed', p_buyer_id, 'receive', '买家确认收货，资金结算');

  COMMIT;
END$$

CREATE PROCEDURE sp_apply_refund(
  IN p_order_sn VARCHAR(64),
  IN p_applicant_id BIGINT UNSIGNED,
  IN p_reason VARCHAR(255),
  IN p_evidence_urls_text TEXT
)
BEGIN
  DECLARE v_order_count INT DEFAULT 0;
  DECLARE v_active_refund_count INT DEFAULT 0;
  DECLARE v_buyer_id BIGINT UNSIGNED;
  DECLARE v_seller_id BIGINT UNSIGNED;
  DECLARE v_status VARCHAR(30);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_order_count
  FROM orders
  WHERE order_sn = p_order_sn;

  IF v_order_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order not found';
  END IF;

  SELECT buyer_id, seller_id, status
    INTO v_buyer_id, v_seller_id, v_status
  FROM orders
  WHERE order_sn = p_order_sn
  FOR UPDATE;

  IF v_buyer_id <> p_applicant_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'only buyer can apply refund';
  END IF;

  IF v_status NOT IN ('paid','shipped') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order status cannot request refund';
  END IF;

  SELECT COUNT(*) INTO v_active_refund_count
  FROM refund_requests
  WHERE order_sn = p_order_sn
    AND status IN ('pending','seller_rejected','arbitrating');

  IF v_active_refund_count > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'active refund request already exists';
  END IF;

  INSERT INTO refund_requests
    (order_sn, applicant_id, seller_id, reason, evidence_urls, status)
  VALUES
    (p_order_sn, p_applicant_id, v_seller_id, p_reason,
     IF(JSON_VALID(p_evidence_urls_text), JSON_EXTRACT(p_evidence_urls_text, '$'), JSON_ARRAY()),
     'pending');

  UPDATE orders
  SET status = 'refunding',
      updated_at = NOW()
  WHERE order_sn = p_order_sn;

  INSERT INTO order_events
    (order_sn, from_status, to_status, operator_id, event_type, note)
  VALUES
    (p_order_sn, v_status, 'refunding', p_applicant_id, 'refund_apply', p_reason);

  COMMIT;
END$$

CREATE PROCEDURE sp_arbitrate_refund(
  IN p_refund_id BIGINT UNSIGNED,
  IN p_admin_id BIGINT UNSIGNED,
  IN p_result VARCHAR(20),
  IN p_note VARCHAR(255)
)
BEGIN
  DECLARE v_refund_count INT DEFAULT 0;
  DECLARE v_order_sn VARCHAR(64);
  DECLARE v_buyer_id BIGINT UNSIGNED;
  DECLARE v_seller_id BIGINT UNSIGNED;
  DECLARE v_item_type VARCHAR(20);
  DECLARE v_item_id BIGINT UNSIGNED;
  DECLARE v_amount DECIMAL(10,2);
  DECLARE v_refund_status VARCHAR(30);
  DECLARE v_balance DECIMAL(10,2);
  DECLARE v_next_balance DECIMAL(10,2);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_refund_count
  FROM refund_requests
  WHERE id = p_refund_id;

  IF v_refund_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'refund request not found';
  END IF;

  SELECT rr.order_sn, rr.status, o.buyer_id, o.seller_id, o.item_type, o.item_id, o.amount
    INTO v_order_sn, v_refund_status, v_buyer_id, v_seller_id, v_item_type, v_item_id, v_amount
  FROM refund_requests rr
  JOIN orders o ON o.order_sn = rr.order_sn
  WHERE rr.id = p_refund_id
  FOR UPDATE;

  IF v_refund_status NOT IN ('pending','seller_rejected','arbitrating') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'refund request is not arbitrable';
  END IF;

  IF p_result NOT IN ('buyer','seller') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'arbitrate result must be buyer or seller';
  END IF;

  IF p_result = 'buyer' THEN
    SELECT balance INTO v_balance
    FROM users
    WHERE id = v_buyer_id
    FOR UPDATE;

    SET v_next_balance = v_balance + v_amount;

    UPDATE users
    SET balance = v_next_balance
    WHERE id = v_buyer_id;

    UPDATE order_funds
    SET status = 'refunded',
        refunded_at = NOW(),
        updated_at = NOW()
    WHERE order_sn = v_order_sn
      AND status = 'frozen';

    UPDATE orders
    SET status = 'refunded',
        updated_at = NOW()
    WHERE order_sn = v_order_sn;

    IF v_item_type = 'goods' THEN
      UPDATE goods
      SET status = 'on_sale',
          updated_at = NOW()
      WHERE id = v_item_id;
    END IF;

    INSERT INTO wallet_logs
      (user_id, order_sn, type, direction, amount, balance_after, title, note)
    VALUES
      (v_buyer_id, v_order_sn, 'refund', 'in', v_amount, v_next_balance,
       CONCAT('订单退款 ', v_order_sn), p_note);

    UPDATE refund_requests
    SET status = 'buyer_win',
        admin_id = p_admin_id,
        arbitrate_result = 'buyer_win',
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_refund_id;

    INSERT INTO order_events
      (order_sn, from_status, to_status, operator_id, event_type, note)
    VALUES
      (v_order_sn, 'refunding', 'refunded', p_admin_id, 'arbitrate', p_note);
  ELSE
    SELECT balance INTO v_balance
    FROM users
    WHERE id = v_seller_id
    FOR UPDATE;

    SET v_next_balance = v_balance + v_amount;

    UPDATE users
    SET balance = v_next_balance
    WHERE id = v_seller_id;

    UPDATE order_funds
    SET status = 'settled',
        settled_at = NOW(),
        updated_at = NOW()
    WHERE order_sn = v_order_sn
      AND status = 'frozen';

    UPDATE orders
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE order_sn = v_order_sn;

    IF v_item_type = 'goods' THEN
      UPDATE goods
      SET status = 'sold',
          updated_at = NOW()
      WHERE id = v_item_id;
    END IF;

    INSERT INTO wallet_logs
      (user_id, order_sn, type, direction, amount, balance_after, title, note)
    VALUES
      (v_seller_id, v_order_sn, 'income', 'in', v_amount, v_next_balance,
       CONCAT('仲裁结算 ', v_order_sn), p_note);

    UPDATE refund_requests
    SET status = 'seller_win',
        admin_id = p_admin_id,
        arbitrate_result = 'seller_win',
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_refund_id;

    INSERT INTO order_events
      (order_sn, from_status, to_status, operator_id, event_type, note)
    VALUES
      (v_order_sn, 'refunding', 'completed', p_admin_id, 'arbitrate', p_note);
  END IF;

  INSERT INTO admin_audit_logs
    (admin_id, action, target_type, target_id, before_data, after_data, reason)
  VALUES
    (p_admin_id, '订单仲裁', 'refund', CAST(p_refund_id AS CHAR),
     JSON_OBJECT('status', v_refund_status),
     JSON_OBJECT('result', p_result, 'order_sn', v_order_sn),
     p_note);

  COMMIT;
END$$

CREATE PROCEDURE sp_take_errand(
  IN p_errand_id BIGINT UNSIGNED,
  IN p_rider_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_errand_count INT DEFAULT 0;
  DECLARE v_publisher_id BIGINT UNSIGNED;
  DECLARE v_status VARCHAR(30);
  DECLARE v_title VARCHAR(100);
  DECLARE v_pickup_location VARCHAR(120);
  DECLARE v_delivery_location VARCHAR(120);
  DECLARE v_fee DECIMAL(10,2);
  DECLARE v_order_sn VARCHAR(64);
  DECLARE v_now DATETIME(6);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_errand_count
  FROM errand_orders
  WHERE id = p_errand_id;

  IF v_errand_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'errand order not found';
  END IF;

  SELECT publisher_id, status, title, pickup_location, delivery_location, fee
    INTO v_publisher_id, v_status, v_title, v_pickup_location, v_delivery_location, v_fee
  FROM errand_orders
  WHERE id = p_errand_id
  FOR UPDATE;

  IF v_status <> 'waiting_accept' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'errand order has been taken';
  END IF;

  IF v_publisher_id = p_rider_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'publisher cannot take own errand order';
  END IF;

  SET v_now = NOW(6);
  SET v_order_sn = CONCAT(
    'ER',
    DATE_FORMAT(v_now, '%Y%m%d%H%i%s'),
    LPAD(MICROSECOND(v_now), 6, '0'),
    LPAD(p_errand_id, 4, '0')
  );

  UPDATE errand_orders
  SET rider_id = p_rider_id,
      status = 'accepted',
      accepted_at = v_now,
      updated_at = v_now
  WHERE id = p_errand_id;

  INSERT INTO errand_events
    (errand_id, from_status, to_status, operator_id, note)
  VALUES
    (p_errand_id, 'waiting_accept', 'accepted', p_rider_id, '骑手接单');

  INSERT INTO orders
    (order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot, amount, status, remark, paid_at, created_at, updated_at)
  VALUES
    (v_order_sn, v_publisher_id, p_rider_id, 'errand', p_errand_id,
     JSON_OBJECT('title', v_title, 'price', v_fee, 'pickup_location', v_pickup_location, 'delivery_location', v_delivery_location),
     v_fee, 'shipped', '跑腿抢单后进入履约流程', v_now, v_now, v_now);

  INSERT INTO order_funds
    (order_sn, amount, status, frozen_at, created_at, updated_at)
  VALUES
    (v_order_sn, v_fee, 'frozen', v_now, v_now, v_now);

  INSERT INTO order_events
    (order_sn, from_status, to_status, operator_id, event_type, note, created_at)
  VALUES
    (v_order_sn, NULL, 'paid', v_publisher_id, 'errand_pay', '跑腿费托管', v_now),
    (v_order_sn, 'paid', 'shipped', p_rider_id, 'errand_take', '骑手接单，等待配送', v_now);

  COMMIT;
END$$

CREATE PROCEDURE sp_audit_withdraw(
  IN p_withdraw_id BIGINT UNSIGNED,
  IN p_admin_id BIGINT UNSIGNED,
  IN p_result VARCHAR(20),
  IN p_note VARCHAR(255)
)
BEGIN
  DECLARE v_withdraw_count INT DEFAULT 0;
  DECLARE v_user_id BIGINT UNSIGNED;
  DECLARE v_amount DECIMAL(10,2);
  DECLARE v_status VARCHAR(20);
  DECLARE v_balance DECIMAL(10,2);
  DECLARE v_next_balance DECIMAL(10,2);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_withdraw_count
  FROM withdraw_requests
  WHERE id = p_withdraw_id;

  IF v_withdraw_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'withdraw request not found';
  END IF;

  SELECT user_id, amount, status
    INTO v_user_id, v_amount, v_status
  FROM withdraw_requests
  WHERE id = p_withdraw_id
  FOR UPDATE;

  IF v_status <> 'pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'withdraw request already reviewed';
  END IF;

  IF p_result NOT IN ('approved','rejected') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'withdraw result must be approved or rejected';
  END IF;

  IF p_result = 'approved' THEN
    SELECT balance INTO v_balance
    FROM users
    WHERE id = v_user_id
    FOR UPDATE;

    IF v_balance < v_amount THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'insufficient withdraw balance';
    END IF;

    SET v_next_balance = v_balance - v_amount;

    UPDATE users
    SET balance = v_next_balance
    WHERE id = v_user_id;

    INSERT INTO wallet_logs
      (user_id, order_sn, type, direction, amount, balance_after, title, note)
    VALUES
      (v_user_id, NULL, 'withdraw', 'out', v_amount, v_next_balance,
       CONCAT('提现审核通过 ', p_withdraw_id), p_note);
  END IF;

  UPDATE withdraw_requests
  SET status = p_result,
      reviewer_id = p_admin_id,
      review_note = p_note,
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_withdraw_id;

  INSERT INTO admin_audit_logs
    (admin_id, action, target_type, target_id, before_data, after_data, reason)
  VALUES
    (p_admin_id,
     IF(p_result = 'approved', '提现审核通过', '提现驳回'),
     'withdraw',
     CAST(p_withdraw_id AS CHAR),
     JSON_OBJECT('status', v_status),
     JSON_OBJECT('status', p_result),
     p_note);

  COMMIT;
END$$

DELIMITER ;
