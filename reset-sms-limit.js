#!/usr/bin/env node

/**
 * 🔄 SMS Limit Reset Script
 * Resets the SMS limit exceeded flag when daily limit resets
 * 
 * Usage: node reset-sms-limit.js
 */

import https from 'https';
import http from 'http';

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 5000
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

async function resetSMSLimit() {
  log('🔄 Starting SMS Limit Reset...', 'info');
  
  try {
    // Check current status
    log('🔍 Checking current SMS status...', 'info');
    const statusResponse = await makeRequest(`${CONFIG.baseUrl}/api/alerts`);
    
    if (statusResponse.status === 200) {
      const statusData = statusResponse.data;
      
      if (statusData.limitExceeded) {
        log('⚠️ SMS limit is currently exceeded', 'warning');
        log('🔄 Attempting to reset...', 'info');
        
        // Try to send a test SMS to see if limit has reset
        const testResponse = await makeRequest(`${CONFIG.baseUrl}/api/alerts?phone=+919322909257`);
        
        if (testResponse.status === 200) {
          const testData = testResponse.data;
          
          if (testData.success && !testData.limitExceeded) {
            log('✅ SMS limit has been reset!', 'success');
            log('📱 SMS service is now available', 'success');
          } else if (testData.limitExceeded) {
            log('⚠️ SMS limit is still exceeded', 'warning');
            log('📅 Wait until midnight UTC for automatic reset', 'info');
            log('💡 Or upgrade your Twilio account', 'info');
          } else {
            log('❌ Could not determine SMS limit status', 'error');
          }
        } else {
          log('❌ Failed to test SMS status', 'error');
        }
      } else {
        log('✅ SMS limit is not exceeded', 'success');
        log('📱 SMS service is available', 'success');
      }
    } else {
      log('❌ Failed to check SMS status', 'error');
    }
    
  } catch (error) {
    log(`❌ Reset failed: ${error.message}`, 'error');
  }

  log('', 'info');
  log('🔄 SMS Limit Reset Complete!', 'info');
}

// Run the reset
resetSMSLimit().catch(console.error);
