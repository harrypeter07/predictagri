import { NextResponse } from 'next/server'
import { googleEarthEngineService } from '../../../lib/googleEarthEngineService'

// GET: Get satellite data for a specific region
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const regionId = searchParams.get('regionId')
    const dataType = searchParams.get('dataType') || 'comprehensive'
    const date = searchParams.get('date') || new Date().toISOString()

    if (!regionId) {
      return NextResponse.json(
        { error: 'Region ID is required' },
        { status: 400 }
      )
    }

    // Get region data from your database
    // For now, we'll use mock region data
    const region = {
      id: regionId,
      name: 'Sample Region',
      lat: 28.6139, // Delhi coordinates
      lon: 77.2090
    }

    let satelliteData
    const targetDate = new Date(date)

    switch (dataType) {
      case 'ndvi':
        satelliteData = await googleEarthEngineService.getNDVIData(region, targetDate)
        break
      case 'temperature':
        satelliteData = await googleEarthEngineService.getLandSurfaceTemperature(region, targetDate)
        break
      case 'soil-moisture':
        satelliteData = await googleEarthEngineService.getSoilMoisture(region, targetDate)
        break
      case 'vegetation-health':
        satelliteData = await googleEarthEngineService.getVegetationHealthIndex(region, targetDate)
        break
      case 'comprehensive':
      default:
        satelliteData = await googleEarthEngineService.getComprehensiveSatelliteData(region, targetDate)
        break
    }

    // Get service status for monitoring
    const serviceStatus = googleEarthEngineService.getServiceStatus()

    return NextResponse.json({
      success: true,
      data: satelliteData,
      serviceStatus,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Satellite data API error:', error)
    
    // Return appropriate error response
    if (error.message.includes('API call limit exceeded')) {
      return NextResponse.json(
        { 
          error: 'Daily API call limit exceeded',
          message: 'Please try again tomorrow or upgrade your plan',
          fallbackAvailable: true
        },
        { status: 429 }
      )
    }

    if (error.message.includes('Too many consecutive errors')) {
      return NextResponse.json(
        { 
          error: 'Service temporarily unavailable',
          message: 'Switching to fallback mode',
          fallbackAvailable: true
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch satellite data',
        message: error.message,
        fallbackAvailable: true
      },
      { status: 500 }
    )
  }
}

// POST: Get satellite data for multiple regions
export async function POST(request) {
  try {
    const body = await request.json()
    const { regions, dataType = 'comprehensive', date = new Date().toISOString() } = body

    if (!regions || !Array.isArray(regions) || regions.length === 0) {
      return NextResponse.json(
        { error: 'Regions array is required' },
        { status: 400 }
      )
    }

    if (regions.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 regions allowed per request' },
        { status: 400 }
      )
    }

    const targetDate = new Date(date)
    const results = []

    // Process regions sequentially to avoid overwhelming the API
    for (const region of regions) {
      try {
        let satelliteData

        switch (dataType) {
          case 'ndvi':
            satelliteData = await googleEarthEngineService.getNDVIData(region, targetDate)
            break
          case 'temperature':
            satelliteData = await googleEarthEngineService.getLandSurfaceTemperature(region, targetDate)
            break
          case 'soil-moisture':
            satelliteData = await googleEarthEngineService.getSoilMoisture(region, targetDate)
            break
          case 'vegetation-health':
            satelliteData = await googleEarthEngineService.getVegetationHealthIndex(region, targetDate)
            break
          case 'comprehensive':
          default:
            satelliteData = await googleEarthEngineService.getComprehensiveSatelliteData(region, targetDate)
            break
        }

        results.push({
          regionId: region.id,
          regionName: region.name,
          success: true,
          data: satelliteData
        })

      } catch (error) {
        console.error(`Failed to fetch data for region ${region.id}:`, error)
        results.push({
          regionId: region.id,
          regionName: region.name,
          success: false,
          error: error.message,
          fallbackData: await getFallbackData(region, dataType, targetDate)
        })
      }
    }

    const serviceStatus = googleEarthEngineService.getServiceStatus()

    return NextResponse.json({
      success: true,
      results,
      serviceStatus,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Bulk satellite data API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch bulk satellite data',
        message: error.message
      },
      { status: 500 }
    )
  }
}

// Helper function to get fallback data
async function getFallbackData(region, dataType, date) {
  try {
    switch (dataType) {
      case 'ndvi':
        return await googleEarthEngineService.getMockNDVIData(region, date)
      case 'temperature':
        return await googleEarthEngineService.getMockTemperatureData(region, date)
      case 'soil-moisture':
        return await googleEarthEngineService.getMockSoilMoistureData(region, date)
      case 'vegetation-health':
        return await googleEarthEngineService.getMockVegetationHealthData(region, date)
      case 'comprehensive':
      default:
        return await googleEarthEngineService.getMockComprehensiveData(region, date)
    }
  } catch (error) {
    console.error('Fallback data generation failed:', error)
    return {
      error: 'Fallback data unavailable',
      timestamp: date.toISOString(),
      source: 'Error'
    }
  }
}
