@echo off
echo ==========================================
echo Starting Mala Inventory App (Local)
echo ==========================================

echo Installing dependencies...
npm install
if errorlevel 1 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo Starting development server...
npm run dev

pause
