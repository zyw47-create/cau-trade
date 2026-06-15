-- Campus Trade Mini Program - MySQL 8.0 seed data
-- Run after schema.sql and before views_and_routines.sql.

USE campus_trade;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Demo data reset must run before immutable-data triggers are recreated.
DROP TRIGGER IF EXISTS trg_wallet_logs_no_update;
DROP TRIGGER IF EXISTS trg_wallet_logs_no_delete;
DROP TRIGGER IF EXISTS trg_admin_audit_logs_no_update;
DROP TRIGGER IF EXISTS trg_admin_audit_logs_no_delete;
DROP TRIGGER IF EXISTS trg_order_events_no_update;
DROP TRIGGER IF EXISTS trg_order_events_no_delete;
DROP TRIGGER IF EXISTS trg_messages_no_update_content;
DROP TRIGGER IF EXISTS trg_messages_no_delete;

DELETE FROM stats_daily;
DELETE FROM job_logs;
DELETE FROM admin_audit_logs;
DELETE FROM notifications;
DELETE FROM idempotency_keys;
DELETE FROM ai_rules;
DELETE FROM ai_audit_records;
DELETE FROM comments;
DELETE FROM favorites;
DELETE FROM messages;
DELETE FROM conversations;
DELETE FROM refund_requests;
DELETE FROM withdraw_requests;
DELETE FROM wallet_logs;
DELETE FROM order_funds;
DELETE FROM order_events;
DELETE FROM orders;
DELETE FROM errand_events;
DELETE FROM errand_orders;
DELETE FROM services;
DELETE FROM goods;
DELETE FROM credit_logs;
DELETE FROM user_verifications;
DELETE FROM categories;
DELETE FROM user_profiles;
DELETE FROM users;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users
  (id, openid, student_id_enc, real_name_enc, college, nickname, username, avatar_url, phone_enc, address, role, status, is_verified, credit_score, balance, frozen_balance, created_at, updated_at)
VALUES
  (1, 'mock-openid-001', 'enc:20230001', 'enc:campus-user', '软件学院', '校园同学', 'campus_user', '', 'enc:13800000001', '北区宿舍 6 栋', 'user', 'active', 1, 100, 38.60, 0.00, '2026-06-01 09:00:00', '2026-06-12 10:30:00'),
  (2, 'mock-openid-002', 'enc:20230002', 'enc:math-user', '数学学院', '数院同学', 'math_chen', '', 'enc:13800000002', '北区宿舍', 'user', 'active', 1, 96, 46.00, 0.00, '2026-06-02 10:00:00', '2026-06-12 10:20:00'),
  (3, 'mock-openid-003', 'enc:20230003', 'enc:se-user', '软件学院', '软件工程同学', 'se_luo', '', 'enc:13800000003', '图书馆附近', 'user', 'active', 1, 91, 32.00, 0.00, '2026-06-03 11:00:00', '2026-06-12 10:40:00'),
  (4, 'mock-openid-004', 'enc:20230004', 'enc:south-user', '管理学院', '南区同学', 'south_li', '', 'enc:13800000004', '南区食堂', 'user', 'banned', 1, 58, 0.00, 0.00, '2026-06-04 12:00:00', '2026-06-12 09:40:00'),
  (5, 'mock-openid-005', 'enc:20230005', 'enc:print-shop', '文学院', '文印小站', 'print_station', '', 'enc:13800000005', '教学楼 A 区', 'provider', 'active', 1, 98, 0.00, 0.00, '2026-06-05 09:20:00', '2026-06-12 09:20:00'),
  (6, 'mock-openid-006', 'enc:20230006', 'enc:rider-user', '体育学院', '跑腿同学', 'runner_zhao', '', 'enc:13800000006', '东区操场', 'rider', 'active', 1, 97, 12.00, 0.00, '2026-06-06 08:30:00', '2026-06-12 09:30:00'),
  (7, 'mock-openid-007', 'enc:20230007', 'enc:info-user', '信息学院', '信工同学', 'info_wang', '', 'enc:13800000007', '东区宿舍', 'user', 'active', 1, 98, 20.00, 0.00, '2026-06-07 08:30:00', '2026-06-11 19:30:00'),
  (99, 'mock-openid-admin', 'enc:admin001', 'enc:admin-user', '平台运营中心', '平台管理员', 'admin_ops', '', 'enc:13800000999', '后台管理端', 'admin', 'active', 1, 100, 0.00, 0.00, '2026-06-01 08:00:00', '2026-06-12 10:00:00');

INSERT INTO user_profiles
  (user_id, campus_area, major, grade_label, bio, response_time_minutes, last_active_at, trade_tags, completed_trade_count, good_rate_snapshot, created_at, updated_at)
VALUES
  (1, '北区宿舍', '软件工程', '2023级', '偏好当面验货和资金托管，常在北区、图书馆交易。', 10, '2026-06-12 20:30:00', JSON_ARRAY('已实名', '回复快', '支持当面验货'), 3, 100.00, '2026-06-01 09:00:00', '2026-06-12 20:30:00'),
  (2, '北区宿舍', '数学与应用数学', '2022级', '长期出教材、讲义和复习资料，资料会按章节整理。', 15, '2026-06-12 20:20:00', JSON_ARRAY('教材资料多', '准时交易', '描述清楚'), 8, 100.00, '2026-06-02 10:00:00', '2026-06-12 20:20:00'),
  (3, '东区宿舍', '软件工程', '2022级', '数码配件较多，支持现场试用，交易前会说明瑕疵。', 30, '2026-06-12 19:45:00', JSON_ARRAY('支持验货', '数码配件', '售后配合'), 5, 88.00, '2026-06-03 11:00:00', '2026-06-12 19:45:00'),
  (4, '南区宿舍', '工商管理', '2021级', '账号因历史违规被限制展示，交易需谨慎。', 120, '2026-06-12 09:30:00', JSON_ARRAY('风险账号', '平台限制'), 1, 60.00, '2026-06-04 12:00:00', '2026-06-12 09:40:00'),
  (5, '教学楼A区', '校园服务', '服务号', '提供资料整理、打印、装订和晚自习后交付，支持服务完成后评价。', 5, '2026-06-12 20:10:00', JSON_ARRAY('服务者认证', '交付稳定', '可预约'), 12, 100.00, '2026-06-05 09:20:00', '2026-06-12 20:10:00'),
  (6, '东区操场', '体育教育', '2022级', '熟悉东区、北区和图书馆路线，接单后会在聊天中同步进度。', 5, '2026-06-12 18:30:00', JSON_ARRAY('骑手认证', '配送及时', '过程留痕'), 9, 100.00, '2026-06-06 08:30:00', '2026-06-12 18:30:00'),
  (7, '东区宿舍', '计算机科学', '2021级', '提供学习资料和基础答疑，交易地点多在东区宿舍附近。', 20, '2026-06-11 19:30:00', JSON_ARRAY('学习辅导', '好评多', '沟通耐心'), 6, 100.00, '2026-06-07 08:30:00', '2026-06-11 19:30:00'),
  (99, '后台管理端', '平台运营', '管理员', '平台运营账号，仅用于审核、仲裁、备份与安全巡检。', 0, '2026-06-12 20:00:00', JSON_ARRAY('管理员', '安全审计'), 0, 100.00, '2026-06-01 08:00:00', '2026-06-12 20:00:00');

INSERT INTO categories (id, name, type, sort_order, status, created_at)
VALUES
  (1, '教材资料', 'goods', 10, 'active', '2026-06-01 09:00:00'),
  (2, '数码产品', 'goods', 20, 'active', '2026-06-01 09:00:00'),
  (3, '生活用品', 'goods', 30, 'active', '2026-06-01 09:00:00'),
  (4, '运动用品', 'goods', 40, 'active', '2026-06-01 09:00:00'),
  (5, '校园服务', 'service', 50, 'active', '2026-06-01 09:00:00'),
  (6, '跑腿配送', 'errand', 60, 'active', '2026-06-01 09:00:00'),
  (7, '学习辅导', 'service', 70, 'active', '2026-06-01 09:00:00');

INSERT INTO user_verifications
  (id, user_id, student_id_enc, real_name_enc, college, student_card_image_url, ocr_match_score, status, reviewer_id, review_note, reviewed_at, created_at)
VALUES
  (1, 1, 'enc:20230001', 'enc:campus-user', '软件学院', '/uploads/verify/20230001.jpg', 98.50, 'approved', 99, '学生证识别通过', '2026-06-09 09:10:00', '2026-06-09 09:00:00'),
  (2, 2, 'enc:20230002', 'enc:math-user', '数学学院', '/uploads/verify/20230002.jpg', 96.20, 'approved', 99, '学生证识别通过', '2026-06-09 09:20:00', '2026-06-09 09:12:00'),
  (3, 3, 'enc:20230003', 'enc:se-user', '软件学院', '/uploads/verify/20230003.jpg', 94.80, 'approved', 99, '学生证识别通过', '2026-06-09 09:30:00', '2026-06-09 09:18:00'),
  (4, 4, 'enc:20230004', 'enc:south-user', '管理学院', '/uploads/verify/20230004.jpg', 95.00, 'approved', 99, '历史认证记录，当前因违规封禁', '2026-06-09 09:40:00', '2026-06-09 09:22:00');

INSERT INTO credit_logs
  (id, user_id, change_value, reason_type, reason_detail, related_type, related_id, operator_id, score_after, created_at)
VALUES
  (1, 1, 5, 'verify_approved', '实名认证通过', 'verification', '1', 99, 100, '2026-06-09 09:10:00'),
  (2, 1, 2, 'order_completed', '完成校园交易', 'order', 'CT202606100001', NULL, 100, '2026-06-10 20:30:00'),
  (3, 4, -40, 'violation', '发布违规信息并拒绝整改', 'admin_action', 'ban-20260612', 99, 58, '2026-06-12 09:40:00');

INSERT INTO goods
  (id, seller_id, category_id, title, price, condition_level, description, images, location, status, audit_note, is_ai_generated, favorite_count, view_count, created_at, updated_at)
VALUES
  (101, 2, 1, '九成新高数教材与习题册', 26.00, '九成新', '教材保存完整，附带课堂笔记，适合期末复习。', JSON_ARRAY('/uploads/goods/math-book.jpg'), '北区宿舍', 'on_sale', 'AI审核通过', 0, 8, 126, '2026-06-10 09:20:00', '2026-06-12 09:20:00'),
  (102, 3, 2, '蓝牙键盘 低噪轻薄款', 58.00, '八成新', '可连接平板和电脑，电量正常，支持现场验货。', JSON_ARRAY('/uploads/goods/keyboard.jpg'), '图书馆门口', 'on_sale', 'AI审核通过', 0, 15, 212, '2026-06-10 10:10:00', '2026-06-12 09:30:00'),
  (103, 4, 3, '宿舍折叠收纳箱两只', 18.00, '七成新', '搬宿舍闲置，干净无破损。', JSON_ARRAY('/uploads/goods/storage-box.jpg'), '南区食堂', 'on_sale', 'AI审核通过', 0, 3, 42, '2026-06-11 10:20:00', '2026-06-12 08:40:00'),
  (104, 1, 3, '待复核商品', 12.00, '八成新', '该商品命中风险规则，需要管理员人工复核后才能上架。', JSON_ARRAY('/uploads/goods/manual-review.jpg'), '东区操场', 'pending', '命中人工复核规则', 1, 0, 9, '2026-06-12 09:18:00', '2026-06-12 09:18:00');

INSERT INTO services
  (id, provider_id, category_id, title, price, description, images, status, avg_score, created_at, updated_at)
VALUES
  (201, 5, 5, '资料整理与打印代办', 6.00, '支持资料整理、打印、装订，可约晚自习后交付。', JSON_ARRAY('/uploads/services/print.jpg'), 'on_sale', 5.00, '2026-06-11 13:00:00', '2026-06-12 09:00:00'),
  (202, 7, 7, '期末 C 语言答疑半小时', 15.00, '可在图书馆或线上答疑，适合考前查漏补缺。', JSON_ARRAY('/uploads/services/c-language.jpg'), 'on_sale', 4.80, '2026-06-11 14:00:00', '2026-06-12 09:00:00');

INSERT INTO errand_orders
  (id, publisher_id, rider_id, title, description, pickup_location, delivery_location, fee, status, accepted_at, completed_at, created_at, updated_at)
VALUES
  (202, 1, NULL, '南区到北区文件配送', '取件地点南区宿舍，送到北区实验楼。', '南区宿舍', '北区实验楼', 5.00, 'waiting_accept', NULL, NULL, '2026-06-12 09:30:00', '2026-06-12 09:30:00'),
  (203, 1, 6, '东区到图书馆资料代取', '帮忙到东区打印店取资料并送到图书馆二楼。', '东区打印店', '图书馆二楼', 12.00, 'confirmed', '2026-06-11 19:00:00', '2026-06-11 19:40:00', '2026-06-11 18:50:00', '2026-06-11 20:00:00');

INSERT INTO errand_events
  (errand_id, from_status, to_status, operator_id, note, created_at)
VALUES
  (202, NULL, 'waiting_accept', 1, '用户发布跑腿配送任务', '2026-06-12 09:30:00'),
  (203, NULL, 'waiting_accept', 1, '用户发布跑腿配送任务', '2026-06-11 18:50:00'),
  (203, 'waiting_accept', 'accepted', 6, '骑手接单', '2026-06-11 19:00:00'),
  (203, 'accepted', 'processing', 6, '骑手开始配送', '2026-06-11 19:12:00'),
  (203, 'processing', 'completed', 6, '骑手完成配送', '2026-06-11 19:40:00'),
  (203, 'completed', 'confirmed', 1, '发布者确认完成', '2026-06-11 20:00:00');

INSERT INTO orders
  (order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot, amount, status, remark, paid_at, completed_at, created_at, updated_at)
VALUES
  ('CT202606100001', 7, 2, 'goods', 101, JSON_OBJECT('title', '九成新高数教材与习题册', 'price', 26.00, 'location', '北区宿舍'), 26.00, 'completed', '历史成交评价记录', '2026-06-10 19:00:00', '2026-06-10 20:20:00', '2026-06-10 18:58:00', '2026-06-10 20:20:00'),
  ('CT202606120001', 1, 2, 'goods', 101, JSON_OBJECT('title', '九成新高数教材与习题册', 'price', 26.00, 'location', '北区宿舍'), 26.00, 'paid', '今晚北区宿舍楼下交易', '2026-06-12 09:50:00', NULL, '2026-06-12 09:48:00', '2026-06-12 09:50:00'),
  ('CT202606120002', 1, 3, 'goods', 102, JSON_OBJECT('title', '蓝牙键盘 低噪轻薄款', 'price', 58.00, 'location', '图书馆门口'), 58.00, 'refunding', '描述与实物不符，申请售后', '2026-06-12 10:00:00', NULL, '2026-06-12 09:58:00', '2026-06-12 10:40:00'),
  ('SV202606120001', 1, 5, 'service', 201, JSON_OBJECT('title', '资料整理与打印代办', 'price', 6.00, 'provider', '文印小站'), 6.00, 'paid', '晚自习后交付', '2026-06-12 09:10:00', NULL, '2026-06-12 09:08:00', '2026-06-12 09:10:00'),
  ('ER202606110001', 1, 6, 'errand', 203, JSON_OBJECT('title', '东区到图书馆资料代取', 'price', 12.00, 'rider', '跑腿同学'), 12.00, 'completed', '跑腿任务完成', '2026-06-11 18:50:00', '2026-06-11 20:00:00', '2026-06-11 18:50:00', '2026-06-11 20:00:00');

INSERT INTO order_events
  (order_sn, from_status, to_status, operator_id, event_type, note, created_at)
VALUES
  ('CT202606100001', NULL, 'unpaid', 7, 'create', '创建订单', '2026-06-10 18:58:00'),
  ('CT202606100001', 'unpaid', 'paid', 7, 'pay', '买家支付，资金托管', '2026-06-10 19:00:00'),
  ('CT202606100001', 'paid', 'completed', 7, 'receive', '买家确认收货，资金结算', '2026-06-10 20:20:00'),
  ('CT202606120001', NULL, 'unpaid', 1, 'create', '创建订单', '2026-06-12 09:48:00'),
  ('CT202606120001', 'unpaid', 'paid', 1, 'pay', '买家支付，资金托管', '2026-06-12 09:50:00'),
  ('CT202606120002', NULL, 'unpaid', 1, 'create', '创建订单', '2026-06-12 09:58:00'),
  ('CT202606120002', 'unpaid', 'paid', 1, 'pay', '买家支付，资金托管', '2026-06-12 10:00:00'),
  ('CT202606120002', 'paid', 'refunding', 1, 'refund_apply', '买家发起售后：描述与实物不符', '2026-06-12 10:40:00'),
  ('SV202606120001', NULL, 'unpaid', 1, 'create', '预约服务', '2026-06-12 09:08:00'),
  ('SV202606120001', 'unpaid', 'paid', 1, 'pay', '服务费托管', '2026-06-12 09:10:00'),
  ('ER202606110001', NULL, 'paid', 1, 'errand_pay', '跑腿费托管', '2026-06-11 18:50:00'),
  ('ER202606110001', 'paid', 'completed', 1, 'errand_confirm', '发布者确认完成，收益结算', '2026-06-11 20:00:00');

INSERT INTO order_funds
  (order_sn, amount, status, frozen_at, settled_at, refunded_at, created_at, updated_at)
VALUES
  ('CT202606100001', 26.00, 'settled', '2026-06-10 19:00:00', '2026-06-10 20:20:00', NULL, '2026-06-10 19:00:00', '2026-06-10 20:20:00'),
  ('CT202606120001', 26.00, 'frozen', '2026-06-12 09:50:00', NULL, NULL, '2026-06-12 09:50:00', '2026-06-12 09:50:00'),
  ('CT202606120002', 58.00, 'frozen', '2026-06-12 10:00:00', NULL, NULL, '2026-06-12 10:00:00', '2026-06-12 10:40:00'),
  ('SV202606120001', 6.00, 'frozen', '2026-06-12 09:10:00', NULL, NULL, '2026-06-12 09:10:00', '2026-06-12 09:10:00'),
  ('ER202606110001', 12.00, 'settled', '2026-06-11 18:50:00', '2026-06-11 20:00:00', NULL, '2026-06-11 18:50:00', '2026-06-11 20:00:00');

INSERT INTO wallet_logs
  (id, user_id, order_sn, type, direction, amount, balance_after, title, note, created_at)
VALUES
  (1, 1, NULL, 'recharge', 'in', 128.60, 128.60, '账户充值', '小程序账户充值', '2026-06-12 09:00:00'),
  (2, 1, 'CT202606120001', 'pay', 'out', 26.00, 102.60, '支付订单 CT202606120001', '资金进入订单托管账户', '2026-06-12 09:50:00'),
  (3, 1, 'CT202606120002', 'pay', 'out', 58.00, 44.60, '支付订单 CT202606120002', '资金进入订单托管账户', '2026-06-12 10:00:00'),
  (4, 1, 'SV202606120001', 'pay', 'out', 6.00, 38.60, '预约服务 SV202606120001', '服务费进入订单托管账户', '2026-06-12 09:10:00'),
  (5, 6, 'ER202606110001', 'income', 'in', 12.00, 12.00, '跑腿收益 ER202606110001', '发布者确认完成后结算', '2026-06-11 20:00:00'),
  (6, 7, 'CT202606100001', 'pay', 'out', 26.00, 20.00, '支付订单 CT202606100001', '历史成交扣款流水', '2026-06-10 19:00:00'),
  (7, 2, 'CT202606100001', 'income', 'in', 26.00, 46.00, '订单收入 CT202606100001', '历史成交结算流水', '2026-06-10 20:20:00');

INSERT INTO refund_requests
  (id, order_sn, applicant_id, seller_id, reason, evidence_urls, status, seller_reply, admin_id, arbitrate_result, resolved_at, created_at, updated_at)
VALUES
  (1, 'CT202606120002', 1, 3, '描述与实物不符，键盘部分按键不灵敏。', JSON_ARRAY('/uploads/evidence/keyboard-issue.jpg'), 'arbitrating', '卖家表示可现场复验', 99, NULL, NULL, '2026-06-12 10:40:00', '2026-06-12 10:45:00');

INSERT INTO withdraw_requests
  (id, user_id, amount, reason, status, reviewer_id, review_note, reviewed_at, created_at, updated_at)
VALUES
  (301, 6, 12.00, '跑腿收益提现', 'pending', NULL, NULL, NULL, '2026-06-12 09:35:00', '2026-06-12 09:35:00');

INSERT INTO conversations
  (id, session_type, business_type, business_id, user_a_id, user_b_id, last_message_at, created_at)
VALUES
  (1, 'goods_chat', 'goods', 101, 1, 2, '2026-06-12 20:12:00', '2026-06-12 20:10:00'),
  (2, 'goods_chat', 'goods', 102, 1, 3, '2026-06-12 10:42:00', '2026-06-12 10:35:00');

INSERT INTO messages
  (id, conversation_id, sender_id, receiver_id, message_type, content, content_hash, previous_hash, status, created_at)
VALUES
  (1, 1, 2, 1, 'text', '教材还在，可以今天晚上北区宿舍楼下交易。', SHA2('教材还在，可以今天晚上北区宿舍楼下交易。', 256), NULL, 'normal', '2026-06-12 20:10:00'),
  (2, 1, 1, 2, 'text', '好的，我下单后过去拿。', SHA2('好的，我下单后过去拿。', 256), SHA2('教材还在，可以今天晚上北区宿舍楼下交易。', 256), 'normal', '2026-06-12 20:12:00'),
  (3, 2, 1, 3, 'text', '键盘按键和描述不一致，我已经申请售后。', SHA2('键盘按键和描述不一致，我已经申请售后。', 256), NULL, 'normal', '2026-06-12 10:42:00');

INSERT INTO favorites
  (id, user_id, target_type, target_id, created_at)
VALUES
  (1, 1, 'goods', 102, '2026-06-12 09:25:00'),
  (2, 7, 'goods', 101, '2026-06-11 19:00:00');

INSERT INTO comments
  (id, order_sn, evaluator_id, target_user_id, target_type, target_id, score, content, status, created_at)
VALUES
  (1, 'CT202606100001', 7, 2, 'goods', 101, 5, '教材保存很好，交易也准时。', 'normal', '2026-06-10 20:30:00');

INSERT INTO ai_audit_records
  (id, target_type, target_id, audit_type, provider, request_id, risk_level, reason, raw_result, created_at)
VALUES
  (1, 'goods', 101, 'text_audit', 'mock-ai', 'ai-20260612-0001', 'pass', '文本未命中风险词，图片清晰。', JSON_OBJECT('score', 0.98, 'tags', JSON_ARRAY('教材', '笔记')), '2026-06-12 09:20:00'),
  (2, 'goods', 104, 'text_audit', 'mock-ai', 'ai-20260612-0002', 'manual', '命中人工复核规则。', JSON_OBJECT('score', 0.62, 'keywords', JSON_ARRAY('违规')), '2026-06-12 09:18:00'),
  (3, 'goods', 104, 'recommend_tags', 'mock-ai', 'ai-20260612-0003', 'pass', '生成商品标签建议。', JSON_OBJECT('tags', JSON_ARRAY('生活用品', '待复核')), '2026-06-12 09:18:10');

INSERT INTO ai_rules
  (id, rule_name, text_audit_enabled, image_audit_enabled, manual_risk_level, keywords, updated_by, created_at, updated_at)
VALUES
  (1, 'default_publish_audit', 1, 1, 'manual', '违规,仿冒,危险品', 99, '2026-06-12 09:00:00', '2026-06-12 09:00:00');

INSERT INTO admin_audit_logs
  (id, admin_id, action, target_type, target_id, before_data, after_data, reason, ip_address, created_at)
VALUES
  (1, NULL, 'AI审核通过', 'goods', '101', NULL, JSON_OBJECT('status', 'on_sale'), '系统文本与图片审核通过', '127.0.0.1', '2026-06-12 09:20:00'),
  (2, NULL, '售后申请进入仲裁池', 'order', 'CT202606120002', JSON_OBJECT('status', 'paid'), JSON_OBJECT('status', 'refunding'), '买家提交售后申请', '127.0.0.1', '2026-06-12 10:40:00'),
  (3, 99, '封禁用户', 'user', '4', JSON_OBJECT('status', 'active', 'credit_score', 98), JSON_OBJECT('status', 'banned', 'credit_score', 58), '发布违规信息并拒绝整改', '127.0.0.1', '2026-06-12 09:40:00');

INSERT INTO job_logs
  (id, job_name, status, scanned_count, success_count, fail_count, message, started_at, finished_at, created_at)
VALUES
  (1, 'seed_data_loaded', 'success', 1, 1, 0, '基础数据已装载', '2026-06-12 10:45:00', '2026-06-12 10:45:01', '2026-06-12 10:45:01');

INSERT INTO idempotency_keys
  (id, user_id, idempotency_key, request_path, request_hash, response_code, response_body, status, locked_until, created_at, updated_at)
VALUES
  (1, 1, 'demo-pay-CT202606120001', '/api/order/pay', SHA2('CT202606120001:1', 256), 200, JSON_OBJECT('order_sn', 'CT202606120001', 'status', 'paid'), 'success', NULL, '2026-06-12 09:50:00', '2026-06-12 09:50:01'),
  (2, 1, 'demo-refund-CT202606120002', '/api/order/refund', SHA2('CT202606120002:reason', 256), 200, JSON_OBJECT('order_sn', 'CT202606120002', 'status', 'refunding'), 'success', NULL, '2026-06-12 10:40:00', '2026-06-12 10:40:01');

INSERT INTO notifications
  (id, user_id, business_type, business_id, title, content, is_read, created_at, read_at)
VALUES
  (1, 1, 'order', 'CT202606120001', '订单已支付', '资金已进入平台托管，等待卖家履约。', 0, '2026-06-12 09:50:00', NULL),
  (2, 2, 'order', 'CT202606120001', '你有新的订单', '买家已支付，请按约定时间交付商品。', 0, '2026-06-12 09:50:00', NULL),
  (3, 1, 'refund', 'CT202606120002', '售后已进入仲裁', '平台管理员将根据订单与聊天证据处理。', 1, '2026-06-12 10:45:00', '2026-06-12 10:46:00');

INSERT INTO stats_daily
  (stat_date, total_users, active_users, goods_on_sale, order_count, total_amount, abnormal_order_count, created_at, updated_at)
VALUES
  ('2026-06-12', 8, 7, 3, 3, 90.00, 0, '2026-06-12 10:50:00', '2026-06-12 10:50:00');
