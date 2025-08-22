@echo off
echo ========================================
echo    Weather API Test Suite Runner
echo ========================================
echo.

echo Checking Node.js version...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Node.js found! Running weather API tests...
echo.

echo Testing OpenMeteo API directly...
node test-weather-api-modern.js

echo.
echo ========================================
echo Tests completed! Check output above.
echo ========================================
echo.
pause
