[CmdletBinding()]
param(
  [string]$HostName = '127.0.0.1',
  [int]$Port = 3306,
  [string]$User = 'root',
  [string]$Database = 'campus_trade',
  [string]$LoginPath = '',
  [string]$MySqlDumpPath = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe',
  [string]$BackupDir = '',
  [int]$RetentionDays = 30,
  [switch]$Compress
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

if (-not (Test-Path -LiteralPath $MySqlDumpPath)) {
  throw "mysqldump not found: $MySqlDumpPath"
}

$mysqlRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')
if ([string]::IsNullOrWhiteSpace($BackupDir)) {
  $BackupDir = Join-Path $mysqlRoot.Path 'backups'
}

if (-not (Test-Path -LiteralPath $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$resolvedBackupDir = Resolve-Path -LiteralPath $BackupDir
if (-not $resolvedBackupDir.Path.StartsWith($mysqlRoot.Path, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refuse to apply backup retention outside database/mysql: $($resolvedBackupDir.Path)"
}

$createdPassword = $false
if ([string]::IsNullOrWhiteSpace($LoginPath) -and [string]::IsNullOrWhiteSpace($env:MYSQL_PWD)) {
  $env:MYSQL_PWD = Get-PlainPasswordFromPrompt
  $createdPassword = $true
}

try {
  $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $backupFile = Join-Path $resolvedBackupDir.Path "$Database-full-$timestamp.sql"

  $dumpArgs = @()
  if (-not [string]::IsNullOrWhiteSpace($LoginPath)) {
    $dumpArgs += "--login-path=$LoginPath"
  }
  else {
    $dumpArgs += @("--host=$HostName", "--port=$Port", "--user=$User", '--protocol=TCP')
  }

  $dumpArgs += @(
    '--default-character-set=utf8mb4',
    '--single-transaction',
    '--quick',
    '--hex-blob',
    '--no-tablespaces',
    '--routines',
    '--triggers',
    '--events',
    '--set-gtid-purged=OFF',
    "--result-file=$backupFile",
    '--databases',
    $Database
  )

  & $MySqlDumpPath @dumpArgs
  if ($LASTEXITCODE -ne 0) {
    throw "mysqldump failed with exit code $LASTEXITCODE"
  }

  $backupItem = Get-Item -LiteralPath $backupFile
  if ($backupItem.Length -le 0) {
    throw "Backup file is empty: $backupFile"
  }

  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $backupFile
  $shaFile = "$backupFile.sha256"
  Set-Content -Encoding ASCII -LiteralPath $shaFile -Value "$($hash.Hash)  $(Split-Path -Leaf $backupFile)"

  if ($Compress) {
    $zipFile = "$backupFile.zip"
    Compress-Archive -LiteralPath $backupFile, $shaFile -DestinationPath $zipFile -Force
  }

  if ($RetentionDays -gt 0) {
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -LiteralPath $resolvedBackupDir.Path -Filter "$Database-full-*.sql" |
      Where-Object { $_.LastWriteTime -lt $cutoff } |
      Remove-Item -Force
    Get-ChildItem -LiteralPath $resolvedBackupDir.Path -Filter "$Database-full-*.sql.sha256" |
      Where-Object { $_.LastWriteTime -lt $cutoff } |
      Remove-Item -Force
  }

  [PSCustomObject]@{
    Database = $Database
    BackupFile = $backupFile
    SizeBytes = $backupItem.Length
    Sha256File = $shaFile
    Sha256 = $hash.Hash
    RetentionDays = $RetentionDays
  } | Format-List
}
finally {
  if ($createdPassword) {
    Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
  }
}
