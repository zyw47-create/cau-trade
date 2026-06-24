$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

function Read-EnvFile {
  param([string]$Path)
  $values = [ordered]@{}
  if (-not (Test-Path -LiteralPath $Path)) { return $values }
  foreach ($rawLine in Get-Content -LiteralPath $Path) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { continue }
    $parts = $line.Split("=", 2)
    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    if ($key) { $values[$key] = $value }
  }
  return $values
}

function Import-LocalEnvFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  foreach ($rawLine in Get-Content -LiteralPath $Path) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { continue }
    $parts = $line.Split("=", 2)
    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    if ($key -and $value -and -not [Environment]::GetEnvironmentVariable($key, "Process")) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

function Get-DefaultValue {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Name,
    [string]$Fallback
  )
  $current = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ($current) { return $current }
  if ($Values.Contains($Name) -and $Values[$Name]) { return $Values[$Name] }
  return $Fallback
}

function ConvertFrom-SecureInput {
  param([securestring]$Secret)
  if (-not $Secret -or $Secret.Length -eq 0) { return "" }
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

function Prompt-Value {
  param(
    [string]$Name,
    [string]$Label,
    [string]$Default,
    [switch]$Secret
  )
  $answer = ""
  if ($Secret) {
    if ($Default) {
      $secureAnswer = Read-Host "$Label [$Name, press Enter to keep current value]" -AsSecureString
      $answer = ConvertFrom-SecureInput $secureAnswer
      if ($answer) { return $answer }
      return $Default
    }
    while (-not $answer) {
      $secureAnswer = Read-Host "$Label [$Name, required]" -AsSecureString
      $answer = ConvertFrom-SecureInput $secureAnswer
    }
    return $answer
  }
  $answer = Read-Host "$Label [$Name, default: $Default]"
  if ($answer) { return $answer }
  return $Default
}

function Set-ProcessEnv {
  param([System.Collections.IDictionary]$Values)
  foreach ($key in $Values.Keys) {
    if ($Values[$key] -ne $null) {
      [Environment]::SetEnvironmentVariable($key, [string]$Values[$key], "Process")
    }
  }
}

function Write-EnvFile {
  param(
    [string]$Path,
    [System.Collections.IDictionary]$Values
  )
  $lines = @(
    "APP_ENV=$($Values.APP_ENV)"
    "FLASK_HOST=$($Values.FLASK_HOST)"
    "FLASK_PORT=$($Values.FLASK_PORT)"
    ""
    "ADMIN_DB_HOST=$($Values.ADMIN_DB_HOST)"
    "ADMIN_DB_PORT=$($Values.ADMIN_DB_PORT)"
    "ADMIN_DB_USER=$($Values.ADMIN_DB_USER)"
    "ADMIN_DB_PASSWORD=$($Values.ADMIN_DB_PASSWORD)"
    "ADMIN_DB_NAME=$($Values.ADMIN_DB_NAME)"
    ""
    "ADMIN_WEB_USERNAME=$($Values.ADMIN_WEB_USERNAME)"
    "ADMIN_WEB_PASSWORD=$($Values.ADMIN_WEB_PASSWORD)"
    "ADMIN_WEB_PASSWORD_HASH=$($Values.ADMIN_WEB_PASSWORD_HASH)"
    ""
    "FLASK_SECRET_KEY=$($Values.FLASK_SECRET_KEY)"
    "JWT_SECRET=$($Values.JWT_SECRET)"
    "EMAIL_CODE_SECRET=$($Values.EMAIL_CODE_SECRET)"
    "PII_ENCRYPTION_KEY=$($Values.PII_ENCRYPTION_KEY)"
    ""
    "ALLOW_DEV_LOGIN=$($Values.ALLOW_DEV_LOGIN)"
    "ALLOW_DEMO_TOKEN=$($Values.ALLOW_DEMO_TOKEN)"
    "MOCK_EMAIL=$($Values.MOCK_EMAIL)"
    "MAX_UPLOAD_BYTES=$($Values.MAX_UPLOAD_BYTES)"
    ""
    "SMTP_HOST=$($Values.SMTP_HOST)"
    "SMTP_PORT=$($Values.SMTP_PORT)"
    "SMTP_USER=$($Values.SMTP_USER)"
    "SMTP_PASS=$($Values.SMTP_PASS)"
    "SMTP_FROM=$($Values.SMTP_FROM)"
    ""
    "WECHAT_APPID=$($Values.WECHAT_APPID)"
    "WECHAT_SECRET=$($Values.WECHAT_SECRET)"
    ""
    "AI_ENABLED=$($Values.AI_ENABLED)"
    "DEEPSEEK_API_KEY=$($Values.DEEPSEEK_API_KEY)"
    "DEEPSEEK_BASE_URL=$($Values.DEEPSEEK_BASE_URL)"
    "DEEPSEEK_MODEL=$($Values.DEEPSEEK_MODEL)"
  )
  Set-Content -LiteralPath $Path -Value $lines -Encoding UTF8
}

function Test-DatabaseConnection {
  python -c "from campus_trade.config import load_config; from campus_trade.database import configure_database, ping; cfg=load_config(); configure_database(cfg); ping(); print('database connection ok')"
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Import-LocalEnvFile (Join-Path $ProjectRoot ".env")
Import-LocalEnvFile (Join-Path $PSScriptRoot ".env")

$LocalEnvPath = Join-Path $PSScriptRoot ".env.local"
$Existing = Read-EnvFile $LocalEnvPath

Write-Host ""
Write-Host "Campus Trade Flask backend startup wizard"
Write-Host "Press Enter to use the value shown in brackets."
Write-Host ""

$Values = [ordered]@{}
$Values.APP_ENV = Prompt-Value "APP_ENV" "Runtime environment" (Get-DefaultValue $Existing "APP_ENV" "development")
$Values.FLASK_HOST = Prompt-Value "FLASK_HOST" "Flask bind host" (Get-DefaultValue $Existing "FLASK_HOST" "127.0.0.1")
$Values.FLASK_PORT = Prompt-Value "FLASK_PORT" "Flask port" (Get-DefaultValue $Existing "FLASK_PORT" "5000")

$Values.ADMIN_DB_HOST = Prompt-Value "ADMIN_DB_HOST" "MySQL host" (Get-DefaultValue $Existing "ADMIN_DB_HOST" "127.0.0.1")
$Values.ADMIN_DB_PORT = Prompt-Value "ADMIN_DB_PORT" "MySQL port" (Get-DefaultValue $Existing "ADMIN_DB_PORT" "3306")
$Values.ADMIN_DB_USER = Prompt-Value "ADMIN_DB_USER" "MySQL app user" (Get-DefaultValue $Existing "ADMIN_DB_USER" "campus_app")
$Values.ADMIN_DB_PASSWORD = Prompt-Value "ADMIN_DB_PASSWORD" "MySQL app password" (Get-DefaultValue $Existing "ADMIN_DB_PASSWORD" "") -Secret
$Values.ADMIN_DB_NAME = Prompt-Value "ADMIN_DB_NAME" "MySQL database" (Get-DefaultValue $Existing "ADMIN_DB_NAME" "campus_trade")

$Values.ADMIN_WEB_USERNAME = Prompt-Value "ADMIN_WEB_USERNAME" "Admin web username" (Get-DefaultValue $Existing "ADMIN_WEB_USERNAME" "admin")
$Values.ADMIN_WEB_PASSWORD = Prompt-Value "ADMIN_WEB_PASSWORD" "Admin web password for local development" (Get-DefaultValue $Existing "ADMIN_WEB_PASSWORD" "Admin@Local-2026!") -Secret
$Values.ADMIN_WEB_PASSWORD_HASH = Get-DefaultValue $Existing "ADMIN_WEB_PASSWORD_HASH" ""

$Values.FLASK_SECRET_KEY = Get-DefaultValue $Existing "FLASK_SECRET_KEY" ""
$Values.JWT_SECRET = Get-DefaultValue $Existing "JWT_SECRET" ""
$Values.EMAIL_CODE_SECRET = Get-DefaultValue $Existing "EMAIL_CODE_SECRET" ""
$Values.PII_ENCRYPTION_KEY = Get-DefaultValue $Existing "PII_ENCRYPTION_KEY" ""

$Values.ALLOW_DEV_LOGIN = Prompt-Value "ALLOW_DEV_LOGIN" "Allow mini-program devOpenid login? 0/1" (Get-DefaultValue $Existing "ALLOW_DEV_LOGIN" "0")
$Values.ALLOW_DEMO_TOKEN = Get-DefaultValue $Existing "ALLOW_DEMO_TOKEN" "0"
$Values.MOCK_EMAIL = Get-DefaultValue $Existing "MOCK_EMAIL" "auto"
$Values.MAX_UPLOAD_BYTES = Get-DefaultValue $Existing "MAX_UPLOAD_BYTES" "5242880"

$Values.SMTP_HOST = Prompt-Value "SMTP_HOST" "SMTP host for verification email" (Get-DefaultValue $Existing "SMTP_HOST" "")
$Values.SMTP_PORT = Prompt-Value "SMTP_PORT" "SMTP SSL port" (Get-DefaultValue $Existing "SMTP_PORT" "465")
$Values.SMTP_USER = Prompt-Value "SMTP_USER" "SMTP username/email" (Get-DefaultValue $Existing "SMTP_USER" "")
$Values.SMTP_PASS = Prompt-Value "SMTP_PASS" "SMTP authorization code/password" (Get-DefaultValue $Existing "SMTP_PASS" "") -Secret
$Values.SMTP_FROM = Prompt-Value "SMTP_FROM" "SMTP sender address" (Get-DefaultValue $Existing "SMTP_FROM" $Values.SMTP_USER)

$Values.WECHAT_APPID = Prompt-Value "WECHAT_APPID" "WeChat Mini Program AppID" (Get-DefaultValue $Existing "WECHAT_APPID" "")
$Values.WECHAT_SECRET = Prompt-Value "WECHAT_SECRET" "WeChat Mini Program AppSecret" (Get-DefaultValue $Existing "WECHAT_SECRET" "") -Secret

$Values.AI_ENABLED = Get-DefaultValue $Existing "AI_ENABLED" "1"
$Values.DEEPSEEK_API_KEY = Get-DefaultValue $Existing "DEEPSEEK_API_KEY" ""
$Values.DEEPSEEK_BASE_URL = Get-DefaultValue $Existing "DEEPSEEK_BASE_URL" "https://api.deepseek.com"
$Values.DEEPSEEK_MODEL = Get-DefaultValue $Existing "DEEPSEEK_MODEL" "deepseek-chat"

Write-EnvFile $LocalEnvPath $Values
Set-ProcessEnv $Values

Write-Host ""
Write-Host "Saved local configuration to $LocalEnvPath"
Write-Host "Checking database connection..."

try {
  Test-DatabaseConnection
} catch {
  Write-Host ""
  Write-Host "Database check failed." -ForegroundColor Red
  Write-Host "Please verify MySQL is running and the configured account can access the campus_trade database."
  Write-Host "Current DB: $($Values.ADMIN_DB_USER)@$($Values.ADMIN_DB_HOST):$($Values.ADMIN_DB_PORT)/$($Values.ADMIN_DB_NAME)"
  Write-Host "If the campus_app account still uses another password, run the MySQL security script again or enter that password in this wizard."
  throw
}

Write-Host ""
Write-Host "Campus Trade Flask backend is starting..."
Write-Host "Admin web: http://127.0.0.1:$($Values.FLASK_PORT)"
Write-Host "Mini-program API: http://127.0.0.1:$($Values.FLASK_PORT)/api/status"
Write-Host "Login account: $($Values.ADMIN_WEB_USERNAME)"
Write-Host "Press Ctrl+C to stop."

python app.py
