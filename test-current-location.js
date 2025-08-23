/**
 * Test Current Location Functionality
 * This script tests the new current location features
 */

import LocationService from './lib/locationService.js'

async function testCurrentLocation() {
  console.log('🧪 Testing Current Location Functionality...\n')
  
  const locationService = new LocationService()
  
  try {
    // Test 1: Get current location
    console.log('📍 Test 1: Getting current location...')
    const currentLocation = await locationService.getCurrentLocation()
    console.log('✅ Current Location:', {
      lat: currentLocation.lat,
      lon: currentLocation.lon,
      source: currentLocation.source,
      accuracy: currentLocation.accuracy
    })
    
    // Test 2: Get location with fallback
    console.log('\n📍 Test 2: Getting location with fallback...')
    const fallbackLocation = await locationService.getLocationWithFallback()
    console.log('✅ Fallback Location:', {
      lat: fallbackLocation.lat,
      lon: fallbackLocation.lon,
      source: fallbackLocation.source
    })
    
    // Test 3: Get agricultural region info
    console.log('\n📍 Test 3: Getting agricultural region info...')
    const regionInfo = locationService.getAgriculturalRegion(currentLocation.lat, currentLocation.lon)
    console.log('✅ Agricultural Region:', regionInfo)
    
    // Test 4: Validate coordinates
    console.log('\n📍 Test 4: Validating coordinates...')
    const isValid = locationService.validateCoordinates(currentLocation.lat, currentLocation.lon)
    console.log('✅ Coordinates Valid:', isValid)
    
    // Test 5: Calculate distance from Nagpur
    console.log('\n📍 Test 5: Calculating distance from Nagpur...')
    const nagpurCoords = { lat: 21.1458, lon: 79.0882 }
    const distance = locationService.calculateDistance(
      currentLocation.lat, currentLocation.lon,
      nagpurCoords.lat, nagpurCoords.lon
    )
    console.log('✅ Distance from Nagpur:', `${distance.toFixed(2)} km`)
    
    // Test 6: Get weather data
    console.log('\n📍 Test 6: Getting weather data...')
    const weatherData = await locationService.getCurrentLocationWeather()
    console.log('✅ Weather Data:', {
      location: weatherData.location,
      hasWeather: !!weatherData.weather,
      temperature: weatherData.weather?.current?.temperature_2m
    })
    
    console.log('\n🎉 All location tests completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`- Current Location: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lon.toFixed(6)}`)
    console.log(`- Source: ${currentLocation.source}`)
    console.log(`- Region: ${regionInfo.region}, ${regionInfo.state}`)
    console.log(`- Distance from Nagpur: ${distance.toFixed(2)} km`)
    
  } catch (error) {
    console.error('❌ Location test failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the test
testCurrentLocation()
