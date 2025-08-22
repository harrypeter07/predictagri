#!/usr/bin/env node

/**
 * 🚀 NASA Data Service Test Script
 * 
 * This script tests individual methods of the nasaDataService
 * to identify which one is causing the hanging issue.
 */

import { nasaDataService } from './lib/nasaDataService.js'

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

// Test individual methods with timeout
async function testMethod(methodName, methodCall, timeout = 15000) {
  logSection(`Testing ${methodName}`);
  
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${methodName} timeout after ${timeout/1000}s`)), timeout)
    });
    
    const result = await Promise.race([
      methodCall(),
      timeoutPromise
    ]);
    
    logSuccess(`${methodName} completed successfully`);
    logInfo(`Result: ${JSON.stringify(result, null, 2).substring(0, 200)}...`);
    return { success: true, result };
    
  } catch (error) {
    logError(`${methodName} failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  logHeader('NASA DATA SERVICE TEST SUITE');
  
  const results = {};
  
  // Test 1: APOD
  results.apod = await testMethod(
    'getAPOD()',
    () => nasaDataService.getAPOD(),
    10000
  );
  
  // Test 2: Natural Disasters
  results.disasters = await testMethod(
    'getNaturalDisasters(3)',
    () => nasaDataService.getNaturalDisasters(3),
    10000
  );
  
  // Test 3: Earth Imagery
  results.imagery = await testMethod(
    'getEarthImagery(38.5111, -96.8005)',
    () => nasaDataService.getEarthImagery(38.5111, -96.8005),
    15000
  );
  
  // Test 4: EPIC Images (known to be problematic)
  results.epic = await testMethod(
    'getEPICImages()',
    () => nasaDataService.getEPICImages(),
    8000
  );
  
  // Summary
  logHeader('TEST SUMMARY');
  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;
  
  logInfo(`Total methods tested: ${total}`);
  logInfo(`Successful: ${successful}`);
  logInfo(`Failed: ${total - successful}`);
  
  Object.entries(results).forEach(([method, result]) => {
    if (result.success) {
      logSuccess(`${method}: ✅ Working`);
    } else {
      logError(`${method}: ❌ ${result.error}`);
    }
  });
  
  if (successful === total) {
    logSuccess('All NASA service methods are working!');
  } else {
    logWarning('Some methods have issues. Check the details above.');
  }
}

// Run the tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  process.exit(1);
});
