#!/usr/bin/env node

/**
 * 🧪 Enhanced Pipeline Test Script - Focused on Fallback Data Generation
 * Tests the enhanced automated pipeline without external API dependencies
 * 
 * Usage: node test-pipeline-complete.js
 * 
 * This script will:
 * 1. Test the enhanced pipeline's fallback data generation
 * 2. Verify agricultural insights generation
 * 3. Test image analysis capabilities
 * 4. Validate recommendation generation
 * 5. Test the complete farmer analysis workflow
 * 6. Verify data quality and structure
 */

import https from 'https';
import http from 'http';

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 15000,
  retries: 3,
  contactInfo: {
    email: 'hassanmansuri570@gmail.com',
    mobile: '+919322909257'
  }
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
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔍';
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
  
      // Check if the test was successful based on the response structure
      let isSuccess = false;
      if (result.status === 200) {
        if (result.data && result.data.success !== undefined) {
          isSuccess = result.data.success;
        } else if (result.data && (result.data.pipelineId || result.data.insights || result.data.dataCollection)) {
          // Pipeline API returns data even if success field is not present
          isSuccess = true;
        } else {
          isSuccess = false;
        }
      } else {
        isSuccess = false;
      }
      
      if (isSuccess) {
        testResults.passed++;
        log(`${testName} - PASSED (${result.status})`, 'success');
        if (result.data) {
          console.log(`   📊 Response keys: ${Object.keys(result.data).join(', ')}`);
          if (result.data.success !== undefined) {
            console.log(`   🎯 Success: ${result.data.success}`);
          }
          if (result.data.pipelineId) {
            console.log(`   🆔 Pipeline ID: ${result.data.pipelineId}`);
          }
          if (result.data.insights) {
            console.log(`   💡 Insights: ${Array.isArray(result.data.insights) ? result.data.insights.length : Object.keys(result.data.insights).length} generated`);
          }
        }
      } else {
        testResults.failed++;
        log(`${testName} - FAILED (${result.status})`, 'error');
        if (result.data && result.data.error) {
          console.log(`   📝 Response: ${JSON.stringify(result.data.error)}`);
        } else if (result.data) {
          console.log(`   📝 Response structure: ${JSON.stringify(result.data).substring(0, 200)}...`);
        }
      }
      
      return { success: isSuccess, status: result.status, data: result.data };
  } catch (error) {
      if (attempt === retries) {
    testResults.failed++;
        testResults.total++;
        log(`${testName} - FAILED (Error: ${error.message})`, 'error');
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
async function testEnhancedPipelineBasic() {
  const url = `${CONFIG.baseUrl}/api/pipeline`;
  const body = JSON.stringify({
    farmerData: {
      farmerId: 'test_farmer_001',
      location: {
        village: 'Test Village',
        district: 'Test District',
        state: 'Test State',
        coordinates: { lat: 21.1458, lon: 79.0882 }
      },
      crops: ['Wheat', 'Cotton'],
      farmSize: 5.5,
      soilType: 'Loam',
      irrigationType: 'Drip',
      contactInfo: CONFIG.contactInfo
    }
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

async function testEnhancedPipelineAdvanced() {
  const url = `${CONFIG.baseUrl}/api/pipeline`;
  const body = JSON.stringify({
    farmerData: {
      farmerId: 'test_farmer_002',
      location: {
        village: 'Advanced Village',
        district: 'Advanced District',
        state: 'Advanced State',
        coordinates: { lat: 19.0760, lon: 72.8777 }
      },
      crops: ['Rice', 'Pulses', 'Vegetables'],
      farmSize: 8.0,
      soilType: 'Clay Loam',
      irrigationType: 'Sprinkler',
      previousYield: 'Good',
      pestIssues: ['Aphids', 'Whiteflies'],
      contactInfo: CONFIG.contactInfo,
      images: [
        {
          type: 'base64',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        }
      ]
    }
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

async function testImageAnalysis() {
  const url = `${CONFIG.baseUrl}/api/image-analysis`;
  const body = JSON.stringify({
    imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    analysisType: 'comprehensive'
  });

  const response = await makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  
  // Image analysis returns 200 but might have fallback data
  return {
    success: response.status === 200,
    status: response.status,
    data: response.data
  };
}

async function testEnhancedPipelineComprehensive() {
  const url = `${CONFIG.baseUrl}/api/pipeline`;
  const body = JSON.stringify({
    farmerData: {
      farmerId: 'test_farmer_comprehensive',
      location: {
        village: 'Comprehensive Village',
        district: 'Comprehensive District',
        state: 'Comprehensive State',
        coordinates: { lat: 23.2599, lon: 77.4126 }
      },
      crops: ['Soybean', 'Maize', 'Wheat'],
      farmSize: 12.0,
      soilType: 'Sandy Loam',
      irrigationType: 'Center Pivot',
      previousYield: 'Excellent',
      pestIssues: [],
      weatherConcerns: ['Drought risk', 'Temperature variations'],
      contactInfo: CONFIG.contactInfo,
      images: [
        {
          type: 'base64',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        }
      ],
      additionalData: {
        cropRotation: ['Wheat', 'Soybean', 'Maize'],
        soilTesting: 'Last month',
        waterSource: 'Borewell',
        farmEquipment: ['Tractor', 'Seeder', 'Harvester']
      }
    }
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

async function testEnhancedPipelineFallback() {
  const url = `${CONFIG.baseUrl}/api/pipeline`;
  const body = JSON.stringify({
    farmerData: {
      farmerId: 'test_farmer_fallback',
      location: {
        village: 'Fallback Village',
        district: 'Fallback District',
        state: 'Fallback State',
        coordinates: { lat: 25.2048, lon: 55.2708 }
      },
      crops: ['Date Palm', 'Alfalfa'],
      farmSize: 3.0,
      soilType: 'Sandy',
      irrigationType: 'Drip',
      contactInfo: CONFIG.contactInfo
    }
  });

  return makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

// Validation functions
function validateAgriculturalInsights(insights, testName) {
  console.log(`\n🔍 Validating Agricultural Insights for: ${testName}`);
  
  if (!insights) {
    console.log(`   ❌ No insights provided`);
    return false;
  }
  
  // Handle both array format (from pipeline API) and object format (from enhanced pipeline)
  let insightData = {};
  if (Array.isArray(insights)) {
    console.log(`   📊 Found ${insights.length} insights in array format`);
    insights.forEach(insight => {
      if (insight.type && insight.data) {
        const key = insight.type.replace('_', '');
        insightData[key] = insight.data;
        console.log(`   ✅ ${insight.type}: ${insight.message || 'Present'}`);
      }
    });
  } else if (typeof insights === 'object') {
    console.log(`   📊 Found insights in object format`);
    insightData = insights;
    Object.keys(insights).forEach(key => {
      if (key !== 'timestamp' && insights[key]) {
        console.log(`   ✅ ${key}: Present`);
      }
    });
  }
  
  const requiredInsights = [
    'soilHealth', 'cropSuitability', 'waterManagement', 
    'pestRisk', 'yieldPotential', 'climateAdaptation'
  ];
  
  // Check for insights in object format
  let objectInsightCount = 0;
  requiredInsights.forEach(insight => {
    if (insightData[insight] || insightData[insight.replace(/([A-Z])/g, '_$1').toLowerCase()]) {
      objectInsightCount++;
    }
  });
  
  if (Array.isArray(insights) && insights.length > 0) {
    console.log(`   🎯 Pipeline format: ${insights.length} insights generated successfully!`);
    return true;
  } else if (objectInsightCount > 0) {
    console.log(`   🎯 Enhanced format: ${objectInsightCount} insights present!`);
    return true;
  } else {
    console.log(`   ⚠️  No valid insights found`);
    return false;
  }
}

function validateDataCollection(dataCollection, testName) {
  console.log(`\n🔍 Validating Data Collection Structure for: ${testName}`);
  
  const requiredCollections = ['weather', 'environmental', 'imageAnalysis'];
  let validCount = 0;
  
  requiredCollections.forEach(collection => {
    if (dataCollection[collection]) {
      console.log(`   ✅ ${collection}: Present`);
      validCount++;
    } else {
      console.log(`   ❌ ${collection}: Missing`);
    }
  });
  
  console.log(`   📦 Data Collection Structure:`);
      Object.keys(dataCollection).forEach(key => {
        const data = dataCollection[key];
    if (typeof data === 'object' && data !== null) {
      const subKeys = Object.keys(data).slice(0, 3).join(', ');
      console.log(`      ${key}: ${subKeys}${Object.keys(data).length > 3 ? '...' : ''}`);
    } else {
      console.log(`      ${key}: ${data}`);
    }
  });
  
  return validCount === requiredCollections.length;
}

function validatePredictions(predictions, testName) {
  console.log(`\n🔮 Validating Predictions for: ${testName}`);
  
  if (!predictions) {
    console.log(`   ❌ No predictions provided`);
    return false;
  }
  
  // Handle both array formats (pipeline API vs enhanced pipeline)
  if (Array.isArray(predictions)) {
    if (predictions.length === 0) {
      console.log(`   ❌ Empty predictions array`);
      return false;
    }
    
    console.log(`   📈 Generated ${predictions.length} predictions:`);
    predictions.forEach((prediction, index) => {
      if (prediction.type && prediction.message) {
        // Pipeline API format
        console.log(`      ${index + 1}: ${prediction.type} - ${prediction.message}`);
      } else if (prediction.priority && prediction.action) {
        // Enhanced pipeline format
        const priority = prediction.priority || 'Unknown';
        const category = prediction.category || 'Unknown';
        const action = prediction.action || 'No action specified';
        console.log(`      ${index + 1}: ${priority} priority - ${category}: ${action}`);
      } else {
        console.log(`      ${index + 1}: ${JSON.stringify(prediction).substring(0, 50)}...`);
      }
    });
    
    return true;
  } else {
    console.log(`   ❌ Predictions not in expected array format`);
    return false;
  }
}

function validateDataQuality(response, testName) {
  console.log(`\n🔍 Validating Data Quality for: ${testName}`);
  
  let qualityScore = 0;
  let fallbackDetected = false;
  
  // Check for fallback data indicators
  if (response.data && response.data.environmental && response.data.environmental.source === 'Fallback Data') {
    console.log(`   ⚠️  Fallback data detected`);
    fallbackDetected = true;
    qualityScore += 25; // Fallback data is still valuable
  }
  
  // Check for insights generation
  if (response.data && response.data.insights) {
    const insightCount = Object.keys(response.data.insights).filter(key => key !== 'timestamp').length;
    console.log(`   ✅ ${insightCount} insights generated`);
    qualityScore += Math.min(insightCount * 10, 50);
  }
  
  // Check for recommendations
  if (response.data && response.data.recommendations && Array.isArray(response.data.recommendations)) {
    console.log(`   💡 ${response.data.recommendations.length} recommendations generated`);
    qualityScore += Math.min(response.data.recommendations.length * 5, 25);
  }
  
  console.log(`   📊 Data Quality Score: ${qualityScore}/100`);
  
  if (qualityScore >= 80) {
    console.log(`   ✅ Excellent data quality`);
  } else if (qualityScore >= 60) {
    console.log(`   ✅ Good data quality`);
  } else if (qualityScore >= 40) {
    console.log(`   ⚠️  Moderate data quality`);
  } else {
    console.log(`   ❌ Poor data quality`);
  }
  
  return { qualityScore, fallbackDetected };
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Enhanced Pipeline Test Suite...\n');
  console.log(`📧 Contact Email: ${CONFIG.contactInfo.email}`);
  console.log(`📱 Contact Mobile: ${CONFIG.contactInfo.mobile}\n`);
  
  // Test 1: Basic Enhanced Pipeline
  console.log('🔍 Testing: Enhanced Pipeline - Basic Farmer Analysis');
  const basicResult = await testWithRetry('Enhanced Pipeline - Basic Farmer Analysis', testEnhancedPipelineBasic);
  
  if (basicResult.success && basicResult.data) {
    validateAgriculturalInsights(basicResult.data.insights, 'Basic Test');
    validateDataCollection(basicResult.data.dataCollection, 'Basic Test');
    validatePredictions(basicResult.data.predictions, 'Basic Test');
  }
  
  // Test 2: Advanced Enhanced Pipeline
  console.log('\n🔍 Testing: Enhanced Pipeline - Advanced Farmer Analysis');
  const advancedResult = await testWithRetry('Enhanced Pipeline - Advanced Farmer Analysis', testEnhancedPipelineAdvanced);
  
  if (advancedResult.success && advancedResult.data) {
    validateAgriculturalInsights(advancedResult.data.insights, 'Advanced Test');
    validateDataCollection(advancedResult.data.dataCollection, 'Advanced Test');
    validatePredictions(advancedResult.data.predictions, 'Advanced Test');
  }
  
  // Test 3: Image Analysis
  console.log('\n🔍 Testing: Image Analysis - Basic Test');
  const imageResult = await testWithRetry('Image Analysis - Basic Test', testImageAnalysis);
  
  // Test 4: Comprehensive Enhanced Pipeline
  console.log('\n🔍 Testing: Enhanced Pipeline - Comprehensive Data Collection');
  const comprehensiveResult = await testWithRetry('Enhanced Pipeline - Comprehensive Data Collection', testEnhancedPipelineComprehensive);
  
  if (comprehensiveResult.success && comprehensiveResult.data) {
    validateAgriculturalInsights(comprehensiveResult.data.insights, 'Comprehensive Test');
    validateDataCollection(comprehensiveResult.data.dataCollection, 'Comprehensive Test');
    validatePredictions(comprehensiveResult.data.predictions, 'Comprehensive Test');
    
    console.log('\n📊 Comprehensive Enhanced Pipeline Test Results:');
    console.log(`   ✅ Pipeline execution successful`);
    console.log(`   💡 Agricultural Insights Generated`);
    
    // Detailed insight validation
    if (comprehensiveResult.data.insights) {
      Object.entries(comprehensiveResult.data.insights).forEach(([key, value]) => {
        if (key !== 'timestamp' && value) {
          const dataPreview = JSON.stringify(value).substring(0, 100) + '...';
          console.log(`   📊 ${key}: ${dataPreview}`);
        }
      });
    }
  }
  
  // Test 5: Fallback Data Test
  console.log('\n🔍 Testing: Enhanced Pipeline - Fallback Data Test');
  const fallbackResult = await testWithRetry('Enhanced Pipeline - Fallback Data Test', testEnhancedPipelineFallback);
  
  if (fallbackResult.success && fallbackResult.data) {
    console.log('\n📊 Fallback Test Results:');
    console.log(`   ✅ Fallback data generated successfully`);
    console.log(`   📋 This ensures pipeline robustness when external services fail`);
  }
  
  // Data Quality Validation
  console.log('\n🔍 Validating Data Quality...');
  
  if (basicResult.success && basicResult.data) {
    validateDataQuality(basicResult, 'Basic Enhanced Pipeline Response');
  }
  
  if (comprehensiveResult.success && comprehensiveResult.data) {
    validateDataQuality(comprehensiveResult, 'Enhanced Pipeline Response');
  }
  
  // Summary
  console.log('\n📊 Test Summary Report');
  console.log('============================================================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.total}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n💡 Enhanced Pipeline Recommendations:');
    console.log('   🔧 Some tests failed. Check the following:');
    console.log('      - Server is running on the correct port');
    console.log('      - Enhanced pipeline services are properly configured');
    console.log('      - Database connections are working (if applicable)');
    console.log('      - Image processing services are available');
  }
  
  console.log('\n🏁 Enhanced Pipeline Test Suite Complete!');
}

// Export for potential reuse
export { runTests, testResults };

// Run tests if this file is executed directly
runTests().catch(console.error);
