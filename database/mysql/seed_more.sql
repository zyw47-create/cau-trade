-- Campus Trade Mini Program - clean additional demo data.
-- Run after schema.sql, seed.sql, views_and_routines.sql and business_procedures.sql.

USE campus_trade;
SET NAMES utf8mb4;

INSERT INTO users
  (id, openid, student_id_enc, real_name_enc, college, nickname, username, avatar_url, phone_enc, address, role, status, is_verified, credit_score, balance, frozen_balance, created_at, updated_at)
VALUES
  (8, 'mock-openid-008', 'enc:20230008', 'enc:english-user', '外国语学院', '外语学院同学', 'english_lin', '', 'enc:13800000008', '外语楼', 'user', 'active', 1, 95, 36.00, 0.00, '2026-06-08 09:00:00', NOW()),
  (9, 'mock-openid-009', 'enc:20230009', 'enc:north-helper', '信息学院', '北区服务号', 'north_helper', '', 'enc:13800000009', '北区综合楼', 'provider', 'active', 1, 94, 18.00, 0.00, '2026-06-08 10:00:00', NOW()),
  (10, 'mock-openid-010', 'enc:20230010', 'enc:bio-user', '生物学院', '生院同学', 'bio_sun', '', 'enc:13800000010', '西区宿舍', 'user', 'active', 1, 93, 24.00, 0.00, '2026-06-09 10:00:00', NOW())
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  username = VALUES(username),
  role = VALUES(role),
  status = VALUES(status),
  is_verified = VALUES(is_verified),
  credit_score = VALUES(credit_score),
  balance = VALUES(balance),
  updated_at = NOW();

INSERT INTO user_profiles
  (user_id, campus_area, major, grade_label, bio, response_time_minutes, last_active_at, trade_tags, completed_trade_count, good_rate_snapshot, created_at, updated_at)
VALUES
  (8, '外语楼', '英语', '2022级', '常出四六级资料和考试耳机，支持现场测试。', 20, '2026-06-12 19:05:00', JSON_ARRAY('考试用品', '支持测试', '描述准确'), 4, 95.00, '2026-06-08 09:00:00', NOW()),
  (9, '北区综合楼', '校园服务', '服务号', '提供简历排版、打印和基础材料整理。', 10, '2026-06-12 19:12:00', JSON_ARRAY('服务者认证', '简历排版', '北区交付'), 5, 100.00, '2026-06-08 10:00:00', NOW()),
  (10, '西区宿舍', '生物科学', '2021级', '实验课资料、生活用品和校园跑腿需求较多。', 25, '2026-06-12 18:50:00', JSON_ARRAY('实验资料', '准时交易', '沟通清楚'), 3, 96.00, '2026-06-09 10:00:00', NOW())
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

INSERT IGNORE INTO user_verifications
  (id, user_id, student_id_enc, real_name_enc, college, student_card_image_url, ocr_match_score, status, reviewer_id, review_note, reviewed_at, created_at)
VALUES
  (8, 8, 'enc:20230008', 'enc:english-user', '外国语学院', '/uploads/verify/20230008.jpg', 96.00, 'approved', 99, '邮箱与学生信息一致', '2026-06-10 10:00:00', '2026-06-10 09:50:00'),
  (9, 9, 'enc:20230009', 'enc:north-helper', '信息学院', '/uploads/verify/20230009.jpg', 95.50, 'approved', 99, '服务者实名审核通过', '2026-06-10 10:20:00', '2026-06-10 10:10:00'),
  (10, 10, 'enc:20230010', 'enc:bio-user', '生物学院', '/uploads/verify/20230010.jpg', 94.80, 'approved', 99, '实名审核通过', '2026-06-10 10:40:00', '2026-06-10 10:30:00');

INSERT INTO goods
  (id, seller_id, category_id, title, price, condition_level, description, images, location, status, audit_note, is_ai_generated, favorite_count, view_count, created_at, updated_at)
VALUES
  (105, 2, 1, '考研政治资料与网课讲义', 35.00, '八成新', '资料按章节整理，重点页有标注，适合暑假复习。', JSON_ARRAY('/uploads/goods/postgrad-politics.jpg'), '图书馆二楼', 'on_sale', 'AI审核通过', 0, 11, 88, '2026-06-12 13:20:00', NOW()),
  (106, 3, 3, '宿舍小台灯 可调亮度', 22.00, '九成新', '三档亮度，晚自习和宿舍桌面都能用。', JSON_ARRAY('/uploads/goods/desk-lamp.jpg'), '东区操场', 'on_sale', 'AI审核通过', 0, 6, 54, '2026-06-12 13:30:00', NOW()),
  (107, 1, 4, '自用羽毛球拍 单拍带拍套', 45.00, '八成新', '拍框无裂，线还有弹性，适合体育课和日常练习。', JSON_ARRAY('/uploads/goods/badminton.jpg'), '体育馆门口', 'on_sale', 'AI审核通过', 0, 4, 37, '2026-06-12 14:00:00', NOW()),
  (108, 1, 2, '闲置计算器 考试可用款', 30.00, '七成新', '功能正常，因暂不出售已下架。', JSON_ARRAY('/uploads/goods/calculator.jpg'), '软件学院楼下', 'removed', '卖家主动下架', 0, 2, 21, '2026-06-12 14:10:00', NOW()),
  (109, 8, 2, '四六级听力耳机', 28.00, '八成新', '学校考试频段可用，外壳有轻微使用痕迹。', JSON_ARRAY('/uploads/goods/cet-headset.jpg'), '外语楼大厅', 'on_sale', 'AI审核通过', 0, 9, 63, '2026-06-12 15:10:00', NOW()),
  (110, 7, 3, '宿舍床上小书桌', 32.00, '九成新', '桌腿稳定，可折叠，适合宿舍学习和放电脑。', JSON_ARRAY('/uploads/goods/bed-desk.jpg'), '东区宿舍', 'on_sale', 'AI审核通过', 0, 5, 41, '2026-06-12 15:20:00', NOW()),
  (111, 2, 1, '校园笔记与答案汇编', 14.00, '九成新', '适合复习阶段，含章节提纲和重点题型整理。', JSON_ARRAY('/uploads/goods/study-notes.jpg'), '北区宿舍', 'on_sale', 'AI审核通过', 0, 12, 66, '2026-06-12 16:20:00', NOW()),
  (112, 7, 1, '数理统计公式补充卡', 20.00, '八成新', '公式标注明细完整，适合考前速记。', JSON_ARRAY('/uploads/goods/formula-sheet.jpg'), '图书馆二楼', 'on_sale', 'AI审核通过', 0, 7, 34, '2026-06-12 16:30:00', NOW()),
  (113, 8, 2, '电脑小杂件收纳盒', 16.00, '八成新', '充电线、耳机线、优盘等分类收纳。', JSON_ARRAY('/uploads/goods/accessory-box.jpg'), '外语楼大厅', 'on_sale', 'AI审核通过', 0, 5, 29, '2026-06-12 16:35:00', NOW()),
  (114, 1, 4, '羽毛球训练拍袋', 12.00, '九成新', '适合运动队和日常训练使用，背带完好。', JSON_ARRAY('/uploads/goods/ball-bag.jpg'), '体育馆门口', 'on_sale', 'AI审核通过', 0, 3, 18, '2026-06-12 16:40:00', NOW()),
  (115, 3, 3, '床上小桌组合板', 38.00, '八成新', '桌面可翻转，可放笔记本和电脑。', JSON_ARRAY('/uploads/goods/bed-table.jpg'), '东区宿舍', 'on_sale', 'AI审核通过', 0, 6, 25, '2026-06-12 16:45:00', NOW()),
  (121, 2, 1, '概率论复习讲义', 19.00, '九成新', '重点章节有标注，适合期末刷题。', JSON_ARRAY('/uploads/goods/probability-notes.jpg'), '北区教学楼', 'on_sale', 'AI审核通过', 0, 10, 51, '2026-06-12 17:40:00', NOW()),
  (122, 3, 2, 'Type-C 扩展坞', 42.00, '八成新', 'HDMI、USB 和读卡口正常，支持现场验货。', JSON_ARRAY('/uploads/goods/typec-hub.jpg'), '图书馆门口', 'on_sale', 'AI审核通过', 0, 13, 72, '2026-06-12 17:45:00', NOW()),
  (123, 7, 3, '宿舍折叠衣架一组', 10.00, '九成新', '搬宿舍闲置，适合阳台晾晒。', JSON_ARRAY('/uploads/goods/clothes-rack.jpg'), '东区宿舍', 'on_sale', 'AI审核通过', 0, 4, 23, '2026-06-12 17:50:00', NOW()),
  (124, 8, 2, '四六级收音机备用电池套装', 15.00, '全新', '考试备用电池，未拆封。', JSON_ARRAY('/uploads/goods/battery-set.jpg'), '外语楼大厅', 'on_sale', 'AI审核通过', 0, 8, 37, '2026-06-12 17:55:00', NOW()),
  (125, 1, 4, '瑜伽垫厚款', 25.00, '八成新', '适合体育课和宿舍拉伸，表面已清洁。', JSON_ARRAY('/uploads/goods/yoga-mat.jpg'), '体育馆门口', 'on_sale', 'AI审核通过', 0, 6, 31, '2026-06-12 18:00:00', NOW())
ON DUPLICATE KEY UPDATE
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
  updated_at = NOW();

INSERT INTO services
  (id, provider_id, category_id, title, price, description, images, status, avg_score, created_at, updated_at)
VALUES
  (203, 7, 7, 'Python 作业思路辅导', 18.00, '讲解作业思路、调试报错和基础语法，不代写。', JSON_ARRAY('/uploads/services/python-help.jpg'), 'on_sale', 4.80, '2026-06-12 15:30:00', NOW()),
  (204, 9, 5, '简历排版与打印', 10.00, '提供简历格式整理、黑白打印和装订。', JSON_ARRAY('/uploads/services/resume-print.jpg'), 'on_sale', 4.90, '2026-06-12 15:40:00', NOW()),
  (205, 9, 5, '新学期课表资料整理', 9.00, '可按学期、时间和课程分类整理课表及资料。', JSON_ARRAY('/uploads/services/schedule-organize.jpg'), 'on_sale', 4.70, '2026-06-12 16:50:00', NOW()),
  (206, 5, 5, '图书馆陪学半小时', 8.00, '适合需要自习陪伴和督促打卡的同学。', JSON_ARRAY('/uploads/services/library-study.jpg'), 'on_sale', 4.90, '2026-06-12 16:55:00', NOW()),
  (207, 7, 7, 'C 和 Python 基础辅导', 22.00, '提供课后思路讲解、报错定位和基础答疑。', JSON_ARRAY('/uploads/services/c-tutoring.jpg'), 'on_sale', 4.85, '2026-06-12 16:58:00', NOW()),
  (208, 8, 7, '英语口语配练', 16.00, '口语考试前短时配练，重点练发音和表达。', JSON_ARRAY('/uploads/services/oral-practice.jpg'), 'on_sale', 4.80, '2026-06-12 17:05:00', NOW()),
  (209, 6, 5, '公共材料代打印', 12.00, '支持证件材料、课程讲义和报名材料打印。', JSON_ARRAY('/uploads/services/office-print.jpg'), 'on_sale', 4.75, '2026-06-12 17:10:00', NOW()),
  (210, 9, 5, 'PPT 简洁排版', 18.00, '适合课程展示和答辩前快速整理版式。', JSON_ARRAY('/uploads/services/ppt-layout.jpg'), 'on_sale', 4.88, '2026-06-12 18:10:00', NOW()),
  (211, 7, 7, '数据库 SQL 答疑', 20.00, '讲解表设计、查询语句和简单索引问题。', JSON_ARRAY('/uploads/services/sql-help.jpg'), 'on_sale', 4.86, '2026-06-12 18:15:00', NOW())
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  price = VALUES(price),
  description = VALUES(description),
  images = VALUES(images),
  status = VALUES(status),
  avg_score = VALUES(avg_score),
  updated_at = NOW();

INSERT INTO errand_orders
  (id, publisher_id, rider_id, title, description, pickup_location, delivery_location, fee, status, accepted_at, completed_at, created_at, updated_at)
VALUES
  (204, 3, NULL, '帮取北门外卖送到实验楼', '北门外卖架取餐，送到软件学院实验楼一层。', '北门外卖架', '软件学院实验楼', 4.00, 'waiting_accept', NULL, NULL, '2026-06-12 15:50:00', NOW()),
  (205, 8, 6, '图书馆还书跑腿', '从东区宿舍取两本书，还到图书馆自助还书机。', '东区宿舍', '图书馆', 6.00, 'accepted', '2026-06-12 16:05:00', NULL, '2026-06-12 16:00:00', NOW()),
  (206, 1, 6, '北区快递取件送宿舍', '快递柜取件后送到东区宿舍楼下。', '北区快递柜', '东区宿舍', 6.00, 'accepted', '2026-06-12 17:25:00', NULL, '2026-06-12 17:20:00', NOW()),
  (207, 2, 6, '帮买食堂晚饭', '购买两份晚饭并送至图书馆门口。', '南区食堂', '图书馆门口', 8.00, 'accepted', '2026-06-12 17:25:00', NULL, '2026-06-12 17:22:00', NOW()),
  (208, 7, NULL, '打印并送达教室', '打印三页课程资料并送到教学楼A302。', '北区打印店', '教学楼A302', 4.00, 'waiting_accept', NULL, NULL, '2026-06-12 17:30:00', NOW()),
  (209, 8, 6, '外语楼到北区送资料', '帮忙把资料袋送到北区实验楼前台。', '外语楼大厅', '北区实验楼', 7.00, 'processing', '2026-06-12 18:05:00', NULL, '2026-06-12 18:00:00', NOW())
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  pickup_location = VALUES(pickup_location),
  delivery_location = VALUES(delivery_location),
  fee = VALUES(fee),
  status = VALUES(status),
  rider_id = VALUES(rider_id),
  accepted_at = VALUES(accepted_at),
  updated_at = NOW();

INSERT INTO orders
  (order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot, amount, status, remark, paid_at, completed_at, created_at, updated_at)
VALUES
  ('CT202606120005', 1, 8, 'goods', 109, JSON_OBJECT('title', '四六级听力耳机', 'price', 28.00, 'location', '外语楼大厅'), 28.00, 'unpaid', '待支付演示订单', NULL, NULL, '2026-06-12 19:05:00', NOW()),
  ('CT202606120006', 1, 7, 'goods', 110, JSON_OBJECT('title', '宿舍床上小书桌', 'price', 32.00, 'location', '东区宿舍'), 32.00, 'paid', '买家已支付，等待卖家确认', '2026-06-12 19:12:00', NULL, '2026-06-12 19:10:00', NOW()),
  ('CT202606120007', 3, 8, 'goods', 113, JSON_OBJECT('title', '电脑小杂件收纳盒', 'price', 16.00, 'location', '外语楼大厅'), 16.00, 'confirmed', '卖家已确认，待发货', '2026-06-12 19:25:00', NULL, '2026-06-12 19:22:00', NOW()),
  ('CT202606120008', 3, 2, 'goods', 111, JSON_OBJECT('title', '校园笔记与答案汇编', 'price', 14.00, 'location', '北区宿舍'), 14.00, 'shipped', '卖家已交付，等待买家确认收货', '2026-06-12 19:38:00', NULL, '2026-06-12 19:35:00', NOW()),
  ('CT202606120003', 1, 2, 'goods', 105, JSON_OBJECT('title', '考研政治资料与网课讲义', 'price', 35.00, 'location', '图书馆二楼'), 35.00, 'completed', '资料当面验收完成', '2026-06-12 14:30:00', '2026-06-12 15:00:00', '2026-06-12 14:28:00', NOW()),
  ('CT202606120004', 3, 1, 'goods', 107, JSON_OBJECT('title', '自用羽毛球拍 单拍带拍套', 'price', 45.00, 'location', '体育馆门口'), 45.00, 'completed', '体育馆当面交易完成', '2026-06-12 18:50:00', '2026-06-12 19:20:00', '2026-06-12 18:48:00', NOW()),
  ('SV202606120002', 3, 9, 'service', 204, JSON_OBJECT('title', '简历排版与打印', 'price', 10.00, 'provider', '北区服务号'), 10.00, 'paid', '预约简历打印服务', '2026-06-12 16:00:00', NULL, '2026-06-12 15:58:00', NOW()),
  ('SV202606120003', 1, 7, 'service', 211, JSON_OBJECT('title', '数据库 SQL 答疑', 'price', 20.00, 'provider', '信工同学'), 20.00, 'confirmed', '服务者已确认，今晚线上沟通', '2026-06-12 18:20:00', NULL, '2026-06-12 18:18:00', NOW()),
  ('SV202606120004', 1, 9, 'service', 210, JSON_OBJECT('title', 'PPT 简洁排版', 'price', 18.00, 'provider', '北区服务号'), 18.00, 'shipped', '服务者已开始处理，等待用户确认', '2026-06-12 18:40:00', NULL, '2026-06-12 18:36:00', NOW()),
  ('ER202606120005', 3, 99, 'errand', 204, JSON_OBJECT('title', '帮取北门外卖送到实验楼', 'price', 4.00, 'pickup_location', '北门外卖架', 'delivery_location', '软件学院实验楼'), 4.00, 'paid', '跑腿费已托管，等待骑手接单', '2026-06-12 15:52:00', NULL, '2026-06-12 15:50:00', NOW()),
  ('ER202606120006', 8, 6, 'errand', 205, JSON_OBJECT('title', '图书馆还书跑腿', 'price', 6.00, 'rider', '跑腿同学'), 6.00, 'confirmed', '骑手已接单，等待开始配送', '2026-06-12 16:02:00', NULL, '2026-06-12 16:00:00', NOW()),
  ('ER202606120003', 1, 6, 'errand', 206, JSON_OBJECT('title', '北区快递取件送宿舍', 'price', 6.00, 'rider', '跑腿同学'), 6.00, 'confirmed', '骑手已接单，等待开始配送', '2026-06-12 17:20:00', NULL, '2026-06-12 17:20:00', NOW()),
  ('ER202606120007', 2, 6, 'errand', 207, JSON_OBJECT('title', '帮买食堂晚饭', 'price', 8.00, 'rider', '跑腿同学'), 8.00, 'confirmed', '骑手已接单，等待开始配送', '2026-06-12 17:24:00', NULL, '2026-06-12 17:22:00', NOW()),
  ('ER202606120008', 7, 99, 'errand', 208, JSON_OBJECT('title', '打印并送达教室', 'price', 4.00, 'pickup_location', '北区打印店', 'delivery_location', '教学楼A302'), 4.00, 'paid', '跑腿费已托管，等待骑手接单', '2026-06-12 17:32:00', NULL, '2026-06-12 17:30:00', NOW()),
  ('ER202606120004', 8, 6, 'errand', 209, JSON_OBJECT('title', '外语楼到北区送资料', 'price', 7.00, 'rider', '跑腿同学'), 7.00, 'shipped', '骑手配送中', '2026-06-12 18:05:00', NULL, '2026-06-12 18:00:00', NOW())
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  remark = VALUES(remark),
  paid_at = VALUES(paid_at),
  completed_at = VALUES(completed_at),
  updated_at = NOW();

INSERT IGNORE INTO order_funds
  (order_sn, amount, status, frozen_at, settled_at, refunded_at, created_at, updated_at)
VALUES
  ('CT202606120006', 32.00, 'frozen', '2026-06-12 19:12:00', NULL, NULL, '2026-06-12 19:12:00', NOW()),
  ('CT202606120007', 16.00, 'frozen', '2026-06-12 19:25:00', NULL, NULL, '2026-06-12 19:25:00', NOW()),
  ('CT202606120008', 14.00, 'frozen', '2026-06-12 19:38:00', NULL, NULL, '2026-06-12 19:38:00', NOW()),
  ('CT202606120003', 35.00, 'settled', '2026-06-12 14:30:00', '2026-06-12 15:00:00', NULL, '2026-06-12 14:30:00', NOW()),
  ('CT202606120004', 45.00, 'settled', '2026-06-12 18:50:00', '2026-06-12 19:20:00', NULL, '2026-06-12 18:50:00', NOW()),
  ('SV202606120002', 10.00, 'frozen', '2026-06-12 16:00:00', NULL, NULL, '2026-06-12 16:00:00', NOW()),
  ('SV202606120003', 20.00, 'frozen', '2026-06-12 18:20:00', NULL, NULL, '2026-06-12 18:20:00', NOW()),
  ('SV202606120004', 18.00, 'frozen', '2026-06-12 18:40:00', NULL, NULL, '2026-06-12 18:40:00', NOW()),
  ('ER202606120005', 4.00, 'frozen', '2026-06-12 15:52:00', NULL, NULL, '2026-06-12 15:52:00', NOW()),
  ('ER202606120006', 6.00, 'frozen', '2026-06-12 16:02:00', NULL, NULL, '2026-06-12 16:02:00', NOW()),
  ('ER202606120003', 6.00, 'frozen', '2026-06-12 17:20:00', NULL, NULL, '2026-06-12 17:20:00', NOW()),
  ('ER202606120007', 8.00, 'frozen', '2026-06-12 17:24:00', NULL, NULL, '2026-06-12 17:24:00', NOW()),
  ('ER202606120008', 4.00, 'frozen', '2026-06-12 17:32:00', NULL, NULL, '2026-06-12 17:32:00', NOW()),
  ('ER202606120004', 7.00, 'frozen', '2026-06-12 18:05:00', NULL, NULL, '2026-06-12 18:05:00', NOW());

INSERT IGNORE INTO order_events
  (order_sn, from_status, to_status, operator_id, event_type, note, created_at)
VALUES
  ('CT202606120005', NULL, 'unpaid', 1, 'create', '创建二手商品订单', '2026-06-12 19:05:00'),
  ('CT202606120006', NULL, 'unpaid', 1, 'create', '创建二手商品订单', '2026-06-12 19:10:00'),
  ('CT202606120006', 'unpaid', 'paid', 1, 'pay', '买家支付，资金托管，等待卖家确认', '2026-06-12 19:12:00'),
  ('CT202606120007', NULL, 'unpaid', 3, 'create', '创建二手商品订单', '2026-06-12 19:22:00'),
  ('CT202606120007', 'unpaid', 'paid', 3, 'pay', '买家支付，资金托管', '2026-06-12 19:25:00'),
  ('CT202606120007', 'paid', 'confirmed', 8, 'seller_confirm', '卖家确认订单', '2026-06-12 19:28:00'),
  ('CT202606120008', NULL, 'unpaid', 3, 'create', '创建二手商品订单', '2026-06-12 19:35:00'),
  ('CT202606120008', 'unpaid', 'paid', 3, 'pay', '买家支付，资金托管', '2026-06-12 19:38:00'),
  ('CT202606120008', 'paid', 'confirmed', 2, 'seller_confirm', '卖家确认订单', '2026-06-12 19:42:00'),
  ('CT202606120008', 'confirmed', 'shipped', 2, 'ship', '卖家已当面交付，等待买家确认', '2026-06-12 19:48:00'),
  ('CT202606120003', NULL, 'unpaid', 1, 'create', '创建二手商品订单', '2026-06-12 14:28:00'),
  ('CT202606120003', 'unpaid', 'paid', 1, 'pay', '买家支付，资金托管', '2026-06-12 14:30:00'),
  ('CT202606120003', 'paid', 'completed', 1, 'receive', '买家确认收货，资金结算', '2026-06-12 15:00:00'),
  ('CT202606120004', NULL, 'unpaid', 3, 'create', '创建二手商品订单', '2026-06-12 18:48:00'),
  ('CT202606120004', 'unpaid', 'paid', 3, 'pay', '买家支付，资金托管', '2026-06-12 18:50:00'),
  ('CT202606120004', 'paid', 'completed', 3, 'receive', '买家确认收货，资金结算', '2026-06-12 19:20:00'),
  ('SV202606120002', NULL, 'unpaid', 3, 'create', '创建服务预约订单', '2026-06-12 15:58:00'),
  ('SV202606120002', 'unpaid', 'paid', 3, 'pay', '服务费用进入平台托管', '2026-06-12 16:00:00'),
  ('SV202606120003', NULL, 'unpaid', 1, 'create', '创建服务预约订单', '2026-06-12 18:18:00'),
  ('SV202606120003', 'unpaid', 'paid', 1, 'pay', '服务费用进入平台托管', '2026-06-12 18:20:00'),
  ('SV202606120003', 'paid', 'confirmed', 7, 'seller_confirm', '服务者确认预约', '2026-06-12 18:24:00'),
  ('SV202606120004', NULL, 'unpaid', 1, 'create', '创建服务预约订单', '2026-06-12 18:36:00'),
  ('SV202606120004', 'unpaid', 'paid', 1, 'pay', '服务费用进入平台托管', '2026-06-12 18:40:00'),
  ('SV202606120004', 'paid', 'confirmed', 9, 'seller_confirm', '服务者确认预约', '2026-06-12 18:42:00'),
  ('SV202606120004', 'confirmed', 'shipped', 9, 'ship', '服务者已开始处理', '2026-06-12 18:48:00'),
  ('ER202606120005', NULL, 'unpaid', 3, 'errand_publish', '发布跑腿任务，等待支付', '2026-06-12 15:50:00'),
  ('ER202606120005', 'unpaid', 'paid', 3, 'pay', '跑腿费用托管，等待骑手接单', '2026-06-12 15:52:00'),
  ('ER202606120006', NULL, 'unpaid', 8, 'errand_publish', '发布跑腿任务，等待支付', '2026-06-12 16:00:00'),
  ('ER202606120006', 'unpaid', 'paid', 8, 'pay', '跑腿费用托管，等待骑手接单', '2026-06-12 16:02:00'),
  ('ER202606120006', 'paid', 'confirmed', 6, 'errand_take', '骑手已接单，等待开始配送', '2026-06-12 16:05:00'),
  ('ER202606120003', NULL, 'paid', 1, 'errand_pay', '跑腿费用托管', '2026-06-12 17:20:00'),
  ('ER202606120003', 'paid', 'confirmed', 6, 'errand_take', '骑手已接单，等待开始配送', '2026-06-12 17:25:00'),
  ('ER202606120007', NULL, 'unpaid', 2, 'errand_publish', '发布跑腿任务，等待支付', '2026-06-12 17:22:00'),
  ('ER202606120007', 'unpaid', 'paid', 2, 'pay', '跑腿费用托管，等待骑手接单', '2026-06-12 17:24:00'),
  ('ER202606120007', 'paid', 'confirmed', 6, 'errand_take', '骑手已接单，等待开始配送', '2026-06-12 17:25:00'),
  ('ER202606120008', NULL, 'unpaid', 7, 'errand_publish', '发布跑腿任务，等待支付', '2026-06-12 17:30:00'),
  ('ER202606120008', 'unpaid', 'paid', 7, 'pay', '跑腿费用托管，等待骑手接单', '2026-06-12 17:32:00'),
  ('ER202606120004', NULL, 'paid', 8, 'errand_pay', '跑腿费用托管', '2026-06-12 18:05:00'),
  ('ER202606120004', 'paid', 'confirmed', 6, 'seller_confirm', '骑手接单', '2026-06-12 18:08:00'),
  ('ER202606120004', 'confirmed', 'shipped', 6, 'ship', '骑手开始配送', '2026-06-12 18:12:00');

INSERT IGNORE INTO errand_events
  (errand_id, operator_id, event_type, from_status, to_status, remark, created_at)
VALUES
  (204, 3, 'publish', NULL, 'waiting_accept', '发布取外卖任务', '2026-06-12 15:50:00'),
  (205, 8, 'publish', NULL, 'waiting_accept', '发布还书任务', '2026-06-12 16:00:00'),
  (205, 6, 'take', 'waiting_accept', 'accepted', '跑腿同学接单', '2026-06-12 16:05:00'),
  (206, 1, 'publish', NULL, 'waiting_accept', '发布跑腿任务并托管费用', '2026-06-12 17:20:00'),
  (207, 2, 'publish', NULL, 'waiting_accept', '发布购买晚饭任务', '2026-06-12 17:22:00'),
  (207, 6, 'take', 'waiting_accept', 'accepted', '跑腿同学接单', '2026-06-12 17:25:00'),
  (208, 7, 'publish', NULL, 'waiting_accept', '发布打印送达任务', '2026-06-12 17:30:00'),
  (209, 8, 'publish', NULL, 'waiting_accept', '发布资料配送任务', '2026-06-12 18:00:00'),
  (209, 6, 'take', 'waiting_accept', 'accepted', '跑腿同学接单', '2026-06-12 18:05:00'),
  (209, 6, 'start', 'accepted', 'processing', '开始配送', '2026-06-12 18:12:00');

INSERT IGNORE INTO conversations
  (id, session_type, business_type, business_id, user_a_id, user_b_id, last_message_at, created_at)
VALUES
  (3, 'goods_chat', 'goods', 105, 1, 2, '2026-06-12 18:20:00', '2026-06-12 18:18:00'),
  (4, 'goods_chat', 'goods', 107, 1, 3, '2026-06-12 18:45:00', '2026-06-12 18:40:00'),
  (5, 'goods_chat', 'goods', 109, 1, 8, '2026-06-12 19:05:00', '2026-06-12 19:00:00'),
  (6, 'service_chat', 'service', 204, 1, 9, '2026-06-12 19:12:00', '2026-06-12 19:10:00'),
  (7, 'service_chat', 'service', 204, 3, 9, '2026-06-12 16:05:00', '2026-06-12 15:58:00'),
  (8, 'task_chat', 'errand', 206, 1, 6, '2026-06-12 17:25:00', '2026-06-12 17:20:00'),
  (9, 'service_chat', 'service', 211, 1, 7, '2026-06-12 18:22:00', '2026-06-12 18:18:00'),
  (10, 'goods_chat', 'goods', 122, 1, 3, '2026-06-12 18:30:00', '2026-06-12 18:25:00');

INSERT IGNORE INTO messages
  (id, conversation_id, sender_id, receiver_id, message_type, content, content_hash, previous_hash, status, created_at)
VALUES
  (4, 3, 2, 1, 'text', '资料是今年新版，讲义和错题都在。', SHA2('资料是今年新版，讲义和错题都在。', 256), NULL, 'normal', '2026-06-12 18:20:00'),
  (5, 4, 1, 3, 'text', '羽毛球拍今晚体育馆可以看吗？', SHA2('羽毛球拍今晚体育馆可以看吗？', 256), NULL, 'normal', '2026-06-12 18:40:00'),
  (6, 4, 3, 1, 'text', '可以，拍套也一起给你。', SHA2('可以，拍套也一起给你。', 256), SHA2('羽毛球拍今晚体育馆可以看吗？', 256), 'normal', '2026-06-12 18:45:00'),
  (7, 5, 1, 8, 'text', '听力耳机考试频段稳定吗？', SHA2('听力耳机考试频段稳定吗？', 256), NULL, 'normal', '2026-06-12 19:00:00'),
  (8, 5, 8, 1, 'text', '稳定，去年四六级一直用这个型号。', SHA2('稳定，去年四六级一直用这个型号。', 256), SHA2('听力耳机考试频段稳定吗？', 256), 'normal', '2026-06-12 19:05:00'),
  (9, 6, 1, 9, 'text', '简历今晚能排版并打印两份吗？', SHA2('简历今晚能排版并打印两份吗？', 256), NULL, 'normal', '2026-06-12 19:10:00'),
  (10, 6, 9, 1, 'text', '可以，发文件后半小时内完成。', SHA2('可以，发文件后半小时内完成。', 256), SHA2('简历今晚能排版并打印两份吗？', 256), 'normal', '2026-06-12 19:12:00'),
  (11, 7, 3, 9, 'text', '请问明天中午前可以完成吗？', SHA2('请问明天中午前可以完成吗？', 256), NULL, 'normal', '2026-06-12 15:59:00'),
  (12, 7, 9, 3, 'text', '可以，发文件后半小时内完成。', SHA2('可以，发文件后半小时内完成。', 256), SHA2('请问明天中午前可以完成吗？', 256), 'normal', '2026-06-12 16:00:00'),
  (13, 8, 1, 6, 'text', '快递到了我这边，能帮忙今天送一下吗？', SHA2('快递到了我这边，能帮忙今天送一下吗？', 256), NULL, 'normal', '2026-06-12 17:21:00'),
  (14, 8, 6, 1, 'text', '可以，接单后会先确认取件点。', SHA2('可以，接单后会先确认取件点。', 256), SHA2('快递到了我这边，能帮忙今天送一下吗？', 256), 'normal', '2026-06-12 17:25:00'),
  (15, 9, 1, 7, 'text', 'SQL 作业里的连接查询能讲一下吗？', SHA2('SQL 作业里的连接查询能讲一下吗？', 256), NULL, 'normal', '2026-06-12 18:20:00'),
  (16, 9, 7, 1, 'text', '可以，把表结构发我，我按题目讲。', SHA2('可以，把表结构发我，我按题目讲。', 256), SHA2('SQL 作业里的连接查询能讲一下吗？', 256), 'normal', '2026-06-12 18:22:00'),
  (17, 10, 1, 3, 'text', '扩展坞支持 HDMI 吗？', SHA2('扩展坞支持 HDMI 吗？', 256), NULL, 'normal', '2026-06-12 18:26:00'),
  (18, 10, 3, 1, 'text', '支持，Mac 和 Windows 都试过。', SHA2('支持，Mac 和 Windows 都试过。', 256), SHA2('扩展坞支持 HDMI 吗？', 256), 'normal', '2026-06-12 18:30:00');

INSERT IGNORE INTO conversations
  (id, session_type, business_type, business_id, user_a_id, user_b_id, last_message_at, created_at)
VALUES
  (11, 'goods_chat', 'goods', 110, 1, 7, '2026-06-12 19:18:00', '2026-06-12 19:12:00');

INSERT IGNORE INTO messages
  (id, conversation_id, sender_id, receiver_id, message_type, content, content_hash, previous_hash, status, created_at)
VALUES
  (19, 11, 1, 7, 'text', '小书桌今晚能送到东区宿舍吗？', SHA2('小书桌今晚能送到东区宿舍吗？', 256), NULL, 'normal', '2026-06-12 19:12:00'),
  (20, 11, 7, 1, 'text', '可以，预计二十分钟后到楼下。', SHA2('可以，预计二十分钟后到楼下。', 256), SHA2('小书桌今晚能送到东区宿舍吗？', 256), 'normal', '2026-06-12 19:18:00');

INSERT IGNORE INTO comments
  (id, order_sn, evaluator_id, target_user_id, target_type, target_id, score, content, status, created_at)
VALUES
  (2, 'CT202606120003', 1, 2, 'goods', 105, 5, '资料分类很清楚，适合复习。', 'normal', '2026-06-12 15:02:00'),
  (3, 'CT202606120004', 3, 1, 'goods', 107, 5, '球拍状态不错，线也还能用。', 'normal', '2026-06-12 19:25:00'),
  (4, 'SV202606120001', 1, 5, 'service', 201, 5, '打印装订速度快，交付时间准确。', 'normal', '2026-06-12 16:10:00'),
  (5, 'ER202606110001', 1, 6, 'errand', 203, 5, '跑腿配送及时，过程沟通清楚。', 'normal', '2026-06-11 20:05:00'),
  (6, 'SV202606120002', 3, 9, 'service', 204, 5, '打印排版很快，沟通也清楚。', 'normal', '2026-06-12 16:06:00'),
  (7, 'ER202606120003', 1, 6, 'errand', 206, 5, '跑腿很及时，过程也有反馈。', 'normal', '2026-06-12 17:40:00'),
  (8, 'SV202606120003', 1, 7, 'service', 211, 5, '数据库答疑讲得很清楚。', 'normal', '2026-06-12 18:40:00');

INSERT IGNORE INTO favorites
  (id, user_id, target_type, target_id, created_at)
VALUES
  (3, 1, 'goods', 105, '2026-06-12 14:20:00'),
  (4, 1, 'goods', 106, '2026-06-12 14:25:00'),
  (5, 2, 'goods', 107, '2026-06-12 14:30:00'),
  (6, 1, 'goods', 109, '2026-06-12 15:30:00'),
  (7, 3, 'goods', 110, '2026-06-12 15:36:00'),
  (8, 1, 'goods', 111, '2026-06-12 18:10:00'),
  (9, 1, 'goods', 122, '2026-06-12 18:12:00'),
  (10, 2, 'goods', 125, '2026-06-12 18:15:00'),
  (11, 7, 'goods', 124, '2026-06-12 18:18:00');

INSERT IGNORE INTO wallet_logs
  (id, user_id, order_sn, type, direction, amount, balance_after, title, note, created_at)
VALUES
  (10, 1, 'CT202606120003', 'pay', 'out', 35.00, 26.60, '支付订单 CT202606120003', '资料订单资金托管', '2026-06-12 14:30:00'),
  (11, 2, 'CT202606120003', 'income', 'in', 35.00, 81.00, '订单收入 CT202606120003', '资料订单完成结算', '2026-06-12 15:00:00'),
  (12, 3, 'CT202606120004', 'pay', 'out', 45.00, 77.00, '支付订单 CT202606120004', '球拍订单资金托管', '2026-06-12 18:50:00'),
  (13, 1, 'CT202606120004', 'income', 'in', 45.00, 106.60, '订单收入 CT202606120004', '球拍订单完成结算', '2026-06-12 19:20:00');

INSERT IGNORE INTO notifications
  (id, user_id, business_type, business_id, title, content, is_read, created_at, read_at)
VALUES
  (4, 1, 'goods', '105', '收藏商品有新留言', '卖家回复了考研资料的交易时间。', 0, '2026-06-12 18:21:00', NULL),
  (5, 1, 'system', 'backup-20260612', '平台备份完成', '数据库全量备份与 SHA-256 校验已生成。', 0, '2026-06-12 14:22:00', NULL),
  (6, 1, 'service', '201', '服务预约提醒', '资料整理与打印代办等待服务者确认。', 1, '2026-06-12 16:00:00', '2026-06-12 16:10:00'),
  (7, 1, 'goods', '109', '收藏商品待确认', '外语学院同学回复了四六级听力耳机的频段情况。', 0, '2026-06-12 19:06:00', NULL),
  (8, 6, 'errand', '205', '跑腿任务已接单', '图书馆还书跑腿已进入配送流程。', 0, '2026-06-12 16:06:00', NULL),
  (9, 3, 'service', '204', '服务预约已创建', '简历排版与打印订单已进入待支付状态。', 0, '2026-06-12 15:58:00', NULL),
  (10, 1, 'errand', '206', '跑腿任务待接单', '北区快递取件送宿舍已发布，等待跑腿同学接单。', 0, '2026-06-12 17:20:00', NULL),
  (11, 1, 'service', '211', '服务者已回复', '信工同学回复了数据库 SQL 答疑预约。', 0, '2026-06-12 18:22:00', NULL),
  (12, 3, 'goods', '122', '商品咨询消息', '有人咨询 Type-C 扩展坞是否支持 HDMI。', 0, '2026-06-12 18:30:00', NULL);

INSERT INTO stats_daily
  (stat_date, total_users, active_users, goods_on_sale, order_count, total_amount, abnormal_order_count, created_at, updated_at)
VALUES
  ('2026-06-13', 11, 10, 18, 10, 164.00, 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  total_users = VALUES(total_users),
  active_users = VALUES(active_users),
  goods_on_sale = VALUES(goods_on_sale),
  order_count = VALUES(order_count),
  total_amount = VALUES(total_amount),
  abnormal_order_count = VALUES(abnormal_order_count),
  updated_at = NOW();

INSERT INTO refund_requests
  (id, order_sn, applicant_id, seller_id, reason, evidence_urls, status, seller_reply, admin_id, arbitrate_result, resolved_at, created_at, updated_at)
VALUES
  (3, 'CT202606120006', 1, 7, '商品交付时间多次变更，请平台核查聊天记录。',
   JSON_OBJECT(
     'source', 'complaint',
     'complaintText', '商品交付时间多次变更，请平台核查聊天记录。',
     'autoLinkedChat', TRUE,
     'conversationId', 11,
     'messageCount', 2,
     'latestMessageHash', SHA2('可以，预计二十分钟后到楼下。', 256),
     'orderStatusBefore', 'paid'
   ),
   'arbitrating', NULL, NULL, NULL, NULL, '2026-06-12 19:30:00', NOW())
ON DUPLICATE KEY UPDATE
  reason = VALUES(reason),
  evidence_urls = VALUES(evidence_urls),
  status = VALUES(status),
  updated_at = NOW();

UPDATE orders
SET status = 'disputed', updated_at = NOW()
WHERE order_sn = 'CT202606120006';

UPDATE order_funds
SET status = 'refunding', updated_at = NOW()
WHERE order_sn = 'CT202606120006'
  AND status IN ('none','frozen','refunding');

INSERT IGNORE INTO order_events
  (order_sn, from_status, to_status, operator_id, event_type, note, created_at)
VALUES
  ('CT202606120006', 'paid', 'disputed', 1, 'complaint', '商品交付时间多次变更，请平台核查聊天记录。', '2026-06-12 19:30:00');
