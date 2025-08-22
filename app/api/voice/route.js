import { NextResponse } from 'next/server'
import { Logger } from '../../../lib/logger'
const VoiceAssistant = require('../../../lib/voiceAssistant')

export async function POST(request) {
  const logger = new Logger({ route: '/api/voice' })
  
  try {
    const body = await request.json()
    const { audioInput, language = 'en', context = {} } = body
    
    logger.info('voice_request_received', { language, context })
    
    if (!audioInput) {
      logger.error('missing_audio_input')
      return NextResponse.json({ success: false, error: 'Audio input is required' }, { status: 400 })
    }
    
    const voiceAssistant = new VoiceAssistant()
    const result = await voiceAssistant.processVoiceInput(audioInput, language, context)
    
    if (result.success) {
      logger.info('voice_processing_success', { language, responseLength: result.response.length })
      return NextResponse.json(result)
    } else {
      logger.error('voice_processing_failed', { error: result.error })
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    logger.error('voice_request_failed', { error: error.message })
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function GET(request) {
  const logger = new Logger({ route: '/api/voice' })
  const { searchParams } = new URL(request.url)
  const language = searchParams.get('language') || 'en'
  
  logger.info('voice_commands_request', { language })
  
  try {
    const voiceAssistant = new VoiceAssistant()
    const commands = voiceAssistant.getVoiceCommands(language)
    
    return NextResponse.json({
      success: true,
      language,
      commands,
      supportedLanguages: ['en', 'hi', 'mr']
    })
  } catch (error) {
    logger.error('voice_commands_failed', { error: error.message })
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
