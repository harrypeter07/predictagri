import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'
import { openMeteoService } from '../../../lib/openMeteoService.js'
import { nasaDataService } from '../../../lib/nasaDataService.js'
import { googleEarthEngineService } from '../../../lib/googleEarthEngineService.js'
import { twilioService } from '../../../lib/twilioService.js'
import { Logger } from '../../../lib/logger'

// Health check cache to avoid overwhelming external services
let healthCache = {
  timestamp: null,
  data: null,
  cacheDuration: 30000 // 30 seconds
}

export async function GET(request) {
  const logger = new Logger({ route: '/api/health' })
  const { searchParams } = new URL(request.url)
  const detailed = searchParams.get('detailed') === 'true'
  const force = searchParams.get('force') === 'true'

  try {
    // Check cache first (unless forced refresh)
    if (!force && healthCache.timestamp && 
        (Date.now() - healthCache.timestamp) < healthCache.cacheDuration) {
      logger.info('health_check_cache_hit')
      return NextResponse.json({
        ...healthCache.data,
        cached: true,
        cacheAge: Date.now() - healthCache.timestamp
      })
    }

    logger.info('health_check_started', { detailed, force })
    const startTime = Date.now()

    // Basic health checks (always run)
    const basicChecks = await performBasicHealthChecks()
    
    // Detailed health checks (only if requested)
    const detailedChecks = detailed ? await performDetailedHealthChecks() : null

    const healthData = {
      status: basicChecks.overall === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      basic: basicChecks,
      ...(detailed && { detailed: detailedChecks })
    }

    // Update cache
    healthCache = {
      timestamp: Date.now(),
      data: healthData,
      cacheDuration: healthCache.cacheDuration
    }

    logger.info('health_check_completed', { 
      status: healthData.status, 
      responseTime: healthData.responseTime 
    })

    return NextResponse.json(healthData)

  } catch (error) {
    logger.error('health_check_failed', { error: error.message })
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      basic: {
        overall: 'unhealthy',
        database: { status: 'unknown', error: 'Health check failed' },
        environment: { status: 'unknown', error: 'Health check failed' }
      }
    }, { status: 500 })
  }
}

async function performBasicHealthChecks() {
  const checks = {
    database: await checkDatabaseHealth(),
    environment: await checkEnvironmentHealth(),
    memory: await checkMemoryHealth(),
    uptime: await checkUptimeHealth()
  }

  // Determine overall health
  const healthyChecks = Object.values(checks).filter(check => check.status === 'healthy').length
  const totalChecks = Object.keys(checks).length
  
  checks.overall = healthyChecks === totalChecks ? 'healthy' : 
                   healthyChecks >= totalChecks * 0.7 ? 'degraded' : 'unhealthy'

  return checks
}

async function performDetailedHealthChecks() {
  const checks = {
    weather: await checkWeatherServiceHealth(),
    nasa: await checkNasaServiceHealth(),
    satellite: await checkSatelliteServiceHealth(),
    notifications: await checkNotificationServiceHealth(),
    imageProcessing: await checkImageProcessingHealth()
  }

  // Determine overall detailed health
  const healthyChecks = Object.values(checks).filter(check => check.status === 'healthy').length
  const totalChecks = Object.keys(checks).length
  
  checks.overall = healthyChecks === totalChecks ? 'healthy' : 
                   healthyChecks >= totalChecks * 0.7 ? 'degraded' : 'unhealthy'

  return checks
}

async function checkDatabaseHealth() {
  try {
    const startTime = Date.now()
    
    // Test basic database connectivity
    const { data, error } = await supabase
      .from('regions')
      .select('count')
      .limit(1)
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime,
        details: 'Database query failed'
      }
    }

    return {
      status: 'healthy',
      responseTime,
      details: 'Database connection successful',
      connectionPool: 'active' // Supabase handles connection pooling
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      details: 'Database connection failed'
    }
  }
}

async function checkEnvironmentHealth() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NASA_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN'
  ]

  const missingVars = requiredVars.filter(varName => !process.env[varName])
  const optionalVars = [
    'GOOGLE_EARTH_ENGINE_CLIENT_EMAIL',
    'GOOGLE_EARTH_ENGINE_PRIVATE_KEY',
    'GOOGLE_GEMINI_API_KEY'
  ]

  const missingOptional = optionalVars.filter(varName => !process.env[varName])

  return {
    status: missingVars.length === 0 ? 'healthy' : 'unhealthy',
    required: {
      configured: requiredVars.length - missingVars.length,
      total: requiredVars.length,
      missing: missingVars
    },
    optional: {
      configured: optionalVars.length - missingOptional.length,
      total: optionalVars.length,
      missing: missingOptional
    },
    details: missingVars.length === 0 ? 'All required environment variables configured' : 
             `Missing ${missingVars.length} required environment variables`
  }
}

async function checkMemoryHealth() {
  const memUsage = process.memoryUsage()
  const maxHeapSize = 512 * 1024 * 1024 // 512MB limit for serverless
  
  const heapUsagePercent = (memUsage.heapUsed / maxHeapSize) * 100
  
  return {
    status: heapUsagePercent < 80 ? 'healthy' : 'degraded',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
    usagePercent: Math.round(heapUsagePercent),
    details: heapUsagePercent < 80 ? 'Memory usage normal' : 'High memory usage detected'
  }
}

async function checkUptimeHealth() {
  const uptime = process.uptime()
  
  return {
    status: 'healthy',
    uptime: Math.round(uptime),
    uptimeFormatted: formatUptime(uptime),
    details: 'Application running normally'
  }
}

async function checkWeatherServiceHealth() {
  try {
    const startTime = Date.now()
    
    // Test weather service with a known location
    const weatherData = await openMeteoService.getCurrent(21.1458, 79.0882) // Nagpur
    
    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      responseTime,
      details: 'Weather service responding normally',
      data: {
        temperature: weatherData?.current?.temperature_2m,
        timestamp: weatherData?.current?.time
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      details: 'Weather service unavailable'
    }
  }
}

async function checkNasaServiceHealth() {
  try {
    const startTime = Date.now()
    
    // Test NASA service with minimal data
    const nasaData = await nasaDataService.getNaturalDisasters(1)
    
    const responseTime = Date.now() - startTime
    
    return {
      status: nasaData.success ? 'healthy' : 'degraded',
      responseTime,
      details: nasaData.success ? 'NASA service responding normally' : 'NASA service using fallback data',
      fallbackMode: !nasaData.success
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      details: 'NASA service unavailable'
    }
  }
}

async function checkSatelliteServiceHealth() {
  try {
    const startTime = Date.now()
    
    // Test satellite service status
    const serviceStatus = googleEarthEngineService.getServiceStatus()
    
    const responseTime = Date.now() - startTime
    
    return {
      status: serviceStatus.fallbackMode ? 'degraded' : 'healthy',
      responseTime,
      details: serviceStatus.fallbackMode ? 'Satellite service in fallback mode' : 'Satellite service operational',
      fallbackMode: serviceStatus.fallbackMode,
      apiCallsRemaining: serviceStatus.remainingCalls,
      errorCount: serviceStatus.errorCount
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      details: 'Satellite service unavailable'
    }
  }
}

async function checkNotificationServiceHealth() {
  try {
    // Check Twilio configuration
    const hasTwilioConfig = !!(process.env.TWILIO_ACCOUNT_SID && 
                              process.env.TWILIO_AUTH_TOKEN && 
                              process.env.TWILIO_PHONE_NUMBER)
    
    return {
      status: hasTwilioConfig ? 'healthy' : 'degraded',
      configured: hasTwilioConfig,
      details: hasTwilioConfig ? 'Notification service configured' : 'Notification service not configured',
      capabilities: {
        sms: hasTwilioConfig,
        voice: hasTwilioConfig,
        email: false // Not implemented yet
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      details: 'Notification service check failed'
    }
  }
}

async function checkImageProcessingHealth() {
  try {
    // Check if Sharp is available
    let sharpAvailable = false
    try {
      const sharp = await import('sharp')
      sharpAvailable = !!sharp.default
    } catch (e) {
      sharpAvailable = false
    }
    
    return {
      status: sharpAvailable ? 'healthy' : 'degraded',
      sharpAvailable,
      details: sharpAvailable ? 'Image processing service available' : 'Image processing using fallback mode',
      fallbackMode: !sharpAvailable
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      details: 'Image processing service check failed'
    }
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
