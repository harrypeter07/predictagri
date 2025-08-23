#!/usr/bin/env node

/**
 * Test Location-Based Agricultural Analysis
 * This script tests the new location-aware pipeline
 */

import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:3000'

async function testLocationAnalysis() {
  console.log('🌍 Testing Location-Based Agricultural Analysis\n')

  const testCases = [
    {
      name: 'Nagpur Coordinates',
      data: { coordinates: { lat: 21.1458, lon: 79.0882 } }
    },
    {
      name: 'Mumbai by Name',
      data: { locationName: 'mumbai' }
    },
    {
      name: 'Delhi Coordinates',
      data: { coordinates: { lat: 28.7041, lon: 77.1025 } }
    },
    {
      name: 'Bangalore Coordinates',
      data: { coordinates: { lat: 12.9716, lon: 77.5946 } }
    },
    {
      name: 'Current Location (IP-based fallback)',
      data: { useCurrentLocation: true }
    }
  ]

  for (const testCase of testCases) {
    console.log(`📍 Testing: ${testCase.name}`)
    console.log('─'.repeat(50))
    
    try {
      const response = await fetch(`${BASE_URL}/api/location-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.data)
      })

      if (response.ok) {
        const result = await response.json()
        
        console.log(`✅ Success!`)
        console.log(`   Coordinates: ${result.locationContext?.coordinates?.lat}, ${result.locationContext?.coordinates?.lon}`)
        console.log(`   Region: ${result.locationContext?.region?.region}, ${result.locationContext?.region?.state}`)
        console.log(`   Climate: ${result.locationContext?.region?.climate}`)
        console.log(`   Soil Type: ${result.locationContext?.region?.soilType}`)
        console.log(`   Major Crops: ${result.locationContext?.region?.majorCrops?.join(', ')}`)
        
        if (result.dataCollection?.environmental?.satellite) {
          const satellite = result.dataCollection.environmental.satellite
          console.log(`   NDVI: ${satellite.ndvi} (${satellite.ndviInterpretation})`)
          console.log(`   Temperature: ${satellite.landSurfaceTemperature}°C`)
        }
        
        if (result.recommendations && result.recommendations.length > 0) {
          console.log(`   Top Recommendation: ${result.recommendations[0].action}`)
        }
        
      } else {
        const error = await response.text()
        console.log(`❌ Failed: ${response.status} - ${error}`)
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
    
    console.log('') // Empty line for readability
  }
}

async function testSpecificLocation(lat, lon, name) {
  console.log(`🌍 Testing Specific Location: ${name} (${lat}, ${lon})\n`)
  
  try {
    const response = await fetch(`${BASE_URL}/api/location-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ coordinates: { lat, lon } })
    })

    if (response.ok) {
      const result = await response.json()
      
      console.log(`✅ Analysis Complete for ${name}`)
      console.log(`📍 Location: ${result.locationContext?.region?.region}, ${result.locationContext?.region?.state}`)
      console.log(`🌡️ Climate: ${result.locationContext?.region?.climate}`)
      console.log(`🌱 Soil: ${result.locationContext?.region?.soilType}`)
      console.log(`🌾 Crops: ${result.locationContext?.region?.majorCrops?.join(', ')}`)
      
      if (result.insights?.cropSuitability) {
        const suitability = result.insights.cropSuitability
        console.log(`🎯 Best Crops: ${suitability.bestCrops?.join(', ')}`)
        console.log(`⚠️ Avoid: ${suitability.avoidCrops?.join(', ')}`)
      }
      
      if (result.recommendations) {
        console.log(`💡 Recommendations:`)
        result.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec.action} (${rec.priority} priority)`)
        })
      }
      
    } else {
      const error = await response.text()
      console.log(`❌ Failed: ${response.status} - ${error}`)
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

// Main execution
async function main() {
  try {
    // Test basic location analysis
    await testLocationAnalysis()
    
    console.log('='.repeat(60))
    console.log('🎯 Testing Specific Agricultural Regions\n')
    
    // Test specific agricultural regions
    await testSpecificLocation(21.1458, 79.0882, 'Nagpur (Vidarbha)')
    await testSpecificLocation(19.0760, 72.8777, 'Mumbai (Konkan)')
    await testSpecificLocation(28.7041, 77.1025, 'Delhi (NCR)')
    await testSpecificLocation(17.3850, 78.4867, 'Hyderabad (Telangana)')
    
    console.log('\n✨ Location analysis testing completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { testLocationAnalysis, testSpecificLocation }
