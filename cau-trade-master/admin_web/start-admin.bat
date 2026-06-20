@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

if "%ADMIN_DB_HOST%"=="" set "ADMIN_DB_HOST=127.0.0.1"
if "%ADMIN_DB_USER%"=="" set "ADMIN_DB_USER=root"
if "%ADMIN_DB_PASSWORD%"=="" set "ADMIN_DB_PASSWORD=Aa123456@"
if "%ADMIN_DB_NAME%"=="" set "ADMIN_DB_NAME=campus_trade"
if "%ADMIN_WEB_USERNAME%"=="" set "ADMIN_WEB_USERNAME=admin"
if "%ADMIN_WEB_PASSWORD%"=="" set "ADMIN_WEB_PASSWORD=admin123"
if "%FLASK_PORT%"=="" set "FLASK_PORT=5000"

echo Campus admin web is starting...
echo URL: http://127.0.0.1:%FLASK_PORT%
echo Login: %ADMIN_WEB_USERNAME% / %ADMIN_WEB_PASSWORD%
echo Press Ctrl+C to stop.
echo.

python app.py

echo.
pause
