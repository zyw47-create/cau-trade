SET NAMES utf8mb4;

UPDATE goods SET images = JSON_ARRAY('/uploads/goods/math-book.jpg') WHERE id = 101;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/keyboard.jpg') WHERE id = 102;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/storage-box.jpg') WHERE id = 103;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/manual-review.jpg') WHERE id = 104;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/postgrad-politics.jpg') WHERE id = 105;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/desk-lamp.jpg') WHERE id = 106;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/badminton.jpg') WHERE id = 107;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/calculator.jpg') WHERE id = 108;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/cet-headset.jpg') WHERE id = 109;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/bed-desk.jpg') WHERE id = 110;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/study-notes.jpg') WHERE id = 111;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/formula-sheet.jpg') WHERE id = 112;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/accessory-box.jpg') WHERE id = 113;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/ball-bag.jpg') WHERE id = 114;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/bed-table.jpg') WHERE id = 115;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/probability-notes.jpg') WHERE id = 121;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/typec-hub.jpg') WHERE id = 122;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/clothes-rack.jpg') WHERE id = 123;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/battery-set.jpg') WHERE id = 124;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/yoga-mat.jpg') WHERE id = 125;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/guitar.jpg') WHERE id = 126;
UPDATE goods SET images = JSON_ARRAY('/uploads/goods/code-tutorial.jpg') WHERE id = 127;
UPDATE goods
SET
  title = '数据结构期末复习资料',
  description = '教材和复习资料整理完整，适合期末复习和课堂补漏。',
  images = JSON_ARRAY('/uploads/goods/demo-data-structure.jpg')
WHERE id = 128;
UPDATE goods
SET
  title = '罗技静音鼠标',
  description = '按键和滚轮正常，静音款，适合宿舍和图书馆使用。',
  images = JSON_ARRAY('/uploads/goods/demo-mouse.jpg')
WHERE id = 129;
