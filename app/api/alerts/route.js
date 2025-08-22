import { NextResponse } from 'next/server'
import { Logger } from '../../../lib/logger'
import { twilioService } from '../../../lib/twilioService.js'

export async function POST(request) {
  const logger = new Logger({ route: '/api/alerts' })
  
  try {
    const body = await request.json()
    const { phoneNumber, alertData, language = 'en' } = body
    
    logger.info('alert_request_received', { phoneNumber, language })
    
    if (!phoneNumber || !alertData) {
      logger.error('missing_required_fields')
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number and alert data are required' 
      }, { status: 400 })
    }
    
    const twilioService = new TwilioService()
    const result = await twilioService.sendAgriculturalAlert(phoneNumber, alertData, language)
    
    if (result.success) {
      logger.info('alert_sent_success', { phoneNumber, language })
      return NextResponse.json(result)
    } else {
      logger.error('alert_sent_failed', { phoneNumber, error: result.error })
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    logger.error('alert_request_failed', { error: error.message })
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function GET(request) {
  const logger = new Logger({ route: '/api/alerts' })
  const { searchParams } = new URL(request.url)
  const phoneNumber = searchParams.get('phone')
  const language = searchParams.get('language') || 'en'
  
  logger.info('alert_status_request', { phoneNumber, language })
  
  try {
    const twilioService = new TwilioService()
    
    // Return alert capabilities
    return NextResponse.json({
      success: true,
      capabilities: {
        sms: true,
        voice: true,
        languages: ['en', 'hi', 'mr'],
        alertTypes: ['drought', 'flood', 'pest', 'disease', 'weather', 'yield']
      },
      configured: !!process.env.TWILIO_ACCOUNT_SID
    })
  } catch (error) {
    logger.error('alert_status_failed', { error: error.message })
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
