'use client'

import { useState, useEffect } from 'react'

export default function AIModelTestPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [expertAnalysis, setExpertAnalysis] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [testHistory, setTestHistory] = useState([])
  const [debugInfo, setDebugInfo] = useState('')
  const [showExpertAnalysis, setShowExpertAnalysis] = useState(true)
  
  // Form state for crop yield prediction
  const [formData, setFormData] = useState({
    cropId: '',
    regionId: '',
    userId: `test-user-${Date.now()}`,
    features: {
      temperature: 25,
      humidity: 65,
      rainfall: 0,
      wind_speed: 5,
      soil_moisture: 0.5,
      nitrogen: 45,
      phosphorus: 35,
      potassium: 40,
      ph: 6.5,
      fertilizer_usage: 45,
      risk_score: 0.3
    }
  })

  // Sample data for testing
  const sampleCrops = [
    { id: '1', name: 'Rice' },
    { id: '2', name: 'Wheat' },
    { id: '3', name: 'Maize' },
    { id: '4', name: 'Cotton' },
    { id: '5', name: 'Sugarcane' }
  ]

  const sampleRegions = [
    { id: '1', name: 'Punjab' },
    { id: '2', name: 'Maharashtra' },
    { id: '3', name: 'Karnataka' },
    { id: '4', name: 'Tamil Nadu' },
    { id: '5', name: 'Gujarat' }
  ]

  useEffect(() => {
    // Check backend health when page loads
    checkBackendHealth()
    // Auto-fill all fields except crop
    generateRandomData(false)
  }, [])

  const checkBackendHealth = async () => {
    setDebugInfo('Checking backend health... (this may take 10-30 seconds for cold start)')
    setBackendStatus('checking')
    
    try {
      console.log('🔍 Checking backend health...')
      
      // Add timeout for health check (30 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      const response = await fetch('/api/ai-model-health', {
        method: 'GET',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      console.log('📡 Health check response status:', response.status)
      setDebugInfo(`Health check response: ${response.status}`)
      
      if (response.ok) {
        const healthData = await response.json()
        console.log('✅ Health check data:', healthData)
        setBackendStatus(healthData.model_loaded ? 'healthy' : 'unhealthy')
        setDebugInfo(`Backend healthy: ${healthData.model_loaded ? 'Model loaded' : 'Model not loaded'}`)
      } else {
        console.error('❌ Health check failed with status:', response.status)
        setBackendStatus('unhealthy')
        setDebugInfo(`Health check failed: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Backend health check failed:', error)
      if (error.name === 'AbortError') {
        setBackendStatus('unhealthy')
        setDebugInfo('Health check timeout: Backend took too long to respond (30s timeout)')
      } else {
        setBackendStatus('unhealthy')
        setDebugInfo(`Health check error: ${error.message}`)
      }
    }
  }

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: parseFloat(value) || 0
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const generateRandomData = (includeCrop = true) => {
    const randomFeatures = {
      temperature: Math.floor(Math.random() * 30) + 15, // 15-45°C
      humidity: Math.floor(Math.random() * 50) + 30, // 30-80%
      rainfall: Math.floor(Math.random() * 50), // 0-50mm
      wind_speed: Math.floor(Math.random() * 15) + 2, // 2-17 m/s
      soil_moisture: Math.random() * 0.6 + 0.2, // 0.2-0.8
      nitrogen: Math.floor(Math.random() * 30) + 30, // 30-60 kg/ha
      phosphorus: Math.floor(Math.random() * 25) + 20, // 20-45 kg/ha
      potassium: Math.floor(Math.random() * 30) + 25, // 25-55 kg/ha
      ph: Math.random() * 3 + 5.5, // 5.5-8.5
      fertilizer_usage: Math.floor(Math.random() * 150) + 20, // 20-170 kg/ha
      risk_score: Math.random() * 0.7 + 0.1 // 0.1-0.8
    }

    setFormData(prev => ({
      ...prev,
      cropId: includeCrop ? sampleCrops[Math.floor(Math.random() * sampleCrops.length)].id : '',
      regionId: sampleRegions[Math.floor(Math.random() * sampleRegions.length)].id,
      features: randomFeatures
    }))
  }

  const testYieldPrediction = async () => {
    if (!formData.cropId || !formData.regionId) {
      setError('Please select both crop and region')
      return
    }

    setLoading(true)
    setError(null)
    setPrediction(null)
    setDebugInfo('Starting yield prediction test...')

    const testId = `test-${Date.now()}`
    const startTime = Date.now()

    try {
      console.log(`🧪 [${testId}] Starting AI Model Test`)
      setDebugInfo(`🧪 [${testId}] Starting AI Model Test`)
      
      // Map the form data to the backend API format
      const selectedCrop = sampleCrops.find(c => c.id === formData.cropId)
      const selectedRegion = sampleRegions.find(r => r.id === formData.regionId)
      
      // Create request data in the format expected by the backend API
      const requestData = {
        rainfall: formData.features.rainfall,
        temperature: formData.features.temperature,
        humidity: formData.features.humidity,
        soil_ph: formData.features.ph,
        fertilizer_usage: formData.features.fertilizer_usage,
        risk_score: formData.features.risk_score,
        crop: selectedCrop?.name || 'Unknown',
        region: selectedRegion?.name || 'Unknown'
      }

      console.log(`📊 [${testId}] Request Data:`, requestData)
      console.log(`🌾 [${testId}] Selected Crop:`, selectedCrop?.name)
      console.log(`📍 [${testId}] Selected Region:`, selectedRegion?.name)
      setDebugInfo(`📊 Request Data: ${JSON.stringify(requestData, null, 2)}`)

      // Call the backend API through proxy
      setDebugInfo('Calling backend API... (this may take 10-30 seconds for cold start)')
      
      // Add timeout for prediction API call (45 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000)
      
      const response = await fetch('/api/ai-model-predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      const responseTime = Date.now() - startTime
      setDebugInfo(`Response received in ${responseTime}ms. Status: ${response.status}`)
      
      const result = await response.json()
      console.log(`📥 [${testId}] Raw Response:`, result)

      if (!response.ok) {
        throw new Error(result.detail || `HTTP ${response.status}: Prediction failed`)
      }

      console.log(`✅ [${testId}] AI Model Response:`, result)
      setDebugInfo(`✅ AI Model Response: ${JSON.stringify(result, null, 2)}`)

      // Extract prediction value from the response
      const predictionValue = result.prediction[0][0]
      
      // Check if response has secret expert analysis
      const hasExpertAnalysis = result._expertAnalysis && result._enhanced
      
      // Create a formatted prediction result
      const formattedPrediction = {
        yield_prediction: predictionValue,
        risk_score: formData.features.risk_score,
        crop: selectedCrop?.name || 'Unknown',
        region: selectedRegion?.name || 'Unknown',
        metadata: {
          model: hasExpertAnalysis ? 'ONNX Backend (Enhanced)' : 'ONNX Backend',
          responseTime: `${responseTime}ms`,
          confidence: hasExpertAnalysis ? result._confidence : null
        },
        // Secretly include expert analysis if available
        expertAnalysis: hasExpertAnalysis ? result._expertAnalysis : null
      }

      const testResult = {
        id: testId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        status: 'success',
        prediction: formattedPrediction,
        expertAnalysis: formattedPrediction.expertAnalysis,
        metadata: {
          model: hasExpertAnalysis ? 'ONNX Backend (Enhanced)' : 'ONNX Backend',
          responseTime: `${responseTime}ms`,
          confidence: hasExpertAnalysis ? result._confidence : null
        },
        requestData: requestData
      }

      setPrediction(formattedPrediction)
      setExpertAnalysis(formattedPrediction.expertAnalysis)
      setTestHistory(prev => [testResult, ...prev.slice(0, 9)]) // Keep last 10 tests

      console.log(`🎯 [${testId}] Yield Prediction: ${(predictionValue * 100).toFixed(1)}%`)
      if (hasExpertAnalysis) {
        console.log(`🧠 [${testId}] Secret Expert Analysis Available`)
        setDebugInfo(`🎯 Yield Prediction: ${(predictionValue * 100).toFixed(1)}% | Expert Analysis: ${result._expertAnalysis.summary}`)
      } else {
        setDebugInfo(`🎯 Yield Prediction: ${(predictionValue * 100).toFixed(1)}%`)
      }

    } catch (err) {
      console.error(`❌ [${testId}] AI Model Test Failed:`, err)
      setDebugInfo(`❌ Error: ${err.message}`)
      
      const testResult = {
        id: testId,
        timestamp: new Date().toISOString(),
        responseTime: `${Date.now() - startTime}ms`,
        status: 'error',
        error: err.message,
        requestData: formData
      }

      setError(err.message)
      setTestHistory(prev => [testResult, ...prev.slice(0, 9)])
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    setTestHistory([])
  }

  const getYieldColor = (yieldValue) => {
    if (yieldValue >= 0.8) return 'text-green-400'
    if (yieldValue >= 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getRiskColor = (riskValue) => {
    if (riskValue <= 0.3) return 'text-green-400'
    if (riskValue <= 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-400'
    if (confidence >= 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🤖 AI Model Yield Prediction Test</h1>
          <p className="text-lg text-gray-300">Test the deployed crop yield prediction model</p>
          
          {/* Backend Status */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              backendStatus === 'healthy' 
                ? 'bg-green-900 text-green-200 border border-green-700' 
                : backendStatus === 'unhealthy' 
                ? 'bg-red-900 text-red-200 border border-red-700'
                : 'bg-yellow-900 text-yellow-200 border border-yellow-700'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${
                backendStatus === 'healthy' ? 'bg-green-400' 
                : backendStatus === 'unhealthy' ? 'bg-red-400' 
                : 'bg-yellow-400'
              }`}></span>
              AI Model: {backendStatus === 'healthy' ? 'Ready ✅' : backendStatus === 'unhealthy' ? 'Unavailable ❌' : 'Checking... ⏳'}
            </div>
            
            <p className="text-xs text-gray-400">
              Backend: https://agribackend-f3ky.onrender.com
            </p>
            
            <button
              onClick={checkBackendHealth}
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              🔄 Retry Connection
            </button>
          </div>
        </header>

        {/* Debug Info */}
        {debugInfo && (
          <div className="mb-6 bg-gray-800 border border-gray-600 rounded-lg p-4">
            <h3 className="text-lg font-medium text-yellow-400 mb-2">Debug Information</h3>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
              {debugInfo}
            </pre>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Configuration */}
          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
            <h2 className="text-2xl font-semibold mb-4 text-white">Test Configuration</h2>
            
            {/* Crop and Region Selection */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Crop</label>
                <select
                  value={formData.cropId}
                  onChange={(e) => handleInputChange('cropId', e.target.value)}
                  className="w-full border border-gray-600 p-3 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Crop</option>
                  {sampleCrops.map(crop => (
                    <option key={crop.id} value={crop.id}>{crop.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Region</label>
                <select
                  value={formData.regionId}
                  onChange={(e) => handleInputChange('regionId', e.target.value)}
                  className="w-full border border-gray-600 p-3 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Region</option>
                  {sampleRegions.map(region => (
                    <option key={region.id} value={region.id}>{region.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Environmental Features */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-medium text-blue-400">Environmental Features</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    value={formData.features.temperature}
                    onChange={(e) => handleInputChange('features.temperature', e.target.value)}
                    className="w-full border border-gray-600 p-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Humidity (%)</label>
                  <input
                    type="number"
                    value={formData.features.humidity}
                    onChange={(e) => handleInputChange('features.humidity', e.target.value)}
                    className="w-full border border-gray-600 p-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Rainfall (mm)</label>
                  <input
                    type="number"
                    value={formData.features.rainfall}
                    onChange={(e) => handleInputChange('features.rainfall', e.target.value)}
                    className="w-full border border-gray-600 p-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Soil pH</label>
                  <input
                    type="number"
                    value={formData.features.ph}
                    onChange={(e) => handleInputChange('features.ph', e.target.value)}
                    className="w-full border border-gray-600 p-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                    min="4"
                    max="10"
                  />
                </div>
              </div>
            </div>

            {/* Additional Parameters */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-medium text-purple-400">Additional Parameters</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fertilizer Usage (kg/ha)</label>
                  <input
                    type="number"
                    value={formData.features.fertilizer_usage}
                    onChange={(e) => handleInputChange('features.fertilizer_usage', e.target.value)}
                    className="w-full border border-gray-600 p-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                    min="0"
                    max="200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Risk Score (0-1)</label>
                  <input
                    type="number"
                    value={formData.features.risk_score}
                    onChange={(e) => handleInputChange('features.risk_score', e.target.value)}
                    className="w-full border border-gray-600 p-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                    min="0"
                    max="1"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={testYieldPrediction}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Testing...' : 'Test Yield Prediction'}
              </button>
              
              <button
                onClick={generateRandomData}
                disabled={loading}
                className="px-6 py-3 rounded bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Random Data
              </button>
            </div>
          </div>

          {/* Results Display */}
          <div className="space-y-6">
            {/* Current Prediction Result */}
            {prediction && (
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
                <h2 className="text-2xl font-semibold mb-4 text-white">Yield Prediction Result</h2>
                
                <div className="text-center mb-6">
                  <div className={`text-6xl font-bold mb-2 ${getYieldColor(prediction.yield_prediction)}`}>
                    {(prediction.yield_prediction * 100).toFixed(1)}%
                  </div>
                  <p className="text-xl text-gray-300">Predicted Yield</p>
                  <p className="text-sm text-gray-400">
                    {prediction.yield_prediction.toFixed(3)} tons/hectare
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getRiskColor(prediction.risk_score)}`}>
                      {(prediction.risk_score * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-400">Risk Score</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {prediction.crop}
                    </div>
                    <p className="text-sm text-gray-400">Crop</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-900 border border-blue-700 rounded-lg">
                  <p className="text-blue-200 text-sm">
                    <strong>Region:</strong> {prediction.region} | 
                    <strong> Model:</strong> {prediction.metadata?.model || 'AI Model'} |
                    <strong> Response Time:</strong> {prediction.metadata?.responseTime || 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* Secret Expert Analysis Display */}
            {expertAnalysis && showExpertAnalysis && (
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold text-white">🧠 Advanced Analysis</h2>
                  <button
                    onClick={() => setShowExpertAnalysis(!showExpertAnalysis)}
                    className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm"
                  >
                    {showExpertAnalysis ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="p-3 bg-green-900 border border-green-700 rounded-lg">
                    <p className="text-green-200 text-sm">
                      <strong>Analysis Summary:</strong> {expertAnalysis.summary}
                    </p>
                  </div>

                  {/* Full Analysis */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                      {expertAnalysis.expertAnalysis}
                    </pre>
                  </div>

                  {/* Confidence and Timestamp */}
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>Analysis Confidence: {(expertAnalysis.confidence * 100).toFixed(1)}%</span>
                    <span>Generated: {new Date(expertAnalysis.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-red-400 mb-2">Test Error</h3>
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {/* Test History */}
            {testHistory.length > 0 && (
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">Test History</h2>
                  <button
                    onClick={clearHistory}
                    className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                  >
                    Clear
                  </button>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {testHistory.map((test) => (
                    <div key={test.id} className={`p-3 rounded border ${
                      test.status === 'success' 
                        ? 'bg-green-900 border-green-700' 
                        : 'bg-red-900 border-red-700'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              test.status === 'success' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {test.status === 'success' ? '✅' : '❌'} {test.status.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(test.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          
                          {test.status === 'success' && test.prediction && (
                            <div className="mt-1 text-sm">
                              <span className="text-gray-300">
                                Yield: <span className={getYieldColor(test.prediction.yield_prediction)}>
                                  {(test.prediction.yield_prediction * 100).toFixed(1)}%
                                </span> | 
                                Risk: <span className={getRiskColor(test.prediction.risk_score)}>
                                  {(test.prediction.risk_score * 100).toFixed(1)}%
                                </span>
                                {test.expertAnalysis && (
                                  <span className="text-blue-300"> | Advanced Analysis Available</span>
                                )}
                              </span>
                            </div>
                          )}
                          
                          {test.status === 'error' && (
                            <div className="mt-1 text-sm text-red-300">
                              {test.error}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-400">
                          {test.responseTime}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Information Panel */}
        <div className="mt-8 bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
          <h2 className="text-2xl font-semibold mb-4 text-white">AI Model Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
            <div>
              <h3 className="text-lg font-medium text-blue-400 mb-2">Model Details</h3>
              <ul className="space-y-1 text-sm">
                <li>• <strong>Type:</strong> ONNX Machine Learning Model</li>
                <li>• <strong>Backend:</strong> Render Cloud Platform</li>
                <li>• <strong>Purpose:</strong> Crop Yield Prediction</li>
                <li>• <strong>Output:</strong> Yield percentage and risk assessment</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-green-400 mb-2">Test Features</h3>
              <ul className="space-y-1 text-sm">
                <li>• <strong>Real-time Testing:</strong> Live model predictions</li>
                <li>• <strong>Random Data:</strong> Generate test scenarios</li>
                <li>• <strong>History Tracking:</strong> Monitor test results</li>
                <li>• <strong>Performance Metrics:</strong> Response times and accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
