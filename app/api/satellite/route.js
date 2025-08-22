import { NextResponse } from 'next/server'
import { googleEarthEngineService } from '../../../lib/googleEarthEngineService'

// GET: Get satellite data for a specific region or historical data
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  if (action === 'history') {
    try {
      const regionId = searchParams.get('regionId')
      const dataType = searchParams.get('dataType')
      const limit = parseInt(searchParams.get('limit') || '30')
      
      if (!regionId) {
        return NextResponse.json(
          { error: 'Region ID is required' },
          { status: 400 }
        )
      }
      
      // Fetch historical data from database
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      let query = supabase
        .from('satellite_data')
        .select('*')
        .eq('region_id', regionId)
        .order('timestamp', { ascending: false })
        .limit(limit)
      
      if (dataType) {
        query = query.eq('data_type', dataType)
      }
      
      const { data: historicalData, error: dbError } = await query
      
      if (dbError) {
        console.error('Failed to fetch historical data:', dbError)
        return NextResponse.json(
          { error: 'Failed to fetch historical data' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: historicalData,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('Historical data fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch historical data' },
        { status: 500 }
      )
    }
  }
  
  // Default behavior - get current satellite data
  try {
    const regionId = searchParams.get('regionId')
    const dataType = searchParams.get('dataType') || 'comprehensive'
    const date = searchParams.get('date') || new Date().toISOString()

    console.log(`🛰️ [Satellite API] Request received:`, {
      regionId,
      dataType,
      date,
      timestamp: new Date().toISOString()
    })

    if (!regionId) {
      console.error(`🛰️ [Satellite API] Missing regionId parameter`)
      return NextResponse.json(
        { error: 'Region ID is required' },
        { status: 400 }
      )
    }

    // Get region data from database
    let region
    try {
      console.log(`🛰️ [Satellite API] Fetching region data from database for ID: ${regionId}`)
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      const { data: regionData, error: regionError } = await supabase
        .from('regions')
        .select('*')
        .eq('id', regionId)
        .single()
      
      if (regionError || !regionData) {
        console.error(`🛰️ [Satellite API] Region not found in database:`, {
          regionId,
          error: regionError,
          hasData: !!regionData
        })
        return NextResponse.json(
          { error: 'Region not found in database' },
          { status: 404 }
        )
      }
      
      console.log(`🛰️ [Satellite API] Region data retrieved successfully:`, {
        regionName: regionData.name,
        coordinates: `${regionData.lat}, ${regionData.lon}`,
        regionId: regionData.id
      })
      region = regionData
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch region data from database' },
        { status: 500 }
      )
    }

    let satelliteData
    const targetDate = new Date(date)
    
    console.log(`🛰️ [Satellite API] Fetching ${dataType} data for region: ${region.name}`)
    console.log(`🛰️ [Satellite API] Target date: ${targetDate.toISOString()}`)

    switch (dataType) {
      case 'ndvi':
        console.log(`🛰️ [Satellite API] Calling Google Earth Engine for NDVI data...`)
        satelliteData = await googleEarthEngineService.getNDVIData(region, targetDate)
        break
      case 'temperature':
        console.log(`🛰️ [Satellite API] Calling Google Earth Engine for temperature data...`)
        satelliteData = await googleEarthEngineService.getLandSurfaceTemperature(region, targetDate)
        break
      case 'soil-moisture':
        console.log(`🛰️ [Satellite API] Calling Google Earth Engine for soil moisture data...`)
        satelliteData = await googleEarthEngineService.getComprehensiveSoilData(region, targetDate)
        break
      case 'vegetation-health':
        console.log(`🛰️ [Satellite API] Calling Google Earth Engine for vegetation health data...`)
        satelliteData = await googleEarthEngineService.getVegetationHealthIndex(region, targetDate)
        break
      case 'comprehensive':
      default:
        console.log(`🛰️ [Satellite API] Calling Google Earth Engine for comprehensive satellite data...`)
        satelliteData = await googleEarthEngineService.getComprehensiveSatelliteData(region, targetDate)
        break
    }
    
    console.log(`🛰️ [Satellite API] Data retrieved successfully:`, {
      dataType,
      hasData: !!satelliteData,
      dataKeys: satelliteData ? Object.keys(satelliteData) : [],
      source: satelliteData?.source || 'Unknown'
    })

    // Get service status for monitoring
    const serviceStatus = googleEarthEngineService.getServiceStatus()

    return NextResponse.json({
      success: true,
      data: satelliteData,
      serviceStatus,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(`🛰️ [Satellite API] Satellite data API error:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      regionId: searchParams.get('regionId'),
      dataType: searchParams.get('dataType'),
      timestamp: new Date().toISOString()
    })
    
    // Return appropriate error response
    if (error.message.includes('API call limit exceeded')) {
      console.warn(`🛰️ [Satellite API] API call limit exceeded, returning 429`)
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
      console.warn(`🛰️ [Satellite API] Too many consecutive errors, switching to fallback mode`)
      return NextResponse.json(
        { 
          error: 'Service temporarily unavailable',
          message: 'Switching to fallback mode',
          fallbackAvailable: true
        },
        { status: 503 }
      )
    }

    console.error(`🛰️ [Satellite API] Unhandled error, returning 500`)
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

// POST: Store satellite data in database
export async function POST(request) {
  try {
    const body = await request.json()
    const { regionId, dataType, satelliteData, timestamp } = body
    
    // Store satellite data in database for historical tracking
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { error: insertError } = await supabase
      .from('satellite_data')
      .insert({
        region_id: regionId,
        data_type: dataType,
        satellite_data: satelliteData,
        timestamp: timestamp || new Date().toISOString()
      })
    
    if (insertError) {
      console.error('Failed to store satellite data:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to store satellite data' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, message: 'Satellite data stored successfully' })
    
  } catch (error) {
    console.error('Satellite data storage error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to store satellite data' },
      { status: 500 }
    )
  }
}
