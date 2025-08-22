import { NextResponse } from 'next/server'
import { enhancedLogger } from '../../../lib/enhancedLogger.js'
import { automatedPipeline } from '../../../lib/automatedPipeline.js'
import { enhancedAutomatedPipeline } from '../../../lib/enhancedAutomatedPipeline.js'
import { twilioService } from '../../../lib/twilioService.js'
import { databaseService } from '../../../lib/databaseService.js'
import { securityMiddleware } from '../../../lib/securityMiddleware.js'
import { cacheService } from '../../../lib/cacheService.js'

export async function POST(request) {
  const logger = enhancedLogger.with({ route: '/api/pipeline' })
  
  try {
    // Security checks
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    
    // Rate limiting
    if (!securityMiddleware.checkRateLimit(clientIP)) {
      logger.warn('rate_limit_exceeded', { clientIP })
      return NextResponse.json({ 
        success: false, 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 })
    }

    // Check for suspicious activity
    if (securityMiddleware.detectSuspiciousActivity(request)) {
      logger.warn('suspicious_activity_detected', { clientIP })
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid request detected.' 
      }, { status: 400 })
    }

    const body = await request.json()
    const { region, farmerData, userId, regionId, cropId, phoneNumber = '+919322909257' } = body

    // Input validation
    if (region) {
      const regionValidation = securityMiddleware.validateRegion(region)
      if (!regionValidation.isValid) {
        logger.warn('invalid_region', { region, errors: regionValidation.errors })
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid region format',
          details: regionValidation.errors 
        }, { status: 400 })
      }
    }

    if (phoneNumber) {
      const phoneValidation = securityMiddleware.validatePhoneNumber(phoneNumber)
      if (!phoneValidation.isValid) {
        logger.warn('invalid_phone', { phoneNumber, errors: phoneValidation.errors })
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid phone number format',
          details: phoneValidation.errors 
        }, { status: 400 })
      }
    }

    if (userId) {
      const userIdValidation = securityMiddleware.validateUserId(userId)
      if (!userIdValidation.isValid) {
        logger.warn('invalid_user_id', { userId, errors: userIdValidation.errors })
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid user ID format',
          details: userIdValidation.errors 
        }, { status: 400 })
      }
    }
    
    if (!region && !farmerData) {
      return NextResponse.json({ success: false, error: 'Either region or farmerData is required' }, { status: 400 })
    }
    
    let result
    let storedResult = { success: false }
    let notificationResult = { success: false }
    
    if (farmerData) {
      // Use enhanced automated pipeline for farmer data
      try {
        // Check cache first for farmer analysis
        const cacheKey = `farmer_analysis:${farmerData.farmerId || 'default'}`
        result = await cacheService.getOrSet(cacheKey, async () => {
          return await enhancedAutomatedPipeline.executeFarmerPipeline(farmerData)
        }, 300000) // 5 minutes cache
        
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
            insights: [
              {
                type: 'soil_health',
                severity: 'medium',
                message: `Soil Health: ${result.insights?.soilHealth?.overall || 'Unknown'}`,
                data: result.insights?.soilHealth
              },
              {
                type: 'crop_suitability',
                severity: 'medium',
                message: `Crop Suitability: ${result.insights?.cropSuitability?.bestCrops?.length || 0} recommended crops`,
                data: result.insights?.cropSuitability
              },
              {
                type: 'water_management',
                severity: 'medium',
                message: `Water Management: ${result.insights?.waterManagement?.irrigationNeeds || 'Unknown'} irrigation needs`,
                data: result.insights?.waterManagement
              }
            ],
            predictions: [
              {
                type: 'yield_prediction',
                severity: 'medium',
                message: `Yield Potential: ${result.insights?.yieldPotential?.overall || 'Unknown'}`,
                data: result.insights?.yieldPotential
              },
              {
                type: 'risk_prediction',
                severity: result.insights?.pestRisk?.overall === 'High' ? 'high' : 'medium',
                message: `Pest Risk: ${result.insights?.pestRisk?.overall || 'Unknown'}`,
                data: result.insights?.pestRisk
              }
            ],
            alerts: result.recommendations?.filter(r => r.priority === 'High').map(r => ({
              type: 'high_priority_recommendation',
              severity: 'high',
              message: r.action
            })) || []
          }
          
          // Store results in database for farmer analysis
          storedResult = await storeFarmerAnalysisResults(result, phoneNumber)
          
          // Enhanced pipeline already sends notifications, so use the result from the pipeline
          notificationResult = result.notification || { success: false, method: 'None' }
        }
      } catch (enhancedError) {
        logger.error('enhanced_pipeline_failed', { error: enhancedError.message })
        
        // Fallback to standard pipeline if enhanced fails
        logger.info('falling_back_to_standard_pipeline')
        result = await automatedPipeline.executePipeline(region || 'maharashtra')
        
        if (result.success) {
          // Store fallback results
          storedResult = await storeFarmerAnalysisResults(result, phoneNumber)
          notificationResult = await sendFarmerNotification(result, phoneNumber)
        }
      }
    } else {
      // Use standard pipeline for region-based analysis
      // Check cache first for region analysis
      const cacheKey = `region_analysis:${region}`
      result = await cacheService.getOrSet(cacheKey, async () => {
        return await automatedPipeline.executePipeline(region)
      }, 600000) // 10 minutes cache
    }
    
    if (result.success) {
      
      // Persist prediction summary and alerts if regionId/cropId provided
      try {
        if (regionId && cropId) {
          const features = {
            weather: result?.dataCollection?.weather || null,
            nasa: result?.dataCollection?.nasa || null,
            gee: result?.dataCollection?.gee || result?.dataCollection?.environmental || null,
            imageAnalysis: result?.dataCollection?.imageAnalysis || null,
            insights: result?.insights || [],
            predictions: result?.predictions || []
          }

          const yieldPred = (result?.predictions || []).find(p => p.type === 'yield_prediction')
          const riskPred = (result?.predictions || []).find(p => p.type === 'risk_prediction')

          const { data: predictionRow, error: predErr } = await databaseService.withRetry(async () => {
            return await databaseService.client
              .from('predictions')
              .insert({
                user_id: userId || null,
                crop_id: cropId,
                region_id: regionId,
                features,
                yield: yieldPred?.data?.yieldChange ?? yieldPred?.data?.score ?? 0,
                risk_score: riskPred ? (riskPred.severity === 'high' ? 0.8 : 0.5) : 0
              })
              .select()
              .single()
          }, 'insert_prediction')

                      if (!predErr && predictionRow && Array.isArray(result.alerts) && result.alerts.length > 0) {
              const alertRows = result.alerts.map(a => ({
                prediction_id: predictionRow.id,
                type: a.type,
                message: a.message
              }))
              await databaseService.withRetry(async () => {
                return await databaseService.client.from('alerts').insert(alertRows)
              }, 'insert_alerts')
            }
        }
      } catch (persistErr) {
        logger.error('pipeline_persist_failed', { error: persistErr?.message })
      }

      // Add database and notification results to response
      const response = {
        ...result,
        database: {
          stored: storedResult.success,
          recordId: storedResult.recordId
        },
        notification: {
          sent: notificationResult.success,
          method: notificationResult.method
        }
      }

      return NextResponse.json(response)
    } else {
      logger.error('pipeline_execution_failed', { 
        pipelineId: result.pipelineId,
        error: result.error 
      })
      
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    logger.error('pipeline_request_failed', { error: error.message })
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

// Database and notification helper functions
async function storeFarmerAnalysisResults(pipelineResult, phoneNumber) {
  try {
    const { data: record, error } = await databaseService.withRetry(async () => {
      return await databaseService.client
        .from('farmer_analysis_results')
        .insert({
          farmer_id: pipelineResult.farmerId || 'pipeline_analysis',
          phone_number: phoneNumber,
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
        })
        .select()
        .single()
    }, 'store_farmer_analysis')

    if (error) {
      console.error('Failed to store farmer analysis results:', error)
      return { success: false, error: error.message }
    }

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
      // Check enhanced pipeline status
      const fallbackFarmerData = {
        farmerId: 'status_check',
        coordinates: { lat: 21.1458, lon: 79.0882 } // Default to Nagpur
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
