#!/usr/bin/env node

/**
 * 📱 SMS Status Test Script
 * Tests if SMS service is working and checks for daily limits
 * 
 * Usage: node test-sms-status.js
 */

import https from 'https';
import http from 'http';

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 10000,
  testPhoneNumber: '+919322909257'
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '🔍';
  console.log(`${prefix} ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(CONFIG.timeout);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testSMSStatus() {
  log('📱 Starting SMS Status Test...', 'info');
  log(`📞 Test Phone Number: ${CONFIG.testPhoneNumber}`, 'info');
  log('', 'info');

  try {
    // Test 1: Check SMS service status
    log('🔍 Testing: SMS Service Status', 'info');
    const statusResponse = await makeRequest(`${CONFIG.baseUrl}/api/alerts`);
    
    if (statusResponse.status === 200) {
      const statusData = statusResponse.data;
      
      if (statusData.configured) {
        log('✅ Twilio is configured', 'success');
        
        if (statusData.limitExceeded) {
          log('⚠️ Daily SMS limit exceeded!', 'warning');
          log('📅 Will reset at midnight UTC', 'info');
          log('💡 Consider upgrading Twilio account', 'info');
        } else {
          log('✅ SMS service is available', 'success');
        }
      } else {
        log('❌ Twilio not configured', 'error');
        log('🔧 Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env.local', 'warning');
      }
      
      log(`📊 Status: ${JSON.stringify(statusData, null, 2)}`, 'info');
    } else {
      log(`❌ Status check failed: ${statusResponse.status}`, 'error');
    }

    log('', 'info');

    // Test 2: Test actual SMS sending
    log('🔍 Testing: SMS Sending Test', 'info');
    const testResponse = await makeRequest(`${CONFIG.baseUrl}/api/alerts?phone=${CONFIG.testPhoneNumber}`);
    
    if (testResponse.status === 200) {
      const testData = testResponse.data;
      
      if (testData.success) {
        log('✅ SMS test successful!', 'success');
        log(`📱 Message ID: ${testData.testResult?.messageId || 'N/A'}`, 'info');
        log(`📊 Status: ${testData.testResult?.status || 'N/A'}`, 'info');
      } else {
        if (testData.limitExceeded) {
          log('⚠️ Daily SMS limit exceeded!', 'warning');
          log('📅 Will reset at midnight UTC', 'info');
          log('💡 Consider upgrading Twilio account', 'info');
        } else {
          log('❌ SMS test failed', 'error');
          log(`📝 Error: ${testData.message || testData.error}`, 'error');
        }
      }
      
      log(`📊 Test Result: ${JSON.stringify(testData, null, 2)}`, 'info');
    } else {
      log(`❌ SMS test failed: ${testResponse.status}`, 'error');
    }

  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'error');
  }

  log('', 'info');
  log('📱 SMS Status Test Complete!', 'info');
}

// Run the test
testSMSStatus().catch(console.error);
