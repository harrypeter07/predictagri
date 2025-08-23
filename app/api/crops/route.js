import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

// Fallback crops data when database is not available
const fallbackCrops = [
  { id: '1', name: 'Rice', season: 'Kharif' },
  { id: '2', name: 'Wheat', season: 'Rabi' },
  { id: '3', name: 'Maize', season: 'Kharif' },
  { id: '4', name: 'Cotton', season: 'Kharif' },
  { id: '5', name: 'Sugarcane', season: 'Year-round' },
  { id: '6', name: 'Pulses', season: 'Rabi' },
  { id: '7', name: 'Oilseeds', season: 'Kharif' },
  { id: '8', name: 'Vegetables', season: 'Year-round' }
]

// GET: Retrieve all crops
export async function GET() {
  const startTime = Date.now()
  const requestId = `crops_get_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`🌾 [${requestId}] Crops API Called: GET /api/crops`)
  console.log(`📊 [${requestId}] Request received at: ${new Date().toISOString()}`)
  
  try {
    // Check if Supabase client is properly configured
    if (!supabase) {
      console.warn(`⚠️ [${requestId}] Supabase client not initialized, returning fallback data`)
      return NextResponse.json(fallbackCrops, {
        headers: {
          'X-Data-Source': 'fallback',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      })
    }

    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .order('name')

    if (error) {
      console.error(`❌ [${requestId}] Supabase error:`, error)
      console.warn(`⚠️ [${requestId}] Returning fallback data due to database error`)
      return NextResponse.json(fallbackCrops, {
        headers: {
          'X-Data-Source': 'fallback',
          'X-Error': error.message,
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      })
    }

    // Check if we got valid data
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`⚠️ [${requestId}] Database returned empty crops array, using fallback`)
      return NextResponse.json(fallbackCrops, {
        headers: {
          'X-Data-Source': 'fallback',
          'X-Reason': 'empty_database',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      })
    }

    const responseTime = Date.now() - startTime
    console.log(`✅ [${requestId}] Retrieved ${data.length} crops in ${responseTime}ms`)

    return NextResponse.json(data, {
      headers: {
        'X-Data-Source': 'database',
        'X-Response-Time': `${responseTime}ms`
      }
    })
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error(`❌ [${requestId}] API error after ${responseTime}ms:`, error)
    
    return NextResponse.json(fallbackCrops, {
      headers: {
        'X-Data-Source': 'fallback',
        'X-Error': error.message,
        'X-Response-Time': `${responseTime}ms`
      }
    })
  }
}

// POST: Create a new crop (for testing)
export async function POST(request) {
  const startTime = Date.now()
  const requestId = `crops_post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`🌾 [${requestId}] Crops API Called: POST /api/crops`)
  console.log(`📊 [${requestId}] Request received at: ${new Date().toISOString()}`)
  
  try {
    const body = await request.json()
    const { name, season } = body

    // Validate required fields
    if (!name || !season) {
      console.warn(`⚠️ [${requestId}] Missing required fields:`, { name: !!name, season: !!season })
      return NextResponse.json(
        { error: 'Missing required fields: name, season' },
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
      .from('crops')
      .insert({
        name,
        season
      })
      .select()
      .single()

    if (error) {
      console.error(`❌ [${requestId}] Supabase error:`, error)
      return NextResponse.json(
        { error: 'Failed to create crop', details: error.message },
        { status: 500 }
      )
    }

    const responseTime = Date.now() - startTime
    console.log(`✅ [${requestId}] Created crop "${name}" in ${responseTime}ms`)

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
