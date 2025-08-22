// Test the new NASA Data Service
require('dotenv').config({ path: '.env.local' })

const NASADataService = require('./lib/nasaDataService')

async function testNASAService() {
  try {
    const apiKey = process.env.NASA_API_KEY
    
    if (!apiKey) {
      console.log('❌ NASA_API_KEY not found in .env.local')
      return
    }
    
    console.log('🚀 Testing NASA Data Service...')
    console.log('API Key:', apiKey.substring(0, 10) + '...')
    
    const nasaService = new NASADataService(apiKey)
    
    // Test 1: Natural Disasters
    console.log('\n🌊 Testing Natural Disasters...')
    const disasters = await nasaService.getNaturalDisasters(5)
    console.log('✅ Natural Disasters:', disasters.success ? 'Working' : 'Failed')
    console.log(`📊 Events found: ${disasters.count}`)
    if (disasters.data.length > 0) {
      console.log('🌍 Sample event:', disasters.data[0].title)
    }
    
    // Test 2: Agricultural Insights
    console.log('\n🌾 Testing Agricultural Insights...')
    const insights = await nasaService.getAgriculturalInsights()
    console.log('✅ Agricultural Insights:', insights.success ? 'Working' : 'Failed')
    console.log(`📊 Weather events: ${insights.data.weatherEvents.length}`)
    console.log(`⚠️ Agricultural risks: ${insights.data.agriculturalRisks.length}`)
    console.log(`💡 Recommendations: ${insights.data.recommendations.length}`)
    
    // Test 3: APOD
    console.log('\n🌟 Testing APOD...')
    const apod = await nasaService.getAPOD()
    console.log('✅ APOD:', apod.success ? 'Working' : 'Failed')
    if (apod.data) {
      console.log(`📸 Today's image: ${apod.data.title}`)
    }
    
    // Test 4: Earth Imagery (will fall back to mock)
    console.log('\n🛰️ Testing Earth Imagery (with fallback)...')
    const earthImagery = await nasaService.getEarthImagery(38.5111, -96.8005)
    console.log('✅ Earth Imagery:', earthImagery.success ? 'Working' : 'Failed')
    console.log(`📊 Source: ${earthImagery.source}`)
    if (earthImagery.data) {
      console.log(`📍 Coordinates: ${earthImagery.data.lat}, ${earthImagery.data.lon}`)
    }
    
    console.log('\n🎉 NASA Data Service test completed!')
    console.log('💡 Service provides fallbacks when APIs are down')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run test
testNASAService()
