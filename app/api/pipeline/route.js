import { NextResponse } from 'next/server'
import { enhancedLogger } from '../../../lib/enhancedLogger.js'
import { automatedPipeline } from '../../../lib/automatedPipeline.js'
import { enhancedAutomatedPipeline } from '../../../lib/enhancedAutomatedPipeline.js'
import { twilioService } from '../../../lib/twilioService.js'
import { databaseService } from '../../../lib/databaseService.js'
import { securityMiddleware } from '../../../lib/securityMiddleware.js'
import { cacheService } from '../../../lib/cacheService.js'

export async function POST(request) {
  const startTime = Date.now()
  const requestId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`🚀 [${requestId}] Pipeline API Called: POST /api/pipeline`)
  console.log(`📊 [${requestId}] Request received at: ${new Date().toISOString()}`)
  
  try {
    const body = await request.json()
    const { region, phoneNumber, userId, farmerData } = body

    console.log(`📋 [${requestId}] Request Data:`, {
      hasRegion: !!region,
      hasPhoneNumber: !!phoneNumber,
      hasUserId: !!userId,
      hasFarmerData: !!farmerData,
      farmerDataKeys: farmerData ? Object.keys(farmerData) : []
    })

    // Apply security middleware
    const securityResult = securityMiddleware.validateInput(body, {
      region: { required: false, type: 'string' },
      phoneNumber: { required: false, type: 'string' },
      userId: { required: false, type: 'string' },
      farmerData: { required: false, type: 'object' }
    })
    if (!securityResult.isValid) {
      console.warn(`⚠️ [${requestId}] Security validation failed:`, securityResult.errors)
      return NextResponse.json({ error: 'Invalid input data', details: securityResult.errors }, { status: 400 })
    }

    // Check rate limiting
    const rateLimitResult = securityMiddleware.checkRateLimit(userId || phoneNumber || region || 'anonymous')
    if (!rateLimitResult.allowed) {
      console.warn(`⚠️ [${requestId}] Rate limit exceeded for:`, userId || phoneNumber || region || 'anonymous')
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // Detect suspicious activity
    const suspiciousActivity = securityMiddleware.detectSuspiciousActivity(request)
    if (suspiciousActivity) {
      console.warn(`🚨 [${requestId}] Suspicious activity detected`)
      return NextResponse.json({ error: 'Suspicious activity detected' }, { status: 403 })
    }

    let result, storedResult, notificationResult

    if (farmerData) {
      console.log(`👨‍🌾 [${requestId}] Running Enhanced Farmer Pipeline for farmer:`, farmerData.farmerId)
      
      // Enhanced pipeline with caching
      result = await cacheService.getOrSet(
        `farmer_analysis:${farmerData.farmerId}`,
        async () => {
          console.log(`🔄 [${requestId}] Cache miss - executing enhanced pipeline`)
          return await enhancedAutomatedPipeline.executeFarmerPipeline(farmerData)
        },
        5 * 60 * 1000 // 5 minutes
      )

      console.log(`✅ [${requestId}] Enhanced pipeline completed:`, {
        success: result.success,
        hasLocation: !!result.location,
        hasDataCollection: !!result.dataCollection,
        hasInsights: !!result.insights,
        hasRecommendations: !!result.recommendations,
        hasNotification: !!result.notification
      })

      // Store results in database for farmer analysis
      storedResult = await storeFarmerAnalysisResults(result, phoneNumber)
      
      // Enhanced pipeline already sends notifications, so use the result from the pipeline
      notificationResult = result.notification || { success: false, method: 'None' }
      
      console.log(`💾 [${requestId}] Farmer analysis results stored:`, {
        stored: !!storedResult,
        notification: notificationResult
      })

    } else {
      console.log(`🌍 [${requestId}] Running Standard Pipeline for region:`, region)
      
      // Standard pipeline with caching
      result = await cacheService.getOrSet(
        `pipeline:${region}`,
        async () => {
          console.log(`🔄 [${requestId}] Cache miss - executing standard pipeline`)
          return await automatedPipeline.executePipeline(region)
        },
        10 * 60 * 1000 // 10 minutes
      )

      console.log(`✅ [${requestId}] Standard pipeline completed:`, {
        success: result.success,
        hasDataCollection: !!result.dataCollection,
        hasInsights: !!result.insights,
        hasPredictions: !!result.predictions,
        hasAlerts: !!result.alerts
      })

      // Transform enhanced pipeline result to match pipeline structure
      if (result.success) {
        result = {
          success: true,
          pipelineId: result.pipelineId,
          timestamp: result.timestamp,
          dataCollection: {
            weather: result.dataCollection?.weather || result.weather,
            environmental: result.dataCollection?.environmental || result.environmental,
            imageAnalysis: result.dataCollection?.imageAnalysis || result.imageAnalysis
          },
          insights: result.insights || [],
          predictions: result.predictions || [],
          alerts: result.alerts || []
        }
      }

             // Store results in database
       console.log(`💾 [${requestId}] Attempting to store pipeline results...`)
       storedResult = await storePipelineResults(result, region)
       console.log(`💾 [${requestId}] Storage result:`, storedResult)
       
       // Send notification to farmer (use default phone for standard pipeline)
       const defaultPhone = '+919322909257' // Default phone number for standard pipeline
       notificationResult = await sendFarmerNotification(result, defaultPhone)
       
       console.log(`💾 [${requestId}] Standard pipeline results stored:`, {
         stored: !!storedResult,
         notification: notificationResult
       })
    }

    const responseTime = Date.now() - startTime
    console.log(`🏁 [${requestId}] Pipeline request completed in ${responseTime}ms`)

    return NextResponse.json({
      ...result,
      metadata: {
        requestId,
        responseTime: `${responseTime}ms`,
        cached: result.cached || false,
        stored: !!storedResult,
        notification: notificationResult
      }
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error(`❌ [${requestId}] Pipeline request failed after ${responseTime}ms:`, error)
    
    return NextResponse.json(
      { 
        error: 'Pipeline execution failed',
        details: error.message,
        requestId,
        responseTime: `${responseTime}ms`
      },
      { status: 500 }
    )
  }
}

// Database and notification helper functions
async function storePipelineResults(pipelineResult, region) {
  try {
    console.log('🔍 storePipelineResults called with:', { region, pipelineId: pipelineResult.pipelineId })
    
    const { data: record, error } = await databaseService.withRetry(async () => {
             const insertData = {
         region_id: region === 'current' ? 'unknown' : (region || 'unknown'), // Fix UUID issue
         pipeline_id: pipelineResult.pipelineId || `pipeline_${Date.now()}`,
         analysis_type: 'standard_pipeline',
        insights: pipelineResult.insights || [],
        predictions: pipelineResult.predictions || [],
        data_collection: {
          weather: pipelineResult.dataCollection?.weather,
          environmental: pipelineResult.dataCollection?.environmental,
          imageAnalysis: pipelineResult.dataCollection?.imageAnalysis
        },
        alerts: pipelineResult.alerts || [],
        recommendations: pipelineResult.recommendations || [],
        created_at: new Date().toISOString()
      }
      console.log('🔍 Inserting data:', insertData)
      
      return await databaseService.client
        .from('farmer_analysis_results')
        .insert(insertData)
        .select()
        .single()
    }, 'store_pipeline_results')

         if (error) {
       console.error('❌ Failed to store pipeline results:', error)
       console.error('❌ Error details:', { message: error.message, code: error.code, details: error.details })
       return { success: false, error: error.message }
     }

     console.log('✅ Pipeline results stored successfully:', { recordId: record.id })
     return { success: true, recordId: record.id }
  } catch (error) {
    console.error('Database storage failed:', error)
    return { success: false, error: error.message }
  }
}

async function storeFarmerAnalysisResults(pipelineResult, phoneNumber) {
  try {
    console.log('🔍 storeFarmerAnalysisResults called with:', { 
      farmerId: pipelineResult.farmerId, 
      phoneNumber: phoneNumber || 'default',
      pipelineId: pipelineResult.pipelineId 
    })
    
    const { data: record, error } = await databaseService.withRetry(async () => {
      const insertData = {
        farmer_id: pipelineResult.farmerId || 'pipeline_analysis',
        phone_number: phoneNumber || '+919322909257', // Default phone number if none provided
        region_id: null, // Will be set if region mapping is available
        crop_id: null, // Will be set if crop mapping is available
        analysis_type: 'enhanced_pipeline',
        pipeline_id: pipelineResult.pipelineId,
        insights: pipelineResult.insights,
        predictions: pipelineResult.predictions || [],
        data_collection: {
          weather: pipelineResult.dataCollection?.weather,
          environmental: pipelineResult.dataCollection?.environmental,
          imageAnalysis: pipelineResult.dataCollection?.imageAnalysis
        },
        alerts: pipelineResult.alerts || [],
        recommendations: pipelineResult.recommendations || [],
        notification_sent: false,
        created_at: new Date().toISOString()
      }
      console.log('🔍 Inserting farmer analysis data:', insertData)
      
      return await databaseService.client
        .from('farmer_analysis_results')
        .insert(insertData)
        .select()
        .single()
    }, 'store_farmer_analysis')

         if (error) {
       console.error('❌ Failed to store farmer analysis results:', error)
       console.error('❌ Error details:', { message: error.message, code: error.code, details: error.details })
       return { success: false, error: error.message }
     }

     console.log('✅ Farmer analysis results stored successfully:', { recordId: record.id })
     return { success: true, recordId: record.id }
  } catch (error) {
    console.error('Database storage failed:', error)
    return { success: false, error: error.message }
  }
}

async function sendFarmerNotification(pipelineResult, phoneNumber) {
  try {
    // Create a comprehensive agricultural alert
    const alertData = {
      type: 'comprehensive_analysis',
      severity: 'medium',
      region: 'Agricultural Analysis',
      crop: 'Field Analysis',
      recommendation: generateNotificationMessage(pipelineResult)
    }

    // Send both SMS and voice notification
    const result = await twilioService.sendAgriculturalAlert(phoneNumber, alertData, 'hi')

    // Update database record to mark notification as sent
    if (result.success) {
      await databaseService.withRetry(async () => {
        return await databaseService.client
          .from('farmer_analysis_results')
          .update({
            notification_sent: true,
            notification_sent_at: new Date().toISOString()
          })
          .eq('pipeline_id', pipelineResult.pipelineId)
      }, 'update_notification_status')
    }

    return {
      success: result.success,
      method: result.sms?.success ? 'SMS + Voice' : result.voice?.success ? 'Voice' : 'Failed'
    }
  } catch (error) {
    console.error('Notification sending failed:', error)
    return { success: false, method: 'Failed', error: error.message }
  }
}

function generateNotificationMessage(pipelineResult) {
  const insights = pipelineResult.insights
  const predictions = pipelineResult.predictions

  let message = 'आपके खेत का विश्लेषण पूरा हुआ है। '

  // Add key insights
  const soilHealth = insights?.find(i => i.type === 'soil_health')
  const yieldPred = predictions?.find(p => p.type === 'yield_prediction')
  const riskPred = predictions?.find(p => p.type === 'risk_prediction')

  if (soilHealth?.data?.overall) {
    message += `मिट्टी की स्थिति: ${soilHealth.data.overall}। `
  }

  if (yieldPred?.data?.overall) {
    message += `उपज की संभावना: ${yieldPred.data.overall}। `
  }

  if (riskPred?.data?.overall) {
    message += `कीट जोखिम: ${riskPred.data.overall}। `
  }

  // Add top alert if available
  if (pipelineResult.alerts && pipelineResult.alerts.length > 0) {
    const topAlert = pipelineResult.alerts[0]
    message += `मुख्य सिफारिश: ${topAlert.message}। `
  }

  message += 'विस्तृत रिपोर्ट के लिए ऐप चेक करें।'

  return message
}

export async function GET(request) {
  const logger = enhancedLogger.with({ route: '/api/pipeline' })
  const { searchParams } = new URL(request.url)
  const region = searchParams.get('region') || 'kansas'
  const farmerMode = searchParams.get('farmer') === 'true'
  
  // Check cache for status requests
  const cacheKey = `pipeline_status:${region}:${farmerMode}`
  const cachedStatus = cacheService.get(cacheKey)
  if (cachedStatus) {
    logger.info('pipeline_status_cache_hit', { region, farmerMode })
    return NextResponse.json(cachedStatus)
  }
  
  logger.info('pipeline_status_request', { region, farmerMode })
  
  try {
    let result
    
    if (farmerMode) {
      // Check enhanced pipeline status - use request coordinates or default to a generic location
      const fallbackFarmerData = {
        farmerId: 'status_check',
        coordinates: { lat: 0, lon: 0 } // Generic coordinates for status check
      }
      
      result = await enhancedAutomatedPipeline.executeFarmerPipeline(fallbackFarmerData)
      
      if (result.success) {
        result = {
          success: true,
          timestamp: result.timestamp,
          dataCollection: {
            weather: result.weather,
            environmental: result.environmental,
            imageAnalysis: result.imageAnalysis
          }
        }
      } else {
        throw new Error('Enhanced pipeline status check failed')
      }
    } else {
      // Use standard pipeline for status check
      result = await automatedPipeline.executePipeline(region)
    }
    
    const statusResponse = {
      success: true,
      status: 'operational',
      lastRun: result.timestamp,
      region: farmerMode ? 'Enhanced Farmer Analysis' : region,
      farmerMode,
      summary: {
        dataSources: Object.keys(result.dataCollection || {}).length,
        insights: result.insights?.length || 0,
        predictions: result.predictions?.length || 0,
        alerts: result.alerts?.length || 0
      }
    }

    // Cache the status response
    cacheService.set(cacheKey, statusResponse, 300000) // 5 minutes

    return NextResponse.json(statusResponse)
  } catch (error) {
    logger.error('pipeline_status_failed', { error: error.message })
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
