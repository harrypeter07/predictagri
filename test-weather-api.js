// Modern Weather API Test Script (ES Module)
// Run with: node test-weather-api.js

// Test coordinates for different locations
const testLocations = [
  { name: 'Mumbai, India', lat: 19.0760, lon: 72.8777 },
  { name: 'Delhi, India', lat: 28.7041, lon: 77.1025 },
  { name: 'Nagpur, India', lat: 21.1458, lon: 79.0882 },
  { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
  { name: 'New York, USA', lat: 40.7128, lon: -74.0060 }
];

// Test the OpenMeteo service directly
async function testOpenMeteoService() {
  console.log('🌤️  Testing OpenMeteo Service Directly...\n');
  
  for (const location of testLocations) {
    try {
      console.log(`📍 Testing: ${location.name} (${location.lat}, ${location.lon})`);
      
      // Test current weather
      const currentUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;
      const currentRes = await fetch(currentUrl);
      const currentData = await currentRes.json();
      
      if (currentRes.ok) {
        console.log(`✅ Current Weather: ${currentData.current?.temperature_2m}°C, Humidity: ${currentData.current?.relative_humidity_2m}%, Wind: ${currentData.current?.wind_speed_10m} km/h`);
      } else {
        console.log(`❌ Current Weather Failed: ${currentRes.status}`);
      }
      
      // Test daily forecast
      const dailyUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      const dailyRes = await fetch(dailyUrl);
      const dailyData = await dailyRes.json();
      
      if (dailyRes.ok) {
        const today = dailyData.daily?.time?.[0];
        const maxTemp = dailyData.daily?.temperature_2m_max?.[0];
        const minTemp = dailyData.daily?.temperature_2m_min?.[0];
        const precipitation = dailyData.daily?.precipitation_sum?.[0];
        
        console.log(`✅ Daily Forecast: ${today} - Max: ${maxTemp}°C, Min: ${minTemp}°C, Rain: ${precipitation}mm`);
      } else {
        console.log(`❌ Daily Forecast Failed: ${dailyRes.status}`);
      }
      
      console.log('---');
      
    } catch (error) {
      console.log(`❌ Error testing ${location.name}: ${error.message}`);
      console.log('---');
    }
  }
}

// Test the Next.js API route (if running locally)
async function testNextJsAPI() {
  console.log('\n🚀 Testing Next.js Weather API Route...\n');
  
  const baseUrl = 'http://localhost:3000'; // Default Next.js dev server
  
  for (const location of testLocations.slice(0, 2)) { // Test first 2 locations
    try {
      console.log(`📍 Testing API Route: ${location.name}`);
      
      const apiUrl = `${baseUrl}/api/weather?lat=${location.lat}&lon=${location.lon}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ API Response Success:`, {
          success: data.success,
          currentTemp: data.current?.temperature_2m,
          currentHumidity: data.current?.relative_humidity_2m,
          currentWind: data.current?.wind_speed_10m,
          dailyCount: data.daily?.time?.length || 0
        });
      } else {
        const errorText = await response.text();
        console.log(`❌ API Response Failed: ${response.status} - ${errorText}`);
      }
      
      console.log('---');
      
    } catch (error) {
      console.log(`❌ Error testing API route for ${location.name}: ${error.message}`);
      console.log('---');
    }
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...\n');
  
  const invalidCoordinates = [
    { name: 'Invalid Lat (90.1)', lat: 90.1, lon: 0 },
    { name: 'Invalid Lon (180.1)', lat: 0, lon: 180.1 },
    { name: 'Negative Lat (-90.1)', lat: -90.1, lon: 0 },
    { name: 'Negative Lon (-180.1)', lat: 0, lon: -180.1 }
  ];
  
  for (const coord of invalidCoordinates) {
    try {
      console.log(`📍 Testing: ${coord.name}`);
      
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lon}&current=temperature_2m&timezone=auto`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`⚠️  Unexpected Success: API accepted invalid coordinates`);
      } else {
        console.log(`✅ Properly Rejected: ${response.status} - ${data.error || 'Invalid coordinates'}`);
      }
      
      console.log('---');
      
    } catch (error) {
      console.log(`❌ Error testing ${coord.name}: ${error.message}`);
      console.log('---');
    }
  }
}

// Test rate limiting and performance
async function testPerformance() {
  console.log('\n⚡ Testing Performance and Rate Limiting...\n');
  
  const startTime = Date.now();
  const promises = [];
  
  // Make 10 concurrent requests to test performance
  for (let i = 0; i < 10; i++) {
    const location = testLocations[i % testLocations.length];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m&timezone=auto`;
    
    promises.push(
      fetch(url)
        .then(res => res.json())
        .then(data => ({ success: true, data }))
        .catch(error => ({ success: false, error: error.message }))
    );
  }
  
  try {
    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(`⏱️  Performance Test Results:`);
    console.log(`   Total Time: ${duration}ms`);
    console.log(`   Successful Requests: ${successCount}`);
    console.log(`   Failed Requests: ${failureCount}`);
    console.log(`   Average Time per Request: ${(duration / promises.length).toFixed(2)}ms`);
    
  } catch (error) {
    console.log(`❌ Performance test failed: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Weather API Test Suite Starting...\n');
  console.log('=' .repeat(60));
  
  try {
    await testOpenMeteoService();
    await testErrorHandling();
    await testPerformance();
    
    // Only test Next.js API if we can connect to it
    try {
      await testNextJsAPI();
    } catch (error) {
      console.log('\n⚠️  Next.js API test skipped - server not running');
      console.log('   Start your dev server with: npm run dev');
    }
    
  } catch (error) {
    console.log(`\n❌ Test suite failed: ${error.message}`);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Weather API Test Suite Completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testOpenMeteoService,
  testNextJsAPI,
  testErrorHandling,
  testPerformance,
  runAllTests
};
