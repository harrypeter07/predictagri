import { NextResponse } from 'next/server'
import { Logger } from '../../../lib/logger'
const AutomatedPipeline = require('../../../lib/automatedPipeline')
const EnhancedAutomatedPipeline = require('../../../lib/enhancedAutomatedPipeline')
import { supabase } from '../../../lib/supabaseClient'

export async function POST(request) {
  const logger = new Logger({ route: '/api/pipeline' })
  
  try {
    const body = await request.json()
    const { region, farmerData, userId, regionId, cropId } = body
    
    logger.info('pipeline_request_received', { region, farmerData })
    
    if (!region && !farmerData) {
      logger.error('missing_region_or_farmer_data')
      return NextResponse.json({ success: false, error: 'Either region or farmerData is required' }, { status: 400 })
    }
    
    let result
    
    if (farmerData) {
      // Use enhanced automated pipeline for farmer data
      logger.info('using_enhanced_pipeline', { farmerId: farmerData.farmerId })
      
      const enhancedPipeline = new EnhancedAutomatedPipeline()
      result = await enhancedPipeline.executeFarmerPipeline(farmerData)
      
      // Transform enhanced pipeline result to match pipeline structure
      if (result.success) {
        result = {
          success: true,
          pipelineId: result.pipelineId,
          timestamp: result.timestamp,
          dataCollection: {
            weather: result.weather,
            environmental: result.environmental,
            imageAnalysis: result.imageAnalysis
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
      }
    } else {
      // Use standard pipeline for region-based analysis
      logger.info('using_standard_pipeline', { region })
      const pipeline = new AutomatedPipeline()
      result = await pipeline.executePipeline(region)
    }
    
    if (result.success) {
      logger.info('pipeline_execution_success', { 
        pipelineId: result.pipelineId,
        insightsCount: result.insights?.length || 0,
        predictionsCount: result.predictions?.length || 0,
        alertsCount: result.alerts?.length || 0
      })
      
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

          const { data: predictionRow, error: predErr } = await supabase
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

          if (!predErr && predictionRow && Array.isArray(result.alerts) && result.alerts.length > 0) {
            const alertRows = result.alerts.map(a => ({
              prediction_id: predictionRow.id,
              type: a.type,
              message: a.message
            }))
            await supabase.from('alerts').insert(alertRows)
          }
        }
      } catch (persistErr) {
        logger.error('pipeline_persist_failed', { error: persistErr?.message })
      }

      return NextResponse.json(result)
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

export async function GET(request) {
  const logger = new Logger({ route: '/api/pipeline' })
  const { searchParams } = new URL(request.url)
  const region = searchParams.get('region') || 'kansas'
  const farmerMode = searchParams.get('farmer') === 'true'
  
  logger.info('pipeline_status_request', { region, farmerMode })
  
  try {
    let result
    
    if (farmerMode) {
      // Check enhanced pipeline status
      const enhancedPipeline = new EnhancedAutomatedPipeline()
      const fallbackFarmerData = {
        farmerId: 'status_check',
        coordinates: { lat: 21.1458, lon: 79.0882 } // Default to Nagpur
      }
      
      result = await enhancedPipeline.executeFarmerPipeline(fallbackFarmerData)
      
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
      const pipeline = new AutomatedPipeline()
      result = await pipeline.executePipeline(region)
    }
    
    return NextResponse.json({
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
    })
  } catch (error) {
    logger.error('pipeline_status_failed', { error: error.message })
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
