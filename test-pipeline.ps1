# PowerShell Script to Test Complete Agricultural Pipeline
# This script will run comprehensive tests to ensure real data integration

Write-Host "🧪 Starting Complete Pipeline Test Suite" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if the test script exists
if (-not (Test-Path "test-pipeline-complete.js")) {
    Write-Host "❌ Test script 'test-pipeline-complete.js' not found" -ForegroundColor Red
    Write-Host "Please ensure you're in the correct directory" -ForegroundColor Yellow
    exit 1
}

# Check if server is running
Write-Host "🔍 Checking if server is running on port 3000..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Server is running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running on port 3000" -ForegroundColor Red
    Write-Host "Starting the development server..." -ForegroundColor Yellow
    
    # Start the development server in background
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Minimized
    
    Write-Host "⏳ Waiting for server to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Check again
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ Server is now running" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start server. Please run 'npm run dev' manually" -ForegroundColor Red
        exit 1
    }
}

# Check environment variables
Write-Host "🔑 Checking environment variables..." -ForegroundColor Yellow
$envFile = ".env.local"
if (Test-Path $envFile) {
    Write-Host "✅ Environment file found: $envFile" -ForegroundColor Green
    
    # Read and check key environment variables
    $envContent = Get-Content $envFile
    $requiredVars = @(
        "GOOGLE_EARTH_ENGINE_CLIENT_EMAIL",
        "GOOGLE_EARTH_ENGINE_PRIVATE_KEY", 
        "NASA_API_KEY",
        "OPENWEATHER_API_KEY",
        "OPENCAGE_API_KEY",
        "TIMEZONE_API_KEY"
    )
    
    $missingVars = @()
    foreach ($var in $requiredVars) {
        if ($envContent -match "^$var=") {
            $value = ($envContent | Where-Object { $_ -match "^$var=" }) -split "=", 2 | Select-Object -Last 1
            if ($value -and $value -ne "your_$($var.ToLower())_here" -and $value -ne "demo") {
                Write-Host "   ✅ $var is set" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  $var has placeholder value" -ForegroundColor Yellow
                $missingVars += $var
            }
        } else {
            Write-Host "   ❌ $var is missing" -ForegroundColor Red
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Host "⚠️  Some API keys are missing or have placeholder values" -ForegroundColor Yellow
        Write-Host "   The system will use fallback data for these services" -ForegroundColor Yellow
    } else {
        Write-Host "🎉 All required API keys are properly configured!" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Environment file not found. Creating template..." -ForegroundColor Yellow
    
    # Create template environment file
    $template = @"
# Google Earth Engine API Keys (Required for Satellite Images)
GOOGLE_EARTH_ENGINE_CLIENT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
GOOGLE_EARTH_ENGINE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"

# NASA API Key (Required for Agricultural Insights)
NASA_API_KEY=your_nasa_api_key_here

# OpenWeather API Keys (Required for Weather Data)
OPENWEATHER_API_KEY=your_openweather_api_key_here
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key_here

# OpenCage API Key (Required for Geocoding)
OPENCAGE_API_KEY=your_opencage_api_key_here

# TimezoneDB API Key (Required for Timezone Data)
TIMEZONE_API_KEY=your_timezone_api_key_here

# Twilio API Keys (Required for SMS Alerts)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
"@
    
    $template | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "📝 Created template environment file: $envFile" -ForegroundColor Green
    Write-Host "   Please update it with your actual API keys" -ForegroundColor Yellow
}

# Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "✅ Dependencies are installed" -ForegroundColor Green
}

# Run the test suite
Write-Host "🚀 Running comprehensive pipeline tests..." -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

try {
    node test-pipeline-complete.js
    $exitCode = $LASTEXITCODE
} catch {
    Write-Host "❌ Failed to run tests: $($_.Exception.Message)" -ForegroundColor Red
    $exitCode = 1
}

# Summary
Write-Host "=" * 60 -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "🎉 Test suite completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Test suite completed with errors (Exit code: $exitCode)" -ForegroundColor Red
}

Write-Host "`n💡 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Review the test results above" -ForegroundColor White
Write-Host "   2. Fix any failed tests" -ForegroundColor White
Write-Host "   3. Update API keys in .env.local if needed" -ForegroundColor White
Write-Host "   4. Re-run tests to verify fixes" -ForegroundColor White

Write-Host "`n🏁 Pipeline testing complete!" -ForegroundColor Green
exit $exitCode
