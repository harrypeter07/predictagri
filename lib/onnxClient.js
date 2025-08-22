// client-only helper to load and run ONNX via Render backend
"use client";

// Backend URL - your actual Render backend URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agribackend-f3ky.onrender.com';

export async function loadSchema() {
  // Since the backend doesn't have a schema endpoint, return a default schema
  // based on the required fields we discovered
  return {
    numeric_features: ['soil_ph', 'temperature', 'humidity', 'rainfall', 'fertilizer_usage', 'risk_score'],
    categorical_features: ['crop_name', 'season', 'region']
  };
}

export async function runPrediction(numeric, categorical) {
  try {
    // Combine numeric and categorical data into the flat format the backend expects
    const predictionData = {
      ...numeric,
      ...categorical
    };

    const res = await fetch(`${BACKEND_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(predictionData),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Prediction failed: ${errorData.details || res.statusText}`);
    }

    const data = await res.json();
    return data.prediction;
  } catch (error) {
    console.error('Failed to run prediction on backend:', error);
    throw error;
  }
}

// Helper function to map our feature names to ONNX schema names
export function mapFeaturesToOnnxSchema(features, cropName, season, region) {
  return {
    numeric: {
      soil_ph: features.ph || 6.5,
      temperature: features.temperature || 25.0,
      humidity: features.humidity || 70.0,
      rainfall: features.rainfall || 120.0,
      fertilizer_usage: features.fertilizer_usage || 150.0,
      risk_score: features.risk_score || 0.3
    },
    categorical: {
      crop_name: cropName,
      season: season,
      region: region
    }
  };
}

// Helper function to check backend health
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    if (!res.ok) {
      return false;
    }
    const data = await res.json();
    return data.modelLoaded;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}
