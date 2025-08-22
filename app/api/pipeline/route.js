import { NextResponse } from 'next/server'
import { Logger } from '../../../lib/logger'
const AutomatedPipeline = require('../../../lib/automatedPipeline')
import { supabase } from '../../../lib/supabaseClient'

export async function POST(request) {
  const logger = new Logger({ route: '/api/pipeline' })
  
  try {
    const body = await request.json()
    const { region, farmerData, userId, regionId, cropId } = body
    
    logger.info('pipeline_request_received', { region, farmerData })
    
    if (!region) {
      logger.error('missing_region')
      return NextResponse.json({ success: false, error: 'Region is required' }, { status: 400 })
    }
    
    const pipeline = new AutomatedPipeline()
    const result = await pipeline.executePipeline(region, farmerData)
    
    if (result.success) {
      logger.info('pipeline_execution_success', { 
        pipelineId: result.pipelineId,
        insightsCount: result.insights.length,
        predictionsCount: result.predictions.length,
        alertsCount: result.alerts.length
      })
      
      // Persist prediction summary and alerts if regionId/cropId provided
      try {
        if (regionId && cropId) {
          const features = {
            weather: result?.dataCollection?.weather || null,
            nasa: result?.dataCollection?.nasa || null,
            gee: result?.dataCollection?.gee || null,
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
              yield: yieldPred?.data?.yieldChange ?? 0,
              risk_score: riskPred ? 1 : 0
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
  
  logger.info('pipeline_status_request', { region })
  
  try {
    const pipeline = new AutomatedPipeline()
    const result = await pipeline.executePipeline(region)
    
    return NextResponse.json({
      success: true,
      status: 'operational',
      lastRun: result.timestamp,
      region,
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
