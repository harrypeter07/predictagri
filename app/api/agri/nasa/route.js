import { NextResponse } from 'next/server'
import { Logger } from '../../../../lib/logger'
const NASADataService = require('../../../../lib/nasaDataService')

export async function GET(request) {
  const logger = new Logger({ route: '/api/agri/nasa' })
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '38.5111')
  const lon = parseFloat(searchParams.get('lon') || '-96.8005')
  const apiKey = process.env.NASA_API_KEY

  if (!apiKey) {
    logger.error('missing_nasa_api_key')
    return NextResponse.json({ success: false, error: 'NASA_API_KEY missing' }, { status: 500 })
  }

  const svc = new NASADataService(apiKey)
  logger.info('nasa_request_received', { lat, lon })

  try {
    const [disasters, insights, apod, imagery] = await Promise.all([
      svc.getNaturalDisasters(5),
      svc.getAgriculturalInsights(),
      svc.getAPOD(),
      svc.getEarthImagery(lat, lon)
    ])

    if (disasters?.isFallbackData) logger.warn('eonet_fallback_data')
    if (imagery?.isFallbackData || imagery?.source === 'Fallback Data') logger.warn('earth_imagery_fallback_data')

    logger.info('nasa_success')

    return NextResponse.json({
      success: true,
      disasters,
      insights,
      apod,
      imagery
    })
  } catch (error) {
    logger.error('nasa_failed', { error: error.message })
    return NextResponse.json({ success: false, error: error.message }, { status: 502 })
  }
}
