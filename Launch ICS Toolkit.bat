@echo off
echo Launching ICS Toolkit...

REM Navigate to the directory where this script is located
cd /d "%~dp0"

echo Installing dependencies...
call npm install

echo Starting the app...
call npm run dev

pause