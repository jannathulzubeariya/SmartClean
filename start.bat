@echo off
setlocal enabledelayedexpansion

echo ===================================================================
echo     SMARTCLEAN - Intelligent Storage, Organization & Safe Cleanup
echo         "The computer cleaner that thinks before it cleans."
echo ===================================================================
echo.

:: 1. Verify Node / npm (Required for Full-Stack Engine)
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js / npm is not installed or not in PATH.
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js and npm detected.

:: 2. Optional Python check
python --version >nul 2>&1
if errorlevel 1 (
    echo [INFO] Python optional runtime not found (Node.js engine active).
) else (
    echo [OK] Python detected.
)

:: 3. Install Node Dependencies if missing
if not exist "node_modules" (
    echo [INFO] Installing SmartClean dependencies (npm install)...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: 4. Launch SmartClean
echo.
echo ===================================================================
echo [STARTING] Launching SmartClean Full-Stack Engine...
echo            Web & API: http://localhost:3000
echo ===================================================================
echo.

:: Launch in background or combined server
start http://localhost:3000
npm run dev

pause
