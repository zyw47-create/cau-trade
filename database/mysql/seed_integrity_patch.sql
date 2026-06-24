-- Idempotent demo integrity patch.
-- Keeps mini-program orders, counterpart users, business items, and chat
-- conversations aligned. Safe to run repeatedly after seed.sql/seed_more.sql.

USE campus_trade;
SET NAMES utf8mb4;

SET @demo_now := '2026-06-12 20:30:00';

INSERT INTO users
  (id, openid, student_id_enc, real_name_enc, college, nickname, username, avatar_url, phone_enc, address, role, status, is_verified, credit_score, balance, frozen_balance, created_at, updated_at)
VALUES
  (1, 'mock-openid-001', 'enc:20230001', 'enc:campus-user',
   CONVERT(0xe8bdafe4bbb6e5ada6e999a2 USING utf8mb4),
   CONVERT(0xe5bd93e5898de799bbe5bd95e794a8e688b7 USING utf8mb4),
   'campus_user', '', 'enc:13800000001',
   CONVERT(0xe58c97e58cbae5aebfe8888d USING utf8mb4),
   'user', 'active', 1, 100, 38.60, 0.00, '2026-06-01 09:00:00', @demo_now)
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  username = VALUES(username),
  college = VALUES(college),
  role = VALUES(role),
  status = VALUES(status),
  is_verified = VALUES(is_verified),
  credit_score = VALUES(credit_score),
  updated_at = VALUES(updated_at);

INSERT INTO users
  (openid, student_id_enc, real_name_enc, college, nickname, username, avatar_url, phone_enc, address, role, status, is_verified, credit_score, balance, frozen_balance, created_at, updated_at)
VALUES
  ('mock-openid-011', 'enc:20230011', 'enc:layout-liu',
   CONVERT(0xe8bdafe4bbb6e5ada6e999a2 USING utf8mb4),
   CONVERT(0xe68e92e78988e5908ce5ada6 USING utf8mb4),
   'layout_liu', '', 'enc:13800000011',
   CONVERT(0xe58c97e58cbae7bbbce59088e6a5bc USING utf8mb4),
   'provider', 'active', 1, 97, 12.00, 0.00, '2026-06-08 11:00:00', @demo_now)
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  username = VALUES(username),
  college = VALUES(college),
  role = VALUES(role),
  status = VALUES(status),
  is_verified = VALUES(is_verified),
  credit_score = VALUES(credit_score),
  updated_at = VALUES(updated_at);

SET @current_user_id := 1;
SET @layout_user_id := (SELECT id FROM users WHERE username = 'layout_liu' LIMIT 1);

INSERT INTO user_profiles
  (user_id, campus_area, major, grade_label, bio, response_time_minutes, last_active_at, trade_tags, completed_trade_count, good_rate_snapshot, created_at, updated_at)
VALUES
  (@layout_user_id,
   CONVERT(0xe58c97e58cbae7bbbce59088e6a5bc USING utf8mb4),
   CONVERT(0xe6a0a1e59bade69c8de58aa1 USING utf8mb4),
   CONVERT(0xe69c8de58aa1e88085e8aea4e8af81 USING utf8mb4),
   CONVERT(0xe8afbee7a88be8b584e69699e695b4e79086 USING utf8mb4),
   8, '2026-06-12 20:28:00',
   JSON_ARRAY(CONVERT(0xe69c8de58aa1e88085e8aea4e8af81 USING utf8mb4), CONVERT(0xe8afbee7a88be8b584e69699e695b4e79086 USING utf8mb4), CONVERT(0xe58c97e58cbae7bbbce59088e6a5bc USING utf8mb4)),
   7, 100.00, '2026-06-08 11:00:00', @demo_now)
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
  updated_at = VALUES(updated_at);

INSERT IGNORE INTO user_verifications
  (user_id, student_id_enc, real_name_enc, college, student_card_image_url, ocr_match_score, status, reviewer_id, review_note, reviewed_at, created_at)
SELECT
   @layout_user_id, 'enc:20230011', 'enc:layout-liu',
   CONVERT(0xe8bdafe4bbb6e5ada6e999a2 USING utf8mb4),
   '/uploads/verify/20230011.jpg', 96.80, 'approved', 99,
   CONVERT(0xe5ae9ee5908de5aea1e6a0b8e9809ae8bf87 USING utf8mb4),
   '2026-06-10 11:00:00', '2026-06-10 10:50:00'
WHERE NOT EXISTS (
  SELECT 1 FROM user_verifications
  WHERE user_id = @layout_user_id
    AND student_id_enc = 'enc:20230011'
);

INSERT INTO services
  (id, provider_id, category_id, title, price, description, images, status, avg_score, created_at, updated_at)
VALUES
  (9116, @layout_user_id, 5,
   CONVERT(0xe8afbee7a88be8a1a8e695b4e79086 USING utf8mb4),
   9.00,
   CONVERT(0xe8afbee7a88be8a1a8e695b4e79086efbc9ae68a8ae4b880e591a8e8afbee7a88be68c89e697b6e997b4e38081e59cb0e782b9e5928ce8b584e69699e6b885e58d95e695b4e79086e68890e8a1a8e6a0bcefbc8ce58fafe794a8e4ba8ee68993e58db0e68896e5afbce585a5e697a5e58e86e38082 USING utf8mb4),
   JSON_ARRAY('/uploads/services/schedule-organize.jpg'), 'on_sale', 4.90,
   '2026-06-12 20:00:00', @demo_now)
ON DUPLICATE KEY UPDATE
  provider_id = VALUES(provider_id),
  category_id = VALUES(category_id),
  title = VALUES(title),
  price = VALUES(price),
  description = VALUES(description),
  images = VALUES(images),
  status = VALUES(status),
  avg_score = VALUES(avg_score),
  updated_at = VALUES(updated_at);

INSERT INTO orders
  (order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot, amount, status, remark, paid_at, completed_at, created_at, updated_at)
VALUES
  ('DX-SV-SH-01', @current_user_id, @layout_user_id, 'service', 9116,
   JSON_OBJECT(
     'title', CONVERT(0xe8afbee7a88be8a1a8e695b4e79086 USING utf8mb4),
     'price', 9.00,
     'provider', CONVERT(0xe68e92e78988e5908ce5ada6 USING utf8mb4)
   ),
   9.00, 'completed',
   CONVERT(0xe8afbee7a88be8a1a8e695b4e79086e8aea2e58d95 USING utf8mb4),
   '2026-06-12 20:05:00', '2026-06-12 20:25:00',
   '2026-06-12 20:02:00', @demo_now)
ON DUPLICATE KEY UPDATE
  buyer_id = VALUES(buyer_id),
  seller_id = VALUES(seller_id),
  item_type = VALUES(item_type),
  item_id = VALUES(item_id),
  item_snapshot = VALUES(item_snapshot),
  amount = VALUES(amount),
  status = VALUES(status),
  remark = VALUES(remark),
  paid_at = VALUES(paid_at),
  completed_at = VALUES(completed_at),
  updated_at = VALUES(updated_at);

INSERT INTO order_funds
  (order_sn, amount, status, frozen_at, settled_at, refunded_at, created_at, updated_at)
VALUES
  ('DX-SV-SH-01', 9.00, 'settled', '2026-06-12 20:05:00', '2026-06-12 20:25:00', NULL, '2026-06-12 20:05:00', @demo_now)
ON DUPLICATE KEY UPDATE
  amount = VALUES(amount),
  status = VALUES(status),
  frozen_at = VALUES(frozen_at),
  settled_at = VALUES(settled_at),
  updated_at = VALUES(updated_at);

INSERT IGNORE INTO order_events
  (order_sn, from_status, to_status, operator_id, event_type, note, created_at)
VALUES
  ('DX-SV-SH-01', NULL, 'unpaid', @current_user_id, 'create', CONVERT(0xe69c8de58aa1e8aea2e58d95e5b7b2e5889be5bbba USING utf8mb4), '2026-06-12 20:02:00'),
  ('DX-SV-SH-01', 'unpaid', 'paid', @current_user_id, 'pay', CONVERT(0xe69c8de58aa1e8b4b9e794a8e8bf9be585a5e5b9b3e58fb0e68998e7aea1 USING utf8mb4), '2026-06-12 20:05:00'),
  ('DX-SV-SH-01', 'paid', 'completed', @current_user_id, 'receive', CONVERT(0xe8818ae5a4a9e8af81e68daee993bee5b7b2e8a1a5e9bd90 USING utf8mb4), '2026-06-12 20:25:00');

INSERT INTO conversations
  (session_type, business_type, business_id, user_a_id, user_b_id, last_message_at, created_at)
VALUES
  ('service_chat', 'service', 9116, LEAST(@current_user_id, @layout_user_id), GREATEST(@current_user_id, @layout_user_id), '2026-06-12 20:24:00', '2026-06-12 20:06:00')
ON DUPLICATE KEY UPDATE
  id = LAST_INSERT_ID(id),
  session_type = VALUES(session_type),
  business_type = VALUES(business_type),
  business_id = VALUES(business_id),
  user_a_id = VALUES(user_a_id),
  user_b_id = VALUES(user_b_id),
  last_message_at = VALUES(last_message_at);

SET @layout_conversation_id := LAST_INSERT_ID();

INSERT INTO messages
  (id, conversation_id, sender_id, receiver_id, message_type, content, content_hash, previous_hash, status, created_at)
VALUES
  (911601, @layout_conversation_id, @current_user_id, @layout_user_id, 'text',
   CONVERT(0xe8b584e69699e58f91e4bda0e4ba86efbc8ce9babbe783a6e4bc98e58588e695b4e79086e697a9e585abe5928ce5ae9ee9aa8ce8afbee38082 USING utf8mb4),
   SHA2(CONVERT(0xe8b584e69699e58f91e4bda0e4ba86efbc8ce9babbe783a6e4bc98e58588e695b4e79086e697a9e585abe5928ce5ae9ee9aa8ce8afbee38082 USING utf8mb4), 256),
   NULL, 'normal', '2026-06-12 20:06:00'),
  (911602, @layout_conversation_id, @layout_user_id, @current_user_id, 'text',
   CONVERT(0xe5a5bde79a84efbc8ce68891e4bc9ae58588e68a8ae697a9e585abe5928ce5ae9ee9aa8ce8afbee694bee59ca8e5898de99da2efbc8ce5ae8ce68890e5908ee58f91e4bda0e7a1aee8aea4e38082 USING utf8mb4),
   SHA2(CONVERT(0xe5a5bde79a84efbc8ce68891e4bc9ae58588e68a8ae697a9e585abe5928ce5ae9ee9aa8ce8afbee694bee59ca8e5898de99da2efbc8ce5ae8ce68890e5908ee58f91e4bda0e7a1aee8aea4e38082 USING utf8mb4), 256),
   SHA2(CONVERT(0xe8b584e69699e58f91e4bda0e4ba86efbc8ce9babbe783a6e4bc98e58588e695b4e79086e697a9e585abe5928ce5ae9ee9aa8ce8afbee38082 USING utf8mb4), 256),
   'normal', '2026-06-12 20:10:00'),
  (911603, @layout_conversation_id, @layout_user_id, @current_user_id, 'text',
   CONVERT(0xe694b6e588b0efbc8ce68891e4bc9ae68c89e591a8e4b880e588b0e591a8e697a5e695b4e79086efbc8ce5b9b6e6a087e587bae59cb0e782b9e5928ce8b584e69699e6b885e58d95e38082 USING utf8mb4),
   SHA2(CONVERT(0xe694b6e588b0efbc8ce68891e4bc9ae68c89e591a8e4b880e588b0e591a8e697a5e695b4e79086efbc8ce5b9b6e6a087e587bae59cb0e782b9e5928ce8b584e69699e6b885e58d95e38082 USING utf8mb4), 256),
   SHA2(CONVERT(0xe5a5bde79a84efbc8ce68891e4bc9ae58588e68a8ae697a9e585abe5928ce5ae9ee9aa8ce8afbee694bee59ca8e5898de99da2efbc8ce5ae8ce68890e5908ee58f91e4bda0e7a1aee8aea4e38082 USING utf8mb4), 256),
   'normal', '2026-06-12 20:24:00')
ON DUPLICATE KEY UPDATE
  conversation_id = VALUES(conversation_id),
  sender_id = VALUES(sender_id),
  receiver_id = VALUES(receiver_id),
  message_type = VALUES(message_type),
  content = VALUES(content),
  content_hash = VALUES(content_hash),
  previous_hash = VALUES(previous_hash),
  status = VALUES(status),
  created_at = VALUES(created_at);

-- Extra orders for mini-program status filters. Keep these rows idempotent so
-- insert-demo-data.bat can be run repeatedly without duplicating demo records.
INSERT INTO users
  (openid, student_id_enc, real_name_enc, college, nickname, username, avatar_url, phone_enc, address, role, status, is_verified, credit_score, balance, frozen_balance, created_at, updated_at)
VALUES
  ('mock-openid-status-seller', 'enc:demo-status-seller', 'enc:status-seller',
   '信息学院', '状态卖家同学', 'status_seller', '', 'enc:13800009101',
   '北区教学楼', 'user', 'active', 1, 96, 26.00, 0.00, '2026-06-12 18:00:00', @demo_now),
  ('mock-openid-status-provider', 'enc:demo-status-provider', 'enc:status-provider',
   '软件学院', '状态服务同学', 'status_provider', '', 'enc:13800009102',
   '软件学院实验楼', 'provider', 'active', 1, 98, 18.00, 0.00, '2026-06-12 18:00:00', @demo_now),
  ('mock-openid-status-rider', 'enc:demo-status-rider', 'enc:status-rider',
   '体育学院', '状态骑手同学', 'status_rider', '', 'enc:13800009103',
   '东区操场', 'rider', 'active', 1, 97, 14.00, 0.00, '2026-06-12 18:00:00', @demo_now)
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  username = VALUES(username),
  college = VALUES(college),
  role = VALUES(role),
  status = VALUES(status),
  is_verified = VALUES(is_verified),
  credit_score = VALUES(credit_score),
  updated_at = VALUES(updated_at);

SET @status_seller_id := (SELECT id FROM users WHERE username = 'status_seller' LIMIT 1);
SET @status_provider_id := (SELECT id FROM users WHERE username = 'status_provider' LIMIT 1);
SET @status_rider_id := (SELECT id FROM users WHERE username = 'status_rider' LIMIT 1);

INSERT INTO user_profiles
  (user_id, campus_area, major, grade_label, bio, response_time_minutes, last_active_at, trade_tags, completed_trade_count, good_rate_snapshot, created_at, updated_at)
VALUES
  (@status_seller_id, '北区教学楼', '信息管理', '2022级', '演示订单状态筛选用账号，商品信息完整，支持点进主页查看。', 12, @demo_now,
   JSON_ARRAY('实名用户', '二手交易', '状态演示'), 6, 98.00, '2026-06-12 18:00:00', @demo_now),
  (@status_provider_id, '软件学院实验楼', '校园服务', '服务者认证', '演示服务订单状态流转，支持预约、履约和评价。', 8, @demo_now,
   JSON_ARRAY('服务者认证', '履约演示', '回复快'), 8, 100.00, '2026-06-12 18:00:00', @demo_now),
  (@status_rider_id, '东区操场', '体育教育', '骑手认证', '演示跑腿待接单、配送和完成状态，资料完整可访问主页。', 6, @demo_now,
   JSON_ARRAY('骑手认证', '跑腿配送', '过程留痕'), 9, 99.00, '2026-06-12 18:00:00', @demo_now)
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
  updated_at = VALUES(updated_at);

INSERT INTO goods
  (id, seller_id, category_id, title, price, condition_level, description, images, location, status, audit_note, is_ai_generated, favorite_count, view_count, created_at, updated_at)
VALUES
  (9301, @status_seller_id, 1, '状态筛选耳机 待付款', 12.00, '八成新', '用于演示订单待付款分类，交易对象资料完整。', JSON_ARRAY('/uploads/goods/status-earphone.jpg'), '北区教学楼', 'reserved', '演示数据', 0, 2, 20, '2026-06-12 18:01:00', @demo_now),
  (9302, @status_seller_id, 1, '状态筛选小桌 待确认', 18.00, '九成新', '用于演示订单待确认分类，买家已支付等待卖家确认。', JSON_ARRAY('/uploads/goods/status-desk.jpg'), '北区教学楼', 'reserved', '演示数据', 0, 3, 24, '2026-06-12 18:02:00', @demo_now),
  (9303, @current_user_id, 4, '状态筛选球拍 待发货', 24.00, '八成新', '当前登录用户作为卖家，用于演示待发货分类和履约按钮。', JSON_ARRAY('/uploads/goods/status-racket.jpg'), '体育馆门口', 'reserved', '演示数据', 0, 4, 31, '2026-06-12 18:03:00', @demo_now),
  (9304, @status_seller_id, 1, '状态筛选讲义 待收货', 15.00, '九成新', '用于演示卖家已交付、买家待确认完成的订单。', JSON_ARRAY('/uploads/goods/status-notes.jpg'), '图书馆二楼', 'reserved', '演示数据', 0, 5, 35, '2026-06-12 18:04:00', @demo_now),
  (9305, @status_seller_id, 3, '状态筛选卡套 待评价', 8.00, '九成新', '用于演示已完成但当前用户尚未评价的订单。', JSON_ARRAY('/uploads/goods/status-card-holder.jpg'), '软件学院楼下', 'sold', '演示数据', 0, 1, 16, '2026-06-12 18:05:00', @demo_now),
  (9306, @status_seller_id, 2, '状态筛选扩展坞 售后中', 36.00, '七成新', '用于演示订单进入售后处理分类。', JSON_ARRAY('/uploads/goods/status-hub.jpg'), '图书馆门口', 'reserved', '演示数据', 0, 6, 40, '2026-06-12 18:06:00', @demo_now)
ON DUPLICATE KEY UPDATE
  seller_id = VALUES(seller_id),
  category_id = VALUES(category_id),
  title = VALUES(title),
  price = VALUES(price),
  condition_level = VALUES(condition_level),
  description = VALUES(description),
  images = VALUES(images),
  location = VALUES(location),
  status = VALUES(status),
  audit_note = VALUES(audit_note),
  favorite_count = VALUES(favorite_count),
  view_count = VALUES(view_count),
  updated_at = VALUES(updated_at);

INSERT INTO services
  (id, provider_id, category_id, title, price, description, images, status, avg_score, created_at, updated_at)
VALUES
  (9311, @status_provider_id, 5, '状态筛选资料整理 待履约', 16.00, '服务者已确认，用于演示待发货/履约分类。', JSON_ARRAY('/uploads/services/status-service.jpg'), 'on_sale', 4.90, '2026-06-12 18:07:00', @demo_now)
ON DUPLICATE KEY UPDATE
  provider_id = VALUES(provider_id),
  category_id = VALUES(category_id),
  title = VALUES(title),
  price = VALUES(price),
  description = VALUES(description),
  images = VALUES(images),
  status = VALUES(status),
  avg_score = VALUES(avg_score),
  updated_at = VALUES(updated_at);

INSERT INTO errand_orders
  (id, publisher_id, rider_id, title, description, pickup_location, delivery_location, fee, status, accepted_at, completed_at, created_at, updated_at)
VALUES
  (9321, @current_user_id, NULL, '状态筛选跑腿 待接单', '用于演示跑腿订单已支付、等待骑手接单分类。', '北区快递柜', '软件学院实验楼', 5.00, 'waiting_accept', NULL, NULL, '2026-06-12 18:08:00', @demo_now)
ON DUPLICATE KEY UPDATE
  publisher_id = VALUES(publisher_id),
  rider_id = VALUES(rider_id),
  title = VALUES(title),
  description = VALUES(description),
  pickup_location = VALUES(pickup_location),
  delivery_location = VALUES(delivery_location),
  fee = VALUES(fee),
  status = VALUES(status),
  accepted_at = VALUES(accepted_at),
  completed_at = VALUES(completed_at),
  updated_at = VALUES(updated_at);

INSERT INTO orders
  (order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot, amount, status, remark, paid_at, completed_at, created_at, updated_at)
VALUES
  ('DX-FLT-PAY-01', @current_user_id, @status_seller_id, 'goods', 9301, JSON_OBJECT('title', '状态筛选耳机 待付款', 'price', 12.00, 'location', '北区教学楼'), 12.00, 'unpaid', '待付款分类演示', NULL, NULL, '2026-06-12 18:10:00', @demo_now),
  ('DX-FLT-CONFIRM-01', @current_user_id, @status_seller_id, 'goods', 9302, JSON_OBJECT('title', '状态筛选小桌 待确认', 'price', 18.00, 'location', '北区教学楼'), 18.00, 'paid', '待确认分类演示', '2026-06-12 18:13:00', NULL, '2026-06-12 18:12:00', @demo_now),
  ('DX-FLT-SHIP-01', @status_seller_id, @current_user_id, 'goods', 9303, JSON_OBJECT('title', '状态筛选球拍 待发货', 'price', 24.00, 'location', '体育馆门口'), 24.00, 'confirmed', '待发货分类演示', '2026-06-12 18:16:00', NULL, '2026-06-12 18:15:00', @demo_now),
  ('DX-FLT-RECEIVE-01', @current_user_id, @status_seller_id, 'goods', 9304, JSON_OBJECT('title', '状态筛选讲义 待收货', 'price', 15.00, 'location', '图书馆二楼'), 15.00, 'shipped', '待收货分类演示', '2026-06-12 18:19:00', NULL, '2026-06-12 18:18:00', @demo_now),
  ('DX-FLT-COMMENT-01', @current_user_id, @status_seller_id, 'goods', 9305, JSON_OBJECT('title', '状态筛选卡套 待评价', 'price', 8.00, 'location', '软件学院楼下'), 8.00, 'completed', '待评价分类演示', '2026-06-12 18:22:00', '2026-06-12 18:30:00', '2026-06-12 18:21:00', @demo_now),
  ('DX-FLT-AFTER-01', @current_user_id, @status_seller_id, 'goods', 9306, JSON_OBJECT('title', '状态筛选扩展坞 售后中', 'price', 36.00, 'location', '图书馆门口'), 36.00, 'refunding', '售后中分类演示', '2026-06-12 18:33:00', NULL, '2026-06-12 18:32:00', @demo_now),
  ('DX-FLT-SVC-01', @current_user_id, @status_provider_id, 'service', 9311, JSON_OBJECT('title', '状态筛选资料整理 待履约', 'price', 16.00, 'provider', '状态服务同学'), 16.00, 'confirmed', '服务待履约分类演示', '2026-06-12 18:36:00', NULL, '2026-06-12 18:35:00', @demo_now),
  ('DX-FLT-ERRAND-01', @current_user_id, @status_rider_id, 'errand', 9321, JSON_OBJECT('title', '状态筛选跑腿 待接单', 'price', 5.00, 'pickup_location', '北区快递柜', 'delivery_location', '软件学院实验楼'), 5.00, 'paid', '跑腿待接单分类演示', '2026-06-12 18:39:00', NULL, '2026-06-12 18:38:00', @demo_now)
ON DUPLICATE KEY UPDATE
  buyer_id = VALUES(buyer_id),
  seller_id = VALUES(seller_id),
  item_type = VALUES(item_type),
  item_id = VALUES(item_id),
  item_snapshot = VALUES(item_snapshot),
  amount = VALUES(amount),
  status = VALUES(status),
  remark = VALUES(remark),
  paid_at = VALUES(paid_at),
  completed_at = VALUES(completed_at),
  updated_at = VALUES(updated_at);

INSERT INTO order_funds
  (order_sn, amount, status, frozen_at, settled_at, refunded_at, created_at, updated_at)
VALUES
  ('DX-FLT-CONFIRM-01', 18.00, 'frozen', '2026-06-12 18:13:00', NULL, NULL, '2026-06-12 18:13:00', @demo_now),
  ('DX-FLT-SHIP-01', 24.00, 'frozen', '2026-06-12 18:16:00', NULL, NULL, '2026-06-12 18:16:00', @demo_now),
  ('DX-FLT-RECEIVE-01', 15.00, 'frozen', '2026-06-12 18:19:00', NULL, NULL, '2026-06-12 18:19:00', @demo_now),
  ('DX-FLT-COMMENT-01', 8.00, 'settled', '2026-06-12 18:22:00', '2026-06-12 18:30:00', NULL, '2026-06-12 18:22:00', @demo_now),
  ('DX-FLT-AFTER-01', 36.00, 'refunding', '2026-06-12 18:33:00', NULL, NULL, '2026-06-12 18:33:00', @demo_now),
  ('DX-FLT-SVC-01', 16.00, 'frozen', '2026-06-12 18:36:00', NULL, NULL, '2026-06-12 18:36:00', @demo_now),
  ('DX-FLT-ERRAND-01', 5.00, 'frozen', '2026-06-12 18:39:00', NULL, NULL, '2026-06-12 18:39:00', @demo_now)
ON DUPLICATE KEY UPDATE
  amount = VALUES(amount),
  status = VALUES(status),
  frozen_at = VALUES(frozen_at),
  settled_at = VALUES(settled_at),
  refunded_at = VALUES(refunded_at),
  updated_at = VALUES(updated_at);

INSERT IGNORE INTO order_events
  (order_sn, from_status, to_status, operator_id, event_type, note, created_at)
VALUES
  ('DX-FLT-PAY-01', NULL, 'unpaid', @current_user_id, 'create', '创建待付款演示订单', '2026-06-12 18:10:00'),
  ('DX-FLT-CONFIRM-01', NULL, 'unpaid', @current_user_id, 'create', '创建待确认演示订单', '2026-06-12 18:12:00'),
  ('DX-FLT-CONFIRM-01', 'unpaid', 'paid', @current_user_id, 'pay', '买家支付，等待卖家确认', '2026-06-12 18:13:00'),
  ('DX-FLT-SHIP-01', NULL, 'unpaid', @status_seller_id, 'create', '创建待发货演示订单', '2026-06-12 18:15:00'),
  ('DX-FLT-SHIP-01', 'unpaid', 'paid', @status_seller_id, 'pay', '买家支付，资金托管', '2026-06-12 18:16:00'),
  ('DX-FLT-SHIP-01', 'paid', 'confirmed', @current_user_id, 'seller_confirm', '卖家确认，等待发货或履约', '2026-06-12 18:17:00'),
  ('DX-FLT-RECEIVE-01', NULL, 'unpaid', @current_user_id, 'create', '创建待收货演示订单', '2026-06-12 18:18:00'),
  ('DX-FLT-RECEIVE-01', 'unpaid', 'paid', @current_user_id, 'pay', '买家支付，资金托管', '2026-06-12 18:19:00'),
  ('DX-FLT-RECEIVE-01', 'paid', 'confirmed', @status_seller_id, 'seller_confirm', '卖家确认订单', '2026-06-12 18:20:00'),
  ('DX-FLT-RECEIVE-01', 'confirmed', 'shipped', @status_seller_id, 'ship', '卖家已交付，等待买家确认', '2026-06-12 18:21:00'),
  ('DX-FLT-COMMENT-01', NULL, 'unpaid', @current_user_id, 'create', '创建待评价演示订单', '2026-06-12 18:21:00'),
  ('DX-FLT-COMMENT-01', 'unpaid', 'paid', @current_user_id, 'pay', '买家支付，资金托管', '2026-06-12 18:22:00'),
  ('DX-FLT-COMMENT-01', 'paid', 'completed', @current_user_id, 'receive', '买家确认完成，等待评价', '2026-06-12 18:30:00'),
  ('DX-FLT-AFTER-01', NULL, 'unpaid', @current_user_id, 'create', '创建售后演示订单', '2026-06-12 18:32:00'),
  ('DX-FLT-AFTER-01', 'unpaid', 'paid', @current_user_id, 'pay', '买家支付，资金托管', '2026-06-12 18:33:00'),
  ('DX-FLT-AFTER-01', 'paid', 'refunding', @current_user_id, 'refund_apply', '买家申请售后，等待平台处理', '2026-06-12 18:34:00'),
  ('DX-FLT-SVC-01', NULL, 'unpaid', @current_user_id, 'create', '创建服务履约演示订单', '2026-06-12 18:35:00'),
  ('DX-FLT-SVC-01', 'unpaid', 'paid', @current_user_id, 'pay', '服务费进入平台托管', '2026-06-12 18:36:00'),
  ('DX-FLT-SVC-01', 'paid', 'confirmed', @status_provider_id, 'seller_confirm', '服务者确认预约，等待履约', '2026-06-12 18:37:00'),
  ('DX-FLT-ERRAND-01', NULL, 'unpaid', @current_user_id, 'errand_publish', '发布跑腿任务，等待支付', '2026-06-12 18:38:00'),
  ('DX-FLT-ERRAND-01', 'unpaid', 'paid', @current_user_id, 'pay', '跑腿费已托管，等待骑手接单', '2026-06-12 18:39:00');

INSERT INTO refund_requests
  (id, order_sn, applicant_id, seller_id, reason, evidence_urls, status, seller_reply, admin_id, arbitrate_result, resolved_at, created_at, updated_at)
VALUES
  (9301, 'DX-FLT-AFTER-01', @current_user_id, @status_seller_id, '扩展坞接口接触不稳定，申请平台介入处理。',
   JSON_ARRAY('/uploads/evidence/status-hub-issue.jpg'), 'pending', '', NULL, NULL, NULL, '2026-06-12 18:34:00', @demo_now)
ON DUPLICATE KEY UPDATE
  order_sn = VALUES(order_sn),
  applicant_id = VALUES(applicant_id),
  seller_id = VALUES(seller_id),
  reason = VALUES(reason),
  evidence_urls = VALUES(evidence_urls),
  status = VALUES(status),
  seller_reply = VALUES(seller_reply),
  admin_id = VALUES(admin_id),
  arbitrate_result = VALUES(arbitrate_result),
  resolved_at = VALUES(resolved_at),
  updated_at = VALUES(updated_at);

INSERT IGNORE INTO errand_events
  (errand_id, operator_id, event_type, from_status, to_status, remark, created_at)
VALUES
  (9321, @current_user_id, 'publish', NULL, 'waiting_accept', '发布跑腿任务并托管费用', '2026-06-12 18:38:00');

UPDATE orders o
JOIN goods g ON g.id = o.item_id
SET o.seller_id = g.seller_id,
    o.updated_at = @demo_now
WHERE o.item_type = 'goods'
  AND o.seller_id <> g.seller_id;

UPDATE orders o
JOIN services s ON s.id = o.item_id
SET o.seller_id = s.provider_id,
    o.updated_at = @demo_now
WHERE o.item_type = 'service'
  AND o.seller_id <> s.provider_id;

UPDATE orders o
JOIN errand_orders e ON e.id = o.item_id
SET o.buyer_id = e.publisher_id,
    o.seller_id = COALESCE(e.rider_id, o.seller_id),
    o.updated_at = @demo_now
WHERE o.item_type = 'errand'
  AND (
    o.buyer_id <> e.publisher_id
    OR (e.rider_id IS NOT NULL AND o.seller_id <> e.rider_id)
  );

UPDATE comments c
JOIN orders o ON o.order_sn = c.order_sn
SET c.target_user_id = IF(c.evaluator_id = o.buyer_id, o.seller_id, o.buyer_id)
WHERE c.target_user_id NOT IN (o.buyer_id, o.seller_id);

INSERT INTO job_logs
  (job_name, status, scanned_count, success_count, fail_count, message, started_at, finished_at, created_at)
VALUES
  ('seed_integrity_patch', 'success', 1, 1, 0,
   CONVERT(0xe6bc94e7a4bae695b0e68daee4b880e887b4e680a7e8a1a5e4b881 USING utf8mb4),
   NOW(), NOW(), NOW());
