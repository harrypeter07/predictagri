import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

// POST: Create a new prediction
export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, cropId, regionId, features } = body

    // Validate required fields
    if (!cropId || !regionId || !features) {
      return NextResponse.json(
        { error: 'Missing required fields: cropId, regionId, features' },
        { status: 400 }
      )
    }

    // Generate mock prediction data
    const yield_prediction = Math.random() * 100 + 50 // Random yield between 50-150
    const risk_score = Math.random() * 0.5 + 0.1 // Random risk between 0.1-0.6

    // Insert prediction into database
    const { data, error } = await supabase
      .from('predictions')
      .insert({
        user_id: userId || null,
        crop_id: cropId,
        region_id: regionId,
        features: features,
        yield: yield_prediction,
        risk_score: risk_score
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to create prediction' },
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

// GET: Retrieve last 10 predictions
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select(`
        *,
        crops (name, season),
        regions (name, lat, lon)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch predictions' },
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
