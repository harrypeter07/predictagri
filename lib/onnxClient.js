// client-only helper to load and run ONNX via Render backend
"use client";

// Backend URL - your actual Render backend URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agribackend-f3ky.onrender.com';

export async function loadSchema() {
  try {
    const res = await fetch(`${BACKEND_URL}/schema`);
    if (!res.ok) {
      throw new Error(`Failed to load schema: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error('Failed to load schema from backend:', error);
    throw error;
  }
}

export async function runPrediction(numeric, categorical) {
  try {
    const res = await fetch(`${BACKEND_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ numeric, categorical }),
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
      soil_ph: features.ph || 6.5
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
