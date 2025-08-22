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
