import { NextResponse } from 'next/server'
import { Logger } from '../../../lib/logger'
import LocationService from '../../../lib/locationService.js'

const locationService = new LocationService()

export async function GET(request) {
  const logger = new Logger({ route: '/api/location' })
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) {
    return NextResponse.json({ 
      success: false, 
      error: 'Query parameter is required' 
    }, { status: 400 })
  }

  logger.info('location_request_received', { query })

  try {
    const locationData = await locationService.getLocationInfo(query)
    
    logger.info('location_success', { query })
    
    return NextResponse.json({
      success: true,
      query,
      location: locationData
    })
  } catch (error) {
    console.error('Location service error:', error)
    logger.error('location_failed', { error: error.message, query })
    
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
