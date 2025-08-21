'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Fetch predictions on component mount
  useEffect(() => {
    fetchPredictions()
  }, [])

  const fetchPredictions = async () => {
    try {
      const response = await fetch('/api/predictions')
      const data = await response.json()
      if (response.ok) {
        setPredictions(data)
      } else {
        setError('Failed to fetch predictions')
      }
    } catch (err) {
      setError('Error fetching predictions')
    }
  }

  const generateMockPrediction = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Mock data for testing
      const mockData = {
        userId: '123e4567-e89b-12d3-a456-426614174000', // Mock user ID
        cropId: '123e4567-e89b-12d3-a456-426614174001', // Mock crop ID
        regionId: '123e4567-e89b-12d3-a456-426614174002', // Mock region ID
        features: {
          temperature: 25.5,
          humidity: 65,
          rainfall: 120,
          soil_moisture: 0.45,
          nitrogen: 45,
          phosphorus: 30,
          potassium: 25,
          ph: 6.5
        }
      }

      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockData)
      })

      const data = await response.json()
      
      if (response.ok) {
        setResult(data)
        // Refresh predictions list
        fetchPredictions()
      } else {
        setError(data.error || 'Failed to generate prediction')
      }
    } catch (err) {
      setError('Error generating prediction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">PredictAgri</h1>
          <p className="text-lg text-gray-600">Agriculture Crop Yield Prediction System</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Prediction Generator */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Generate Prediction</h2>
            
            <button
              onClick={generateMockPrediction}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Mock Prediction'}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {result && (
              <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded">
                <h3 className="font-semibold text-green-800 mb-2">Prediction Generated!</h3>
                <div className="space-y-1 text-sm text-green-700">
                  <p><strong>Yield:</strong> {result.yield?.toFixed(2)} units</p>
                  <p><strong>Risk Score:</strong> {(result.risk_score * 100).toFixed(1)}%</p>
                  <p><strong>Created:</strong> {new Date(result.created_at).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Predictions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Recent Predictions</h2>
            
            {predictions.length === 0 ? (
              <p className="text-gray-500">No predictions yet. Generate one to see results!</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {predictions.map((prediction) => (
                  <div key={prediction.id} className="border border-gray-200 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {prediction.crops?.name || 'Unknown Crop'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {prediction.regions?.name || 'Unknown Region'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {prediction.yield?.toFixed(1)} yield
                        </p>
                        <p className="text-sm text-red-600">
                          {(prediction.risk_score * 100).toFixed(1)}% risk
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(prediction.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Database Status */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Database Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded">
              <p className="text-2xl font-bold text-blue-600">{predictions.length}</p>
              <p className="text-sm text-gray-600">Total Predictions</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-600">5</p>
              <p className="text-sm text-gray-600">Regions Available</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded">
              <p className="text-2xl font-bold text-purple-600">8</p>
              <p className="text-sm text-gray-600">Crops Supported</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
