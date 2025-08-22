import { NextResponse } from 'next/server'
import { Logger } from '../../../../lib/logger'

// POST: Store image analysis results in database
export async function POST(request) {
  const logger = new Logger({ route: '/api/image-analysis/store' })
  
  try {
    const body = await request.json()
    const { regionId, cropId, analysisType, analysisResult, imageMetadata, timestamp } = body
    
    // Store image analysis results in database
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { error: insertError } = await supabase
      .from('image_analysis_results')
      .insert({
        region_id: regionId,
        crop_id: cropId,
        analysis_type: analysisType,
        analysis_result: analysisResult,
        image_metadata: imageMetadata,
        timestamp: timestamp || new Date().toISOString()
      })
    
    if (insertError) {
      logger.error('image_analysis_store_failed', { error: insertError.message })
      return NextResponse.json(
        { success: false, error: 'Failed to store image analysis results' },
        { status: 500 }
      )
    }
    
    logger.info('image_analysis_store_success')
    return NextResponse.json({ success: true, message: 'Image analysis results stored successfully' })
    
  } catch (error) {
    logger.error('image_analysis_store_exception', { error: error.message })
    return NextResponse.json(
      { success: false, error: 'Failed to store image analysis results' },
      { status: 500 }
    )
  }
}
