$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendScript = Join-Path $Root "backend\start-backend.ps1"

Write-Host "Starting campus trade Node backend..."
Write-Host "Backend API: http://127.0.0.1:3001"
Write-Host ""

& $BackendScript

Write-Host ""
Write-Host "Mini-program project path:"
Write-Host (Join-Path $Root "miniprogram")
