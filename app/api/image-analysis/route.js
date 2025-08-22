import { NextResponse } from 'next/server'
import imageProcessingService from '../../../lib/imageProcessingService'
import { Logger } from '../../../lib/logger'

// Helpers
async function readAsBuffer(file) {
  const arrayBuffer = await file.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function ok(data, logger, meta = {}) {
  logger.info('image_analysis_success', meta)
  return NextResponse.json({ success: true, data, message: 'Image analysis completed successfully' })
}

function fail(status, message, logger, extra = {}) {
  logger.error('image_analysis_failed', { status, message, ...extra })
  return NextResponse.json({ success: false, error: message, ...extra }, { status })
}

// POST: Analyze agricultural image (multipart or JSON)
export async function POST(request) {
  const logger = new Logger({ route: '/api/image-analysis' })

  try {
    const contentType = request.headers.get('content-type') || ''
    logger.info('image_analysis_request_received', { contentType })

    let imageBuffer = null
    let analysisType = 'comprehensive'
    let regionId = undefined
    let cropId = undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const imageFile = formData.get('image')
      analysisType = formData.get('analysisType') || 'comprehensive'
      regionId = formData.get('regionId') || undefined
      cropId = formData.get('cropId') || undefined

      if (!imageFile || !(imageFile instanceof File)) {
        return fail(400, 'Image file is required (multipart)', logger)
      }

      if (imageFile.size > 10 * 1024 * 1024) {
        return fail(400, 'File size too large. Maximum 10MB allowed.', logger, { size: imageFile.size })
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff']
      if (!allowedTypes.includes(imageFile.type)) {
        return fail(400, 'Invalid file type. Only JPEG, PNG, BMP, and TIFF are allowed.', logger, { type: imageFile.type })
      }

      imageBuffer = await readAsBuffer(imageFile)
      logger.info('image_file_parsed', { size: imageFile.size, type: imageFile.type })
    } else if (contentType.includes('application/json')) {
      const body = await request.json()
      analysisType = body.analysisType || 'comprehensive'
      regionId = body.regionId
      cropId = body.cropId

      // Accept base64 or remote URL (URL fetch kept minimal; prefer base64 for serverless limits)
      if (body.imageBase64) {
        imageBuffer = Buffer.from(body.imageBase64, 'base64')
        logger.info('json_image_base64_parsed', { length: imageBuffer.length })
      } else if (body.imageUrl) {
        const res = await fetch(body.imageUrl)
        if (!res.ok) return fail(400, 'Failed to fetch imageUrl', logger, { status: res.status })
        const arr = Buffer.from(await res.arrayBuffer())
        imageBuffer = arr
        logger.info('json_image_url_fetched', { length: imageBuffer.length })
      } else {
        // No image provided; run mock/fallback analysis
        logger.warn('no_image_in_json_payload')
        imageBuffer = Buffer.from('')
      }
    } else {
      // Unsupported content-type; try to proceed with mock
      logger.warn('unsupported_content_type', { contentType })
      imageBuffer = Buffer.from('')
    }

    const analysisResult = await imageProcessingService.analyzeAgriculturalImage(imageBuffer, analysisType)

    const enhancedResult = {
      ...analysisResult,
      metadata: {
        analysisType,
        regionId,
        cropId,
        timestamp: new Date().toISOString()
      }
    }

    return ok(enhancedResult, logger, { analysisType })
  } catch (error) {
    logger.error('image_analysis_exception', { error: error?.message })
    // Graceful fallback: return mock result from service
    try {
      const fallback = await imageProcessingService.analyzeAgriculturalImage(Buffer.from(''), 'comprehensive')
      return NextResponse.json({ success: true, data: fallback, fallback: true })
    } catch (inner) {
      return fail(500, 'Failed to analyze image', logger, { message: error?.message })
    }
  }
}

// GET: Get supported analysis types and service status
export async function GET() {
  const logger = new Logger({ route: '/api/image-analysis' })
  try {
    const serviceStatus = imageProcessingService.getServiceStatus?.() || {
      supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'tiff'],
      maxFileSize: 10 * 1024 * 1024
    }

    const analysisTypes = [
      { id: 'comprehensive', name: 'Comprehensive Analysis', description: 'Full analysis including crop health, diseases, soil, and weeds', estimatedTime: '30-60 seconds' },
      { id: 'crop-health', name: 'Crop Health Analysis', description: 'Focus on vegetation health and growth patterns', estimatedTime: '15-30 seconds' },
      { id: 'disease-detection', name: 'Disease Detection', description: 'Identify common plant diseases and infections', estimatedTime: '20-40 seconds' },
      { id: 'soil-analysis', name: 'Soil Analysis', description: 'Analyze soil composition, moisture, and fertility', estimatedTime: '20-35 seconds' },
      { id: 'weed-detection', name: 'Weed Detection', description: 'Detect and classify weed types and coverage', estimatedTime: '25-45 seconds' }
    ]

    logger.info('image_analysis_status_ok')
    return NextResponse.json({ success: true, serviceStatus, analysisTypes, supportedFormats: serviceStatus.supportedFormats, maxFileSize: serviceStatus.maxFileSize, timestamp: new Date().toISOString() })
  } catch (error) {
    logger.error('image_analysis_status_error', { error: error?.message })
    return NextResponse.json({ success: false, error: 'Failed to get service status', message: error?.message }, { status: 500 })
  }
}
