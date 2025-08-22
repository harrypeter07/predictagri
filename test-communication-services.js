#!/usr/bin/env node

/**
 * 📞 Communication Services Test Script
 * Tests email, SMS, voice calls, and messaging services
 * 
 * Usage: node test-communication-services.js
 * 
 * This script will test:
 * 1. Twilio SMS Service
 * 2. Twilio Voice Call Service  
 * 3. Email Service (if implemented)
 * 4. Voice Assistant Service
 * 5. Alert System Integration
 */

import https from 'https';
import http from 'http';

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 15000,
  testPhoneNumber: '+919322909257',
  testEmail: 'hassanmansuri570@gmail.com',
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

// Test functions
async function testSMSAlert() {
  const url = `${CONFIG.baseUrl}/api/alerts`;
  const body = JSON.stringify({
    phoneNumber: CONFIG.testPhoneNumber,
    alertData: {
      type: 'drought',
      severity: 'medium',
      region: 'Test Region',
      crop: 'Wheat',
      recommendation: 'Monitor soil moisture levels and consider irrigation.'
    },
    language: 'en'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

async function testVoiceAlert() {
  const url = `${CONFIG.baseUrl}/api/alerts`;
  const body = JSON.stringify({
    phoneNumber: CONFIG.testPhoneNumber,
    alertData: {
      type: 'pest',
      severity: 'high',
      region: 'Test Farm',
      crop: 'Cotton',
      recommendation: 'Apply organic pesticide immediately.'
    },
    language: 'en'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

async function testVoiceAssistant() {
  const url = `${CONFIG.baseUrl}/api/voice`;
  const body = JSON.stringify({
    audioInput: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUdCEih5OSydB0FJH/L7+OWPAoYZ7zj46BLFAw+ltryxngsBSl+zPLaizsIGGi58+CbTgwOUarm7bllHgg2jdXzzn0vBSF1xe/eizELDl2t5+qnWBQLQJvd8sFkHAg7k9n0unEfBC2Exe7diDALEWSz6+OZRQ==',
    language: 'en',
    context: {
      farmerId: 'test_farmer_001',
      location: 'Test Farm',
      crops: ['Wheat', 'Cotton']
    }
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

async function testVoiceCommands() {
  const url = `${CONFIG.baseUrl}/api/voice?language=en`;

  return makeRequest(url, {
    method: 'GET'
  });
}

async function testMultilingualAlert() {
  const url = `${CONFIG.baseUrl}/api/alerts`;
  const body = JSON.stringify({
    phoneNumber: CONFIG.testPhoneNumber,
    alertData: {
      type: 'weather',
      severity: 'high',
      region: 'महाराष्ट्र',
      crop: 'धान',
      recommendation: 'बारिश के कारण फसल की सुरक्षा करें।'
    },
    language: 'hi'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

async function testWeatherAlert() {
  const url = `${CONFIG.baseUrl}/api/alerts`;
  const body = JSON.stringify({
    phoneNumber: CONFIG.testPhoneNumber,
    alertData: {
      type: 'flood',
      severity: 'high',
      region: 'Nagpur',
      crop: 'Rice',
      recommendation: 'Heavy rainfall expected. Ensure proper drainage and move equipment to higher ground.'
    },
    language: 'en'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

async function testEmergencyAlert() {
  const url = `${CONFIG.baseUrl}/api/alerts`;
  const body = JSON.stringify({
    phoneNumber: CONFIG.testPhoneNumber,
    alertData: {
      type: 'disease',
      severity: 'critical',
      region: 'Test Farm',
      crop: 'Tomato',
      recommendation: 'Disease outbreak detected. Isolate affected plants immediately and apply fungicide.'
    },
    language: 'en'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

// Email service tests
async function testEmailService() {
  const url = `${CONFIG.baseUrl}/api/email?action=test`;
  
  return makeRequest(url, {
    method: 'GET'
  });
}

async function testAgriculturalEmail() {
  const url = `${CONFIG.baseUrl}/api/email`;
  const body = JSON.stringify({
    email: CONFIG.testEmail,
    type: 'agricultural_alert',
    data: {
      type: 'drought',
      severity: 'high',
      region: 'Maharashtra',
      crop: 'Cotton',
      recommendation: 'Immediate irrigation required. Monitor soil moisture levels closely.'
    },
    language: 'en'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

async function testWeatherEmail() {
  const url = `${CONFIG.baseUrl}/api/email`;
  const body = JSON.stringify({
    email: CONFIG.testEmail,
    type: 'weather_forecast',
    data: {
      temperature: 32,
      humidity: 75,
      precipitation: 25,
      region: 'Nagpur',
      forecast: 'Moderate rainfall expected in the next 3 days. Good conditions for rice cultivation.'
    },
    language: 'en'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

async function testCropInsightsEmail() {
  const url = `${CONFIG.baseUrl}/api/email`;
  const body = JSON.stringify({
    email: CONFIG.testEmail,
    type: 'crop_insights',
    data: {
      soilHealth: 'Excellent soil conditions with optimal pH and nutrients.',
      cropSuitability: 'High suitability for wheat and cotton cultivation.',
      recommendations: [
        'Consider planting wheat in the northern fields',
        'Cotton cultivation recommended for southern fields',
        'Regular soil testing advised'
      ]
    },
    language: 'en'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

async function testYieldPredictionEmail() {
  const url = `${CONFIG.baseUrl}/api/email`;
  const body = JSON.stringify({
    email: CONFIG.testEmail,
    type: 'yield_prediction',
    data: {
      crop: 'Wheat',
      predictedYield: '4.5 tons per hectare',
      confidence: 85,
      factors: [
        'Favorable weather conditions',
        'Optimal soil moisture',
        'Good fertilizer application'
      ]
    },
    language: 'en'
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

// Service status check
async function checkTwilioConfiguration() {
  log('\n🔧 Checking Twilio Configuration...', 'info');
  
  // Check if Twilio environment variables are set
  const twilioConfigured = process.env.TWILIO_ACCOUNT_SID && 
                          process.env.TWILIO_AUTH_TOKEN && 
                          process.env.TWILIO_PHONE_NUMBER;
  
  if (twilioConfigured) {
    log('✅ Twilio credentials found', 'success');
    log(`📱 Twilio Phone: ${process.env.TWILIO_PHONE_NUMBER || 'Not configured'}`, 'info');
  } else {
    log('⚠️ Twilio credentials not found in environment', 'warning');
    log('   Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env.local', 'warning');
  }
  
  return twilioConfigured;
}

// Validate service responses
function validateAlertResponse(response) {
  console.log('\n🔍 Validating Alert Response Structure:');
  
  if (!response.data) {
    console.log('   ❌ No response data');
    return false;
  }
  
  const data = response.data;
  let score = 0;
  
  if (data.success !== undefined) {
    console.log(`   ✅ Success field: ${data.success}`);
    score += 25;
  }
  
  if (data.sms) {
    console.log(`   📱 SMS Result: ${data.sms.success ? 'Success' : 'Failed'}`);
    if (data.sms.sid) {
      console.log(`      SID: ${data.sms.sid}`);
    }
    score += 25;
  }
  
  if (data.voice) {
    console.log(`   📞 Voice Result: ${data.voice.success ? 'Success' : 'Failed'}`);
    if (data.voice.sid) {
      console.log(`      SID: ${data.voice.sid}`);
    }
    score += 25;
  }
  
  if (data.error) {
    console.log(`   ❌ Error: ${data.error}`);
    score -= 25;
  }
  
  console.log(`   📊 Response Quality Score: ${score}/75`);
  return score > 0;
}

function validateVoiceResponse(response) {
  console.log('\n🔍 Validating Voice Assistant Response:');
  
  if (!response.data) {
    console.log('   ❌ No response data');
    return false;
  }
  
  const data = response.data;
  let score = 0;
  
  if (data.success !== undefined) {
    console.log(`   ✅ Success field: ${data.success}`);
    score += 30;
  }
  
  if (data.transcription) {
    console.log(`   🎤 Transcription: "${data.transcription.substring(0, 50)}..."`);
    score += 25;
  }
  
  if (data.response) {
    console.log(`   🗣️ Response: "${data.response.substring(0, 50)}..."`);
    score += 25;
  }
  
  if (data.commands && Array.isArray(data.commands)) {
    console.log(`   📋 Available Commands: ${data.commands.length}`);
    score += 20;
  }
  
  console.log(`   📊 Voice Response Quality Score: ${score}/100`);
  return score > 50;
}

// Main test execution
async function runCommunicationTests() {
  console.log('📞 Starting Communication Services Test Suite...\n');
  console.log(`📱 Test Phone Number: ${CONFIG.testPhoneNumber}`);
  console.log(`📧 Test Email: ${CONFIG.testEmail}\n`);
  
  // Check service configuration
  const twilioConfigured = await checkTwilioConfiguration();
  
  // Test 1: SMS Alert Service
  console.log('\n🔍 Testing: SMS Alert Service');
  const smsResult = await testWithRetry('SMS Alert Service', testSMSAlert);
  
  if (smsResult.success && smsResult.data) {
    validateAlertResponse(smsResult);
  }
  
  // Test 2: Voice Call Alert Service
  console.log('\n🔍 Testing: Voice Call Alert Service');
  const voiceResult = await testWithRetry('Voice Call Alert Service', testVoiceAlert);
  
  if (voiceResult.success && voiceResult.data) {
    validateAlertResponse(voiceResult);
  }
  
  // Test 3: Voice Assistant Service
  console.log('\n🔍 Testing: Voice Assistant Service');
  const assistantResult = await testWithRetry('Voice Assistant Service', testVoiceAssistant);
  
  if (assistantResult.success && assistantResult.data) {
    validateVoiceResponse(assistantResult);
  }
  
  // Test 4: Voice Commands
  console.log('\n🔍 Testing: Voice Commands API');
  const commandsResult = await testWithRetry('Voice Commands API', testVoiceCommands);
  
  // Test 5: Multilingual Alert
  console.log('\n🔍 Testing: Multilingual Alert (Hindi)');
  const multilingualResult = await testWithRetry('Multilingual Alert', testMultilingualAlert);
  
  // Test 6: Weather Alert
  console.log('\n🔍 Testing: Weather Alert Service');
  const weatherResult = await testWithRetry('Weather Alert Service', testWeatherAlert);
  
  // Test 7: Emergency Alert
  console.log('\n🔍 Testing: Emergency Alert Service');
  const emergencyResult = await testWithRetry('Emergency Alert Service', testEmergencyAlert);
  
  // Test 8: Email Service Status
  console.log('\n🔍 Testing: Email Service Status');
  const emailStatusResult = await testWithRetry('Email Service Status', testEmailService);
  
  // Test 9: Agricultural Email Alert
  console.log('\n🔍 Testing: Agricultural Email Alert');
  const emailAlertResult = await testWithRetry('Agricultural Email Alert', testAgriculturalEmail);
  
  // Test 10: Weather Forecast Email
  console.log('\n🔍 Testing: Weather Forecast Email');
  const weatherEmailResult = await testWithRetry('Weather Forecast Email', testWeatherEmail);
  
  // Test 11: Crop Insights Email
  console.log('\n🔍 Testing: Crop Insights Email');
  const insightsEmailResult = await testWithRetry('Crop Insights Email', testCropInsightsEmail);
  
  // Test 12: Yield Prediction Email
  console.log('\n🔍 Testing: Yield Prediction Email');
  const yieldEmailResult = await testWithRetry('Yield Prediction Email', testYieldPredictionEmail);
  
  // Summary
  console.log('\n📊 Communication Services Test Summary Report');
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
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // Configuration recommendations
  console.log('\n💡 Service Configuration Status:');
  if (twilioConfigured) {
    console.log('   ✅ Twilio SMS/Voice: Configured');
  } else {
    console.log('   ❌ Twilio SMS/Voice: Not configured');
    console.log('      Add Twilio credentials to .env.local');
  }
  
  // Check email service status from test results
  const emailConfigured = emailStatusResult && emailStatusResult.data && 
                          emailStatusResult.data.test && emailStatusResult.data.test.configured;
  
  if (emailConfigured) {
    console.log('   ✅ Email Service: Configured');
  } else {
    console.log('   ❌ Email Service: Not configured (using fallback mode)');
    console.log('      Add email credentials to .env.local for real emails');
  }
  
  console.log('\n📞 Communication Services Test Complete!');
  
  if (testResults.failed === 0) {
    console.log('🎉 All communication services are working correctly!');
  } else {
    console.log('⚠️ Some services failed. Check configuration and try again.');
  }
}

// Export for potential reuse
export { runCommunicationTests, testResults };

// Run tests if this file is executed directly
runCommunicationTests().catch(console.error);
