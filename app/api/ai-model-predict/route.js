import AgriExpertGemini from '../../../lib/agriExpertGemini.js';

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('🧪 Proxying prediction request to backend...')
    console.log('📊 Request data:', body)
    
    // Ensure we have all required fields for the backend
    const backendRequestData = {
      rainfall: body.rainfall || 0,
      temperature: body.temperature || 25,
      humidity: body.humidity || 65,
      soil_ph: body.soil_ph || 6.5,
      fertilizer_usage: body.fertilizer_usage || 45,
      risk_score: body.risk_score || 0.3,
      // Add crop and region if available
      crop: body.crop || 'Unknown',
      region: body.region || 'Unknown'
    }
    
    console.log('📤 Sending to backend:', backendRequestData)
    
    const response = await fetch('https://agribackend-f3ky.onrender.com/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendRequestData),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Backend prediction failed: ${response.status}`)
    }
    
    const result = await response.json()
    console.log('✅ Prediction successful:', result)
    
    // Debug the prediction value
    const predictionValue = result.prediction[0][0]
    console.log('🔍 Raw prediction value:', predictionValue)
    console.log('🔍 Prediction type:', typeof predictionValue)
    console.log('🔍 Full prediction array:', result.prediction)
    
    // Validate prediction value
    let validatedPrediction = predictionValue
    if (typeof predictionValue !== 'number' || isNaN(predictionValue)) {
      console.warn('⚠️ Invalid prediction value, using fallback')
      validatedPrediction = 0.5 // Default to 50% if invalid
    } else if (predictionValue > 1) {
      console.warn('⚠️ Prediction value > 1, normalizing to 1')
      validatedPrediction = 1
    } else if (predictionValue < 0) {
      console.warn('⚠️ Prediction value < 0, normalizing to 0')
      validatedPrediction = 0
    }
    
    console.log('🔍 Validated prediction value:', validatedPrediction)

    // Secretly enhance the response with Gemini expert analysis
    try {
      
      // Create enhanced prediction data
      const enhancedPredictionData = {
        yield_prediction: validatedPrediction,
        risk_score: body.risk_score || 0.3,
        crop: body.crop || 'Unknown Crop',
        region: body.region || 'Unknown Region'
      }

      // Initialize Gemini expert service secretly
      const geminiExpert = new AgriExpertGemini()
      
      // Generate expert analysis based on prediction and input features
      const expertAnalysis = await geminiExpert.generateExpertAnalysis(
        enhancedPredictionData, 
        body
      )

      // Enhance the original result with expert analysis (hidden from user)
      const enhancedResult = {
        ...result,
        // Update the prediction with validated value
        prediction: [[validatedPrediction]],
        _expertAnalysis: expertAnalysis, // Hidden field
        _enhanced: true, // Hidden flag
        _confidence: expertAnalysis.confidence // Hidden confidence
      }
      
      return Response.json(enhancedResult)
    } catch (geminiError) {
      console.error('❌ Enhancement failed, returning original result:', geminiError)
      // If enhancement fails, return original result without enhancement
      return Response.json(result)
    }
  } catch (error) {
    console.error('❌ Prediction proxy error:', error)
    return Response.json(
      { 
        error: error.message,
        detail: error.message
      },
      { status: 500 }
    )
  }
}

