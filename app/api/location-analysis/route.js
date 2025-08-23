import { NextResponse } from 'next/server'
import { enhancedLogger } from '../../../lib/enhancedLogger.js'
import { enhancedAutomatedPipeline } from '../../../lib/enhancedAutomatedPipeline.js'
import { cacheService } from '../../../lib/cacheService.js'
import { securityMiddleware } from '../../../lib/securityMiddleware.js'
import LocationService from '../../../lib/locationService.js'

export async function POST(request) {
  const startTime = Date.now()
  const requestId = `location_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`🌍 [${requestId}] Location Analysis API Called: POST /api/location-analysis`)
  console.log(`📊 [${requestId}] Request received at: ${new Date().toISOString()}`)
  
  try {
    const body = await request.json()
    const { coordinates, locationName, useCurrentLocation, farmerData } = body

    console.log(`📋 [${requestId}] Request Data:`, {
      hasCoordinates: !!coordinates,
      hasLocationName: !!locationName,
      useCurrentLocation: !!useCurrentLocation,
      hasFarmerData: !!farmerData
    })

    // Apply security middleware
    const securityResult = securityMiddleware.validateInput(body, {
      coordinates: { required: false, type: 'object' },
      locationName: { required: false, type: 'string' },
      useCurrentLocation: { required: false, type: 'boolean' },
      farmerData: { required: false, type: 'object' }
    })
    
    if (!securityResult.isValid) {
      console.warn(`⚠️ [${requestId}] Security validation failed:`, securityResult.errors)
      return NextResponse.json({ error: 'Invalid input data', details: securityResult.errors }, { status: 400 })
    }

    // Check rate limiting
    const rateLimitResult = securityMiddleware.checkRateLimit('location_analysis')
    if (!rateLimitResult.allowed) {
      console.warn(`⚠️ [${requestId}] Rate limit exceeded`)
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    let locationData
    const locationService = new LocationService()

    // Determine location based on input
    if (coordinates && coordinates.lat && coordinates.lon) {
      // Use provided coordinates
      locationData = {
        lat: parseFloat(coordinates.lat),
        lon: parseFloat(coordinates.lon),
        source: 'provided_coordinates',
        timestamp: new Date().toISOString()
      }
      console.log(`📍 [${requestId}] Using provided coordinates: ${locationData.lat}, ${locationData.lon}`)
      
    } else if (locationName) {
      // Use location name
      locationData = locationService.getLocationByName(locationName)
      console.log(`🏙️ [${requestId}] Using location name: ${locationName} -> ${locationData.lat}, ${locationData.lon}`)
      
    } else if (useCurrentLocation) {
      // Try to get current location (this would work in browser context)
      try {
        locationData = await locationService.getCurrentLocation()
        console.log(`📍 [${requestId}] Using current location: ${locationData.lat}, ${locationData.lon}`)
      } catch (error) {
        console.warn(`⚠️ [${requestId}] Current location failed, using IP-based location`)
        try {
          locationData = await locationService.getIPBasedLocation()
        } catch (ipError) {
          locationData = locationService.getDefaultLocation()
        }
      }
    } else {
      // Default to Nagpur
      locationData = locationService.getDefaultLocation()
      console.log(`📍 [${requestId}] Using default location: ${locationData.lat}, ${locationData.lon}`)
    }

    // Validate coordinates
    if (!locationService.validateCoordinates(locationData.lat, locationData.lon)) {
      return NextResponse.json({ error: 'Invalid coordinates provided' }, { status: 400 })
    }

    // Get agricultural region information
    const regionInfo = locationService.getAgriculturalRegion(locationData.lat, locationData.lon)
    
    // Create farmer data for analysis
    const analysisData = {
      farmerId: `location_${Date.now()}`,
      coordinates: locationData,
      address: regionInfo.region + ', ' + regionInfo.state,
      region: regionInfo.region,
      state: regionInfo.state,
      climate: regionInfo.climate,
      soilType: regionInfo.soilType,
      majorCrops: regionInfo.majorCrops,
      ...farmerData
    }

    // Run enhanced pipeline with location data
    const cacheKey = `location_analysis:${locationData.lat.toFixed(4)}_${locationData.lon.toFixed(4)}`
    
    const result = await cacheService.getOrSet(
      cacheKey,
      async () => {
        console.log(`🔄 [${requestId}] Cache miss - executing location-based analysis`)
        return await enhancedAutomatedPipeline.executeFarmerPipeline(analysisData)
      },
      10 * 60 * 1000 // 10 minutes cache
    )

    // Add location context to result
    const enhancedResult = {
      ...result,
      locationContext: {
        coordinates: locationData,
        region: regionInfo,
        analysisType: 'location_based',
        timestamp: new Date().toISOString()
      }
    }

    console.log(`✅ [${requestId}] Location analysis completed:`, {
      success: enhancedResult.success,
      coordinates: `${locationData.lat}, ${locationData.lon}`,
      region: regionInfo.region,
      state: regionInfo.state,
      hasInsights: !!enhancedResult.insights,
      hasRecommendations: !!enhancedResult.recommendations
    })

    const executionTime = Date.now() - startTime
    console.log(`🏁 [${requestId}] Location analysis request completed in ${executionTime}ms`)

    return NextResponse.json(enhancedResult, { status: 200 })

  } catch (error) {
    console.error(`❌ [${requestId}] Location analysis failed:`, error)
    
    return NextResponse.json({
      error: 'Location analysis failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      requestId
    }, { status: 500 })
  }
}

export async function GET(request) {
  // Handle GET request for location detection
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const name = searchParams.get('name')
  
  if (lat && lon) {
    return POST(new Request(request.url, {
      method: 'POST',
      body: JSON.stringify({ coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) } })
    }))
  } else if (name) {
    return POST(new Request(request.url, {
      method: 'POST',
      body: JSON.stringify({ locationName: name })
    }))
  } else {
    return POST(new Request(request.url, {
      method: 'POST',
      body: JSON.stringify({ useCurrentLocation: true })
    }))
  }
}
