// Comprehensive NASA API test with alternative endpoints
require('dotenv').config({ path: '.env.local' })

async function testNASAFixed() {
  try {
    const apiKey = process.env.NASA_API_KEY
    
    if (!apiKey) {
      console.log('❌ NASA_API_KEY not found in .env.local')
      return
    }
    
    console.log('🚀 Testing NASA API with alternative endpoints...')
    console.log('API Key:', apiKey.substring(0, 10) + '...')
    
    // Test 1: EONET (Working - Natural Events)
    console.log('\n🌊 Testing EONET (Natural Events)...')
    try {
      const eonetResponse = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?api_key=${apiKey}&limit=5`)
      if (eonetResponse.ok) {
        const eonetData = await eonetResponse.json()
        console.log('✅ EONET API working!')
        console.log(`📊 Recent events: ${eonetData.events?.length || 0}`)
      }
    } catch (error) {
      console.log('❌ EONET failed:', error.message)
    }
    
    // Test 2: EPIC Alternative 1 (Natural Images)
    console.log('\n📸 Testing EPIC Alternative 1 (Natural Images)...')
    try {
      const epicResponse1 = await fetch(`https://api.nasa.gov/EPIC/api/natural/latest?api_key=${apiKey}`)
      if (epicResponse1.ok) {
        const epicData = await epicResponse1.json()
        console.log('✅ EPIC Natural API working!')
        console.log(`📊 Images available: ${epicData.length}`)
      } else {
        console.log('❌ EPIC Natural failed:', epicResponse1.status)
      }
    } catch (error) {
      console.log('❌ EPIC Natural error:', error.message)
    }
    
    // Test 3: EPIC Alternative 2 (Available Dates)
    console.log('\n📅 Testing EPIC Alternative 2 (Available Dates)...')
    try {
      const epicResponse2 = await fetch(`https://api.nasa.gov/EPIC/api/natural/available?api_key=${apiKey}`)
      if (epicResponse2.ok) {
        const epicData = await epicResponse2.json()
        console.log('✅ EPIC Available Dates API working!')
        console.log(`📊 Dates available: ${epicData.length}`)
      } else {
        console.log('❌ EPIC Available Dates failed:', epicResponse2.status)
      }
    } catch (error) {
      console.log('❌ EPIC Available Dates error:', error.message)
    }
    
    // Test 4: Earth Imagery (Alternative to GIBS)
    console.log('\n🛰️ Testing Earth Imagery (Alternative to GIBS)...')
    try {
      const earthResponse = await fetch(`https://api.nasa.gov/planetary/earth/imagery?api_key=${apiKey}&lat=40.7128&lon=-74.0060&date=2024-01-01&dim=0.15`)
      if (earthResponse.ok) {
        const earthData = await earthResponse.json()
        console.log('✅ Earth Imagery API working!')
        console.log('📊 Data:', JSON.stringify(earthData, null, 2))
      } else {
        console.log('❌ Earth Imagery failed:', earthResponse.status)
      }
    } catch (error) {
      console.log('❌ Earth Imagery error:', error.message)
    }
    
    // Test 5: Earth Assets (Alternative to GIBS)
    console.log('\n🌍 Testing Earth Assets (Alternative to GIBS)...')
    try {
      const assetsResponse = await fetch(`https://api.nasa.gov/planetary/earth/assets?api_key=${apiKey}&lat=40.7128&lon=-74.0060&dim=0.15`)
      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json()
        console.log('✅ Earth Assets API working!')
        console.log('📊 Data:', JSON.stringify(assetsData, null, 2))
      } else {
        console.log('❌ Earth Assets failed:', assetsResponse.status)
      }
    } catch (error) {
      console.log('❌ Earth Assets error:', error.message)
    }
    
    // Test 6: APOD (Astronomy Picture of the Day)
    console.log('\n🌟 Testing APOD (Astronomy Picture of the Day)...')
    try {
      const apodResponse = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}`)
      if (apodResponse.ok) {
        const apodData = await apodResponse.json()
        console.log('✅ APOD API working!')
        console.log(`📸 Today's image: ${apodData.title}`)
      } else {
        console.log('❌ APOD failed:', apodResponse.status)
      }
    } catch (error) {
      console.log('❌ APOD error:', error.message)
    }
    
    console.log('\n🎉 NASA API comprehensive test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run test
testNASAFixed()
