import { NextResponse } from 'next/server'
import { googleEarthEngineService } from '../../../../lib/googleEarthEngineService'
const imageProcessingService = require('../../../../lib/imageProcessingService')

// Helper: Promise wrapper for getThumbURL (EE callback API)
function getThumbURLAsync(image, params) {
  return new Promise((resolve, reject) => {
    try {
      image.getThumbURL(params, (url, err) => {
        if (err) return reject(err)
        return resolve(url)
      })
    } catch (error) {
      reject(error)
    }
  })
}

// GET: Fetch a recent Sentinel-2 RGB thumbnail for Nagpur, process with current image pipeline, log, and return concise JSON
export async function GET() {
  try {
    const nagpur = { name: 'Nagpur, Maharashtra', lat: 21.1458, lon: 79.0882 }

    // Ensure EE is initialized (will fall back if not configured)
    let initError = null
    let ee = null
    try {
      await googleEarthEngineService.initialize()
      // Get the properly initialized ee instance from the service
      ee = require('@google/earthengine')
      
      // Verify that ee.Geometry is available
      if (!ee || !ee.Geometry || !ee.Geometry.Rectangle) {
        throw new Error('Earth Engine Geometry not available after initialization')
      }
    } catch (e) {
      initError = e
      console.error('Earth Engine initialization failed:', e)
    }

    // If fallback mode is active or ee.Geometry is not available, use the local test image
    if (googleEarthEngineService.fallbackMode || !ee || !ee.Geometry) {
      const fs = require('fs')
      const path = require('path')
      const testImgPath = path.join(process.cwd(), 'test-image.png')
      const buffer = fs.readFileSync(testImgPath)
      const analysis = await imageProcessingService.analyzeAgriculturalImage(buffer, 'comprehensive')
      const diagnostics = {
        reason: 'fallback_mode_active_or_ee_unavailable',
        initError: initError ? (initError.message || String(initError)) : undefined,
        serviceStatus: googleEarthEngineService.getServiceStatus(),
        envPresence: {
          GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
          GOOGLE_PROJECT_ID: !!process.env.GOOGLE_PROJECT_ID
        },
        emailDomain: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.split('@')[1] : undefined,
        eeAvailable: {
          eeImported: !!ee,
          eeGeometry: !!(ee && ee.Geometry),
          eeGeometryRectangle: !!(ee && ee.Geometry && ee.Geometry.Rectangle),
          getThumbURL: !!(ee && ee.Image && ee.Image.prototype && ee.Image.prototype.getThumbURL)
        }
      }
      console.error('[Nagpur EE Fallback] Diagnostics:', diagnostics)
      console.log('[Nagpur EE Fallback] Image analysis:', analysis)
      return NextResponse.json({
        success: true,
        mode: 'fallback',
        region: nagpur.name,
        analysis,
        note: 'Using local test-image.png due to EE fallback mode or unavailable Geometry',
        diagnostics
      })
    }

    // Define a small rectangle around Nagpur (~40km box)
    const region = ee.Geometry.Rectangle([
      nagpur.lon - 0.2,
      nagpur.lat - 0.2,
      nagpur.lon + 0.2,
      nagpur.lat + 0.2
    ])

    const end = new Date()
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Sentinel-2 SR, low cloud, last 30 days, median composite, RGB bands
    const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(region)
      .filterDate(start.toISOString(), end.toISOString())
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))

    const composite = collection.median()
    const rgb = composite.select(['B4', 'B3', 'B2'])
    const vis = rgb.visualize({ min: 0, max: 3000 })

    // Build a thumbnail URL and download the image
    let url
    try {
      url = await getThumbURLAsync(vis, {
        region,
        dimensions: 512,
        format: 'png'
      })
    } catch (err) {
      const fs = require('fs')
      const path = require('path')
      const testImgPath = path.join(process.cwd(), 'test-image.png')
      const buffer = fs.readFileSync(testImgPath)
      const analysis = await imageProcessingService.analyzeAgriculturalImage(buffer, 'comprehensive')
      const diagnostics = {
        reason: 'getThumbURL_failed',
        error: err?.message || String(err),
        step: 'ee.Image.getThumbURL',
        serviceStatus: googleEarthEngineService.getServiceStatus()
      }
      console.error('[Nagpur EE Fallback] Diagnostics:', diagnostics)
      console.log('[Nagpur EE Fallback] Image analysis:', analysis)
      return NextResponse.json({ success: true, mode: 'fallback', region: nagpur.name, analysis, diagnostics })
    }

    let buffer
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to download thumbnail: ${res.status}`)
      const arrayBuffer = await res.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } catch (err) {
      const fs = require('fs')
      const path = require('path')
      const testImgPath = path.join(process.cwd(), 'test-image.png')
      const fb = fs.readFileSync(testImgPath)
      const analysis = await imageProcessingService.analyzeAgriculturalImage(fb, 'comprehensive')
      const diagnostics = {
        reason: 'download_failed',
        error: err?.message || String(err),
        step: 'download_thumb',
        url,
        serviceStatus: googleEarthEngineService.getServiceStatus()
      }
      console.error('[Nagpur EE Fallback] Diagnostics:', diagnostics)
      console.log('[Nagpur EE Fallback] Image analysis:', analysis)
      return NextResponse.json({ success: true, mode: 'fallback', region: nagpur.name, analysis, diagnostics })
    }

    // Process image using existing implementation
    const analysis = await imageProcessingService.analyzeAgriculturalImage(buffer, 'comprehensive')

    // Log to server console as requested
    console.log('[Nagpur EE] Thumbnail analysis:', analysis)

    return NextResponse.json({
      success: true,
      mode: 'earth-engine',
      region: nagpur.name,
      thumbBytes: buffer.length,
      analysis
    })
  } catch (error) {
    console.error('Nagpur satellite processing failed:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}


