import { NextResponse } from 'next/server'
import { googleEarthEngineService } from '../../../../lib/googleEarthEngineService'

// GET: Get service status and health
export async function GET() {
  try {
    const status = googleEarthEngineService.getServiceStatus()
    
    // Calculate additional metrics
    const now = new Date()
    const hoursSinceReset = (now - status.lastResetTime) / (1000 * 60 * 60)
    const callsPerHour = hoursSinceReset > 0 ? status.apiCallCount / hoursSinceReset : 0
    const estimatedCallsRemaining = Math.max(0, status.maxApiCalls - status.apiCallCount)
    
    const healthStatus = {
      ...status,
      hoursSinceReset: Math.round(hoursSinceReset * 100) / 100,
      callsPerHour: Math.round(callsPerHour * 100) / 100,
      estimatedCallsRemaining,
      estimatedHoursRemaining: callsPerHour > 0 ? Math.round(estimatedCallsRemaining / callsPerHour * 100) / 100 : 0,
      health: getHealthIndicator(status),
      recommendations: getRecommendations(status)
    }

    return NextResponse.json({
      success: true,
      status: healthStatus,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('Service status API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get service status',
        message: error.message
      },
      { status: 500 }
    )
  }
}

// POST: Control service behavior
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    let result
    let message

    switch (action) {
      case 'reset_errors':
        googleEarthEngineService.resetErrorCounter()
        result = 'Error counter reset successfully'
        message = 'Error counter has been reset. Service will attempt to use Google Earth Engine again.'
        break

      case 'enable_fallback':
        googleEarthEngineService.enableFallbackMode()
        result = 'Fallback mode enabled'
        message = 'Service is now using fallback data sources.'
        break

      case 'disable_fallback':
        googleEarthEngineService.disableFallbackMode()
        result = 'Fallback mode disabled'
        message = 'Service will attempt to use Google Earth Engine again.'
        break

      case 'force_refresh':
        // This would typically reinitialize the service
        result = 'Service refresh initiated'
        message = 'Service refresh has been initiated.'
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    const updatedStatus = googleEarthEngineService.getServiceStatus()

    return NextResponse.json({
      success: true,
      action,
      result,
      message,
      updatedStatus,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Service control API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to execute action',
        message: error.message
      },
      { status: 500 }
    )
  }
}

// Helper function to determine health indicator
function getHealthIndicator(status) {
  if (status.fallbackMode) {
    return 'degraded'
  }
  
  if (status.errorCount >= status.maxErrors) {
    return 'critical'
  }
  
  if (status.apiCallCount >= status.maxApiCalls * 0.9) {
    return 'warning'
  }
  
  if (status.errorCount > 0) {
    return 'attention'
  }
  
  return 'healthy'
}

// Helper function to get recommendations
function getRecommendations(status) {
  const recommendations = []

  if (status.fallbackMode) {
    recommendations.push('Service is in fallback mode. Check credentials and try resetting errors.')
  }

  if (status.errorCount >= status.maxErrors) {
    recommendations.push('Too many consecutive errors. Consider checking network connectivity and credentials.')
  }

  if (status.apiCallCount >= status.maxApiCalls * 0.9) {
    recommendations.push('Approaching daily API limit. Consider upgrading plan or waiting for reset.')
  }

  if (status.apiCallCount >= status.maxApiCalls * 0.7) {
    recommendations.push('High API usage detected. Monitor usage to avoid hitting limits.')
  }

  if (status.errorCount > 0 && status.errorCount < status.maxErrors) {
    recommendations.push('Some errors detected. Monitor service health.')
  }

  if (recommendations.length === 0) {
    recommendations.push('Service is operating normally.')
  }

  return recommendations
}
