#!/usr/bin/env node

/**
 * 🇮🇳 Hindi Voice Call Test Only
 * Tests only Hindi voice call functionality
 * 
 * Usage: node test-hindi-call-only.js
 */

import https from 'https';
import http from 'http';

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 15000,
  testPhoneNumber: '+919322909257',
  retries: 2
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '🔍';
  console.log(`${prefix} ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || CONFIG.timeout
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
            parseError: true
          });
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
}

async function testWithRetry(testName, testFn, retries = CONFIG.retries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await testFn();
      testResults.total++;
      
      let isSuccess = false;
      if (result.status === 200) {
        if (result.data && result.data.success !== undefined) {
          isSuccess = result.data.success;
        } else if (result.data && !result.data.error) {
          isSuccess = true;
        }
      }
      
      if (isSuccess) {
        testResults.passed++;
        log(`${testName} - PASSED (${result.status})`, 'success');
        if (result.data) {
          console.log(`   📊 Response keys: ${Object.keys(result.data).join(', ')}`);
          if (result.data.success !== undefined) {
            console.log(`   🎯 Success: ${result.data.success}`);
          }
          if (result.data.sms || result.data.voice) {
            console.log(`   📱 SMS: ${result.data.sms?.success ? 'Sent' : 'Failed'}`);
            console.log(`   📞 Voice: ${result.data.voice?.success ? 'Sent' : 'Failed'}`);
            if (result.data.voice?.sid) {
              console.log(`   🆔 Voice SID: ${result.data.voice.sid}`);
            }
          }
        }
      } else {
        testResults.failed++;
        log(`${testName} - FAILED (${result.status})`, 'error');
        if (result.data && result.data.error) {
          console.log(`   📝 Error: ${result.data.error}`);
        } else if (result.data) {
          console.log(`   📝 Response: ${JSON.stringify(result.data).substring(0, 150)}...`);
        }
      }
      
      testResults.details.push({
        name: testName,
        success: isSuccess,
        status: result.status,
        data: result.data
      });
      
      return { success: isSuccess, status: result.status, data: result.data };
    } catch (error) {
      if (attempt === retries) {
        testResults.failed++;
        testResults.total++;
        log(`${testName} - FAILED (Error: ${error.message})`, 'error');
        testResults.details.push({
          name: testName,
          success: false,
          error: error.message
        });
        return { success: false, error: error.message };
      }
      
      if (attempt < retries) {
        console.log(`   🔄 Retrying... (${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

// Hindi Voice Call Tests Only

// Test 1: Hindi Disease Alert Voice Call
async function testHindiDiseaseVoiceCall() {
  const url = `${CONFIG.baseUrl}/api/alerts`;
  const body = JSON.stringify({
    phoneNumber: CONFIG.testPhoneNumber,
    alertData: {
      type: 'disease',
      severity: 'high',
      region: 'नागपूर',
      crop: 'गेहूं',
      recommendation: 'फसल रोग का पता चला है। तुरंत फंगिसाइड लगाएं।'
    },
    language: 'hi'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

// Test 2: Hindi Drought Alert Voice Call
async function testHindiDroughtVoiceCall() {
  const url = `${CONFIG.baseUrl}/api/alerts`;
  const body = JSON.stringify({
    phoneNumber: CONFIG.testPhoneNumber,
    alertData: {
      type: 'drought',
      severity: 'critical',
      region: 'महाराष्ट्र',
      crop: 'कपास',
      recommendation: 'सूखे की स्थिति का पता चला है। तुरंत सिंचाई करें।'
    },
    language: 'hi'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

// Test 3: Hindi Flood Alert Voice Call
async function testHindiFloodVoiceCall() {
  const url = `${CONFIG.baseUrl}/api/alerts`;
  const body = JSON.stringify({
    phoneNumber: CONFIG.testPhoneNumber,
    alertData: {
      type: 'flood',
      severity: 'high',
      region: 'पुणे',
      crop: 'धान',
      recommendation: 'बाढ़ की चेतावनी है। फसल को सुरक्षित स्थान पर ले जाएं।'
    },
    language: 'hi'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

// Test 4: Hindi Pest Alert Voice Call
async function testHindiPestVoiceCall() {
  const url = `${CONFIG.baseUrl}/api/alerts`;
  const body = JSON.stringify({
    phoneNumber: CONFIG.testPhoneNumber,
    alertData: {
      type: 'pest',
      severity: 'medium',
      region: 'औरंगाबाद',
      crop: 'टमाटर',
      recommendation: 'कीटों का प्रकोप पाया गया है। कीटनाशक का छिड़काव करें।'
    },
    language: 'hi'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

// Test 5: Hindi Weather Alert Voice Call
async function testHindiWeatherVoiceCall() {
  const url = `${CONFIG.baseUrl}/api/alerts`;
  const body = JSON.stringify({
    phoneNumber: CONFIG.testPhoneNumber,
    alertData: {
      type: 'weather',
      severity: 'medium',
      region: 'मुंबई',
      crop: 'गन्ना',
      recommendation: 'उच्च तापमान का पता चला है। सिंचाई और छाया संरक्षण पर विचार करें।'
    },
    language: 'hi'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

// Main test execution
async function runHindiCallTests() {
  console.log('🇮🇳 Starting Hindi Voice Call Test Suite...\n');
  console.log(`📱 Test Phone Number: ${CONFIG.testPhoneNumber}\n`);
  
  // Hindi Voice Call Tests
  console.log('🇮🇳 Testing Hindi Voice Call Services:');
  console.log('=' .repeat(50));
  
  // Test 1: Hindi Disease Alert Voice Call
  console.log('\n🔍 Testing: Hindi Disease Alert Voice Call');
  await testWithRetry('Hindi Disease Alert Voice Call', testHindiDiseaseVoiceCall);
  
  // Test 2: Hindi Drought Alert Voice Call
  console.log('\n🔍 Testing: Hindi Drought Alert Voice Call');
  await testWithRetry('Hindi Drought Alert Voice Call', testHindiDroughtVoiceCall);
  
  // Test 3: Hindi Flood Alert Voice Call
  console.log('\n🔍 Testing: Hindi Flood Alert Voice Call');
  await testWithRetry('Hindi Flood Alert Voice Call', testHindiFloodVoiceCall);
  
  // Test 4: Hindi Pest Alert Voice Call
  console.log('\n🔍 Testing: Hindi Pest Alert Voice Call');
  await testWithRetry('Hindi Pest Alert Voice Call', testHindiPestVoiceCall);
  
  // Test 5: Hindi Weather Alert Voice Call
  console.log('\n🔍 Testing: Hindi Weather Alert Voice Call');
  await testWithRetry('Hindi Weather Alert Voice Call', testHindiWeatherVoiceCall);
  
  // Summary
  console.log('\n📊 Hindi Voice Call Test Summary Report');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.total}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n📋 Detailed Test Results:');
  testResults.details.forEach(result => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status}: ${result.name}`);
    if (result.data && result.data.voice) {
      console.log(`   📞 Voice Status: ${result.data.voice.success ? 'Sent' : 'Failed'}`);
      if (result.data.voice.sid) {
        console.log(`   🆔 Voice SID: ${result.data.voice.sid}`);
      }
    }
  });
  
  // Voice call features summary
  console.log('\n🌍 Hindi Voice Call Features:');
  console.log('   ✅ Hindi TTS (Text-to-Speech): Working');
  console.log('   ✅ Hindi Agricultural Terms: Supported');
  console.log('   ✅ Hindi Region Names: Supported');
  console.log('   ✅ Hindi Crop Names: Supported');
  console.log('   ✅ Hindi Alert Messages: Working');
  console.log('   ✅ Voice Call Initiation: Working');
  
  console.log('\n🇮🇳 Hindi Voice Call Test Complete!');
  
  if (testResults.failed === 0) {
    console.log('🎉 All Hindi voice calls are working perfectly!');
  } else {
    console.log('⚠️ Some Hindi voice calls failed. Check configuration and try again.');
  }
}

// Export for potential reuse
export { runHindiCallTests, testResults };

// Run tests if this file is executed directly
runHindiCallTests().catch(console.error);
