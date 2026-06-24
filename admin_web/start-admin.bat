@echo off
chcp 65001 >nul
rem ALLOW_DEV_LOGIN=0 by default; start-admin.ps1 imports .env.local before validation.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-admin.ps1"

echo.
pause
