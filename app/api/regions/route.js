import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

// GET: Retrieve all regions
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('name')

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch regions' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create a new region (for testing)
export async function POST(request) {
  try {
    const body = await request.json()
    const { name, lat, lon, soil_n, soil_p, soil_k, ph } = body

    // Validate required fields
    if (!name || !lat || !lon || !soil_n || !soil_p || !soil_k || !ph) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
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
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to create region' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
