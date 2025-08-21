import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

// GET: Retrieve all crops
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .order('name')

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch crops' },
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

// POST: Create a new crop (for testing)
export async function POST(request) {
  try {
    const body = await request.json()
    const { name, season } = body

    // Validate required fields
    if (!name || !season) {
      return NextResponse.json(
        { error: 'Missing required fields: name, season' },
        { status: 400 }
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
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to create crop' },
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
