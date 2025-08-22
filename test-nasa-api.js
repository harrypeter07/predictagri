#!/usr/bin/env node

/**
 * 🚀 NASA API Key and Functionality Test Script
 * 
 * This script will:
 * 1. Check if NASA_API_KEY environment variable is set
 * 2. Validate the API key format
 * 3. Test individual NASA API endpoints
 * 4. Test the complete NASA API route
 * 5. Provide detailed error analysis
 * 
 * Usage: node test-nasa-api.js
 */

import https from 'https';
import http from 'http';

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  nasaApiKey: "CXhkWzJHRwFV1x1IVghnxE5zQqQm2UVjxOUT63FU",
  timeout: 15000
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logHeader = (title) => {
  log('\n' + '='.repeat(60), 'cyan');
  log(` ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
};

const logSection = (title) => {
  log(`\n📋 ${title}`, 'yellow');
  log('-'.repeat(40), 'yellow');
};

const logSuccess = (message) => log(`✅ ${message}`, 'green');
const logError = (message) => log(`❌ ${message}`, 'red');
const logWarning = (message) => log(`⚠️  ${message}`, 'yellow');
const logInfo = (message) => log(`ℹ️  ${message}`, 'blue');

// HTTP request function with timeout
const makeRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      timeout: CONFIG.timeout,
      ...options
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
};

// Test 1: Environment Variable Check
const testEnvironmentVariables = () => {
  logHeader('ENVIRONMENT VARIABLES CHECK');
  
  logSection('NASA API Key Status');
  
  if (!CONFIG.nasaApiKey) {
    logError('NASA_API_KEY environment variable is NOT set');
    logInfo('To set it, create a .env.local file with:');
    logInfo('NASA_API_KEY=your_actual_api_key_here');
    return false;
  }
  
  if (CONFIG.nasaApiKey === 'your_nasa_api_key_here' || 
      CONFIG.nasaApiKey === 'demo' || 
      CONFIG.nasaApiKey.length < 10) {
    logWarning('NASA_API_KEY appears to be a placeholder or invalid');
    logInfo(`Current value: ${CONFIG.nasaApiKey}`);
    logInfo('Please update with a valid NASA API key');
    return false;
  }
  
  logSuccess(`NASA_API_KEY is set (length: ${CONFIG.nasaApiKey.length})`);
  logInfo(`Key format: ${CONFIG.nasaApiKey.substring(0, 8)}...${CONFIG.nasaApiKey.substring(CONFIG.nasaApiKey.length - 4)}`);
  return true;
};

// Test 2: Direct NASA API Endpoint Tests
const testDirectNASAEndpoints = async () => {
  logHeader('DIRECT NASA API ENDPOINT TESTS');
  
  if (!CONFIG.nasaApiKey) {
    logWarning('Skipping direct NASA API tests - no API key available');
    return;
  }
  
  const endpoints = [
    {
      name: 'APOD (Astronomy Picture of the Day)',
      url: `https://api.nasa.gov/planetary/apod?api_key=${CONFIG.nasaApiKey}`
    },
    {
      name: 'EPIC (Earth Polychromatic Imaging Camera)',
      url: `https://api.nasa.gov/EPIC/api/natural/latest?api_key=${CONFIG.nasaApiKey}`
    },
    {
      name: 'EONET (Earth Observatory Natural Event Tracker)',
      url: `https://eonet.gsfc.nasa.gov/api/v3/events?api_key=${CONFIG.nasaApiKey}&limit=1`
    }
  ];
  
  for (const endpoint of endpoints) {
    logSection(endpoint.name);
    logInfo(`Testing: ${endpoint.url}`);
    
    try {
      const response = await makeRequest(endpoint.url);
      
      if (response.status === 200) {
        logSuccess(`✅ ${endpoint.name} - Status: ${response.status}`);
        
        if (response.data.error) {
          logWarning(`API returned error: ${response.data.error}`);
        } else {
          logInfo(`Response keys: ${Object.keys(response.data).join(', ')}`);
        }
      } else if (response.status === 401) {
        logError(`❌ ${endpoint.name} - Unauthorized (Invalid API key)`);
      } else if (response.status === 403) {
        logError(`❌ ${endpoint.name} - Forbidden (API key may be invalid or rate limited)`);
      } else {
        logWarning(`⚠️ ${endpoint.name} - Status: ${response.status}`);
        logInfo(`Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
      }
    } catch (error) {
      logError(`❌ ${endpoint.name} - Error: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

// Test 3: Local NASA API Route Test
const testLocalNASAAPI = async () => {
  logHeader('LOCAL NASA API ROUTE TEST');
  
  logSection('Testing /api/agri/nasa endpoint');
  
  try {
    const response = await makeRequest(
      `${CONFIG.baseUrl}/api/agri/nasa?lat=19.7515&lon=75.7139`
    );
    
    if (response.status === 200) {
      logSuccess('✅ Local NASA API route working');
      
      if (response.data.success) {
        logInfo('Response structure:');
        Object.keys(response.data).forEach(key => {
          if (key !== 'success') {
            const data = response.data[key];
            if (data && typeof data === 'object') {
              logInfo(`  ${key}: ${Object.keys(data).join(', ')}`);
            } else {
              logInfo(`  ${key}: ${data}`);
            }
          }
        });
      } else {
        logWarning('API returned success: false');
        logInfo(`Error: ${response.data.error}`);
      }
    } else if (response.status === 500) {
      logError('❌ Local NASA API route - Internal Server Error');
      logInfo('Check server logs for detailed error information');
    } else if (response.status === 502) {
      logError('❌ Local NASA API route - Bad Gateway');
      logInfo('This usually means the NASA API timed out or failed');
    } else {
      logWarning(`⚠️ Local NASA API route - Status: ${response.status}`);
      logInfo(`Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
    }
  } catch (error) {
    logError(`❌ Local NASA API route - Error: ${error.message}`);
  }
};

// Test 4: API Key Validation
const validateAPIKey = () => {
  logHeader('API KEY VALIDATION');
  
  if (!CONFIG.nasaApiKey) {
    logError('No API key to validate');
    return false;
  }
  
  logSection('Key Format Analysis');
  
  // Check key length
  if (CONFIG.nasaApiKey.length < 20) {
    logError('API key is too short (should be at least 20 characters)');
    return false;
  }
  
  // Check for common placeholder patterns
  const placeholderPatterns = [
    'your_nasa_api_key',
    'demo',
    'test',
    'placeholder',
    'example',
    'sample'
  ];
  
  const lowerKey = CONFIG.nasaApiKey.toLowerCase();
  for (const pattern of placeholderPatterns) {
    if (lowerKey.includes(pattern)) {
      logError(`API key contains placeholder pattern: ${pattern}`);
      return false;
    }
  }
  
  // Check if it looks like a valid format
  if (!/^[a-zA-Z0-9_-]+$/.test(CONFIG.nasaApiKey)) {
    logWarning('API key contains unusual characters');
  }
  
  logSuccess('API key format appears valid');
  return true;
};

// Test 5: Server Health Check
const testServerHealth = async () => {
  logHeader('SERVER HEALTH CHECK');
  
  try {
    const response = await makeRequest(`${CONFIG.baseUrl}/api/weather`);
    
    if (response.status === 200) {
      logSuccess('✅ Server is running and responding');
      logInfo('Weather API working - server is healthy');
    } else {
      logWarning(`⚠️ Server responding but weather API status: ${response.status}`);
    }
  } catch (error) {
    logError(`❌ Server health check failed: ${error.message}`);
    logInfo('Make sure your Next.js server is running with: npm run dev');
    return false;
  }
  
  return true;
};

// Main test execution
const runTests = async () => {
  logHeader('NASA API DIAGNOSTIC TEST SUITE');
  logInfo(`Base URL: ${CONFIG.baseUrl}`);
  logInfo(`Timeout: ${CONFIG.timeout}ms`);
  logInfo(`NASA API Key: ${CONFIG.nasaApiKey ? 'Set' : 'Not Set'}`);
  
  // Run tests in sequence
  const envCheck = testEnvironmentVariables();
  const serverHealth = await testServerHealth();
  
  if (serverHealth) {
    await testDirectNASAEndpoints();
    await testLocalNASAAPI();
  }
  
  validateAPIKey();
  
  // Summary
  logHeader('TEST SUMMARY');
  if (envCheck && serverHealth) {
    logSuccess('All basic checks completed');
    logInfo('Check the results above for specific issues');
  } else {
    logError('Some basic checks failed');
    logInfo('Fix the issues above before proceeding');
  }
  
  logInfo('\n💡 Next Steps:');
  if (!CONFIG.nasaApiKey) {
    logInfo('1. Get a NASA API key from: https://api.nasa.gov/');
    logInfo('2. Add it to your .env.local file');
    logInfo('3. Restart your server');
  } else if (CONFIG.nasaApiKey.includes('your_') || CONFIG.nasaApiKey.includes('demo')) {
    logInfo('1. Replace placeholder API key with real one');
    logInfo('2. Restart your server');
  } else {
    logInfo('1. Check server logs for detailed error messages');
    logInfo('2. Verify API key is valid and not rate limited');
    logInfo('3. Consider removing NASA API if issues persist');
  }
};

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logError('Uncaught Exception:', error);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  logError('Test execution failed:', error);
  process.exit(1);
});
