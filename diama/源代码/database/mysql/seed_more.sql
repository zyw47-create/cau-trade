-- Campus Trade Mini Program - additional campus trading data.
-- Safe to run multiple times after seed.sql/views/procedures have been imported.

USE campus_trade;

SET NAMES utf8mb4;

SET @username_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'username'
);
SET @add_username_col := IF(
  @username_col_exists = 0,
  'ALTER TABLE users ADD COLUMN username VARCHAR(64) NULL AFTER nickname',
  'SELECT 1'
);
PREPARE stmt FROM @add_username_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE users
SET username = CASE id
  WHEN 1 THEN 'campus_user'
  WHEN 2 THEN 'math_chen'
  WHEN 3 THEN 'se_luo'
  WHEN 4 THEN 'south_li'
  WHEN 5 THEN 'print_station'
  WHEN 6 THEN 'runner_zhao'
  WHEN 7 THEN 'info_wang'
  WHEN 99 THEN 'admin_ops'
  ELSE CONCAT('user_', id)
END
WHERE username IS NULL OR username = '';

SET @username_index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'uk_users_username'
);
SET @add_username_index := IF(
  @username_index_exists = 0,
  'ALTER TABLE users ADD UNIQUE KEY uk_users_username (username)',
  'SELECT 1'
);
PREPARE stmt FROM @add_username_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE users MODIFY username VARCHAR(64) NOT NULL;

SET @uv_email_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_verifications'
    AND COLUMN_NAME = 'school_email'
);
SET @add_uv_email_col := IF(
  @uv_email_col_exists = 0,
  'ALTER TABLE user_verifications ADD COLUMN school_email VARCHAR(120) NULL AFTER college',
  'SELECT 1'
);
PREPARE stmt FROM @add_uv_email_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @uv_email_time_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_verifications'
    AND COLUMN_NAME = 'email_verified_at'
);
SET @add_uv_email_time_col := IF(
  @uv_email_time_col_exists = 0,
  'ALTER TABLE user_verifications ADD COLUMN email_verified_at DATETIME NULL AFTER school_email',
  'SELECT 1'
);
PREPARE stmt FROM @add_uv_email_time_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @uv_email_index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_verifications'
    AND INDEX_NAME = 'idx_user_verifications_email'
);
SET @add_uv_email_index := IF(
  @uv_email_index_exists = 0,
  'ALTER TABLE user_verifications ADD KEY idx_user_verifications_email (school_email)',
  'SELECT 1'
);
PREPARE stmt FROM @add_uv_email_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(120) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  purpose VARCHAR(30) NOT NULL DEFAULT 'campus_verify',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_email_code_user_created (user_id, created_at),
  KEY idx_email_code_email_status (email, status, expires_at),
  CONSTRAINT fk_email_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_email_codes_purpose CHECK (purpose IN ('campus_verify','email_change')),
  CONSTRAINT chk_email_codes_status CHECK (status IN ('pending','verified','expired','locked')),
  CONSTRAINT chk_email_codes_attempt CHECK (attempt_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

UPDATE user_verifications
SET school_email = CASE user_id
    WHEN 1 THEN 'campus_user@cau.edu.cn'
    WHEN 2 THEN 'math_chen@cau.edu.cn'
    WHEN 3 THEN 'se_luo@cau.edu.cn'
    WHEN 4 THEN 'south_li@cau.edu.cn'
    ELSE school_email
  END,
  email_verified_at = COALESCE(email_verified_at, reviewed_at)
WHERE school_email IS NULL OR school_email = '';

INSERT IGNORE INTO email_verification_codes
  (id, user_id, email, code_hash, purpose, status, attempt_count, expires_at, verified_at, created_at, updated_at)
VALUES
  (1, 1, 'campus_user@cau.edu.cn', SHA2('123456', 256), 'campus_verify', 'verified', 1, '2026-06-09 09:05:00', '2026-06-09 09:03:00', '2026-06-09 09:00:00', '2026-06-09 09:03:00'),
  (2, 2, 'math_chen@cau.edu.cn', SHA2('234567', 256), 'campus_verify', 'verified', 1, '2026-06-09 09:15:00', '2026-06-09 09:13:00', '2026-06-09 09:10:00', '2026-06-09 09:13:00'),
  (3, 3, 'se_luo@cau.edu.cn', SHA2('345678', 256), 'campus_verify', 'verified', 1, '2026-06-09 09:25:00', '2026-06-09 09:23:00', '2026-06-09 09:20:00', '2026-06-09 09:23:00');

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  campus_area VARCHAR(80) NULL,
  major VARCHAR(80) NULL,
  grade_label VARCHAR(40) NULL,
  bio VARCHAR(500) NULL,
  response_time_minutes INT NOT NULL DEFAULT 30,
  last_active_at DATETIME NULL,
  trade_tags JSON NULL,
  completed_trade_count INT NOT NULL DEFAULT 0,
  good_rate_snapshot DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_user_profiles_response CHECK (response_time_minutes >= 0),
  CONSTRAINT chk_user_profiles_counts CHECK (completed_trade_count >= 0),
  CONSTRAINT chk_user_profiles_good_rate CHECK (good_rate_snapshot BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO users
  (id, openid, student_id_enc, real_name_enc, college, nickname, username, avatar_url, phone_enc, address, role, status, is_verified, credit_score, balance, frozen_balance, created_at, updated_at)
VALUES
  (8, 'mock-openid-008', 'enc:20230008', 'enc:english-user', '外国语学院', '外语学院同学', 'english_lin', '', 'enc:13800000008', '外语楼', 'user', 'active', 1, 95, 36.00, 0.00, '2026-06-08 09:00:00', '2026-06-12 16:00:00'),
  (9, 'mock-openid-009', 'enc:20230009', 'enc:north-helper', '信息学院', '北区服务号', 'north_helper', '', 'enc:13800000009', '北区综合楼', 'provider', 'active', 1, 94, 18.00, 0.00, '2026-06-08 10:00:00', '2026-06-12 16:10:00')
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  username = VALUES(username),
  role = VALUES(role),
  status = VALUES(status),
  is_verified = VALUES(is_verified),
  credit_score = VALUES(credit_score),
  updated_at = VALUES(updated_at);

INSERT INTO user_profiles
  (user_id, campus_area, major, grade_label, bio, response_time_minutes, last_active_at, trade_tags, completed_trade_count, good_rate_snapshot, created_at, updated_at)
VALUES
  (1, '北区宿舍', '软件工程', '2023级', '偏好当面验货和资金托管，常在北区、图书馆交易。', 10, '2026-06-12 20:30:00', JSON_ARRAY('已实名', '回复快', '支持当面验货'), 3, 100.00, '2026-06-01 09:00:00', NOW()),
  (2, '北区宿舍', '数学与应用数学', '2022级', '长期出教材、讲义和复习资料，资料会按章节整理。', 15, '2026-06-12 20:20:00', JSON_ARRAY('教材资料多', '准时交易', '描述清楚'), 8, 100.00, '2026-06-02 10:00:00', NOW()),
  (3, '东区宿舍', '软件工程', '2022级', '数码配件较多，支持现场试用，交易前会说明瑕疵。', 30, '2026-06-12 19:45:00', JSON_ARRAY('支持验货', '数码配件', '售后配合'), 5, 88.00, '2026-06-03 11:00:00', NOW()),
  (4, '南区宿舍', '工商管理', '2021级', '账号因历史违规被限制展示，交易需谨慎。', 120, '2026-06-12 09:30:00', JSON_ARRAY('风险账号', '平台限制'), 1, 60.00, '2026-06-04 12:00:00', NOW()),
  (5, '教学楼A区', '校园服务', '服务号', '提供资料整理、打印、装订和晚自习后交付，支持服务完成后评价。', 5, '2026-06-12 20:10:00', JSON_ARRAY('服务者认证', '交付稳定', '可预约'), 12, 100.00, '2026-06-05 09:20:00', NOW()),
  (6, '东区操场', '体育教育', '2022级', '熟悉东区、北区和图书馆路线，接单后会在聊天中同步进度。', 5, '2026-06-12 18:30:00', JSON_ARRAY('骑手认证', '配送及时', '过程留痕'), 9, 100.00, '2026-06-06 08:30:00', NOW()),
  (7, '东区宿舍', '计算机科学', '2021级', '提供学习资料和基础答疑，交易地点多在东区宿舍附近。', 20, '2026-06-11 19:30:00', JSON_ARRAY('学习辅导', '好评多', '沟通耐心'), 6, 100.00, '2026-06-07 08:30:00', NOW()),
  (8, '外语楼', '英语', '2022级', '常出四六级资料和考试耳机，支持现场测试频段。', 20, '2026-06-12 19:05:00', JSON_ARRAY('考试用品', '支持测试', '描述准确'), 4, 95.00, '2026-06-08 09:00:00', NOW()),
  (9, '北区综合楼', '校园服务', '服务号', '提供简历排版、打印和基础材料整理，适合求职季快速处理。', 10, '2026-06-12 19:12:00', JSON_ARRAY('服务者认证', '简历排版', '北区交付'), 5, 100.00, '2026-06-08 10:00:00', NOW()),
  (99, '后台管理端', '平台运营', '管理员', '平台运营账号，仅用于审核、仲裁、备份与安全巡检。', 0, '2026-06-12 20:00:00', JSON_ARRAY('管理员', '安全审计'), 0, 100.00, '2026-06-01 08:00:00', NOW())
ON DUPLICATE KEY UPDATE
  campus_area = VALUES(campus_area),
  major = VALUES(major),
  grade_label = VALUES(grade_label),
  bio = VALUES(bio),
  response_time_minutes = VALUES(response_time_minutes),
  last_active_at = VALUES(last_active_at),
  trade_tags = VALUES(trade_tags),
  completed_trade_count = VALUES(completed_trade_count),
  good_rate_snapshot = VALUES(good_rate_snapshot),
  updated_at = NOW();

INSERT INTO goods
  (id, seller_id, category_id, title, price, condition_level, description, images, location, status, audit_note, is_ai_generated, favorite_count, view_count, created_at, updated_at)
VALUES
  (105, 2, 1, '考研政治资料与网课讲义', 35.00, '八成新', '资料按章节整理好，重点页有标注，适合暑假复习。', JSON_ARRAY('/uploads/goods/postgrad-politics.jpg'), '图书馆二楼', 'on_sale', 'AI审核通过', 0, 11, 88, '2026-06-12 13:20:00', '2026-06-12 13:20:00'),
  (106, 3, 3, '宿舍小台灯 可调亮度', 22.00, '九成新', '三档亮度，晚自习和宿舍桌面都能用，支持现场验货。', JSON_ARRAY('/uploads/goods/desk-lamp.jpg'), '东区操场', 'on_sale', 'AI审核通过', 0, 6, 54, '2026-06-12 13:30:00', '2026-06-12 13:30:00'),
  (107, 1, 4, '自用羽毛球拍 单拍带拍套', 45.00, '八成新', '拍框无裂，线还有弹性，适合体育课和日常练习。', JSON_ARRAY('/uploads/goods/badminton.jpg'), '体育馆门口', 'on_sale', 'AI审核通过', 0, 4, 37, '2026-06-12 14:00:00', '2026-06-12 14:00:00'),
  (108, 1, 2, '闲置计算器 考试可用款', 30.00, '七成新', '功能正常，因暂不出售已下架。', JSON_ARRAY('/uploads/goods/calculator.jpg'), '软件学院楼下', 'removed', '卖家主动下架', 0, 2, 21, '2026-06-12 14:10:00', '2026-06-12 14:40:00'),
  (109, 8, 2, '四六级听力耳机', 28.00, '八成新', '学校考试频段可用，外壳有轻微使用痕迹。', JSON_ARRAY('/uploads/goods/cet-headset.jpg'), '外语楼大厅', 'on_sale', 'AI审核通过', 0, 9, 63, '2026-06-12 15:10:00', '2026-06-12 15:10:00'),
  (110, 7, 3, '宿舍床上小书桌', 32.00, '九成新', '桌腿稳定，可折叠，适合宿舍学习和放电脑。', JSON_ARRAY('/uploads/goods/bed-desk.jpg'), '东区宿舍', 'on_sale', 'AI审核通过', 0, 5, 41, '2026-06-12 15:20:00', '2026-06-12 15:20:00')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  price = VALUES(price),
  condition_level = VALUES(condition_level),
  description = VALUES(description),
  location = VALUES(location),
  status = VALUES(status),
  audit_note = VALUES(audit_note),
  favorite_count = VALUES(favorite_count),
  view_count = VALUES(view_count),
  updated_at = VALUES(updated_at);

INSERT IGNORE INTO favorites
  (id, user_id, target_type, target_id, created_at)
VALUES
  (3, 1, 'goods', 105, '2026-06-12 14:20:00'),
  (4, 1, 'goods', 106, '2026-06-12 14:25:00'),
  (5, 2, 'goods', 107, '2026-06-12 14:30:00'),
  (6, 1, 'goods', 109, '2026-06-12 15:30:00'),
  (7, 3, 'goods', 110, '2026-06-12 15:36:00');

INSERT INTO services
  (id, provider_id, category_id, title, price, description, images, status, avg_score, created_at, updated_at)
VALUES
  (203, 7, 7, 'Python 作业思路辅导', 18.00, '讲解作业思路、调试报错和基础语法，不代写。', JSON_ARRAY('/uploads/services/python-help.jpg'), 'on_sale', 4.80, '2026-06-12 15:30:00', '2026-06-12 15:30:00'),
  (204, 9, 5, '简历排版与打印', 10.00, '提供简历格式整理、黑白打印和装订。', JSON_ARRAY('/uploads/services/resume-print.jpg'), 'on_sale', 4.90, '2026-06-12 15:40:00', '2026-06-12 15:40:00')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  price = VALUES(price),
  description = VALUES(description),
  status = VALUES(status),
  avg_score = VALUES(avg_score),
  updated_at = VALUES(updated_at);

INSERT INTO errand_orders
  (id, publisher_id, rider_id, title, description, pickup_location, delivery_location, fee, status, accepted_at, completed_at, created_at, updated_at)
VALUES
  (204, 3, NULL, '帮取北门外卖送到实验楼', '北门外卖架取餐，送到软件学院实验楼一层。', '北门外卖架', '软件学院实验楼', 4.00, 'waiting_accept', NULL, NULL, '2026-06-12 15:50:00', '2026-06-12 15:50:00'),
  (205, 8, 6, '图书馆还书跑腿', '从东区宿舍取两本书，还到图书馆自助还书机。', '东区宿舍', '图书馆', 6.00, 'accepted', '2026-06-12 16:05:00', NULL, '2026-06-12 16:00:00', '2026-06-12 16:05:00')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  fee = VALUES(fee),
  status = VALUES(status),
  rider_id = VALUES(rider_id),
  accepted_at = VALUES(accepted_at),
  updated_at = VALUES(updated_at);

INSERT INTO orders
  (order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot, amount, status, remark, paid_at, completed_at, created_at, updated_at)
VALUES
  ('CT202606120003', 1, 2, 'goods', 105, JSON_OBJECT('title', '考研政治资料与网课讲义', 'price', 35.00, 'location', '图书馆二楼'), 35.00, 'completed', '资料当面验收完成', '2026-06-12 14:30:00', '2026-06-12 15:00:00', '2026-06-12 14:28:00', '2026-06-12 15:00:00'),
  ('CT202606120004', 3, 1, 'goods', 107, JSON_OBJECT('title', '自用羽毛球拍 单拍带拍套', 'price', 45.00, 'location', '体育馆门口'), 45.00, 'completed', '体育馆当面交易完成', '2026-06-12 18:50:00', '2026-06-12 19:20:00', '2026-06-12 18:48:00', '2026-06-12 19:20:00')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  completed_at = VALUES(completed_at),
  updated_at = VALUES(updated_at);

INSERT INTO order_events
  (order_sn, from_status, to_status, operator_id, event_type, note, created_at)
SELECT v.order_sn, v.from_status, v.to_status, v.operator_id, v.event_type, v.note, v.created_at
FROM (
  SELECT 'CT202606120003' AS order_sn, CAST(NULL AS CHAR(20)) AS from_status, 'unpaid' AS to_status, 1 AS operator_id, 'create' AS event_type, '创建订单' AS note, TIMESTAMP('2026-06-12 14:28:00') AS created_at
  UNION ALL SELECT 'CT202606120003', 'unpaid', 'paid', 1, 'pay', '买家支付，资金托管', TIMESTAMP('2026-06-12 14:30:00')
  UNION ALL SELECT 'CT202606120003', 'paid', 'completed', 1, 'receive', '买家确认收货，资金结算', TIMESTAMP('2026-06-12 15:00:00')
  UNION ALL SELECT 'CT202606120004', CAST(NULL AS CHAR(20)), 'unpaid', 3, 'create', '创建订单', TIMESTAMP('2026-06-12 18:48:00')
  UNION ALL SELECT 'CT202606120004', 'unpaid', 'paid', 3, 'pay', '买家支付，资金托管', TIMESTAMP('2026-06-12 18:50:00')
  UNION ALL SELECT 'CT202606120004', 'paid', 'completed', 3, 'receive', '买家确认收货，资金结算', TIMESTAMP('2026-06-12 19:20:00')
) AS v
WHERE NOT EXISTS (
  SELECT 1
  FROM order_events oe
  WHERE oe.order_sn = v.order_sn
    AND oe.event_type = v.event_type
    AND oe.created_at = v.created_at
);

INSERT INTO order_funds
  (order_sn, amount, status, frozen_at, settled_at, refunded_at, created_at, updated_at)
VALUES
  ('CT202606120003', 35.00, 'settled', '2026-06-12 14:30:00', '2026-06-12 15:00:00', NULL, '2026-06-12 14:30:00', '2026-06-12 15:00:00'),
  ('CT202606120004', 45.00, 'settled', '2026-06-12 18:50:00', '2026-06-12 19:20:00', NULL, '2026-06-12 18:50:00', '2026-06-12 19:20:00')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  settled_at = VALUES(settled_at),
  updated_at = VALUES(updated_at);

INSERT IGNORE INTO comments
  (id, order_sn, evaluator_id, target_user_id, target_type, target_id, score, content, status, created_at)
VALUES
  (2, 'CT202606120003', 1, 2, 'goods', 105, 5, '资料分类很清楚，适合复习。', 'normal', '2026-06-12 15:02:00'),
  (3, 'CT202606120004', 3, 1, 'goods', 107, 5, '球拍状态不错，线也还能用。', 'normal', '2026-06-12 19:25:00'),
  (4, 'SV202606120001', 1, 5, 'service', 201, 5, '打印装订速度快，交付时间准确。', 'normal', '2026-06-12 16:10:00'),
  (5, 'ER202606110001', 1, 6, 'errand', 203, 5, '跑腿配送及时，过程沟通清楚。', 'normal', '2026-06-11 20:05:00');

INSERT INTO conversations
  (id, session_type, business_type, business_id, user_a_id, user_b_id, last_message_at, created_at)
VALUES
  (3, 'goods_chat', 'goods', 105, 1, 2, '2026-06-12 18:20:00', '2026-06-12 18:18:00'),
  (4, 'goods_chat', 'goods', 107, 1, 3, '2026-06-12 18:45:00', '2026-06-12 18:40:00'),
  (5, 'goods_chat', 'goods', 109, 1, 8, '2026-06-12 19:05:00', '2026-06-12 19:00:00'),
  (6, 'service_chat', 'service', 204, 1, 9, '2026-06-12 19:12:00', '2026-06-12 19:10:00')
ON DUPLICATE KEY UPDATE
  last_message_at = VALUES(last_message_at);

INSERT IGNORE INTO messages
  (id, conversation_id, sender_id, receiver_id, message_type, content, content_hash, previous_hash, status, created_at)
VALUES
  (4, 3, 2, 1, 'text', '资料是今年最新版，讲义和错题都在。', SHA2('资料是今年最新版，讲义和错题都在。', 256), NULL, 'normal', '2026-06-12 18:20:00'),
  (5, 4, 1, 3, 'text', '羽毛球拍今晚体育馆可以看吗？', SHA2('羽毛球拍今晚体育馆可以看吗？', 256), NULL, 'normal', '2026-06-12 18:40:00'),
  (6, 4, 3, 1, 'text', '可以，拍套也一起给你。', SHA2('可以，拍套也一起给你。', 256), SHA2('羽毛球拍今晚体育馆可以看吗？', 256), 'normal', '2026-06-12 18:45:00'),
  (7, 5, 1, 8, 'text', '听力耳机考试频段稳定吗？', SHA2('听力耳机考试频段稳定吗？', 256), NULL, 'normal', '2026-06-12 19:00:00'),
  (8, 5, 8, 1, 'text', '稳定，去年四六级一直用这个型号。', SHA2('稳定，去年四六级一直用这个型号。', 256), SHA2('听力耳机考试频段稳定吗？', 256), 'normal', '2026-06-12 19:05:00'),
  (9, 6, 1, 9, 'text', '简历今晚能排版并打印两份吗？', SHA2('简历今晚能排版并打印两份吗？', 256), NULL, 'normal', '2026-06-12 19:10:00'),
  (10, 6, 9, 1, 'text', '可以，发文件后半小时内完成。', SHA2('可以，发文件后半小时内完成。', 256), SHA2('简历今晚能排版并打印两份吗？', 256), 'normal', '2026-06-12 19:12:00');

INSERT IGNORE INTO wallet_logs
  (id, user_id, order_sn, type, direction, amount, balance_after, title, note, created_at)
VALUES
  (8, 1, NULL, 'refund', 'in', 18.00, 56.60, '售后退款入账', '管理员仲裁后退款到账记录', '2026-06-12 15:20:00'),
  (9, 1, NULL, 'adjust', 'in', 5.00, 61.60, '提现取消退回', '提现申请取消后金额退回', '2026-06-12 15:40:00'),
  (10, 1, 'CT202606120003', 'pay', 'out', 35.00, 26.60, '支付订单 CT202606120003', '资料订单资金托管', '2026-06-12 14:30:00'),
  (11, 2, 'CT202606120003', 'income', 'in', 35.00, 81.00, '订单收入 CT202606120003', '资料订单完成结算', '2026-06-12 15:00:00'),
  (12, 3, 'CT202606120004', 'pay', 'out', 45.00, 77.00, '支付订单 CT202606120004', '球拍订单资金托管', '2026-06-12 18:50:00'),
  (13, 1, 'CT202606120004', 'income', 'in', 45.00, 106.60, '订单收入 CT202606120004', '球拍订单完成结算', '2026-06-12 19:20:00');

INSERT IGNORE INTO notifications
  (id, user_id, business_type, business_id, title, content, is_read, created_at, read_at)
VALUES
  (4, 1, 'goods', '105', '收藏商品有新留言', '卖家回复了考研资料的交易时间。', 0, '2026-06-12 18:21:00', NULL),
  (5, 1, 'system', 'backup-20260612', '平台备份完成', '数据库全量备份与SHA-256校验已生成。', 0, '2026-06-12 14:22:00', NULL),
  (6, 1, 'service', '201', '服务预约提醒', '资料整理与打印代办等待服务者确认。', 1, '2026-06-12 16:00:00', '2026-06-12 16:10:00'),
  (7, 1, 'goods', '109', '收藏商品待确认', '外语学院同学回复了四六级听力耳机的频段情况。', 0, '2026-06-12 19:06:00', NULL),
  (8, 6, 'errand', '205', '跑腿任务已接单', '图书馆还书跑腿已进入配送流程。', 0, '2026-06-12 16:06:00', NULL);

INSERT INTO stats_daily
  (stat_date, total_users, active_users, goods_on_sale, order_count, total_amount, abnormal_order_count, created_at, updated_at)
VALUES
  ('2026-06-13', 10, 9, 8, 5, 128.00, 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  total_users = VALUES(total_users),
  active_users = VALUES(active_users),
  goods_on_sale = VALUES(goods_on_sale),
  order_count = VALUES(order_count),
  total_amount = VALUES(total_amount),
  abnormal_order_count = VALUES(abnormal_order_count),
  updated_at = NOW();
