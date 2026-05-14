@echo off
setlocal

if /i not "%~1"=="--inner" (
  cmd /k ""%~f0" --inner"
  exit /b
)
shift

set "REPO_ZIP=https://github.com/River-jp/civ6bot_node/archive/refs/heads/main.zip"
set "INSTALL_ROOT=%LOCALAPPDATA%\Civ6BotClient"
set "ZIP_PATH=%TEMP%\civ6bot-client.zip"
set "EXTRACT_ROOT=%TEMP%\civ6bot-client-extract"
set "CLIENT_DIR=%INSTALL_ROOT%\civ6bot_node-main"
set "EXIT_CODE=0"

echo Civ6 Bot Client Installer
echo.

where powershell >nul 2>nul
if errorlevel 1 (
  echo PowerShell is required but was not found.
  set "EXIT_CODE=1"
  goto end
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or is not available in PATH.
  echo Install Node.js first, then run this installer again.
  echo https://nodejs.org/
  set "EXIT_CODE=1"
  goto end
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not installed or is not available in PATH.
  echo Reinstall Node.js with npm enabled, then run this installer again.
  set "EXIT_CODE=1"
  goto end
)

echo Node:
node --version
echo npm:
call npm --version
echo.

echo Downloading Civ6 Bot client files...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%REPO_ZIP%' -OutFile '%ZIP_PATH%'"
if errorlevel 1 (
  echo Download failed.
  set "EXIT_CODE=1"
  goto end
)

if exist "%EXTRACT_ROOT%" rmdir /s /q "%EXTRACT_ROOT%"
mkdir "%EXTRACT_ROOT%" >nul 2>nul

echo Extracting files...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%ZIP_PATH%' -DestinationPath '%EXTRACT_ROOT%' -Force"
if errorlevel 1 (
  echo Extract failed.
  set "EXIT_CODE=1"
  goto end
)

if not exist "%INSTALL_ROOT%" mkdir "%INSTALL_ROOT%" >nul 2>nul
if exist "%CLIENT_DIR%" rmdir /s /q "%CLIENT_DIR%"
move "%EXTRACT_ROOT%\civ6bot_node-main" "%INSTALL_ROOT%\" >nul
if errorlevel 1 (
  echo Install failed.
  set "EXIT_CODE=1"
  goto end
)

echo.
echo Starting Civ6 Bot client...
call "%CLIENT_DIR%\start-civ6bot-client.bat" --inner
set "EXIT_CODE=%ERRORLEVEL%"

:end
echo.
echo Press any key to close this window.
pause >nul
exit /b %EXIT_CODE%
