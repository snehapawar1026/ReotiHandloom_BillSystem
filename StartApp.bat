@echo off
title Reoti Handloom - Bill System
color 0A

echo.
echo  =============================================
echo    Reoti Handloom - Bill System Starting...
echo  =============================================
echo.

if not exist "node_modules\" (
    echo  Installing dependencies, please wait...
    call npm.cmd install
    echo.
)

echo  Starting server, please wait...
echo.

start "" /B cmd /C "npm.cmd run dev > app_log.txt 2>&1"

echo  Waiting for server to be ready...
timeout /t 6 /nobreak > nul

echo  Opening app in browser...
start "" "http://localhost:5173"

echo.
echo  =============================================
echo    App is running! Browser will open now.
echo    Press any key or close this window to STOP.
echo  =============================================
echo.
pause
