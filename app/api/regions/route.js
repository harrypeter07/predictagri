import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

// Fallback regions data when database is not available
const fallbackRegions = [
  { id: '1', name: 'Punjab Region', lat: 30.3753, lon: 69.3451, soil_n: 45, soil_p: 30, soil_k: 25, ph: 6.5 },
  { id: '2', name: 'Haryana Plains', lat: 29.0588, lon: 76.0856, soil_n: 50, soil_p: 35, soil_k: 30, ph: 7.2 },
  { id: '3', name: 'Uttar Pradesh Central', lat: 26.8467, lon: 80.9462, soil_n: 40, soil_p: 25, soil_k: 20, ph: 6.8 },
  { id: '4', name: 'Maharashtra Western', lat: 19.0760, lon: 72.8777, soil_n: 35, soil_p: 20, soil_k: 15, ph: 7.0 },
  { id: '5', name: 'Karnataka Southern', lat: 12.9716, lon: 77.5946, soil_n: 30, soil_p: 15, soil_k: 10, ph: 6.2 },
  { id: '6', name: 'Tamil Nadu Eastern', lat: 13.0827, lon: 80.2707, soil_n: 25, soil_p: 10, soil_k: 5, ph: 6.0 },
  { id: '7', name: 'Gujarat Western', lat: 23.0225, lon: 72.5714, soil_n: 20, soil_p: 5, soil_k: 0, ph: 7.5 },
  { id: '8', name: 'Rajasthan Northern', lat: 26.9124, lon: 75.7873, soil_n: 15, soil_p: 0, soil_k: 0, ph: 8.0 }
]

// GET: Retrieve all regions
export async function GET() {
  const startTime = Date.now()
  const requestId = `regions_get_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`📍 [${requestId}] Regions API Called: GET /api/regions`)
  console.log(`📊 [${requestId}] Request received at: ${new Date().toISOString()}`)
  
  try {
    // Check if Supabase client is properly configured
    if (!supabase) {
      console.warn(`⚠️ [${requestId}] Supabase client not initialized, returning fallback data`)
      return NextResponse.json(fallbackRegions, {
        headers: {
          'X-Data-Source': 'fallback',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      })
    }

    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('name')

    if (error) {
      console.error(`❌ [${requestId}] Supabase error:`, error)
      console.warn(`⚠️ [${requestId}] Returning fallback data due to database error`)
      return NextResponse.json(fallbackRegions, {
        headers: {
          'X-Data-Source': 'fallback',
          'X-Error': error.message,
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      })
    }

    // Check if we got valid data
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`⚠️ [${requestId}] Database returned empty regions array, using fallback`)
      return NextResponse.json(fallbackRegions, {
        headers: {
          'X-Data-Source': 'fallback',
          'X-Reason': 'empty_database',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      })
    }

    const responseTime = Date.now() - startTime
    console.log(`✅ [${requestId}] Retrieved ${data.length} regions in ${responseTime}ms`)

    return NextResponse.json(data, {
      headers: {
        'X-Data-Source': 'database',
        'X-Response-Time': `${responseTime}ms`
      }
    })
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error(`❌ [${requestId}] API error after ${responseTime}ms:`, error)
    
    return NextResponse.json(fallbackRegions, {
      headers: {
        'X-Data-Source': 'fallback',
        'X-Error': error.message,
        'X-Response-Time': `${responseTime}ms`
      }
    })
  }
}

// POST: Create a new region (for testing)
export async function POST(request) {
  const startTime = Date.now()
  const requestId = `regions_post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`📍 [${requestId}] Regions API Called: POST /api/regions`)
  console.log(`📊 [${requestId}] Request received at: ${new Date().toISOString()}`)
  
  try {
    const body = await request.json()
    const { name, lat, lon, soil_n, soil_p, soil_k, ph } = body

    // Validate required fields
    if (!name || !lat || !lon || !soil_n || !soil_p || !soil_k || !ph) {
      console.warn(`⚠️ [${requestId}] Missing required fields:`, { 
        name: !!name, lat: !!lat, lon: !!lon, 
        soil_n: !!soil_n, soil_p: !!soil_p, soil_k: !!soil_k, ph: !!ph 
      })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if Supabase client is properly configured
    if (!supabase) {
      console.error(`❌ [${requestId}] Supabase client not initialized`)
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    const { data, error } = await supabase
      .from('regions')
      .insert({
        name,
        lat,
        lon,
        soil_n,
        soil_p,
        soil_k,
        ph
      })
      .select()
      .single()

    if (error) {
      console.error(`❌ [${requestId}] Supabase error:`, error)
      return NextResponse.json(
        { error: 'Failed to create region', details: error.message },
        { status: 500 }
      )
    }

    const responseTime = Date.now() - startTime
    console.log(`✅ [${requestId}] Created region "${name}" in ${responseTime}ms`)

    return NextResponse.json(data, {
      headers: {
        'X-Response-Time': `${responseTime}ms`
      }
    })
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error(`❌ [${requestId}] API error after ${responseTime}ms:`, error)
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
