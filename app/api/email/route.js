import { NextResponse } from 'next/server'
import { Logger } from '../../../lib/logger'
import { emailService } from '../../../lib/emailService.js'

export async function POST(request) {
  const logger = new Logger({ route: '/api/email' })
  
  try {
    const body = await request.json()
    const { email, type, data, language = 'en' } = body
    
    logger.info('email_request_received', { email, type, language })
    
    if (!email || !type || !data) {
      logger.error('missing_required_fields')
      return NextResponse.json({ 
        success: false, 
        error: 'Email, type, and data are required' 
      }, { status: 400 })
    }

    let result;
    
    switch (type) {
      case 'agricultural_alert':
        result = await emailService.sendAgriculturalAlert(email, data, language)
        break
      
      case 'weather_forecast':
        result = await emailService.sendWeatherForecast(email, data, language)
        break
      
      case 'crop_insights':
        result = await emailService.sendCropInsights(email, data, language)
        break
      
      case 'yield_prediction':
        result = await emailService.sendYieldPrediction(email, data, language)
        break
      
      default:
        logger.error('invalid_email_type', { type })
        return NextResponse.json({
          success: false,
          error: `Invalid email type: ${type}. Supported types: agricultural_alert, weather_forecast, crop_insights, yield_prediction`
        }, { status: 400 })
    }
    
    if (result.success) {
      logger.info('email_sent_success', { email, type, messageId: result.messageId })
      return NextResponse.json(result)
    } else {
      logger.error('email_sent_failed', { email, type, error: result.error })
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    logger.error('email_request_failed', { error: error.message })
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function GET(request) {
  const logger = new Logger({ route: '/api/email' })
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  if (action === 'test') {
    // Test email service connection
    try {
      const result = await emailService.testConnection()
      
      logger.info('email_test_completed', { 
        configured: result.configured, 
        success: result.success 
      })
      
      return NextResponse.json({
        success: true,
        test: result,
        supportedTypes: [
          'agricultural_alert',
          'weather_forecast', 
          'crop_insights',
          'yield_prediction'
        ],
        supportedLanguages: ['en', 'hi']
      })
    } catch (error) {
      logger.error('email_test_failed', { error: error.message })
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
  }
  
  // Return email service status and capabilities
  return NextResponse.json({
    success: true,
    service: 'Email Service',
    configured: emailService.configured,
    supportedTypes: [
      'agricultural_alert',
      'weather_forecast',
      'crop_insights', 
      'yield_prediction'
    ],
    supportedLanguages: ['en', 'hi'],
    endpoints: {
      send: 'POST /api/email',
      test: 'GET /api/email?action=test'
    }
  })
}
