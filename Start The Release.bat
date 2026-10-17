@echo off
title The Release - keep this window open
cd /d "%~dp0"
if not exist node_modules (
  echo Installing packages, first time only...
  call npm install
)
echo.
echo Starting The Release. Your browser will open in a moment.
echo Keep this window open while you use the site. Close it to stop.
echo.
call npm run dev -- --open --host
pause
