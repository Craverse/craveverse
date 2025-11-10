@echo off
echo Stopping Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Cleaning .next directory...
if exist .next rmdir /s /q .next

echo Starting dev server...
npm run dev





