param(
  [string]$User = "campus_app",
  [string]$HostName = "127.0.0.1",
  [int]$Port = 3306,
  [string]$Database = "campus_trade",
  [switch]$Prepare,
  [switch]$UseProcedure
)

$ErrorActionPreference = "Stop"

$mysql = Get-Command mysql.exe -ErrorAction SilentlyContinue
if (-not $mysql) {
  $default = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
  if (Test-Path -LiteralPath $default) {
    $mysql = Get-Item -LiteralPath $default
  }
}
if (-not $mysql) {
  throw "mysql.exe not found. Add MySQL client to PATH or install MySQL Server client tools."
}
$mysqlExe = if ($mysql.Source) { $mysql.Source } else { $mysql.FullName }

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Resolve-Path (Join-Path $root "..\..\admin_web\.env.local") -ErrorAction SilentlyContinue
if ($envFile -and -not $env:MYSQL_PWD) {
  $line = Select-String -LiteralPath $envFile.Path -Pattern "^ADMIN_DB_PASSWORD=" | Select-Object -First 1
  if ($line) {
    $env:MYSQL_PWD = $line.Line.Substring($line.Line.IndexOf("=") + 1)
  }
}

$prepareSql = @"
SET @buyer_id := 1;
SET @seller_id := (SELECT id FROM users WHERE username = 'status_seller' LIMIT 1);
INSERT INTO goods
  (id, seller_id, category_id, title, price, condition_level, description, images, location, status, audit_note, is_ai_generated, favorite_count, view_count, created_at, updated_at)
VALUES
  (9399, @seller_id, 1, 'JOB-01 timeout demo goods', 11.00, 'like new', 'JOB-01 timeout unpaid order demo.', JSON_ARRAY('/uploads/goods/job01-timeout.jpg'), 'north campus', 'reserved', 'JOB-01 demo', 0, 0, 1, NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 2 HOUR)
ON DUPLICATE KEY UPDATE
  seller_id = VALUES(seller_id),
  status = 'reserved',
  updated_at = NOW() - INTERVAL 2 HOUR;
INSERT INTO orders
  (order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot, amount, status, remark, paid_at, completed_at, created_at, updated_at)
VALUES
  ('JOB01-TIMEOUT-01', @buyer_id, @seller_id, 'goods', 9399, JSON_OBJECT('title', 'JOB-01 timeout demo goods', 'price', 11.00, 'location', 'north campus'), 11.00, 'unpaid', 'JOB-01 timeout unpaid demo order', NULL, NULL, NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 2 HOUR)
ON DUPLICATE KEY UPDATE
  status = 'unpaid',
  paid_at = NULL,
  completed_at = NULL,
  updated_at = NOW() - INTERVAL 2 HOUR;
"@

if ($Prepare) {
  $prepareSql | & $mysqlExe -h $HostName -P $Port -u $User --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 $Database
  if ($LASTEXITCODE -ne 0) {
    throw "prepare JOB-01 demo data failed with exit code $LASTEXITCODE"
  }
}

$procedureSql = @"
CALL sp_cancel_unpaid_orders(NOW() - INTERVAL 30 MINUTE);
"@

$fallbackSql = @"
SET @cutoff := NOW() - INTERVAL 30 MINUTE;
SET @started_at := NOW();
SET @cancel_count := (
  SELECT COUNT(*)
  FROM orders
  WHERE status = 'unpaid'
    AND created_at < @cutoff
    AND order_sn = 'JOB01-TIMEOUT-01'
);
UPDATE goods g
JOIN orders o ON o.item_type = 'goods' AND o.item_id = g.id
SET g.status = 'on_sale',
    g.updated_at = NOW()
WHERE o.status = 'unpaid'
  AND o.created_at < @cutoff
  AND o.order_sn = 'JOB01-TIMEOUT-01'
  AND g.status = 'reserved';
INSERT INTO order_events
  (order_sn, from_status, to_status, operator_id, event_type, note, created_at)
SELECT
  o.order_sn,
  'unpaid',
  'cancelled',
  NULL,
  'timeout_cancel',
  'JOB-01 timeout unpaid auto cancel',
  NOW()
FROM orders o
WHERE o.status = 'unpaid'
  AND o.created_at < @cutoff
  AND o.order_sn = 'JOB01-TIMEOUT-01'
  AND NOT EXISTS (
    SELECT 1
    FROM order_events e
    WHERE e.order_sn = o.order_sn
      AND e.event_type = 'timeout_cancel'
  );
UPDATE orders
SET status = 'cancelled',
    updated_at = NOW()
WHERE status = 'unpaid'
  AND created_at < @cutoff
  AND order_sn = 'JOB01-TIMEOUT-01';
INSERT INTO job_logs
  (job_name, status, scanned_count, success_count, fail_count, message, started_at, finished_at)
VALUES
  ('JOB-01 cancel_unpaid_orders', 'success', @cancel_count, @cancel_count, 0,
   CONCAT('fallback SQL cancelled unpaid orders before ', DATE_FORMAT(@cutoff, '%Y-%m-%d %H:%i:%s')),
   @started_at, NOW());
"@

$verifySql = @"
SELECT order_sn, status, updated_at FROM orders WHERE order_sn = 'JOB01-TIMEOUT-01';
SELECT id, status, updated_at FROM goods WHERE id = 9399;
SELECT job_name, status, scanned_count, success_count, fail_count, message
FROM job_logs
WHERE job_name IN ('sp_cancel_unpaid_orders', 'JOB-01 cancel_unpaid_orders')
ORDER BY id DESC
LIMIT 2;
"@

if ($UseProcedure) {
  $procedureError = Join-Path $env:TEMP "job01-procedure-error.txt"
  $procedureSql | & $mysqlExe -h $HostName -P $Port -u $User --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 $Database 2>$procedureError
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Stored procedure not available for user '$User'. Running JOB-01 demo fallback SQL..."
    $fallbackSql | & $mysqlExe -h $HostName -P $Port -u $User --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 $Database
    if ($LASTEXITCODE -ne 0) {
      throw "JOB-01 fallback scan failed with exit code $LASTEXITCODE"
    }
  }
  Remove-Item -LiteralPath $procedureError -ErrorAction SilentlyContinue
} else {
  $fallbackSql | & $mysqlExe -h $HostName -P $Port -u $User --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 $Database
  if ($LASTEXITCODE -ne 0) {
    throw "JOB-01 fallback scan failed with exit code $LASTEXITCODE"
  }
}

$verifySql | & $mysqlExe -h $HostName -P $Port -u $User --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 $Database
if ($LASTEXITCODE -ne 0) {
  throw "JOB-01 verification failed with exit code $LASTEXITCODE"
}
