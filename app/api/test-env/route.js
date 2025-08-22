import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasNasaKey: !!process.env.NASA_API_KEY,
    keyLength: process.env.NASA_API_KEY?.length || 0,
    keyPreview: process.env.NASA_API_KEY ? 
      `${process.env.NASA_API_KEY.substring(0, 8)}...${process.env.NASA_API_KEY.substring(-4)}` : 
      'Not set',
    timestamp: new Date().toISOString()
  })
}
