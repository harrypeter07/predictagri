import { NextResponse } from 'next/server'
import { Logger } from '../../../../lib/logger'
import { nasaDataService } from '../../../../lib/nasaDataService.js'

export async function GET(request) {
  const logger = new Logger({ route: '/api/agri/nasa' })
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '38.5111')
  const lon = parseFloat(searchParams.get('lon') || '-96.8005')
  const apiKey = process.env.NASA_API_KEY

  console.log(`🚀 [NASA API] Request received:`, {
    lat,
    lon,
    hasApiKey: !!apiKey,
    timestamp: new Date().toISOString()
  })

  if (!apiKey) {
    console.error(`🚀 [NASA API] Missing NASA_API_KEY environment variable`)
    logger.error('missing_nasa_api_key')
    return NextResponse.json({ success: false, error: 'NASA_API_KEY missing' }, { status: 500 })
  }

  const svc = new NASADataService(apiKey)
  logger.info('nasa_request_received', { lat, lon })
  console.log(`🚀 [NASA API] Initializing NASA Data Service...`)

  try {
    console.log(`🚀 [NASA API] Fetching NASA data in parallel...`)
    const [disasters, insights, apod, imagery] = await Promise.all([
      svc.getNaturalDisasters(5),
      svc.getAgriculturalInsights(),
      svc.getAPOD(),
      svc.getEarthImagery(lat, lon)
    ])

    console.log(`🚀 [NASA API] All NASA data fetched successfully:`, {
      disastersCount: disasters?.data?.length || 0,
      hasInsights: !!insights,
      hasApod: !!apod,
      hasImagery: !!imagery
    })

    if (disasters?.isFallbackData) {
      console.warn(`🚀 [NASA API] Using fallback data for natural disasters`)
      logger.warn('eonet_fallback_data')
    }
    if (imagery?.isFallbackData || imagery?.source === 'Fallback Data') {
      console.warn(`🚀 [NASA API] Using fallback data for Earth imagery`)
      logger.warn('earth_imagery_fallback_data')
    }

    logger.info('nasa_success')
    console.log(`🚀 [NASA API] NASA API request completed successfully`)

    return NextResponse.json({
      success: true,
      disasters,
      insights,
      apod,
      imagery
    })
  } catch (error) {
    console.error(`🚀 [NASA API] NASA API request failed:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    logger.error('nasa_failed', { error: error.message })
    return NextResponse.json({ success: false, error: error.message }, { status: 502 })
  }
}
