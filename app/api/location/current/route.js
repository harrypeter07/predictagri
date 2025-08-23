import { NextResponse } from 'next/server'
import { Logger } from '../../../../lib/logger.js'
import LocationService from '../../../../lib/locationService.js'

export async function GET(request) {
  const logger = new Logger({ route: '/api/location/current' })
  
  try {
    const locationService = new LocationService()
    
    // Get current location using the service
    const locationData = await locationService.getCurrentLocation()
    
    logger.info('current_location_success', { 
      lat: locationData.lat, 
      lon: locationData.lon,
      source: locationData.source 
    })
    
    return NextResponse.json({
      success: true,
      location: locationData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Current location service error:', error)
    logger.error('current_location_failed', { error: error.message })
    
    // Return fallback location with error info
    const locationService = new LocationService()
    const fallbackLocation = locationService.getDefaultLocation()
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      fallbackLocation: fallbackLocation,
      note: 'Using fallback location due to geolocation failure'
    }, { status: 500 })
  }
}

export async function POST(request) {
  const logger = new Logger({ route: '/api/location/current' })
  
  try {
    const body = await request.json()
    const { coordinates, address } = body
    
    if (!coordinates || !coordinates.lat || !coordinates.lon) {
      return NextResponse.json({ 
        success: false, 
        error: 'Coordinates (lat, lon) are required' 
      }, { status: 400 })
    }
    
    const locationService = new LocationService()
    
    // Validate coordinates
    if (!locationService.validateCoordinates(coordinates.lat, coordinates.lon)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid coordinates provided' 
      }, { status: 400 })
    }
    
    // Get agricultural region info for the provided coordinates
    const regionInfo = locationService.getAgriculturalRegion(coordinates.lat, coordinates.lon)
    
    const locationData = {
      lat: coordinates.lat,
      lon: coordinates.lon,
      address: address || `${regionInfo.region}, ${regionInfo.state}`,
      region: regionInfo.region,
      state: regionInfo.state,
      climate: regionInfo.climate,
      soilType: regionInfo.soilType,
      majorCrops: regionInfo.majorCrops,
      source: 'user_provided',
      timestamp: new Date().toISOString()
    }
    
    logger.info('location_provided_success', { 
      lat: locationData.lat, 
      lon: locationData.lon,
      region: locationData.region 
    })
    
    return NextResponse.json({
      success: true,
      location: locationData
    })
  } catch (error) {
    console.error('Location processing error:', error)
    logger.error('location_processing_failed', { error: error.message })
    
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
