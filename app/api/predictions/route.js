import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

// POST: Create a new prediction
export async function POST(request) {
  try {
    // Check if Supabase client is properly configured
    if (!supabase) {
      console.error('Supabase client not initialized')
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { userId, cropId, regionId, features } = body

    // Validate required fields
    if (!cropId || !regionId || !features) {
      return NextResponse.json(
        { error: 'Missing required fields: cropId, regionId, features' },
        { status: 400 }
      )
    }

    // Get crop and region details for ONNX model
    const { data: cropData, error: cropError } = await supabase
      .from('crops')
      .select('name, season')
      .eq('id', cropId)
      .single()

    if (cropError || !cropData) {
      console.error('Crop not found:', cropError)
      return NextResponse.json(
        { error: 'Crop not found' },
        { status: 400 }
      )
    }

    const { data: regionData, error: regionError } = await supabase
      .from('regions')
      .select('name')
      .eq('id', regionId)
      .single()

    if (regionError || !regionData) {
      console.error('Region not found:', regionError)
      return NextResponse.json(
        { error: 'Region not found' },
        { status: 400 }
      )
    }

    // Use ONNX model for prediction via Render backend
    let yield_prediction, risk_score
    
    try {
      // Backend URL - replace with your actual Render URL
      const BACKEND_URL = process.env.BACKEND_URL || 'https://your-render-backend-url.onrender.com';
      
      // Map features to ONNX schema format
      const onnxFeatures = {
        numeric: {
          soil_ph: features.ph || 6.5
        },
        categorical: {
          crop_name: cropData.name,
          season: cropData.season,
          region: regionData.name
        }
      };
      
      // Run ONNX prediction via backend
      const predictionResponse = await fetch(`${BACKEND_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(onnxFeatures),
      });

      if (!predictionResponse.ok) {
        throw new Error(`Backend prediction failed: ${predictionResponse.statusText}`);
      }

      const predictionData = await predictionResponse.json();
      yield_prediction = predictionData.prediction;
      
      // Calculate risk score based on prediction and features
      risk_score = calculateRiskScore(features, yield_prediction)
      
      console.log('Backend ONNX prediction successful:', { yield_prediction, risk_score })
    } catch (onnxError) {
      console.log('ONNX backend not available, using fallback ML prediction. Error:', onnxError.message)
      
      // Fallback to ML-based prediction using features
      yield_prediction = calculateMLPrediction(features, cropData, regionData)
      risk_score = calculateRiskScore(features, yield_prediction)
    }

    console.log('Attempting to insert prediction:', { cropId, regionId, userId })

    // Insert prediction into database
    const { data, error } = await supabase
      .from('predictions')
      .insert({
        user_id: userId || null, // Allow null or string user_id
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
        { error: 'Failed to create prediction', details: error.message },
        { status: 500 }
      )
    }

    console.log('Prediction created successfully:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// ML-based prediction calculation (fallback)
function calculateMLPrediction(features, cropData, regionData) {
  // Base yield for different crops
  const baseYields = {
    'Rice': 80,
    'Wheat': 75,
    'Maize': 85,
    'Cotton': 60,
    'Sugarcane': 120,
    'Pulses': 70,
    'Oilseeds': 65,
    'Vegetables': 90,
    'Fruits': 95,
    'Tea': 55,
    'Coffee': 50,
    'Spices': 45
  }
  
  const baseYield = baseYields[cropData.name] || 75
  
  // Environmental factors
  const tempFactor = features.temperature ? Math.max(0.5, Math.min(1.5, 1 + (features.temperature - 25) / 50)) : 1
  const moistureFactor = features.soil_moisture ? Math.max(0.6, Math.min(1.4, features.soil_moisture * 2)) : 1
  const phFactor = features.ph ? Math.max(0.7, Math.min(1.3, 1 + (features.ph - 6.5) / 10)) : 1
  const npkFactor = features.soil_n && features.soil_p && features.soil_k ? 
    Math.max(0.8, Math.min(1.2, (features.soil_n + features.soil_p + features.soil_k) / 150)) : 1
  
  // Calculate final yield
  const finalYield = baseYield * tempFactor * moistureFactor * phFactor * npkFactor
  
  // Add some randomness (±10%)
  const randomFactor = 0.9 + Math.random() * 0.2
  
  return Math.round(finalYield * randomFactor)
}

// Risk score calculation based on features and prediction
function calculateRiskScore(features, yieldPrediction) {
  let riskScore = 0.1 // Base risk
  
  // Temperature risk
  if (features.temperature < 10 || features.temperature > 40) {
    riskScore += 0.3
  } else if (features.temperature < 15 || features.temperature > 35) {
    riskScore += 0.2
  }
  
  // Moisture risk
  if (features.soil_moisture < 0.2 || features.soil_moisture > 0.8) {
    riskScore += 0.25
  }
  
  // pH risk
  if (features.ph < 5.5 || features.ph > 8.5) {
    riskScore += 0.2
  }
  
  // NPK risk
  if (features.soil_n < 20 || features.soil_p < 15 || features.soil_k < 10) {
    riskScore += 0.15
  }
  
  // Yield-based risk
  if (yieldPrediction < 50) {
    riskScore += 0.2
  }
  
  return Math.min(0.9, Math.max(0.1, riskScore))
}

// GET: Retrieve last 10 predictions
export async function GET() {
  try {
    // Check if Supabase client is properly configured
    if (!supabase) {
      console.error('Supabase client not initialized')
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    console.log('Fetching predictions from database...')

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
        { error: 'Failed to fetch predictions', details: error.message },
        { status: 500 }
      )
    }

    console.log(`Fetched ${data?.length || 0} predictions`)
    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
