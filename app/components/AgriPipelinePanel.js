'use client'

import { useState } from 'react'

export default function AgriPipelinePanel({ region = 'kansas' }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pipelineMode, setPipelineMode] = useState('standard') // 'standard' or 'farmer'
  const [farmerData, setFarmerData] = useState({
    farmerId: '',
    coordinates: { lat: 21.1458, lon: 79.0882 },
    address: 'Nagpur, Maharashtra'
  })

  const runPipeline = async () => {
    try {
      setLoading(true)
      setError(null)
      
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
      
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Pipeline failed')
      setResult(json)
    } catch (e) {
      setError(e.message)
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

      {error && <p className="mt-3 text-red-300 text-sm">{error}</p>}
      
      {result && (
        <div className="mt-4 space-y-4">
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
                <p className="text-green-400">✅ Success</p>
              </div>
              <div>
                <p className="text-gray-400">Timestamp</p>
                <p className="text-white text-xs">{new Date(result.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {pipelineMode === 'farmer' ? (
            // Enhanced Farmer Analysis Results
            <div className="space-y-4">
              {result.insights && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">🌱 Agricultural Insights</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="text-gray-400">Soil Health:</span> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${getHealthColor(result.insights[0]?.data?.overall)}`}>
                          {result.insights[0]?.data?.overall || 'Unknown'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Crop Suitability:</span> 
                        <span className="text-white ml-2">{result.insights[1]?.data?.bestCrops?.length || 0} recommended crops</span>
                      </p>
                      <p><span className="text-gray-400">Water Management:</span> 
                        <span className="text-white ml-2">{result.insights[2]?.data?.irrigationNeeds || 'Unknown'}</span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Pest Risk:</span> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${getRiskColor(result.predictions[1]?.data?.overall)}`}>
                          {result.predictions[1]?.data?.overall || 'Unknown'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Yield Potential:</span> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${getHealthColor(result.predictions[0]?.data?.overall)}`}>
                          {result.predictions[0]?.data?.overall || 'Unknown'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {result.alerts && result.alerts.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">🚨 High Priority Alerts</h4>
                  <div className="space-y-2">
                    {result.alerts.slice(0, 3).map((alert, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="px-2 py-1 rounded text-xs bg-red-600 text-white">
                          High
                        </span>
                        <p className="text-sm text-gray-300">{alert.message}</p>
                      </div>
                    ))}
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
