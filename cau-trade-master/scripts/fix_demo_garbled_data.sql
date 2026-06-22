SET NAMES utf8mb4;

DELETE c
FROM comments c
JOIN (
  SELECT order_sn, evaluator_id, MIN(id) AS keep_id
  FROM comments
  WHERE status = 'normal'
  GROUP BY order_sn, evaluator_id
  HAVING COUNT(*) > 1
) d ON d.order_sn = c.order_sn AND d.evaluator_id = c.evaluator_id
WHERE c.id <> d.keep_id;

UPDATE comments
SET content = CONVERT(0xe58d96e5aeb6e59b9ee5ba94e5be88e58f8ae697b6efbc8ce8aeb2e4b9a6e5928ce68f8fe8bfb0e4b99fe5928ce5ae9ee4bca0e4b880e887b4e38082 USING utf8mb4)
WHERE order_sn = 'DEMO2023311250423A' AND evaluator_id = 100;

UPDATE orders
SET item_snapshot = JSON_OBJECT(
  'title', CONVERT(0xe6a682e78e87e8aebae5a48de4b9a0e8aeb2e4b989 USING utf8mb4),
  'price', '19.00',
  'location', CONVERT(0xe4b89ce58cbae59bbee4b9a6e9a686 USING utf8mb4)
)
WHERE order_sn = 'DEMO2023311250423A';

UPDATE orders
SET item_snapshot = JSON_OBJECT(
  'title', CONVERT(0x547970652d4320e689a9e5b195e59d9e USING utf8mb4),
  'price', '42.00',
  'location', CONVERT(0xe4bfa1e794b5e5ada6e999a2e6a5bc USING utf8mb4)
)
WHERE order_sn = 'DEMO2023311250423B';

UPDATE orders
SET item_snapshot = JSON_OBJECT(
  'title', CONVERT(0xe6a0a1e59bade8b791e885bfe4bba3e58f96 USING utf8mb4),
  'pickup_location', CONVERT(0xe5aebfe8888de58cba USING utf8mb4),
  'delivery_location', CONVERT(0xe69599e5ada6e6a5bc USING utf8mb4)
)
WHERE order_sn = 'ER20260618152359675798';

UPDATE users
SET college = CONVERT(0xe4bfa1e681afe4b88ee794b5e6b094e5b7a5e7a88be5ada6e999a2 USING utf8mb4)
WHERE id IN (1, 100);

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'comments'
    AND index_name = 'uq_comments_order_evaluator'
);
SET @ddl := IF(
  @idx_exists = 0,
  'ALTER TABLE comments ADD UNIQUE KEY uq_comments_order_evaluator (order_sn, evaluator_id)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
