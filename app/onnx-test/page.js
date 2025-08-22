"use client";
import { useEffect, useState } from "react";
import { loadSchema, runPrediction, mapFeaturesToOnnxSchema } from "../../lib/onnxClient";

export default function OnnxTestPage() {
  const [schema, setSchema] = useState(null);
  const [numeric, setNumeric] = useState({});
  const [categorical, setCategorical] = useState({});
  const [pred, setPred] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSchema().then(setSchema).catch(console.error);
  }, []);

  if (!schema) return <div className="min-h-screen bg-black text-white flex items-center justify-center">
    <div className="text-xl">Loading schema…</div>
  </div>;

  const onChangeNum = (k, v) =>
    setNumeric((s) => ({ ...s, [k]: Number(v) }));

  const onChangeCat = (k, v) =>
    setCategorical((s) => ({ ...s, [k]: v }));

  const onPredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const y = await runPrediction(numeric, categorical);
      setPred(y);
    } catch (err) {
      setError(err.message);
      console.error('ONNX prediction error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onTestWithRealData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Test with realistic agricultural data
      const testFeatures = {
        soil_ph: 6.8
      };
      const testCategorical = {
        crop_name: "Rice",
        season: "Kharif",
        region: "Punjab"
      };
      
      const y = await runPrediction(testFeatures, testCategorical);
      setPred(y);
      setNumeric(testFeatures);
      setCategorical(testCategorical);
    } catch (err) {
      setError(err.message);
      console.error('ONNX test error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🌾 PredictAgri – ONNX Model Test</h1>
          <p className="text-lg text-gray-300">Test the machine learning model for crop yield prediction</p>
        </header>

        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">ONNX Model Schema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-blue-400 mb-2">Numeric Features</h3>
              <ul className="space-y-1 text-gray-300">
                {schema.numeric_features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <span className="w-4 h-4 bg-blue-500 rounded-full mr-2"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-green-400 mb-2">Categorical Features</h3>
              <ul className="space-y-1 text-gray-300">
                {schema.categorical_features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <span className="w-4 h-4 bg-green-500 rounded-full mr-2"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">Model Input</h2>
          
          <section className="space-y-4 mb-6">
            <h3 className="text-lg font-medium text-blue-400">Numeric Features</h3>
            {schema.numeric_features.map((k) => (
              <div key={k} className="flex gap-4 items-center">
                <label className="w-40 text-gray-300">{k.replace('_', ' ').toUpperCase()}</label>
                <input
                  className="border border-gray-600 p-3 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  type="number"
                  step="any"
                  placeholder="Enter value"
                  onChange={(e) => onChangeNum(k, e.target.value)}
                  value={numeric[k] || ''}
                />
              </div>
            ))}
          </section>

          <section className="space-y-4 mb-6">
            <h3 className="text-lg font-medium text-green-400">Categorical Features</h3>
            {schema.categorical_features.map((k) => (
              <div key={k} className="flex gap-4 items-center">
                <label className="w-40 text-gray-300">{k.replace('_', ' ').toUpperCase()}</label>
                <input
                  className="border border-gray-600 p-3 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  placeholder={`e.g., ${k === 'crop_name' ? 'Rice / Wheat / Maize' : k === 'season' ? 'Kharif / Rabi / Year-round' : 'Punjab / Maharashtra / Karnataka'}`}
                  onChange={(e) => onChangeCat(k, e.target.value)}
                  value={categorical[k] || ''}
                />
              </div>
            ))}
          </section>

          <div className="flex gap-4">
            <button
              onClick={onPredict}
              disabled={loading}
              className="px-6 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Running Prediction...' : 'Run Prediction'}
            </button>
            
            <button
              onClick={onTestWithRealData}
              disabled={loading}
              className="px-6 py-3 rounded bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Test with Sample Data
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-8">
            <h3 className="text-lg font-medium text-red-400 mb-2">Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {pred !== null && (
          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
            <h2 className="text-2xl font-semibold mb-4 text-white">Prediction Result</h2>
            <div className="text-center">
              <div className="text-6xl font-bold text-green-400 mb-2">{pred.toFixed(2)}</div>
              <p className="text-xl text-gray-300">Predicted Yield (tons/hectare)</p>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium text-blue-400 mb-2">Input Features</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  {Object.entries({ ...numeric, ...categorical }).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace('_', ' ')}:</span>
                      <span className="font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-green-400 mb-2">Model Information</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between">
                    <span>Model Type:</span>
                    <span>ONNX Runtime</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Execution:</span>
                    <span>Client-side WASM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-green-400">✓ Success</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
          <h2 className="text-2xl font-semibold mb-4 text-white">How It Works</h2>
          <div className="space-y-4 text-gray-300">
            <p>
              This page demonstrates the ONNX model integration in PredictAgri. The model takes agricultural features as input and predicts crop yield.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Numeric Features:</strong> Soil pH and other continuous values</li>
              <li><strong>Categorical Features:</strong> Crop name, season, and region</li>
              <li><strong>Model:</strong> Pre-trained ONNX model running in the browser</li>
              <li><strong>Output:</strong> Predicted yield in tons per hectare</li>
            </ul>
            <p className="text-blue-400">
              The model runs entirely in your browser using WebAssembly, making it fast and privacy-friendly!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
