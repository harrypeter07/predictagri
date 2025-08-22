// client-only helper to load and run ONNX
"use client";

import * as ort from "onnxruntime-web";

let _session = null;

export async function getOnnxSession() {
  if (_session) return _session;
  // (Optional) set WASM path if behind a custom path:
  // ort.env.wasm.wasmPaths = "/"; 
  _session = await ort.InferenceSession.create("/model/agri_yield.onnx", {
    executionProviders: ["wasm"]
  });
  return _session;
}

export async function loadSchema() {
  const res = await fetch("/model/feature_schema.json");
  return res.json();
}

export async function runPrediction(numeric, categorical) {
  const session = await getOnnxSession();
  const feeds = {};

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
  const value = (results[firstOutputName].data)[0];
  return Number(value);
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
