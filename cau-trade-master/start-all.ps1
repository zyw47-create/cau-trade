$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$FlaskScript = Join-Path $Root "admin_web\start-admin.ps1"

Write-Host "Starting campus trade Flask API and admin web..."
Write-Host "Flask API: http://127.0.0.1:5000/api/status"
Write-Host "Admin web: http://127.0.0.1:5000"
Write-Host ""

& $FlaskScript

Write-Host ""
Write-Host "Mini-program project path:"
Write-Host (Join-Path $Root "miniprogram")
