-- Read-only referential integrity checks for demo data.
-- Every result set should be empty except the final summary, whose
-- problem_count values should all be 0.

USE campus_trade;
SET NAMES utf8mb4;

SELECT
  'orders_missing_buyer' AS check_name,
  o.order_sn,
  o.buyer_id AS missing_user_id
FROM orders o
LEFT JOIN users u ON u.id = o.buyer_id
WHERE u.id IS NULL;

SELECT
  'orders_missing_seller' AS check_name,
  o.order_sn,
  o.seller_id AS missing_user_id
FROM orders o
LEFT JOIN users u ON u.id = o.seller_id
WHERE u.id IS NULL;

SELECT
  'orders_missing_goods' AS check_name,
  o.order_sn,
  o.item_id AS missing_goods_id
FROM orders o
LEFT JOIN goods g ON g.id = o.item_id
WHERE o.item_type = 'goods'
  AND g.id IS NULL;

SELECT
  'orders_missing_service' AS check_name,
  o.order_sn,
  o.item_id AS missing_service_id
FROM orders o
LEFT JOIN services s ON s.id = o.item_id
WHERE o.item_type = 'service'
  AND s.id IS NULL;

SELECT
  'orders_missing_errand' AS check_name,
  o.order_sn,
  o.item_id AS missing_errand_id
FROM orders o
LEFT JOIN errand_orders e ON e.id = o.item_id
WHERE o.item_type = 'errand'
  AND e.id IS NULL;

SELECT
  'goods_wrong_seller' AS check_name,
  o.order_sn,
  o.seller_id AS order_seller_id,
  g.seller_id AS goods_seller_id
FROM orders o
JOIN goods g ON g.id = o.item_id
WHERE o.item_type = 'goods'
  AND o.seller_id <> g.seller_id;

SELECT
  'service_wrong_provider' AS check_name,
  o.order_sn,
  o.seller_id AS order_seller_id,
  s.provider_id AS service_provider_id
FROM orders o
JOIN services s ON s.id = o.item_id
WHERE o.item_type = 'service'
  AND o.seller_id <> s.provider_id;

SELECT
  'errand_wrong_participant' AS check_name,
  o.order_sn,
  o.buyer_id AS order_buyer_id,
  o.seller_id AS order_seller_id,
  e.publisher_id,
  e.rider_id
FROM orders o
JOIN errand_orders e ON e.id = o.item_id
WHERE o.item_type = 'errand'
  AND (
    o.buyer_id <> e.publisher_id
    OR (e.rider_id IS NOT NULL AND o.seller_id <> e.rider_id)
  );

SELECT
  'conversations_missing_user' AS check_name,
  c.id AS conversation_id,
  c.user_a_id,
  c.user_b_id
FROM conversations c
LEFT JOIN users ua ON ua.id = c.user_a_id
LEFT JOIN users ub ON ub.id = c.user_b_id
WHERE ua.id IS NULL
   OR ub.id IS NULL;

SELECT
  'conversations_missing_business' AS check_name,
  c.id AS conversation_id,
  c.business_type,
  c.business_id
FROM conversations c
LEFT JOIN goods g ON c.business_type = 'goods' AND g.id = c.business_id
LEFT JOIN services s ON c.business_type = 'service' AND s.id = c.business_id
LEFT JOIN errand_orders e ON c.business_type = 'errand' AND e.id = c.business_id
WHERE c.business_type IN ('goods', 'service', 'errand')
  AND COALESCE(g.id, s.id, e.id) IS NULL;

SELECT
  'messages_user_not_in_conversation' AS check_name,
  m.id AS message_id,
  m.conversation_id,
  m.sender_id,
  m.receiver_id,
  c.user_a_id,
  c.user_b_id
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
WHERE m.sender_id NOT IN (c.user_a_id, c.user_b_id)
   OR m.receiver_id NOT IN (c.user_a_id, c.user_b_id);

SELECT
  'comments_wrong_target' AS check_name,
  c.id AS comment_id,
  c.order_sn,
  c.target_user_id,
  o.buyer_id,
  o.seller_id
FROM comments c
JOIN orders o ON o.order_sn = c.order_sn
WHERE c.target_user_id NOT IN (o.buyer_id, o.seller_id);

SELECT
  'integrity_summary' AS check_name,
  'orders_missing_buyer' AS problem,
  COUNT(*) AS problem_count
FROM orders o
LEFT JOIN users u ON u.id = o.buyer_id
WHERE u.id IS NULL
UNION ALL
SELECT 'integrity_summary', 'orders_missing_seller', COUNT(*)
FROM orders o
LEFT JOIN users u ON u.id = o.seller_id
WHERE u.id IS NULL
UNION ALL
SELECT 'integrity_summary', 'orders_missing_business_item', COUNT(*)
FROM orders o
LEFT JOIN goods g ON o.item_type = 'goods' AND g.id = o.item_id
LEFT JOIN services s ON o.item_type = 'service' AND s.id = o.item_id
LEFT JOIN errand_orders e ON o.item_type = 'errand' AND e.id = o.item_id
WHERE COALESCE(g.id, s.id, e.id) IS NULL
UNION ALL
SELECT 'integrity_summary', 'wrong_business_owner', COUNT(*)
FROM orders o
LEFT JOIN goods g ON o.item_type = 'goods' AND g.id = o.item_id
LEFT JOIN services s ON o.item_type = 'service' AND s.id = o.item_id
LEFT JOIN errand_orders e ON o.item_type = 'errand' AND e.id = o.item_id
WHERE (o.item_type = 'goods' AND g.id IS NOT NULL AND o.seller_id <> g.seller_id)
   OR (o.item_type = 'service' AND s.id IS NOT NULL AND o.seller_id <> s.provider_id)
   OR (o.item_type = 'errand' AND e.id IS NOT NULL AND (o.buyer_id <> e.publisher_id OR (e.rider_id IS NOT NULL AND o.seller_id <> e.rider_id)))
UNION ALL
SELECT 'integrity_summary', 'conversations_missing_user', COUNT(*)
FROM conversations c
LEFT JOIN users ua ON ua.id = c.user_a_id
LEFT JOIN users ub ON ub.id = c.user_b_id
WHERE ua.id IS NULL OR ub.id IS NULL
UNION ALL
SELECT 'integrity_summary', 'conversations_missing_business', COUNT(*)
FROM conversations c
LEFT JOIN goods g ON c.business_type = 'goods' AND g.id = c.business_id
LEFT JOIN services s ON c.business_type = 'service' AND s.id = c.business_id
LEFT JOIN errand_orders e ON c.business_type = 'errand' AND e.id = c.business_id
WHERE c.business_type IN ('goods', 'service', 'errand')
  AND COALESCE(g.id, s.id, e.id) IS NULL
UNION ALL
SELECT 'integrity_summary', 'messages_user_not_in_conversation', COUNT(*)
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
WHERE m.sender_id NOT IN (c.user_a_id, c.user_b_id)
   OR m.receiver_id NOT IN (c.user_a_id, c.user_b_id)
UNION ALL
SELECT 'integrity_summary', 'comments_wrong_target', COUNT(*)
FROM comments c
JOIN orders o ON o.order_sn = c.order_sn
WHERE c.target_user_id NOT IN (o.buyer_id, o.seller_id)
ORDER BY problem;
