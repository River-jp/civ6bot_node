@echo off
setlocal EnableExtensions EnableDelayedExpansion

if /i not "%~1"=="--inner" (
  cmd /k ""%~f0" --inner"
  exit /b
)
shift

set "SERVER_URL=https://civ6bot-node-web.vercel.app"
set "LUA_LOG=%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VI\Logs\Lua.log"
set "LOG_CONFIG=%USERPROFILE%\.civ6bot-log-path.txt"
set "CLIENT_DIR=%~dp0packages\client"
set "TSX_CMD=%~dp0node_modules\.bin\tsx.cmd"
set "EXIT_CODE=0"

if exist "%LOG_CONFIG%" (
  set "SAVED_LUA_LOG="
  set /p SAVED_LUA_LOG=<"%LOG_CONFIG%"
  if not "%SAVED_LUA_LOG%"=="" set "LUA_LOG=%SAVED_LUA_LOG%"
)

cd /d "%~dp0"

echo Civ6 Bot Client
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or is not available in PATH.
  echo Install Node.js first, then run this file again.
  echo https://nodejs.org/
  echo.
  set "EXIT_CODE=1"
  goto end
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not installed or is not available in PATH.
  echo Reinstall Node.js with npm enabled, then run this file again.
  echo.
  set "EXIT_CODE=1"
  goto end
)

echo Node:
node --version
echo npm:
call npm --version
echo.

if not exist "package.json" (
  echo package.json was not found.
  echo Put this batch file in the Civ6_node project folder and run it again.
  echo.
  set "EXIT_CODE=1"
  goto end
)

if not exist "%CLIENT_DIR%\src\index.ts" (
  echo Client entrypoint was not found.
  echo Expected: %CLIENT_DIR%\src\index.ts
  echo.
  set "EXIT_CODE=1"
  goto end
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    set "EXIT_CODE=1"
    goto end
  )
  echo.
)

if not exist "%TSX_CMD%" (
  echo tsx was not found.
  echo Expected: %TSX_CMD%
  echo Run npm install again.
  echo.
  set "EXIT_CODE=1"
  goto end
)

echo Building shared package...
call npm run build -w @civ6bot/shared
if errorlevel 1 (
  echo.
  echo Shared package build failed.
  set "EXIT_CODE=1"
  goto end
)
echo.

if not exist "%LUA_LOG%" (
  echo Lua.log was not found at:
  echo %LUA_LOG%
  echo.
  echo Start Civilization VI once and make sure logging is enabled.
  echo The client will still start, but uploads can only happen after Lua.log exists.
  echo.
)

:menu
echo Select an action:
echo   1. Link and start watch
echo   2. Start watch
echo   3. Unlink
echo   4. Change Lua.log path
echo   5. Exit
echo.
set "ACTION="
set /p ACTION=Enter number: 
echo.

if "%ACTION%"=="1" goto link
if "%ACTION%"=="2" goto watch
if "%ACTION%"=="3" goto unlink
if "%ACTION%"=="4" goto change_log_path
if "%ACTION%"=="5" goto end

echo Invalid selection.
echo.
goto menu

:change_log_path
echo Current Lua.log path:
echo %LUA_LOG%
echo.
echo Enter the full path to Lua.log.
echo You can drag and drop Lua.log into this window, then press Enter.
echo Leave blank to cancel.
echo.
set "NEW_LUA_LOG="
set /p NEW_LUA_LOG=Lua.log path: 
set "NEW_LUA_LOG=!NEW_LUA_LOG:"=!"

if "!NEW_LUA_LOG!"=="" (
  echo.
  echo Log path was not changed.
  echo.
  goto menu
)

set "LUA_LOG=!NEW_LUA_LOG!"
>"%LOG_CONFIG%" echo !LUA_LOG!
echo.
echo Log path saved to:
echo %LOG_CONFIG%
echo.
if not exist "!LUA_LOG!" (
  echo Lua.log was not found at the saved path.
  echo The client can still start, but uploads can only happen after Lua.log exists.
  echo.
)
goto menu

:link
set "LINK_CODE="
set /p LINK_CODE=Enter link code: 

if "%LINK_CODE%"=="" (
  echo Link code is required.
  echo.
  goto menu
)

echo.
echo Linking client...
set "CIV6BOT_LOG_PATH=%LUA_LOG%"
pushd "%CLIENT_DIR%"
call "%TSX_CMD%" src/index.ts claim --code "%LINK_CODE%" --server "%SERVER_URL%"
set "CLIENT_EXIT=%ERRORLEVEL%"
popd
set "CIV6BOT_LOG_PATH="
if not "%CLIENT_EXIT%"=="0" (
  echo.
  echo Link failed. Check the code and try again.
  goto menu
)

:watch
echo.
echo Starting watch mode.
echo Log: %LUA_LOG%
echo Server: %SERVER_URL%
echo.
set "CIV6BOT_LOG_PATH=%LUA_LOG%"
pushd "%CLIENT_DIR%"
call "%TSX_CMD%" src/index.ts watch --server "%SERVER_URL%"
set "CLIENT_EXIT=%ERRORLEVEL%"
popd
set "CIV6BOT_LOG_PATH="

echo.
echo Watch stopped.
set "EXIT_CODE=%CLIENT_EXIT%"
goto end

:unlink
echo Unlinking client...
pushd "%CLIENT_DIR%"
call "%TSX_CMD%" src/index.ts unlink --server "%SERVER_URL%"
set "CLIENT_EXIT=%ERRORLEVEL%"
popd
if not "%CLIENT_EXIT%"=="0" (
  echo.
  echo Unlink failed. The local config may already be missing or the token may already be invalid.
  echo.
  goto menu
)

echo.
echo Unlinked.
goto menu

:end
echo.
echo Press any key to close this window.
pause >nul
exit /b %EXIT_CODE%
