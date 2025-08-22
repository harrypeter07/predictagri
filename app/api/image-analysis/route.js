import { NextResponse } from 'next/server'
import imageProcessingService from '../../../lib/imageProcessingService'

// POST: Analyze agricultural image
export async function POST(request) {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    const imageFile = formData.get('image')
    const analysisType = formData.get('analysisType') || 'comprehensive'
    const regionId = formData.get('regionId')
    const cropId = formData.get('cropId')

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      )
    }

    // Validate file
    if (!(imageFile instanceof File)) {
      return NextResponse.json(
        { error: 'Invalid file format' },
        { status: 400 }
      )
    }

    // Check file size
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 10MB allowed.' },
        { status: 400 }
      )
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff']
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, BMP, and TIFF are allowed.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())

    // Process image with metadata
    const analysisResult = await imageProcessingService.analyzeAgriculturalImage(imageBuffer, analysisType)
    
    // Add metadata to result
    const enhancedResult = {
      ...analysisResult,
      metadata: {
        fileName: imageFile.name,
        fileSize: imageFile.size,
        fileType: imageFile.type,
        analysisType: analysisType,
        regionId: regionId,
        cropId: cropId,
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json({
      success: true,
      data: enhancedResult,
      message: 'Image analysis completed successfully'
    })

  } catch (error) {
    console.error('Image analysis API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze image',
        message: error.message,
        fallbackAvailable: true
      },
      { status: 500 }
    )
  }
}

// GET: Get supported analysis types and service status
export async function GET() {
  try {
    const serviceStatus = imageProcessingService.getServiceStatus()
    
    const analysisTypes = [
      {
        id: 'comprehensive',
        name: 'Comprehensive Analysis',
        description: 'Full analysis including crop health, diseases, soil, and weeds',
        estimatedTime: '30-60 seconds'
      },
      {
        id: 'crop-health',
        name: 'Crop Health Analysis',
        description: 'Focus on vegetation health and growth patterns',
        estimatedTime: '15-30 seconds'
      },
      {
        id: 'disease-detection',
        name: 'Disease Detection',
        description: 'Identify common plant diseases and infections',
        estimatedTime: '20-40 seconds'
      },
      {
        id: 'soil-analysis',
        name: 'Soil Analysis',
        description: 'Analyze soil composition, moisture, and fertility',
        estimatedTime: '20-35 seconds'
      },
      {
        id: 'weed-detection',
        name: 'Weed Detection',
        description: 'Detect and classify weed types and coverage',
        estimatedTime: '25-45 seconds'
      }
    ]

    return NextResponse.json({
      success: true,
      serviceStatus,
      analysisTypes,
      supportedFormats: serviceStatus.supportedFormats,
      maxFileSize: serviceStatus.maxFileSize,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Image analysis service status error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get service status',
        message: error.message
      },
      { status: 500 }
    )
  }
}
