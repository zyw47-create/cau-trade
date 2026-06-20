-- Campus Trade Mini Program - MySQL 8.0 schema
-- Run with: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS campus_trade
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE campus_trade;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS ai_rules;
DROP TABLE IF EXISTS job_logs;
DROP TABLE IF EXISTS admin_audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS idempotency_keys;
DROP TABLE IF EXISTS ai_audit_records;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS refund_requests;
DROP TABLE IF EXISTS withdraw_requests;
DROP TABLE IF EXISTS order_funds;
DROP TABLE IF EXISTS wallet_logs;
DROP TABLE IF EXISTS order_events;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS errand_events;
DROP TABLE IF EXISTS errand_orders;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS goods;
DROP TABLE IF EXISTS user_verifications;
DROP TABLE IF EXISTS email_verification_codes;
DROP TABLE IF EXISTS credit_logs;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS stats_daily;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  openid VARCHAR(64) NOT NULL,
  student_id_enc VARCHAR(255) NULL,
  real_name_enc VARCHAR(255) NULL,
  college VARCHAR(64) NULL,
  nickname VARCHAR(64) NOT NULL DEFAULT '校园同学',
  username VARCHAR(64) NOT NULL,
  avatar_url VARCHAR(255) NULL,
  phone_enc VARCHAR(255) NULL,
  address VARCHAR(255) NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  credit_score INT NOT NULL DEFAULT 100,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  frozen_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_openid (openid),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_student (student_id_enc),
  KEY idx_users_role_status (role, status),
  CONSTRAINT chk_users_role CHECK (role IN ('user','provider','rider','admin')),
  CONSTRAINT chk_users_status CHECK (status IN ('active','pending_verify','banned','removed')),
  CONSTRAINT chk_users_credit CHECK (credit_score BETWEEN 0 AND 100),
  CONSTRAINT chk_users_balance CHECK (balance >= 0 AND frozen_balance >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_profiles (
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

CREATE TABLE categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'goods',
  sort_order INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categories_name_type (name, type),
  KEY idx_categories_type_status (type, status),
  CONSTRAINT chk_categories_type CHECK (type IN ('goods','service','errand')),
  CONSTRAINT chk_categories_status CHECK (status IN ('active','disabled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_verifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  student_id_enc VARCHAR(255) NOT NULL,
  real_name_enc VARCHAR(255) NOT NULL,
  college VARCHAR(64) NOT NULL,
  school_email VARCHAR(120) NULL,
  email_verified_at DATETIME NULL,
  student_card_image_url VARCHAR(255) NULL,
  ocr_match_score DECIMAL(5,2) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewer_id BIGINT UNSIGNED NULL,
  review_note VARCHAR(255) NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_verifications_user (user_id, created_at),
  KEY idx_user_verifications_status (status, created_at),
  KEY idx_user_verifications_email (school_email),
  CONSTRAINT fk_user_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_user_verifications_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_user_verifications_status CHECK (status IN ('pending','approved','rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE email_verification_codes (
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

CREATE TABLE credit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  change_value INT NOT NULL,
  reason_type VARCHAR(40) NOT NULL,
  reason_detail VARCHAR(255) NULL,
  related_type VARCHAR(30) NULL,
  related_id VARCHAR(64) NULL,
  operator_id BIGINT UNSIGNED NULL,
  score_after INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_credit_user_created (user_id, created_at),
  KEY idx_credit_related (related_type, related_id),
  CONSTRAINT fk_credit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_credit_operator FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_credit_score_after CHECK (score_after BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE goods (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  condition_level VARCHAR(30) NOT NULL,
  description TEXT NOT NULL,
  images JSON NULL,
  location VARCHAR(120) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  audit_note VARCHAR(255) NULL,
  is_ai_generated TINYINT(1) NOT NULL DEFAULT 0,
  favorite_count INT NOT NULL DEFAULT 0,
  view_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_goods_status_created (status, created_at),
  KEY idx_goods_category_status (category_id, status),
  KEY idx_goods_seller (seller_id, created_at),
  FULLTEXT KEY ft_goods_title_desc (title, description),
  CONSTRAINT fk_goods_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_goods_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_goods_price CHECK (price > 0),
  CONSTRAINT chk_goods_status CHECK (status IN ('pending','on_sale','rejected','reserved','sold','removed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  images JSON NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'on_sale',
  avg_score DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_services_provider (provider_id, created_at),
  KEY idx_services_category_status (category_id, status),
  CONSTRAINT fk_services_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_services_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_services_price CHECK (price > 0),
  CONSTRAINT chk_services_status CHECK (status IN ('pending','on_sale','paused','removed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE errand_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  publisher_id BIGINT UNSIGNED NOT NULL,
  rider_id BIGINT UNSIGNED NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  pickup_location VARCHAR(120) NOT NULL,
  delivery_location VARCHAR(120) NOT NULL,
  fee DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
  accepted_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_errand_status_created (status, created_at),
  KEY idx_errand_publisher_created (publisher_id, created_at),
  KEY idx_errand_rider_created (rider_id, created_at),
  CONSTRAINT fk_errand_publisher FOREIGN KEY (publisher_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_errand_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_errand_fee CHECK (fee > 0),
  CONSTRAINT chk_errand_status CHECK (status IN ('unpaid','waiting_accept','accepted','processing','completed','confirmed','cancelled','disputed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE errand_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  errand_id BIGINT UNSIGNED NOT NULL,
  operator_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(40) NOT NULL DEFAULT 'status_change',
  from_status VARCHAR(30) NULL,
  to_status VARCHAR(30) NOT NULL,
  remark VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_errand_events_errand (errand_id, created_at),
  KEY idx_errand_events_operator (operator_id, created_at),
  CONSTRAINT fk_errand_events_order FOREIGN KEY (errand_id) REFERENCES errand_orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_errand_events_operator FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE orders (
  order_sn VARCHAR(64) NOT NULL,
  buyer_id BIGINT UNSIGNED NOT NULL,
  seller_id BIGINT UNSIGNED NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  item_snapshot JSON NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
  remark VARCHAR(255) NULL,
  paid_at DATETIME NULL,
  completed_at DATETIME NULL,
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_sn),
  KEY idx_orders_buyer_created (buyer_id, created_at),
  KEY idx_orders_seller_created (seller_id, created_at),
  KEY idx_orders_status_created (status, created_at),
  KEY idx_orders_item (item_type, item_id),
  CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_orders_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_orders_item_type CHECK (item_type IN ('goods','service','errand')),
  CONSTRAINT chk_orders_amount CHECK (amount > 0),
  CONSTRAINT chk_orders_status CHECK (status IN ('unpaid','paid','confirmed','shipped','completed','refunding','refunded','cancelled','disputed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE order_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_sn VARCHAR(64) NOT NULL,
  from_status VARCHAR(30) NULL,
  to_status VARCHAR(30) NOT NULL,
  operator_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(40) NOT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_events_order (order_sn, created_at),
  CONSTRAINT fk_order_events_order FOREIGN KEY (order_sn) REFERENCES orders(order_sn) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_order_events_operator FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE order_funds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_sn VARCHAR(64) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'none',
  frozen_at DATETIME NULL,
  settled_at DATETIME NULL,
  refunded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_order_funds_order (order_sn),
  KEY idx_order_funds_status (status, created_at),
  CONSTRAINT fk_order_funds_order FOREIGN KEY (order_sn) REFERENCES orders(order_sn) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_order_funds_amount CHECK (amount > 0),
  CONSTRAINT chk_order_funds_status CHECK (status IN ('none','frozen','refunding','settled','refunded'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE wallet_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  order_sn VARCHAR(64) NULL,
  type VARCHAR(30) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  title VARCHAR(120) NOT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wallet_user_created (user_id, created_at),
  KEY idx_wallet_order (order_sn),
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_wallet_order FOREIGN KEY (order_sn) REFERENCES orders(order_sn) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_wallet_type CHECK (type IN ('recharge','pay','income','refund','withdraw','adjust')),
  CONSTRAINT chk_wallet_direction CHECK (direction IN ('in','out')),
  CONSTRAINT chk_wallet_amount CHECK (amount > 0),
  CONSTRAINT chk_wallet_balance CHECK (balance_after >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE refund_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_sn VARCHAR(64) NOT NULL,
  applicant_id BIGINT UNSIGNED NOT NULL,
  seller_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(255) NOT NULL,
  evidence_urls JSON NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  seller_reply VARCHAR(255) NULL,
  admin_id BIGINT UNSIGNED NULL,
  arbitrate_result VARCHAR(30) NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_refund_order (order_sn),
  KEY idx_refund_status_created (status, created_at),
  CONSTRAINT fk_refund_order FOREIGN KEY (order_sn) REFERENCES orders(order_sn) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_refund_applicant FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_refund_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_refund_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_refund_status CHECK (status IN ('pending','seller_agreed','seller_rejected','arbitrating','buyer_win','seller_win','cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE withdraw_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewer_id BIGINT UNSIGNED NULL,
  review_note VARCHAR(255) NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_withdraw_user_created (user_id, created_at),
  KEY idx_withdraw_status_created (status, created_at),
  CONSTRAINT fk_withdraw_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_withdraw_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_withdraw_amount CHECK (amount > 0),
  CONSTRAINT chk_withdraw_status CHECK (status IN ('pending','approved','rejected','cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE conversations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_type VARCHAR(30) NOT NULL,
  business_type VARCHAR(30) NOT NULL,
  business_id BIGINT UNSIGNED NOT NULL,
  user_a_id BIGINT UNSIGNED NOT NULL,
  user_b_id BIGINT UNSIGNED NOT NULL,
  last_message_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_conversation_business_users (business_type, business_id, user_a_id, user_b_id),
  KEY idx_conversation_user_a (user_a_id, last_message_at),
  KEY idx_conversation_user_b (user_b_id, last_message_at),
  CONSTRAINT fk_conversation_user_a FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_conversation_user_b FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_conversation_type CHECK (session_type IN ('goods_chat','service_chat','task_chat','system_notice'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  receiver_id BIGINT UNSIGNED NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  content_hash CHAR(64) NOT NULL,
  previous_hash CHAR(64) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'normal',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_conversation (conversation_id, id),
  KEY idx_messages_sender_created (sender_id, created_at),
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_messages_type CHECK (message_type IN ('text','image','system','recalled')),
  CONSTRAINT chk_messages_status CHECK (status IN ('normal','recalled','hidden'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE favorites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_favorites_user_target (user_id, target_type, target_id),
  KEY idx_favorites_target (target_type, target_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_favorites_target CHECK (target_type IN ('goods','service'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_sn VARCHAR(64) NOT NULL,
  evaluator_id BIGINT UNSIGNED NOT NULL,
  target_user_id BIGINT UNSIGNED NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  score INT NOT NULL,
  content VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'normal',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_target (target_type, target_id, created_at),
  KEY idx_comments_order (order_sn),
  CONSTRAINT fk_comments_order FOREIGN KEY (order_sn) REFERENCES orders(order_sn) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_comments_evaluator FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_comments_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_comments_score CHECK (score BETWEEN 1 AND 5),
  CONSTRAINT chk_comments_target CHECK (target_type IN ('goods','service','errand')),
  CONSTRAINT chk_comments_status CHECK (status IN ('normal','hidden','removed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ai_audit_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  target_type VARCHAR(30) NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  audit_type VARCHAR(30) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'mock',
  request_id VARCHAR(100) NULL,
  risk_level VARCHAR(20) NOT NULL,
  reason VARCHAR(255) NULL,
  raw_result JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_target (target_type, target_id, created_at),
  KEY idx_ai_risk_created (risk_level, created_at),
  CONSTRAINT chk_ai_target CHECK (target_type IN ('goods','service','comment','message')),
  CONSTRAINT chk_ai_audit_type CHECK (audit_type IN ('generate_title','generate_desc','recommend_tags','text_audit','image_audit')),
  CONSTRAINT chk_ai_risk CHECK (risk_level IN ('pass','manual','reject'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ai_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rule_name VARCHAR(80) NOT NULL,
  text_audit_enabled TINYINT(1) NOT NULL DEFAULT 1,
  image_audit_enabled TINYINT(1) NOT NULL DEFAULT 1,
  manual_risk_level VARCHAR(20) NOT NULL DEFAULT 'manual',
  keywords TEXT NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_rules_name (rule_name),
  CONSTRAINT fk_ai_rules_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_ai_rules_level CHECK (manual_risk_level IN ('pass','manual','reject'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE admin_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  reason VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_logs_admin_created (admin_id, created_at),
  KEY idx_admin_logs_target (target_type, target_id),
  CONSTRAINT fk_admin_logs_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE job_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_name VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL,
  scanned_count INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  fail_count INT NOT NULL DEFAULT 0,
  message VARCHAR(500) NULL,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_job_logs_name_created (job_name, created_at),
  KEY idx_job_logs_status_created (status, created_at),
  CONSTRAINT chk_job_logs_status CHECK (status IN ('running','success','failed','partial'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE idempotency_keys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  idempotency_key VARCHAR(80) NOT NULL,
  request_path VARCHAR(120) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response_code INT NULL,
  response_body JSON NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  locked_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_idempotency_user_key (user_id, idempotency_key),
  KEY idx_idempotency_status_lock (status, locked_until),
  CONSTRAINT fk_idempotency_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_idempotency_status CHECK (status IN ('processing','success','failed','expired'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  business_type VARCHAR(30) NOT NULL,
  business_id VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  content VARCHAR(500) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_user_read (user_id, is_read, created_at),
  KEY idx_notifications_business (business_type, business_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_notifications_business CHECK (business_type IN ('order','goods','service','errand','refund','system'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE stats_daily (
  stat_date DATE NOT NULL,
  total_users INT NOT NULL DEFAULT 0,
  active_users INT NOT NULL DEFAULT 0,
  goods_on_sale INT NOT NULL DEFAULT 0,
  order_count INT NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  abnormal_order_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
