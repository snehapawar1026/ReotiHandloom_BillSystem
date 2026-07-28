@echo off
title Reoti Handloom Billing System
echo Starting Reoti Handloom Billing System (Production Release)...
echo Opening browser at http://localhost:5000 ...
timeout /t 2 >nul
start http://localhost:5000
node server.js
pause
