// Test script to verify dynamic data loading
import fetch from 'node-fetch';

async function testDynamicData() {
  console.log('🧪 Testing Dynamic Data Loading...\n');
  
  try {
    // Test crops API
    console.log('🌾 Testing Crops API...');
    const cropsResponse = await fetch('http://localhost:3000/api/crops');
    const cropsData = await cropsResponse.json();
    
    console.log(`✅ Crops API Status: ${cropsResponse.status}`);
    console.log(`📊 Data Source: ${cropsResponse.headers.get('x-data-source') || 'unknown'}`);
    console.log(`⏱️ Response Time: ${cropsResponse.headers.get('x-response-time') || 'unknown'}`);
    console.log(`🌾 Crops Count: ${Array.isArray(cropsData) ? cropsData.length : 'Invalid data'}`);
    
    if (Array.isArray(cropsData) && cropsData.length > 0) {
      console.log('📋 Sample Crops:');
      cropsData.slice(0, 3).forEach(crop => {
        console.log(`   - ${crop.name} (${crop.season || 'Unknown season'})`);
      });
    }
    
    console.log('');
    
    // Test regions API
    console.log('📍 Testing Regions API...');
    const regionsResponse = await fetch('http://localhost:3000/api/regions');
    const regionsData = await regionsResponse.json();
    
    console.log(`✅ Regions API Status: ${regionsResponse.status}`);
    console.log(`📊 Data Source: ${regionsResponse.headers.get('x-data-source') || 'unknown'}`);
    console.log(`⏱️ Response Time: ${regionsResponse.headers.get('x-response-time') || 'unknown'}`);
    console.log(`📍 Regions Count: ${Array.isArray(regionsData) ? regionsData.length : 'Invalid data'}`);
    
    if (Array.isArray(regionsData) && regionsData.length > 0) {
      console.log('📋 Sample Regions:');
      regionsData.slice(0, 3).forEach(region => {
        console.log(`   - ${region.name} (${region.lat}, ${region.lon})`);
      });
    }
    
    console.log('');
    
    // Test predictions API
    console.log('🎯 Testing Predictions API...');
    const predictionsResponse = await fetch('http://localhost:3000/api/predictions');
    const predictionsData = await predictionsResponse.json();
    
    console.log(`✅ Predictions API Status: ${predictionsResponse.status}`);
    console.log(`📊 Predictions Count: ${Array.isArray(predictionsData) ? predictionsData.length : 'Invalid data'}`);
    
    console.log('');
    
    // Summary
    console.log('📊 SUMMARY:');
    console.log(`✅ Crops: ${Array.isArray(cropsData) ? cropsData.length : 0} items`);
    console.log(`✅ Regions: ${Array.isArray(regionsData) ? regionsData.length : 0} items`);
    console.log(`✅ Predictions: ${Array.isArray(predictionsData) ? predictionsData.length : 0} items`);
    
    const cropsSource = cropsResponse.headers.get('x-data-source') || 'unknown';
    const regionsSource = regionsResponse.headers.get('x-data-source') || 'unknown';
    
    console.log(`\n🔍 Data Sources:`);
    console.log(`   Crops: ${cropsSource}`);
    console.log(`   Regions: ${regionsSource}`);
    
    if (cropsSource === 'fallback' || regionsSource === 'fallback') {
      console.log('\n⚠️  WARNING: Some data is coming from fallback sources');
      console.log('   This means the database connection may not be properly configured');
    } else {
      console.log('\n✅ SUCCESS: All data is coming from the database');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the development server is running on http://localhost:3000');
  }
}

// Run the test
testDynamicData();
