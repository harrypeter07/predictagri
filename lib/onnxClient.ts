// client-only helper to load and run ONNX
"use client";

import * as ort from "onnxruntime-web";

let _session: ort.InferenceSession | null = null;

export async function getOnnxSession() {
  if (_session) return _session;
  // (Optional) set WASM path if behind a custom path:
  // ort.env.wasm.wasmPaths = "/"; 
  _session = await ort.InferenceSession.create("/model/agri_yield.onnx", {
    executionProviders: ["wasm"]
  });
  return _session;
}

export type FeatureSchema = {
  numeric_features: string[];
  categorical_features: string[];
};

export async function loadSchema(): Promise<FeatureSchema> {
  const res = await fetch("/model/feature_schema.json");
  return res.json();
}

export async function runPrediction(
  numeric: Record<string, number>,
  categorical: Record<string, string>
) {
  const session = await getOnnxSession();
  const feeds: Record<string, ort.Tensor> = {};

  // Each input tensor must be shape [1,1]
  Object.entries(numeric).forEach(([k, v]) => {
    feeds[k] = new ort.Tensor("float32", new Float32Array([v]), [1, 1]);
  });
  Object.entries(categorical).forEach(([k, v]) => {
    // onnxruntime-web supports string tensors
    feeds[k] = new ort.Tensor("string", [v], [1, 1]);
  });

  const results = await session.run(feeds);
  // take the first output by default
  const firstOutputName = session.outputNames[0];
  const value = (results[firstOutputName].data as Float32Array | Float64Array)[0];
  return Number(value);
}

// Helper function to map our feature names to ONNX schema names
export function mapFeaturesToOnnxSchema(features: any, cropName: string, season: string, region: string) {
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
