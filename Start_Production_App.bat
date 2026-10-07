@echo off
title Reoti Handloom Billing System
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo ========================================================
echo       Starting Reoti Handloom Billing System...
echo ========================================================
echo Opening browser at http://localhost:5000 ...
timeout /t 2 >nul
start http://localhost:5000
node server.js
pause
