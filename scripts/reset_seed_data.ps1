[CmdletBinding()]
param(
  [string]$HostName = "127.0.0.1",
  [int]$Port = 3306,
  [string]$User = "root",
  [string]$Database = "campus_trade",
  [string]$MySqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
  [switch]$Yes
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-PlainPasswordFromPrompt {
  $secure = Read-Host -AsSecureString "MySQL $User password"
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

function Invoke-MySqlFile {
  param(
    [string]$File,
    [switch]$UseDatabase
  )

  if (-not (Test-Path -LiteralPath $File)) {
    throw "SQL file not found: $File"
  }

  $args = @(
    "--host=$HostName",
    "--port=$Port",
    "--user=$User",
    "--protocol=TCP",
    "--default-character-set=utf8mb4",
    "--binary-mode=1"
  )
  if ($UseDatabase) {
    $args += $Database
  }

  Write-Host ""
  Write-Host ">>> Applying $(Split-Path -Leaf $File)"
  $process = Start-Process `
    -FilePath $MySqlPath `
    -ArgumentList $args `
    -RedirectStandardInput $File `
    -NoNewWindow `
    -Wait `
    -PassThru

  if ($process.ExitCode -ne 0) {
    throw "mysql failed while applying $File, exit code $($process.ExitCode)"
  }
}

if (-not (Test-Path -LiteralPath $MySqlPath)) {
  $found = Get-Command mysql.exe -ErrorAction SilentlyContinue
  if ($found) {
    $MySqlPath = $found.Source
  }
  else {
    throw "mysql.exe not found. Install MySQL client or pass -MySqlPath."
  }
}

$projectRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$mysqlRoot = Join-Path $projectRoot.Path "database\mysql"

if (-not $Yes) {
  Write-Host "This will DROP and recreate local database '$Database' from seed data."
  Write-Host "Project: $($projectRoot.Path)"
  $answer = Read-Host "Type RESET to continue"
  if ($answer -ne "RESET") {
    Write-Host "Cancelled."
    exit 0
  }
}

$createdPassword = $false
if ([string]::IsNullOrWhiteSpace($env:MYSQL_PWD)) {
  $env:MYSQL_PWD = Get-PlainPasswordFromPrompt
  $createdPassword = $true
}

try {
  Invoke-MySqlFile -File (Join-Path $mysqlRoot "schema.sql")
  Invoke-MySqlFile -File (Join-Path $mysqlRoot "seed.sql") -UseDatabase
  Invoke-MySqlFile -File (Join-Path $mysqlRoot "seed_more.sql") -UseDatabase
  Invoke-MySqlFile -File (Join-Path $mysqlRoot "views_and_routines.sql") -UseDatabase
  Invoke-MySqlFile -File (Join-Path $mysqlRoot "business_procedures.sql") -UseDatabase
  Invoke-MySqlFile -File (Join-Path $mysqlRoot "security.sql") -UseDatabase
  Invoke-MySqlFile -File (Join-Path $mysqlRoot "ops_events.sql") -UseDatabase
  Invoke-MySqlFile -File (Join-Path $mysqlRoot "verify.sql") -UseDatabase

  Write-Host ""
  Write-Host "Seed reset completed."
  Write-Host "Database: $Database"
  Write-Host "Next: restart Flask backend."
}
finally {
  if ($createdPassword) {
    Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
  }
}
