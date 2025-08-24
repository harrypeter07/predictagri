'use client'

import { useState, useEffect } from 'react'

export default function EnhancedFarmerAnalysis() {
  const [analysisData, setAnalysisData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [farmerInput, setFarmerInput] = useState({
    farmerId: '',
    address: '',
    lat: '',
    lon: '',
    images: []
  })
  const [userLocation, setUserLocation] = useState(null)
  const [autoDetectLocation, setAutoDetectLocation] = useState(true)

  // Get user location on component mount
  useEffect(() => {
    const getUserLocation = async () => {
      if (autoDetectLocation) {
        try {
          const LocationService = await import('../../lib/locationService')
          const locationService = new LocationService.default()
          const location = await locationService.getLocationWithFallback()
          setUserLocation(location)
          
          // Auto-fill coordinates if not manually set
          if (!farmerInput.lat && !farmerInput.lon) {
            setFarmerInput(prev => ({
              ...prev,
              lat: location.lat.toString(),
              lon: location.lon.toString(),
              address: location.city ? `${location.city}, ${location.region}` : ''
            }))
          }
        } catch (error) {
          console.error('Failed to get user location:', error)
        }
      }
    }
    
    getUserLocation()
  }, [autoDetectLocation])

  const runAnalysis = async () => {
    if (!farmerInput.farmerId) {
      setError('Please provide Farmer ID')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Use current location if no coordinates provided
      let finalLat = farmerInput.lat
      let finalLon = farmerInput.lon
      let finalAddress = farmerInput.address
      
      if ((!finalLat || !finalLon) && userLocation) {
        finalLat = userLocation.lat
        finalLon = userLocation.lon
        finalAddress = userLocation.city ? `${userLocation.city}, ${userLocation.region}` : finalAddress
      }

      let url = '/api/farmer-analysis'
      let method = 'GET'
      let body = null

      if (finalAddress) {
        url += `?address=${encodeURIComponent(finalAddress)}&farmerId=${farmerInput.farmerId}`
      } else if (finalLat && finalLon) {
        url += `?lat=${finalLat}&lon=${finalLon}&farmerId=${farmerInput.farmerId}`
      } else {
        setError('Location information is required. Please enable location detection or enter coordinates manually.')
        return
      }

      if (farmerInput.images.length > 0) {
        method = 'POST'
        body = JSON.stringify({
          farmerId: farmerInput.farmerId,
          coordinates: finalLat && finalLon ? { lat: parseFloat(finalLat), lon: parseFloat(finalLon) } : null,
          address: finalAddress || null,
          images: farmerInput.images,
          userLocation: userLocation
        })
      }

      const response = await fetch(url, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body
      })

      const data = await response.json()
      
      if (data.success) {
        setAnalysisData(data)
      } else {
        setError(data.error || 'Analysis failed')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files)
    const imagePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve({
            name: file.name,
            type: 'file',
            file: e.target.result,
            size: file.size
          })
        }
        reader.readAsDataURL(file)
      })
    })

    Promise.all(imagePromises).then(images => {
      setFarmerInput(prev => ({
        ...prev,
        images: [...prev.images, ...images]
      }))
    })
  }

  const removeImage = (index) => {
    setFarmerInput(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">🚜 Enhanced Farmer Analysis Pipeline</h3>
      
      {/* Location Status */}
      {userLocation && (
        <div className="bg-blue-900 border border-blue-700 rounded p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-blue-300 text-sm">
              📍 Location Detected: {userLocation.city ? `${userLocation.city}, ${userLocation.region}` : `${userLocation.lat.toFixed(4)}, ${userLocation.lon.toFixed(4)}`}
              <span className="text-blue-400 ml-2">({userLocation.source})</span>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoDetectLocation}
                onChange={(e) => setAutoDetectLocation(e.target.checked)}
                className="mr-2"
              />
              <span className="text-blue-300 text-sm">Auto-detect</span>
            </label>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Farmer ID *</label>
            <input
              type="text"
              value={farmerInput.farmerId}
              onChange={(e) => setFarmerInput(prev => ({ ...prev, farmerId: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Farmer ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
            <input
              type="text"
              value={farmerInput.address}
              onChange={(e) => setFarmerInput(prev => ({ ...prev, address: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={userLocation ? "Auto-filled from location" : "e.g., Nagpur, Maharashtra"}
              disabled={autoDetectLocation && userLocation && farmerInput.address}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Latitude</label>
            <input
              type="number"
              step="any"
              value={farmerInput.lat}
              onChange={(e) => setFarmerInput(prev => ({ ...prev, lat: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 21.1458"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Longitude</label>
            <input
              type="number"
              step="any"
              value={farmerInput.lon}
              onChange={(e) => setFarmerInput(prev => ({ ...prev, lon: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 79.0882"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Field Images (Optional)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
        </div>

        {farmerInput.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {farmerInput.images.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={image.file}
                  alt={image.name}
                  className="w-full h-20 object-cover rounded border border-gray-600"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {loading ? '🔄 Running Analysis...' : '🚀 Run Comprehensive Analysis'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Analysis Results */}
      {analysisData && (
        <div className="space-y-6">
          <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
            📊 Analysis Results for Farmer {analysisData.farmerId}
          </h4>

          {/* Location Information */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h5 className="text-md font-medium text-white mb-3">📍 Location Analysis</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <p><strong>Coordinates:</strong> {analysisData.location.coordinates.lat}, {analysisData.location.coordinates.lon}</p>
                <p><strong>Address:</strong> {analysisData.location.address}</p>
                <p><strong>Agricultural Zone:</strong> {analysisData.location.agriculturalZone.zone}</p>
                <p><strong>Soil Type:</strong> {analysisData.location.soilClassification.type}</p>
              </div>
              <div>
                <p><strong>Zone Characteristics:</strong></p>
                <ul className="list-disc ml-5">
                  {analysisData.location.agriculturalZone.characteristics.map((crop, i) => (
                    <li key={i}>{crop}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Environmental Data */}
          {analysisData.environmental && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h5 className="text-md font-medium text-white mb-3">🌍 Environmental Data</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <p><strong>NDVI:</strong> {analysisData.environmental.satellite?.ndvi?.toFixed(3) || 'N/A'}</p>
                  <p><strong>Land Temperature:</strong> {analysisData.environmental.satellite?.landSurfaceTemperature?.toFixed(1) || 'N/A'}°C</p>
                  <p><strong>Soil Moisture:</strong> {analysisData.environmental.soil?.soilMoisture?.value?.toFixed(3) || 'N/A'} m³/m³</p>
                  <p><strong>Soil pH:</strong> {analysisData.environmental.soil?.soilPh?.value?.toFixed(1) || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Source:</strong> {analysisData.environmental.source}</p>
                  <p><strong>Quality:</strong> {analysisData.environmental.satellite?.quality || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Weather Data */}
          {analysisData.weather && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h5 className="text-md font-medium text-white mb-3">🌤️ Weather Analysis</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <p><strong>Current Temperature:</strong> {analysisData.weather.current?.temperature_2m?.toFixed(1) || 'N/A'}°C</p>
                  <p><strong>Humidity:</strong> {analysisData.weather.current?.relative_humidity_2m?.toFixed(0) || 'N/A'}%</p>
                  <p><strong>Wind Speed:</strong> {analysisData.weather.current?.wind_speed_10m?.toFixed(1) || 'N/A'} m/s</p>
                </div>
                <div>
                  <p><strong>Irrigation Needs:</strong> {analysisData.weather.agriculturalImpact?.irrigation || 'N/A'}</p>
                  <p><strong>Pest Risk:</strong> {analysisData.weather.agriculturalImpact?.pestRisk || 'N/A'}</p>
                  <p><strong>Crop Stress:</strong> {analysisData.weather.agriculturalImpact?.cropStress || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Image Analysis */}
          {analysisData.imageAnalysis && analysisData.imageAnalysis.data && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h5 className="text-md font-medium text-white mb-3">📸 Image Analysis Results</h5>
              <div className="text-sm text-gray-300">
                <p><strong>Images Analyzed:</strong> {analysisData.imageAnalysis.summary.totalImages}</p>
                <p><strong>Analysis Types:</strong> {analysisData.imageAnalysis.summary.analysisTypes.join(', ')}</p>
                <p><strong>Overall Health:</strong> {analysisData.imageAnalysis.summary.overallHealth}</p>
              </div>
            </div>
          )}

          {/* Agricultural Insights */}
          {analysisData.insights && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h5 className="text-md font-medium text-white mb-3">🌱 Agricultural Insights</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <p><strong>Soil Health:</strong> <span className={`px-2 py-1 rounded text-xs ${getHealthColor(analysisData.insights.soilHealth?.overall)}`}>
                    {analysisData.insights.soilHealth?.overall || 'Unknown'}
                  </span></p>
                  <p><strong>Crop Suitability:</strong> {analysisData.insights.cropSuitability?.bestCrops?.length || 0} recommended crops</p>
                  <p><strong>Water Management:</strong> {analysisData.insights.waterManagement?.irrigationNeeds || 'Unknown'} irrigation needs</p>
                </div>
                <div>
                  <p><strong>Pest Risk:</strong> <span className={`px-2 py-1 rounded text-xs ${getRiskColor(analysisData.insights.pestRisk?.overall)}`}>
                    {analysisData.insights.pestRisk?.overall || 'Unknown'}
                  </span></p>
                  <p><strong>Yield Potential:</strong> <span className={`px-2 py-1 rounded text-xs ${getHealthColor(analysisData.insights.yieldPotential?.overall)}`}>
                    {analysisData.insights.yieldPotential?.overall || 'Unknown'}
                  </span></p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysisData.recommendations && analysisData.recommendations.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h5 className="text-md font-medium text-white mb-3">💡 Actionable Recommendations</h5>
              <div className="space-y-3">
                {analysisData.recommendations.slice(0, 5).map((rec, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      <span className="text-gray-400 text-xs">{rec.category}</span>
                    </div>
                    <p className="text-white text-sm">{rec.action}</p>
                    <p className="text-gray-400 text-xs">Impact: {rec.impact} | Timeframe: {rec.timeframe}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {analysisData.summary && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h5 className="text-md font-medium text-white mb-3">📋 Executive Summary</h5>
              <div className="space-y-3 text-sm text-gray-300">
                <div>
                  <p className="font-medium text-white mb-2">Key Findings:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    {analysisData.summary.keyFindings.map((finding, index) => (
                      <li key={index}>{finding}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-white mb-2">Next Steps:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    {analysisData.summary.nextSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
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

function getPriorityColor(priority) {
  switch (priority?.toLowerCase()) {
    case 'high': return 'bg-red-600 text-white'
    case 'medium': return 'bg-yellow-600 text-white'
    case 'low': return 'bg-green-600 text-white'
    default: return 'bg-gray-600 text-white'
  }
}
