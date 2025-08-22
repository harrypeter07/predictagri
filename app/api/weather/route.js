import { NextResponse } from 'next/server'
import OpenMeteoService from '../../../lib/openMeteoService'
import { Logger } from '../../../lib/logger'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lon = parseFloat(searchParams.get('lon') || '0')
  const logger = new Logger({ route: '/api/weather', lat, lon })

  try {
    const svc = new OpenMeteoService()

    logger.info('weather_request_received')

    const [current, daily] = await Promise.all([
      svc.getCurrent(lat, lon),
      svc.getDaily(lat, lon)
    ])

    logger.info('weather_success')

    return NextResponse.json({ success: true, current: current.current, daily: daily.daily })
  } catch (error) {
    logger.error('weather_failed', { error: error.message })
    return NextResponse.json({ success: false, error: error.message }, { status: 502 })
  }
}

// POST: Store weather data in database
export async function POST(request) {
  const logger = new Logger({ route: '/api/weather/store' })
  
  try {
    const body = await request.json()
    const { regionId, lat, lon, weatherData, timestamp } = body
    
    // Store weather data in database for historical tracking
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { error: insertError } = await supabase
      .from('weather_data')
      .insert({
        region_id: regionId,
        lat,
        lon,
        weather_data: weatherData,
        timestamp: timestamp || new Date().toISOString()
      })
    
    if (insertError) {
      logger.error('weather_store_failed', { error: insertError.message })
      return NextResponse.json(
        { success: false, error: 'Failed to store weather data' },
        { status: 500 }
      )
    }
    
    logger.info('weather_store_success')
    return NextResponse.json({ success: true, message: 'Weather data stored successfully' })
    
  } catch (error) {
    logger.error('weather_store_exception', { error: error.message })
    return NextResponse.json(
      { success: false, error: 'Failed to store weather data' },
      { status: 500 }
    )
  }
}
