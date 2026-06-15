$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

if (-not $env:ADMIN_DB_HOST) { $env:ADMIN_DB_HOST = "127.0.0.1" }
if (-not $env:ADMIN_DB_USER) { $env:ADMIN_DB_USER = "root" }
if (-not $env:ADMIN_DB_PASSWORD) { $env:ADMIN_DB_PASSWORD = "Aa123456@" }
if (-not $env:ADMIN_DB_NAME) { $env:ADMIN_DB_NAME = "campus_trade" }
if (-not $env:ADMIN_WEB_USERNAME) { $env:ADMIN_WEB_USERNAME = "admin" }
if (-not $env:ADMIN_WEB_PASSWORD) { $env:ADMIN_WEB_PASSWORD = "admin123" }
if (-not $env:FLASK_PORT) { $env:FLASK_PORT = "5000" }

Write-Host "校园交易管理后台启动中..."
Write-Host "地址: http://127.0.0.1:$env:FLASK_PORT"
Write-Host "账号: $env:ADMIN_WEB_USERNAME"
Write-Host "按 Ctrl+C 停止服务"

python app.py
