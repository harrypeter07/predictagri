@echo off
chcp 65001 >nul
title 🚀 NASA API Diagnostic Test

echo.
echo 🚀 NASA API Diagnostic Test Suite
echo ================================================
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
if not exist "test-nasa-api.js" (
    echo ❌ Test script 'test-nasa-api.js' not found
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
    echo Please start your server with: npm run dev
    pause
    exit /b 1
)

echo ✅ Server is running on port 3000

REM Check environment file
echo 🔑 Checking environment configuration...
if exist ".env.local" (
    echo ✅ Environment file found: .env.local
    
    REM Check for NASA API key
    findstr /C:"NASA_API_KEY" .env.local >nul 2>&1
    if %errorlevel% equ 0 (
        echo    ✅ NASA_API_KEY is set
    ) else (
        echo    ❌ NASA_API_KEY is missing
    )
) else (
    echo ⚠️  Environment file not found
    echo    Please create .env.local with your NASA API key
)

echo.
echo 🚀 Running NASA API diagnostic tests...
echo ================================================

REM Run the test suite
node test-nasa-api.js

echo.
echo ================================================
echo 🏁 NASA API diagnostic tests complete!
echo.
echo 💡 Check the results above for issues
echo 📝 Review the recommendations provided
pause
