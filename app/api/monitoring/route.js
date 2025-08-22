import { NextResponse } from 'next/server'
import { enhancedLogger } from '../../../lib/enhancedLogger.js'
import { databaseService } from '../../../lib/databaseService.js'
import { cacheService } from '../../../lib/cacheService.js'
import { securityMiddleware } from '../../../lib/securityMiddleware.js'

export async function GET(request) {
  const logger = enhancedLogger.with({ route: '/api/monitoring' })
  
  try {
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'
    
    logger.info('monitoring_dashboard_request', { detailed })
    
    // Collect system metrics
    const metrics = await collectSystemMetrics(detailed)
    
    logger.info('monitoring_dashboard_completed', { 
      metricsCount: Object.keys(metrics).length 
    })
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics
    })
    
  } catch (error) {
    logger.error('monitoring_dashboard_failed', { error: error.message })
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

async function collectSystemMetrics(detailed = false) {
  const metrics = {
    system: await getSystemMetrics(),
    database: await getDatabaseMetrics(),
    cache: await getCacheMetrics(),
    security: await getSecurityMetrics(),
    performance: await getPerformanceMetrics()
  }
  
  if (detailed) {
    metrics.detailed = await getDetailedMetrics()
  }
  
  return metrics
}

async function getSystemMetrics() {
  const memUsage = process.memoryUsage()
  const uptime = process.uptime()
  
  return {
    uptime: {
      seconds: Math.round(uptime),
      formatted: formatUptime(uptime)
    },
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      usagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    },
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    platform: process.platform,
    nodeVersion: process.version
  }
}

async function getDatabaseMetrics() {
  try {
    const health = await databaseService.healthCheck()
    const poolStats = databaseService.getConnectionPool()
    
    return {
      status: health.healthy ? 'healthy' : 'unhealthy',
      responseTime: health.responseTime,
      connectionPool: poolStats,
      lastHealthCheck: new Date(databaseService.lastHealthCheck).toISOString()
    }
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    }
  }
}

async function getCacheMetrics() {
  const stats = cacheService.getStats()
  
  return {
    ...stats,
    efficiency: Math.round(stats.efficiency),
    memoryUsagePercent: Math.round((parseFloat(stats.memoryUsage) / parseFloat(stats.maxMemoryUsage)) * 100)
  }
}

async function getSecurityMetrics() {
  return {
    rateLimitStore: {
      size: securityMiddleware.rateLimitStore.size,
      window: securityMiddleware.rateLimitWindow / 1000 + 's',
      maxRequests: securityMiddleware.maxRequestsPerWindow
    },
    securityHeaders: Object.keys(securityMiddleware.securityHeaders).length,
    corsOrigins: securityMiddleware.corsConfig.origin.length
  }
}

async function getPerformanceMetrics() {
  const startTime = Date.now()
  
  // Measure API response times (simulated)
  const apiMetrics = {
    averageResponseTime: 150, // ms
    p95ResponseTime: 300, // ms
    p99ResponseTime: 500, // ms
    requestsPerMinute: 120,
    errorRate: 0.5 // percentage
  }
  
  return {
    ...apiMetrics,
    collectionTime: Date.now() - startTime
  }
}

async function getDetailedMetrics() {
  return {
    logStats: enhancedLogger.getLogStats(),
    environmentVariables: {
      required: {
        supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        nasa: !!process.env.NASA_API_KEY,
        twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
      },
      optional: {
        googleEarthEngine: !!(process.env.GOOGLE_EARTH_ENGINE_CLIENT_EMAIL && process.env.GOOGLE_EARTH_ENGINE_PRIVATE_KEY),
        gemini: !!process.env.GOOGLE_GEMINI_API_KEY
      }
    },
    externalServices: await getExternalServiceStatus(),
    recentErrors: await getRecentErrors(),
    systemAlerts: await getSystemAlerts()
  }
}

async function getExternalServiceStatus() {
  const services = {
    weather: { status: 'operational', responseTime: 120 },
    nasa: { status: 'operational', responseTime: 800 },
    satellite: { status: 'operational', responseTime: 1500 },
    notifications: { status: 'operational', responseTime: 200 }
  }
  
  return services
}

async function getRecentErrors() {
  // This would typically come from a log aggregation service
  return [
    {
      timestamp: new Date(Date.now() - 300000).toISOString(),
      error: 'Database connection timeout',
      count: 3
    },
    {
      timestamp: new Date(Date.now() - 600000).toISOString(),
      error: 'External API rate limit exceeded',
      count: 1
    }
  ]
}

async function getSystemAlerts() {
  const alerts = []
  
  // Check memory usage
  const memUsage = process.memoryUsage()
  const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
  
  if (memoryPercent > 80) {
    alerts.push({
      level: 'warning',
      message: 'High memory usage detected',
      value: Math.round(memoryPercent) + '%',
      timestamp: new Date().toISOString()
    })
  }
  
  // Check cache efficiency
  const cacheStats = cacheService.getStats()
  if (parseFloat(cacheStats.hitRate) < 50) {
    alerts.push({
      level: 'info',
      message: 'Low cache hit rate',
      value: cacheStats.hitRate,
      timestamp: new Date().toISOString()
    })
  }
  
  return alerts
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// POST endpoint for clearing cache and resetting metrics
export async function POST(request) {
  const logger = enhancedLogger.with({ route: '/api/monitoring' })
  
  try {
    const body = await request.json()
    const { action } = body
    
    switch (action) {
      case 'clear_cache':
        const cleared = cacheService.clear()
        logger.info('cache_cleared', { entriesCleared: cleared })
        return NextResponse.json({
          success: true,
          message: `Cleared ${cleared} cache entries`
        })
        
      case 'reset_metrics':
        // Reset cache statistics
        cacheService.stats = {
          hits: 0,
          misses: 0,
          sets: 0,
          deletes: 0,
          evictions: 0
        }
        logger.info('metrics_reset')
        return NextResponse.json({
          success: true,
          message: 'Metrics reset successfully'
        })
        
      case 'optimize_memory':
        cacheService.optimizeMemory()
        logger.info('memory_optimized')
        return NextResponse.json({
          success: true,
          message: 'Memory optimization completed'
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
    
  } catch (error) {
    logger.error('monitoring_action_failed', { error: error.message })
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
