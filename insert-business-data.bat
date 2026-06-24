@echo off
chcp 65001 >nul
setlocal
set PYTHONUTF8=1
cd /d "%~dp0"

echo.
echo [Campus Trade] 正在追加完整业务数据...
echo.
python "%~dp0scripts\insert_business_data.py"

echo.
pause
