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
    keyLength: apiKey?.length,
    timestamp: new Date().toISOString()
  })

  if (!apiKey) {
    console.error(`🚀 [NASA API] Missing NASA_API_KEY environment variable`)
    logger.error('missing_nasa_api_key')
    return NextResponse.json({ success: false, error: 'NASA_API_KEY missing' }, { status: 500 })
  }

  logger.info('nasa_request_received', { lat, lon })
  console.log(`🚀 [NASA API] Testing individual APIs with timeout...`)

  try {
    const results = {}
    const timeout = 8000 // 8 second timeout per API
    
    // Test each API individually with explicit timeout
    console.log(`🚀 [NASA API] Testing APOD...`)
    try {
      const apodPromise = nasaDataService.getAPOD()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('APOD timeout')), timeout)
      )
      results.apod = await Promise.race([apodPromise, timeoutPromise])
      console.log(`🚀 [NASA API] APOD completed`)
    } catch (error) {
      console.error(`🚀 [NASA API] APOD failed:`, error.message)
      results.apod = { success: false, error: { userMessage: `APOD failed: ${error.message}` } }
    }

    console.log(`🚀 [NASA API] Testing Natural Disasters...`)
    try {
      const disastersPromise = nasaDataService.getNaturalDisasters(3)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Disasters timeout')), timeout)
      )
      results.disasters = await Promise.race([disastersPromise, timeoutPromise])
      console.log(`🚀 [NASA API] Natural Disasters completed`)
    } catch (error) {
      console.error(`🚀 [NASA API] Natural Disasters failed:`, error.message)
      results.disasters = { success: false, error: { userMessage: `Disasters failed: ${error.message}` } }
    }

    console.log(`🚀 [NASA API] Testing Earth Imagery...`)
    try {
      const imageryPromise = nasaDataService.getEarthImagery(lat, lon)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Imagery timeout')), timeout)
      )
      results.imagery = await Promise.race([imageryPromise, timeoutPromise])
      console.log(`🚀 [NASA API] Earth Imagery completed`)
    } catch (error) {
      console.error(`🚀 [NASA API] Earth Imagery failed:`, error.message)
      results.imagery = { success: false, error: { userMessage: `Imagery failed: ${error.message}` } }
    }

    // Skip EPIC for now since it's consistently down
    console.log(`🚀 [NASA API] Skipping EPIC (known to be down)`)
    results.epic = { success: false, error: { userMessage: 'EPIC API skipped - service unavailable' } }

    // Count successful vs failed APIs
    const successful = Object.values(results).filter(r => r.success).length
    const total = Object.keys(results).length

    console.log(`🚀 [NASA API] All tests completed: ${successful}/${total} successful`)

    logger.info('nasa_success')
    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: total,
        successful: successful,
        failed: total - successful
      },
      timestamp: new Date().toISOString(),
      debug: {
        apiKeyPresent: !!apiKey,
        apiKeyLength: apiKey?.length
      }
    })
    
  } catch (error) {
    console.error(`🚀 [NASA API] Unexpected error:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    logger.error('nasa_failed', { error: error.message })
    
    return NextResponse.json({ 
      success: false, 
      error: {
        userMessage: 'NASA API service encountered an unexpected error',
        technicalDetails: error.message,
        recommendation: 'Please try again or contact support'
      },
      timestamp: new Date().toISOString()
    }, { status: 502 })
  }
}
