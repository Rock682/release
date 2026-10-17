@echo off
title The Release - keep this window open
cd /d "%~dp0"
echo Checking packages...
call npm install --no-audit --no-fund
echo.
echo Starting The Release. Your browser will open in a moment.
echo Keep this window open while you use the site. Close it to stop.
echo.
call npm run dev -- --open --host
pause
