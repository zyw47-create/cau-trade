@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul

set "ROOT=%~dp0"
set "PROJECT_ROOT=%ROOT%..\.."
set "ENV_FILE=%PROJECT_ROOT%\admin_web\.env.local"
set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

if exist "%ProgramFiles%\MySQL\MySQL Server 8.0\bin\mysql.exe" (
  set "MYSQL_EXE=%ProgramFiles%\MySQL\MySQL Server 8.0\bin\mysql.exe"
)
if exist "%ProgramFiles%\MySQL\MySQL Server 8.4\bin\mysql.exe" (
  set "MYSQL_EXE=%ProgramFiles%\MySQL\MySQL Server 8.4\bin\mysql.exe"
)
if not exist "%MYSQL_EXE%" (
  for %%M in (mysql.exe) do set "MYSQL_EXE=%%~$PATH:M"
)
if not exist "%MYSQL_EXE%" (
  echo [ERROR] mysql.exe not found. Install MySQL client or add it to PATH.
  exit /b 1
)

set "ADMIN_DB_HOST=127.0.0.1"
set "ADMIN_DB_PORT=3306"
set "ADMIN_DB_USER=campus_app"
set "ADMIN_DB_NAME=campus_trade"
set "IS_RESET=0"
if /i "%~1"=="/reset" set "IS_RESET=1"

if exist "%ENV_FILE%" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    if not "%%A"=="" (
      if /i "%%A"=="ADMIN_DB_HOST" set "ADMIN_DB_HOST=%%B"
      if /i "%%A"=="ADMIN_DB_PORT" set "ADMIN_DB_PORT=%%B"
      if /i "%%A"=="ADMIN_DB_USER" set "ADMIN_DB_USER=%%B"
      if /i "%%A"=="ADMIN_DB_PASSWORD" set "ADMIN_DB_PASSWORD=%%B"
      if /i "%%A"=="ADMIN_DB_NAME" set "ADMIN_DB_NAME=%%B"
    )
  )
)

if "%IS_RESET%"=="1" (
  set "ADMIN_DB_USER=root"
  if not "%~2"=="" set "ADMIN_DB_USER=%~2"
)
if "%IS_RESET%"=="0" if not "%~1"=="" (
  set "ADMIN_DB_USER=%~1"
  set "ADMIN_DB_PASSWORD="
)

if "%ADMIN_DB_PASSWORD%"=="" if "%IS_RESET%"=="0" (
  set /p "ADMIN_DB_PASSWORD=MySQL password for %ADMIN_DB_USER%@%ADMIN_DB_HOST%: "
)
if "%IS_RESET%"=="1" (
  set "ADMIN_DB_PASSWORD="
  set /p "ADMIN_DB_PASSWORD=MySQL password for %ADMIN_DB_USER%@%ADMIN_DB_HOST% [/reset]: "
)
set "MYSQL_PWD=%ADMIN_DB_PASSWORD%"

set "MYSQL_BASE=%MYSQL_EXE% -h %ADMIN_DB_HOST% -P %ADMIN_DB_PORT% -u %ADMIN_DB_USER% --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1"

if "%IS_RESET%"=="1" (
  echo [INFO] Rebuilding %ADMIN_DB_NAME% with schema and seed files...
  call :run_file "" "%ROOT%schema.sql" || exit /b 1
  call :run_file "%ADMIN_DB_NAME%" "%ROOT%seed.sql" || exit /b 1
  call :run_file "%ADMIN_DB_NAME%" "%ROOT%seed_more.sql" || exit /b 1
  call :run_file "%ADMIN_DB_NAME%" "%ROOT%views_and_routines.sql" || exit /b 1
  call :run_file "%ADMIN_DB_NAME%" "%ROOT%business_procedures.sql" || exit /b 1
  call :run_file "%ADMIN_DB_NAME%" "%ROOT%security.sql" || exit /b 1
  call :run_file "%ADMIN_DB_NAME%" "%ROOT%ops_events.sql" || exit /b 1
) else (
  echo [INFO] Applying non-destructive demo integrity patch to %ADMIN_DB_NAME%...
)

call :run_file "%ADMIN_DB_NAME%" "%ROOT%seed_integrity_patch.sql" || exit /b 1
call :run_file "%ADMIN_DB_NAME%" "%ROOT%verify_integrity.sql" || exit /b 1

echo.
echo [OK] Demo data is patched. In verify_integrity output, all integrity_summary problem_count values should be 0.
echo [OK] Known service order fixed: DX-SV-SH-01 -> services.id=9116 -> users.username=layout_liu.
exit /b 0

:run_file
set "TARGET_DB=%~1"
set "SQL_FILE=%~2"
echo.
echo [SQL] %SQL_FILE%
if "%TARGET_DB%"=="" (
  "%MYSQL_EXE%" -h %ADMIN_DB_HOST% -P %ADMIN_DB_PORT% -u %ADMIN_DB_USER% --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 < "%SQL_FILE%"
) else (
  "%MYSQL_EXE%" -h %ADMIN_DB_HOST% -P %ADMIN_DB_PORT% -u %ADMIN_DB_USER% --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 "%TARGET_DB%" < "%SQL_FILE%"
)
if errorlevel 1 (
  echo [ERROR] Failed: %SQL_FILE%
  exit /b 1
)
exit /b 0
