[CmdletBinding()]
param(
  [string]$HostName = '127.0.0.1',
  [int]$Port = 3306,
  [string]$User = 'root',
  [string]$Database = 'campus_trade',
  [string]$LoginPath = '',
  [string]$MySqlPath = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
  [string]$BackupDir = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-PlainPasswordFromPrompt {
  $secure = Read-Host -AsSecureString 'MySQL password'
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

if (-not (Test-Path -LiteralPath $MySqlPath)) {
  throw "mysql client not found: $MySqlPath"
}

$mysqlRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')
if ([string]::IsNullOrWhiteSpace($BackupDir)) {
  $BackupDir = Join-Path $mysqlRoot.Path 'backups'
}

$createdPassword = $false
if ([string]::IsNullOrWhiteSpace($LoginPath) -and [string]::IsNullOrWhiteSpace($env:MYSQL_PWD)) {
  $env:MYSQL_PWD = Get-PlainPasswordFromPrompt
  $createdPassword = $true
}

try {
  $args = @()
  if (-not [string]::IsNullOrWhiteSpace($LoginPath)) {
    $args += "--login-path=$LoginPath"
  }
  else {
    $args += @("--host=$HostName", "--port=$Port", "--user=$User", '--protocol=TCP')
  }
  $args += @('--default-character-set=utf8mb4', '--batch', '--raw', "--database=$Database")

  $query = @"
SELECT 'mysql_version' AS check_name, VERSION() AS value;
SELECT 'base_table_count' AS check_name, COUNT(*) AS value
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE';
SELECT 'view_count' AS check_name, COUNT(*) AS value
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = DATABASE();
SELECT 'procedure_count' AS check_name, COUNT(*) AS value
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE';
SELECT 'trigger_count' AS check_name, COUNT(*) AS value
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE();
SELECT 'event_count' AS check_name, COUNT(*) AS value
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = DATABASE();
SELECT 'abnormal_wallet_orders' AS check_name, COUNT(*) AS value
FROM v_wallet_reconcile_source
WHERE is_abnormal = 1;
SELECT 'stale_processing_idempotency' AS check_name, COUNT(*) AS value
FROM idempotency_keys
WHERE status = 'processing' AND locked_until < NOW();
"@

  & $MySqlPath @args --execute=$query
  if ($LASTEXITCODE -ne 0) {
    throw "mysql health query failed with exit code $LASTEXITCODE"
  }

  if (Test-Path -LiteralPath $BackupDir) {
    $latestBackup = Get-ChildItem -LiteralPath $BackupDir -Filter "$Database-full-*.sql" |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1

    if ($null -ne $latestBackup) {
      [PSCustomObject]@{
        check_name = 'latest_backup'
        path = $latestBackup.FullName
        size_bytes = $latestBackup.Length
        last_write_time = $latestBackup.LastWriteTime
      } | Format-List
    }
    else {
      Write-Warning "No backup file found in $BackupDir"
    }
  }
  else {
    Write-Warning "Backup directory does not exist: $BackupDir"
  }
}
finally {
  if ($createdPassword) {
    Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
  }
}
