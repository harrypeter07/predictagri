@echo off
chcp 65001 >nul
title 🧪 Complete Pipeline Test Suite

echo.
echo 🧪 Starting Complete Pipeline Test Suite
echo ============================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version

REM Check if the test script exists
if not exist "test-pipeline-complete.js" (
    echo ❌ Test script 'test-pipeline-complete.js' not found
    echo Please ensure you're in the correct directory
    pause
    exit /b 1
)

echo ✅ Test script found

REM Check if server is running
echo 🔍 Checking if server is running on port 3000...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Server is not running on port 3000
    echo Starting the development server...
    
    start /min npm run dev
    
    echo ⏳ Waiting for server to start...
    timeout /t 10 /nobreak >nul
    
    REM Check again
    curl -s http://localhost:3000 >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Failed to start server. Please run 'npm run dev' manually
        pause
        exit /b 1
    )
    echo ✅ Server is now running
) else (
    echo ✅ Server is running on port 3000
)

REM Check environment variables
echo 🔑 Checking environment variables...
if exist ".env.local" (
    echo ✅ Environment file found: .env.local
    
    REM Check for required variables (basic check)
    findstr /C:"GOOGLE_EARTH_ENGINE_CLIENT_EMAIL" .env.local >nul 2>&1
    if %errorlevel% equ 0 (
        echo    ✅ GOOGLE_EARTH_ENGINE_CLIENT_EMAIL is set
    ) else (
        echo    ❌ GOOGLE_EARTH_ENGINE_CLIENT_EMAIL is missing
    )
    
    findstr /C:"NASA_API_KEY" .env.local >nul 2>&1
    if %errorlevel% equ 0 (
        echo    ✅ NASA_API_KEY is set
    ) else (
        echo    ❌ NASA_API_KEY is missing
    )
    
    findstr /C:"OPENWEATHER_API_KEY" .env.local >nul 2>&1
    if %errorlevel% equ 0 (
        echo    ✅ OPENWEATHER_API_KEY is set
    ) else (
        echo    ❌ OPENWEATHER_API_KEY is missing
    )
    
    echo.
    echo ⚠️  Note: Check that API keys don't have placeholder values
    echo    The system will use fallback data if keys are invalid
) else (
    echo ⚠️  Environment file not found
    echo    Please create .env.local with your API keys
    echo    See SATELLITE_SETUP.md for instructions
)

REM Install dependencies if needed
echo 📦 Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
) else (
    echo ✅ Dependencies are installed
)

echo.
echo 🚀 Running comprehensive pipeline tests...
echo ============================================================

REM Run the test suite
node test-pipeline-complete.js
set exitCode=%errorlevel%

REM Summary
echo.
echo ============================================================
if %exitCode% equ 0 (
    echo 🎉 Test suite completed successfully!
) else (
    echo ❌ Test suite completed with errors (Exit code: %exitCode%)
)

echo.
echo 💡 Next steps:
echo    1. Review the test results above
echo    2. Fix any failed tests
echo    3. Update API keys in .env.local if needed
echo    4. Re-run tests to verify fixes
echo.
echo 🏁 Pipeline testing complete!

pause
exit /b %exitCode%
