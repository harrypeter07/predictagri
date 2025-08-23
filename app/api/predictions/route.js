import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

// POST: Create a new prediction
export async function POST(request) {
  const startTime = Date.now()
  const requestId = `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`🤖 [${requestId}] AI Model Endpoint Called: POST /api/predictions`)
  console.log(`📊 [${requestId}] Request received at: ${new Date().toISOString()}`)
  
  try {
    // Check if Supabase client is properly configured
    if (!supabase) {
      console.error(`❌ [${requestId}] Supabase client not initialized`)
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { userId, cropId, regionId, features } = body

    console.log(`📋 [${requestId}] Request Data:`, {
      userId,
      cropId,
      regionId,
      features: {
        temperature: features?.temperature,
        humidity: features?.humidity,
        rainfall: features?.rainfall,
        wind_speed: features?.wind_speed,
        soil_moisture: features?.soil_moisture,
        nitrogen: features?.nitrogen,
        phosphorus: features?.phosphorus,
        potassium: features?.potassium,
        ph: features?.ph
      }
    })

    // Validate required fields
    if (!cropId || !regionId || !features) {
      console.warn(`⚠️ [${requestId}] Missing required fields:`, { cropId, regionId, features: !!features })
      return NextResponse.json(
        { error: 'Missing required fields: cropId, regionId, features' },
        { status: 400 }
      )
    }

    // Get crop and region details for ONNX model
    console.log(`🔍 [${requestId}] Fetching crop and region data from database...`)
    let cropData, cropError, regionData, regionError
    
    try {
      const cropResult = await supabase
        .from('crops')
        .select('name, season')
        .eq('id', cropId)
        .single()
      
      cropData = cropResult.data
      cropError = cropResult.error
    } catch (dbError) {
      console.warn(`⚠️ [${requestId}] Database not available for crop lookup:`, dbError.message)
      // Use fallback crop data
      cropData = { name: 'Unknown Crop', season: 'Unknown' }
      cropError = null
    }

    if (cropError || !cropData) {
      console.error(`❌ [${requestId}] Crop not found:`, cropError)
      return NextResponse.json(
        { error: 'Crop not found' },
        { status: 400 }
      )
    }

    try {
      const regionResult = await supabase
        .from('regions')
        .select('name')
        .eq('id', regionId)
        .single()
      
      regionData = regionResult.data
      regionError = regionResult.error
    } catch (dbError) {
      console.warn(`⚠️ [${requestId}] Database not available for region lookup:`, dbError.message)
      // Use fallback region data
      regionData = { name: 'Unknown Region' }
      regionError = null
    }

    if (regionError || !regionData) {
      console.error(`❌ [${requestId}] Region not found:`, regionError)
      return NextResponse.json(
        { error: 'Region not found' },
        { status: 400 }
      )
    }

    console.log(`✅ [${requestId}] Database lookup successful:`, {
      crop: cropData.name,
      season: cropData.season,
      region: regionData.name
    })

    // Use ONNX model for prediction via Render backend
    let yield_prediction, risk_score
    let usedFallback = false
    
    try {
      // Backend URL - use environment variable or fallback
      const BACKEND_URL = process.env.BACKEND_URL || 'https://agribackend-f3ky.onrender.com';
      
      console.log(`🚀 [${requestId}] Calling ONNX Backend: ${BACKEND_URL}/predict`)
      
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

      console.log(`📤 [${requestId}] ONNX Request Payload:`, onnxFeatures)
      
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
      
      console.log(`✅ [${requestId}] ONNX Backend Response:`, predictionData)
      
      // Calculate risk score based on prediction and features
      risk_score = calculateRiskScore(features, yield_prediction)
      
      console.log(`✅ [${requestId}] Backend ONNX prediction successful:`, { yield_prediction, risk_score })
    } catch (onnxError) {
      console.log(`⚠️ [${requestId}] ONNX backend not available, using fallback ML prediction. Error:`, onnxError.message)
      
      // Fallback to ML-based prediction using features
      yield_prediction = calculateMLPrediction(features, cropData, regionData)
      risk_score = calculateRiskScore(features, yield_prediction)
      
      console.log(`🔄 [${requestId}] Fallback ML prediction generated:`, { yield_prediction, risk_score })
      
      // Set flag to indicate fallback was used
      usedFallback = true;
    }

    // Create prediction record
    const predictionRecord = {
      user_id: userId,
      crop_id: cropId,
      region_id: regionId,
      yield: parseFloat(yield_prediction) || 0, // Ensure numeric type
      risk_score: parseFloat(risk_score / 100) || 0, // Convert percentage to decimal (0-1)
      features: features,
      created_at: new Date().toISOString()
    }

    console.log(`💾 [${requestId}] Storing prediction in database:`, {
      yield_prediction,
      risk_score,
      features_count: Object.keys(features).length
    })
    
    console.log(`💾 [${requestId}] Final prediction record:`, predictionRecord)

    let storedPrediction, insertError
    
    try {
      const result = await supabase
        .from('predictions')
        .insert([predictionRecord])
        .select()
      
      storedPrediction = result.data
      insertError = result.error
    } catch (dbError) {
      console.warn(`⚠️ [${requestId}] Database not available, returning prediction without storage:`, dbError.message)
      // Return prediction without storing in database
      const responseTime = Date.now() - startTime
      return NextResponse.json({
        success: true,
        prediction: {
          id: `temp-${Date.now()}`,
          yield: yield_prediction,
          yield_prediction,
          risk_score: risk_score / 100,
          crop: cropData.name,
          region: regionData.name,
          timestamp: new Date().toISOString()
        },
        metadata: {
          requestId,
          responseTime: `${responseTime}ms`,
          model: usedFallback ? 'Fallback ML' : 'ONNX Backend',
          features_used: Object.keys(features).length,
          stored: false,
          note: 'Database not available - prediction returned without storage'
        }
      })
    }

    if (insertError) {
      console.error(`❌ [${requestId}] Failed to store prediction:`, insertError)
      console.error(`❌ [${requestId}] Insert Error Details:`, {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      })
      return NextResponse.json(
        { 
          error: 'Failed to store prediction',
          details: insertError.message,
          code: insertError.code
        },
        { status: 500 }
      )
    }

    console.log(`✅ [${requestId}] Prediction stored successfully with ID:`, storedPrediction[0].id)

    const responseTime = Date.now() - startTime
    console.log(`🏁 [${requestId}] Request completed in ${responseTime}ms`)

    return NextResponse.json({
      success: true,
      prediction: {
        id: storedPrediction[0].id,
        yield: yield_prediction,
        yield_prediction,
        risk_score: risk_score / 100, // Convert to decimal for consistency
        crop: cropData.name,
        region: regionData.name,
        timestamp: storedPrediction[0].created_at
      },
      metadata: {
        requestId,
        responseTime: `${responseTime}ms`,
        model: usedFallback ? 'Fallback ML' : 'ONNX Backend',
        features_used: Object.keys(features).length
      }
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error(`❌ [${requestId}] Prediction generation failed after ${responseTime}ms:`, error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        requestId,
        responseTime: `${responseTime}ms`
      },
      { status: 500 }
    )
  }
}

// GET: Retrieve predictions
export async function GET(request) {
  const startTime = Date.now()
  const requestId = `pred_get_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`🔍 [${requestId}] AI Model Endpoint Called: GET /api/predictions`)
  console.log(`📊 [${requestId}] Request received at: ${new Date().toISOString()}`)
  
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const cropId = searchParams.get('cropId')
    const limit = parseInt(searchParams.get('limit')) || 100

    console.log(`📋 [${requestId}] Query Parameters:`, { userId, cropId, limit })

    let query = supabase
      .from('predictions')
      .select(`
        *,
        crops(name, season),
        regions(name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (cropId) {
      query = query.eq('crop_id', cropId)
    }

    let predictions, error
    
    try {
      const result = await query
      predictions = result.data
      error = result.error
    } catch (dbError) {
      console.warn(`⚠️ [${requestId}] Database not available, returning empty predictions:`, dbError.message)
      const responseTime = Date.now() - startTime
      return NextResponse.json([], {
        headers: {
          'X-Database-Status': 'unavailable',
          'X-Response-Time': `${responseTime}ms`
        }
      })
    }

    if (error) {
      console.error(`❌ [${requestId}] Database query failed:`, error)
      return NextResponse.json(
        { error: 'Failed to fetch predictions' },
        { status: 500 }
      )
    }

    const responseTime = Date.now() - startTime
    console.log(`✅ [${requestId}] Retrieved ${predictions.length} predictions in ${responseTime}ms`)

    return NextResponse.json(predictions)

  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error(`❌ [${requestId}] Prediction retrieval failed after ${responseTime}ms:`, error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        requestId,
        responseTime: `${responseTime}ms`
      },
      { status: 500 }
    )
  }
}

// Helper function to calculate risk score
function calculateRiskScore(features, yield_prediction) {
  let riskScore = 0
  
  // Temperature risk
  if (features.temperature > 35 || features.temperature < 10) {
    riskScore += 25
  } else if (features.temperature > 30 || features.temperature < 15) {
    riskScore += 15
  }
  
  // Humidity risk
  if (features.humidity > 90 || features.humidity < 30) {
    riskScore += 20
  }
  
  // Soil moisture risk
  if (features.soil_moisture < 0.3 || features.soil_moisture > 0.8) {
    riskScore += 20
  }
  
  // pH risk
  if (features.ph < 5.5 || features.ph > 7.5) {
    riskScore += 15
  }
  
  // Yield prediction adjustment
  if (yield_prediction < 0.5) {
    riskScore += 20
  }
  
  return Math.min(100, Math.max(0, riskScore))
}

// Helper function for ML-based prediction
function calculateMLPrediction(features, cropData, regionData) {
  // Simple ML-based prediction using feature weights
  let baseYield = 0.7
  
  // Temperature factor
  const tempFactor = features.temperature >= 20 && features.temperature <= 30 ? 1.2 : 0.8
  
  // Humidity factor
  const humidityFactor = features.humidity >= 50 && features.humidity <= 80 ? 1.1 : 0.9
  
  // Soil moisture factor
  const moistureFactor = features.soil_moisture >= 0.4 && features.soil_moisture <= 0.7 ? 1.15 : 0.85
  
  // pH factor
  const phFactor = features.ph >= 6.0 && features.ph <= 7.0 ? 1.1 : 0.9
  
  // Crop-specific adjustments
  let cropFactor = 1.0
  if (cropData.name.toLowerCase().includes('rice')) {
    cropFactor = 1.2 // Rice likes humidity
  } else if (cropData.name.toLowerCase().includes('wheat')) {
    cropFactor = 0.9 // Wheat prefers moderate conditions
  }
  
  // Calculate final yield
  const finalYield = baseYield * tempFactor * humidityFactor * moistureFactor * phFactor * cropFactor
  
  return Math.max(0.1, Math.min(1.0, finalYield))
}
