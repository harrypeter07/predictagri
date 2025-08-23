import { NextResponse } from 'next/server'
import { Logger } from '../../../../lib/logger'
import { voiceAssistant } from '../../../../lib/voiceAssistant.js'

export async function GET() {
  const logger = new Logger({ route: '/api/voice/status' })
  
  try {
    logger.info('gemini_status_check_requested')
    
    const status = await voiceAssistant.checkGeminiStatus()
    
    logger.info('gemini_status_check_completed', { status: status.status })
    
    return NextResponse.json(status)
  } catch (error) {
    logger.error('gemini_status_check_failed', { error: error.message })
    
    return NextResponse.json({
      status: 'ERROR',
      message: 'Failed to check Gemini status',
      details: error.message,
      errorType: error.name,
      errorCode: error.code
    }, { status: 500 })
  }
}
