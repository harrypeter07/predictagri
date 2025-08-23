import { NextResponse } from 'next/server'
import { Logger } from '../../../lib/logger'
import { deviceTimezoneService } from '../../../lib/deviceTimezoneService.js'

export async function GET(request) {
  const logger = new Logger({ route: '/api/timezone' })
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') // Optional: get timezone for specific date

  try {
    logger.info('timezone_request_received', { date: date || 'current' })

    let timezoneData

    if (date) {
      // Get timezone for specific date
      timezoneData = deviceTimezoneService.getTimezoneForDate(date)
    } else {
      // Get current device timezone
      timezoneData = deviceTimezoneService.getDeviceTimezone()
    }

    // Add additional formatted information
    const response = {
      success: true,
      timezone: timezoneData,
      formatted: deviceTimezoneService.getFormattedTimezone(),
      abbreviation: deviceTimezoneService.getTimezoneAbbreviation(),
      agriculturalClassification: deviceTimezoneService.getAgriculturalTimezoneClassification(),
      isSupported: deviceTimezoneService.isTimezoneSupported(timezoneData.timezone),
      timestamp: new Date().toISOString()
    }

    logger.info('timezone_success', { 
      timezone: timezoneData.timezone,
      source: timezoneData.source 
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('timezone_failed', { error: error.message })
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      fallback: {
        timezone: 'Asia/Kolkata',
        gmtOffset: 19800,
        dst: false,
        source: 'fallback'
      }
    }, { status: 500 })
  }
}

// POST: Update timezone preferences or validate timezone
export async function POST(request) {
  const logger = new Logger({ route: '/api/timezone' })

  try {
    const body = await request.json()
    const { timezone, validate } = body

    if (validate && timezone) {
      // Validate if the provided timezone is supported
      const isSupported = deviceTimezoneService.isTimezoneSupported(timezone)
      
      return NextResponse.json({
        success: true,
        timezone,
        isSupported,
        message: isSupported ? 'Timezone is supported' : 'Timezone is not in supported list'
      })
    }

    // Get current device timezone as reference
    const currentTimezone = deviceTimezoneService.getDeviceTimezone()
    
    return NextResponse.json({
      success: true,
      currentTimezone,
      message: 'Current device timezone retrieved successfully'
    })

  } catch (error) {
    logger.error('timezone_post_failed', { error: error.message })
    
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
