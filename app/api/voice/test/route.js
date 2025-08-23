import { NextResponse } from 'next/server'
import { Logger } from '../../../../lib/logger'
import { voiceAssistant } from '../../../../lib/voiceAssistant.js'

export async function POST(request) {
  const logger = new Logger({ route: '/api/voice/test' })
  
  try {
    const { language = 'en' } = await request.json()
    
    logger.info('gemini_model_test_requested', { language })
    
    // Test the model with a simple prompt
    const testResult = await voiceAssistant.testModelWithSimplePrompt()
    
    if (testResult.success) {
      logger.info('gemini_model_test_successful', { 
        response: testResult.response,
        model: testResult.modelName 
      })
      
      return NextResponse.json({
        success: true,
        response: testResult.response,
        modelName: testResult.modelName,
        language,
        timestamp: new Date().toISOString()
      })
    } else {
      logger.error('gemini_model_test_failed', { 
        error: testResult.error,
        errorType: testResult.errorType,
        errorCode: testResult.errorCode
      })
      
      return NextResponse.json({
        success: false,
        error: testResult.error,
        errorType: testResult.errorType,
        errorCode: testResult.errorCode,
        language,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  } catch (error) {
    logger.error('gemini_model_test_request_failed', { error: error.message })
    
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: error.name,
      language: 'en',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
