'use client'

import { useState } from 'react'

export default function AgriPipelinePanel({ region = 'kansas' }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pipelineMode, setPipelineMode] = useState('standard') // 'standard' or 'farmer'
  const [aiModelCalls, setAiModelCalls] = useState([])
  const [farmerData, setFarmerData] = useState({
    farmerId: '',
    coordinates: { lat: 21.1458, lon: 79.0882 },
    address: 'Nagpur, Maharashtra'
  })

  const runPipeline = async () => {
    try {
      setLoading(true)
      setError(null)
      setAiModelCalls([])
      
      let requestBody = {}
      
      if (pipelineMode === 'farmer') {
        requestBody = {
          farmerData: {
            ...farmerData,
            coordinates: {
              lat: parseFloat(farmerData.coordinates.lat),
              lon: parseFloat(farmerData.coordinates.lon)
            }
          }
        }
      } else {
        requestBody = { region }
      }
      
      // Log AI model endpoint call
      const aiCall = {
        timestamp: new Date().toISOString(),
        endpoint: '/api/pipeline',
        method: 'POST',
        request: requestBody,
        status: 'calling'
      }
      setAiModelCalls(prev => [...prev, aiCall])
      
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      const json = await res.json()
      
      // Update AI call with response
      const updatedCall = {
        ...aiCall,
        status: res.ok ? 'success' : 'error',
        response: json,
        responseTime: Date.now() - new Date(aiCall.timestamp).getTime()
      }
      setAiModelCalls(prev => prev.map(call => 
        call.timestamp === aiCall.timestamp ? updatedCall : call
      ))
      
      if (!res.ok || !json.success) throw new Error(json.error || 'Pipeline failed')
      setResult(json)
    } catch (e) {
      setError(e.message)
      // Update AI call with error
      setAiModelCalls(prev => prev.map(call => 
        call.status === 'calling' ? { ...call, status: 'error', error: e.message } : call
      ))
    } finally {
      setLoading(false)
    }
  }

  const runStatusCheck = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const url = pipelineMode === 'farmer' 
        ? '/api/pipeline?farmer=true'
        : `/api/pipeline?region=${region}`
      
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Status check failed')
      setResult(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const clearAiModelCalls = () => {
    setAiModelCalls([])
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">🚀 Automated Agri Pipeline</h3>
        <div className="flex space-x-2">
          <button
            onClick={runStatusCheck}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm"
          >
            Status
          </button>
          <button
            onClick={runPipeline}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
          >
            {loading ? 'Running...' : 'Run Now'}
          </button>
        </div>
      </div>

      {/* Pipeline Mode Selection */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-4">
          <button
            onClick={() => setPipelineMode('standard')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              pipelineMode === 'standard'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            🌍 Standard Pipeline
          </button>
          <button
            onClick={() => setPipelineMode('farmer')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              pipelineMode === 'farmer'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            🚜 Enhanced Farmer Analysis
          </button>
        </div>

        {pipelineMode === 'farmer' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Farmer ID</label>
              <input
                type="text"
                value={farmerData.farmerId}
                onChange={(e) => setFarmerData(prev => ({ ...prev, farmerId: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Farmer ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Latitude</label>
              <input
                type="number"
                step="any"
                value={farmerData.coordinates.lat}
                onChange={(e) => setFarmerData(prev => ({ 
                  ...prev, 
                  coordinates: { ...prev.coordinates, lat: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="21.1458"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Longitude</label>
              <input
                type="number"
                step="any"
                value={farmerData.coordinates.lon}
                onChange={(e) => setFarmerData(prev => ({ 
                  ...prev, 
                  coordinates: { ...prev.coordinates, lon: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="79.0882"
              />
            </div>
          </div>
        )}
      </div>

      {/* AI Model Endpoint Calls */}
      {aiModelCalls.length > 0 && (
        <div className="mb-6 bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">🤖 AI Model Endpoint Calls</h4>
            <button
              onClick={clearAiModelCalls}
              className="text-gray-400 hover:text-white text-sm"
            >
              Clear
            </button>
          </div>
          <div className="space-y-3">
            {aiModelCalls.map((call, index) => (
              <div key={index} className="bg-gray-700 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    call.status === 'success' ? 'bg-green-600 text-white' :
                    call.status === 'error' ? 'bg-red-600 text-white' :
                    'bg-yellow-600 text-white'
                  }`}>
                    {call.status === 'success' ? '✅ Success' :
                     call.status === 'error' ? '❌ Error' : '⏳ Calling...'}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(call.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="text-gray-300">
                    <span className="text-gray-400">Endpoint:</span> {call.method} {call.endpoint}
                  </p>
                  {call.responseTime && (
                    <p className="text-gray-300">
                      <span className="text-gray-400">Response Time:</span> {call.responseTime}ms
                    </p>
                  )}
                  {call.error && (
                    <p className="text-red-400">
                      <span className="text-gray-400">Error:</span> {call.error}
                    </p>
                  )}
                  {call.response && call.status === 'success' && (
                    <div className="mt-2">
                      <details className="text-gray-300">
                        <summary className="cursor-pointer text-blue-400">View Response</summary>
                        <pre className="mt-2 text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                          {JSON.stringify(call.response, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-red-300 text-sm">{error}</p>}
      
      {result && (
        <div className="mt-4 space-y-4">
          {/* Pipeline Results Header */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">📊 Pipeline Results</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Pipeline ID</p>
                <p className="text-white font-mono">{result.pipelineId}</p>
              </div>
              <div>
                <p className="text-gray-400">Mode</p>
                <p className="text-white">{pipelineMode === 'farmer' ? 'Enhanced Farmer' : 'Standard'}</p>
              </div>
              <div>
                <p className="text-gray-400">Status</p>
                <p className="text-white">✅ Success</p>
              </div>
              <div>
                <p className="text-gray-400">Timestamp</p>
                <p className="text-white text-xs">{new Date(result.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Debug Data Structure */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">🔍 Debug: Raw Data Structure</h4>
            <details className="text-gray-300">
              <summary className="cursor-pointer text-blue-400">View Raw Response Data</summary>
              <pre className="mt-2 text-xs bg-gray-900 p-3 rounded overflow-x-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>

          {pipelineMode === 'farmer' ? (
            // Enhanced Farmer Analysis Results
            <div className="space-y-4">
              {/* Location Data */}
              {result.location && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">📍 Location Data</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="text-gray-400">Coordinates:</span> 
                        <span className="text-white ml-2">
                          {result.location.coordinates?.lat}, {result.location.coordinates?.lon}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Address:</span> 
                        <span className="text-white ml-2">{result.location.address || 'N/A'}</span>
                      </p>
                      <p><span className="text-gray-400">Agricultural Zone:</span> 
                        <span className="text-white ml-2">{result.location.agriculturalZone?.zone || 'N/A'}</span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Soil Type:</span> 
                        <span className="text-white ml-2">{result.location.soilClassification?.type || 'N/A'}</span>
                      </p>
                      <p><span className="text-gray-400">Climate:</span> 
                        <span className="text-white ml-2">{result.location.climateData?.type || 'N/A'}</span>
                      </p>
                      <p><span className="text-gray-400">Elevation:</span> 
                        <span className="text-white ml-2">{result.location.elevation || 'N/A'}m</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Weather Data */}
              {result.dataCollection?.weather && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">🌤️ Weather Data</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p><span className="text-gray-400">Temperature:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.weather.current?.temperature || 'N/A'}°C
                        </span>
                      </p>
                      <p><span className="text-gray-400">Humidity:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.weather.current?.humidity || 'N/A'}%
                        </span>
                      </p>
                      <p><span className="text-gray-400">Wind Speed:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.weather.current?.windSpeed || 'N/A'} km/h
                        </span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Precipitation:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.weather.forecast?.daily?.precipitation_sum?.[0] || 'N/A'} mm
                        </span>
                      </p>
                      <p><span className="text-gray-400">Max Temp:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.weather.forecast?.daily?.temperature_2m_max?.[0] || 'N/A'}°C
                        </span>
                      </p>
                      <p><span className="text-gray-400">Min Temp:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.weather.forecast?.daily?.temperature_2m_min?.[0] || 'N/A'}°C
                        </span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Agricultural Impact:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.weather.agriculturalImpact?.irrigation || 'N/A'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Pest Risk:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.weather.agriculturalImpact?.pestRisk || 'N/A'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Crop Stress:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.weather.agriculturalImpact?.cropStress || 'N/A'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Environmental Data */}
              {result.dataCollection?.environmental && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">🌱 Environmental Data</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p><span className="text-gray-400">NDVI Index:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.environmental.satellite?.ndvi || 'N/A'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Soil Type:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.environmental.soil?.type || 'N/A'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Land Use:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.environmental.landUse?.type || 'N/A'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Soil pH:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.environmental.soil?.ph || 'N/A'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Organic Matter:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.environmental.soil?.organicMatter || 'N/A'}%
                        </span>
                      </p>
                      <p><span className="text-gray-400">Soil Moisture:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.environmental.soil?.moisture || 'N/A'}%
                        </span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Coverage:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.environmental.satellite?.coverage || 'N/A'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Resolution:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.environmental.satellite?.resolution || 'N/A'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Source:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.environmental.satellite?.source || 'Google Earth Engine'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Analysis Data */}
              {result.dataCollection?.imageAnalysis && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">📸 Image Analysis Data</h4>
                  <div className="space-y-3">
                    {result.dataCollection.imageAnalysis.data?.map((image, index) => (
                      <div key={index} className="bg-gray-700 rounded p-3">
                        <p className="text-gray-300 mb-2">
                          <span className="text-gray-400">Image {index + 1}:</span> 
                          {image.type || 'Unknown type'}
                        </p>
                        {image.disease && image.disease.data && (
                          <div className="ml-4">
                            <p className="text-gray-400 text-xs">Disease Analysis:</p>
                            {image.disease.data.results?.map((result, idx) => (
                              <div key={idx} className="ml-4 text-xs">
                                <span className="text-gray-300">
                                  {result.name || 'Unknown'}: {result.confidence || 0}% confidence
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agricultural Insights */}
              {result.insights && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">🌱 Agricultural Insights</h4>
                  <div className="space-y-3">
                    {result.insights.map((insight, index) => (
                      <div key={index} className="bg-gray-700 rounded p-3">
                        <h5 className="text-white font-medium mb-2">{insight.type || `Insight ${index + 1}`}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><span className="text-gray-400">Overall Score:</span> 
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${getHealthColor(insight.data?.overall)}`}>
                                {insight.data?.overall || 'Unknown'}
                              </span>
                            </p>
                            {insight.data?.factors && (
                              <div>
                                <p className="text-gray-400 mb-1">Factors:</p>
                                <ul className="ml-4 text-gray-300">
                                  {insight.data.factors.map((factor, idx) => (
                                    <li key={idx} className="text-xs">• {factor}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div>
                            {insight.data?.recommendations && (
                              <div>
                                <p className="text-gray-400 mb-1">Recommendations:</p>
                                <ul className="ml-4 text-gray-300">
                                  {insight.data.recommendations.map((rec, idx) => (
                                    <li key={idx} className="text-xs">• {rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Crop Recommendations */}
              {result.recommendations && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">🌾 Crop Recommendations</h4>
                  <div className="space-y-3">
                    {result.recommendations.map((rec, index) => (
                      <div key={index} className="bg-gray-700 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-white font-medium">{rec.category || `Recommendation ${index + 1}`}</h5>
                          <span className={`px-2 py-1 rounded text-xs ${
                            rec.priority === 'high' ? 'bg-red-600 text-white' :
                            rec.priority === 'medium' ? 'bg-yellow-600 text-white' :
                            'bg-green-600 text-white'
                          }`}>
                            {rec.priority || 'medium'} priority
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{rec.action || rec.message}</p>
                        {rec.reasoning && (
                          <p className="text-gray-400 text-xs">Reasoning: {rec.reasoning}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notification Status */}
              {result.notification && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">📱 Notification Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="text-gray-400">SMS Status:</span> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          result.notification.sms?.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {result.notification.sms?.success ? '✅ Sent' : '❌ Failed'}
                        </span>
                      </p>
                      {result.notification.sms?.error && (
                        <p className="text-red-400 text-xs mt-1">{result.notification.sms.error}</p>
                      )}
                    </div>
                    <div>
                      <p><span className="text-gray-400">Voice Status:</span> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          result.notification.voice?.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {result.notification.voice?.success ? '✅ Sent' : '❌ Failed'}
                        </span>
                      </p>
                      {result.notification.voice?.error && (
                        <p className="text-red-400 text-xs mt-1">{result.notification.voice.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              {result.summary && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">📋 Analysis Summary</h4>
                  <div className="bg-gray-700 rounded p-3">
                    <p className="text-gray-300">{result.summary}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Standard Pipeline Results
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">📈 Analysis Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Data Sources</p>
                    <p className="text-white">{Object.keys(result.dataCollection || {}).length}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Insights</p>
                    <p className="text-white">{result.insights?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Predictions</p>
                    <p className="text-white">{result.predictions?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Alerts</p>
                    <p className="text-white">{result.alerts?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Data Collection Details */}
              {result.dataCollection && Object.keys(result.dataCollection).length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">🔍 Data Collection Details</h4>
                  <div className="space-y-3">
                    {Object.entries(result.dataCollection).map(([key, data]) => (
                      <div key={key} className="bg-gray-700 rounded p-3">
                        <h5 className="text-white font-medium mb-2 capitalize">{key}</h5>
                        <details className="text-gray-300">
                          <summary className="cursor-pointer text-blue-400">View Data</summary>
                          <pre className="mt-2 text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                            {JSON.stringify(data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.insights?.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">🔍 Top Insight</h4>
                  <div className="bg-gray-700 border border-gray-600 rounded p-3">
                    <p className="text-gray-300">{result.insights[0].message}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper functions for styling
function getHealthColor(health) {
  switch (health?.toLowerCase()) {
    case 'excellent': return 'bg-green-600 text-white'
    case 'good': return 'bg-blue-600 text-white'
    case 'fair': return 'bg-yellow-600 text-white'
    case 'poor': return 'bg-red-600 text-white'
    default: return 'bg-gray-600 text-white'
  }
}

function getRiskColor(risk) {
  switch (risk?.toLowerCase()) {
    case 'high': return 'bg-red-600 text-white'
    case 'moderate': return 'bg-yellow-600 text-white'
    case 'low': return 'bg-green-600 text-white'
    default: return 'bg-gray-600 text-white'
  }
}
