@echo off
setlocal

if /i not "%~1"=="--inner" (
  cmd /k ""%~f0" --inner"
  exit /b
)
shift

set "SERVER_URL=https://civ6bot-node-web.vercel.app"
set "LUA_LOG=%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VI\Logs\Lua.log"
set "EXIT_CODE=0"

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

if not exist "%LUA_LOG%" (
  echo Lua.log was not found at:
  echo %LUA_LOG%
  echo.
  echo Start Civilization VI once and make sure logging is enabled.
  echo The client will still start, but uploads can only happen after Lua.log exists.
  echo.
)

set "LINK_CODE="
set /p LINK_CODE=Enter link code: 

if "%LINK_CODE%"=="" (
  echo Link code is required.
  echo.
  set "EXIT_CODE=1"
  goto end
)

echo.
echo Linking client...
call npm run client -- claim --code "%LINK_CODE%" --server "%SERVER_URL%" --log "%LUA_LOG%"
if errorlevel 1 (
  echo.
  echo Link failed. Check the code and try again.
  set "EXIT_CODE=1"
  goto end
)

echo.
echo Starting watch mode.
echo Log: %LUA_LOG%
echo Server: %SERVER_URL%
echo.
call npm run client -- watch --server "%SERVER_URL%" --log "%LUA_LOG%"

echo.
echo Watch stopped.
set "EXIT_CODE=%ERRORLEVEL%"

:end
echo.
echo Press any key to close this window.
pause >nul
exit /b %EXIT_CODE%
