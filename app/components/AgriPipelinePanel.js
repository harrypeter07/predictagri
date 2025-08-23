'use client'

import { useState, useEffect } from 'react'

export default function AgriPipelinePanel({ region = 'kansas' }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pipelineMode, setPipelineMode] = useState('standard') // 'standard' or 'farmer'
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationLoading, setLocationLoading] = useState(true)

  const [farmerData, setFarmerData] = useState({
    farmerId: '',
    coordinates: { lat: 21.1458, lon: 79.0882 },
    address: 'Nagpur, Maharashtra'
  })

  // Get current device location on component mount
  useEffect(() => {
    getCurrentLocation()
  }, [])

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true)
      
      // First try browser geolocation
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          })
        })
        
        const location = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'browser_geolocation',
          timestamp: new Date().toISOString()
        }
        
        setCurrentLocation(location)
        
        // Update farmer data with current location
        setFarmerData(prev => ({
          ...prev,
          coordinates: { lat: location.lat, lon: location.lon },
          address: `Current Location (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)})`
        }))
        
        console.log('📍 Current device location obtained:', location)
      } else {
        throw new Error('Geolocation not supported')
      }
    } catch (error) {
      console.warn('Failed to get current location:', error)
      
      // Fallback to IP-based location
      try {
        const response = await fetch('/api/location/current')
        const data = await response.json()
        
        if (data.success && data.location) {
          setCurrentLocation(data.location)
          setFarmerData(prev => ({
            ...prev,
            coordinates: { lat: data.location.lat, lon: data.location.lon },
            address: data.location.address || `IP Location (${data.location.lat.toFixed(4)}, ${data.location.lon.toFixed(4)})`
          }))
          console.log('📍 IP-based location obtained:', data.location)
        } else {
          console.warn('Using fallback location (Nagpur)')
        }
      } catch (fallbackError) {
        console.warn('All location methods failed, using fallback:', fallbackError)
      }
    } finally {
      setLocationLoading(false)
    }
  }

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
            onClick={getCurrentLocation}
            disabled={locationLoading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm"
            title="Refresh current location"
          >
            {locationLoading ? '📍 Loading...' : '📍 Refresh Location'}
          </button>
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

      {/* Location Status Display */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-1">📍 Current Location</h4>
            {locationLoading ? (
              <p className="text-gray-400 text-sm">Loading location...</p>
            ) : currentLocation ? (
              <div className="text-sm">
                <p className="text-green-400">
                  {currentLocation.address || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lon.toFixed(4)}`}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Source: {currentLocation.source} • Accuracy: {currentLocation.accuracy ? `${Math.round(currentLocation.accuracy)}m` : 'Unknown'}
                </p>
              </div>
            ) : (
              <p className="text-yellow-400 text-sm">Using fallback location (Nagpur)</p>
            )}
          </div>
          {currentLocation && (
            <div className="text-xs text-gray-400">
              <p>Lat: {currentLocation.lat.toFixed(6)}</p>
              <p>Lon: {currentLocation.lon.toFixed(6)}</p>
            </div>
          )}
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
          <div className="space-y-4">
            {/* Current Location Notice */}
            {currentLocation && (
              <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
                <p className="text-green-400 text-sm">
                  ✅ Using current device location for analysis. 
                  {currentLocation.source === 'browser_geolocation' && ' (GPS-based)'}
                  {currentLocation.source === 'ip_geolocation' && ' (IP-based)'}
                </p>
              </div>
            )}
            
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Latitude 
                  {currentLocation && (
                    <span className="text-green-400 ml-1">(Current: {currentLocation.lat.toFixed(6)})</span>
                  )}
                </label>
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Longitude
                  {currentLocation && (
                    <span className="text-green-400 ml-1">(Current: {currentLocation.lon.toFixed(6)})</span>
                  )}
                </label>
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
            
            {/* Address Display */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
              <div className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white">
                {farmerData.address}
              </div>
            </div>
          </div>
        )}
      </div>



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
                        <span className="text-white ml-2">
                          {typeof result.location.address === 'string' ? result.location.address :
                           result.location.address?.displayName || 'N/A'}
                        </span>
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
                      <p><span className="text-gray-400">Today&apos;s Precipitation:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.weather.forecast?.daily?.precipitation_sum?.[0] || 'N/A'} mm
                        </span>
                      </p>
                      <p><span className="text-gray-400">Today&apos;s Max Temp:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.weather.forecast?.daily?.temperature_2m_max?.[0] || 'N/A'}°C
                        </span>
                      </p>
                      <p><span className="text-gray-400">Today&apos;s Min Temp:</span> 
                        <span className="text-white ml-2">
                          {result.dataCollection.weather.forecast?.daily?.temperature_2m_min?.[0] || 'N/A'}°C
                        </span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Irrigation Needs:</span> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          result.dataCollection.weather.agriculturalImpact?.irrigation === 'Not needed' ? 'bg-green-600 text-white' :
                          result.dataCollection.weather.agriculturalImpact?.irrigation === 'May be needed' ? 'bg-yellow-600 text-white' :
                          'bg-red-600 text-white'
                        }`}>
                          {result.dataCollection.weather.agriculturalImpact?.irrigation || 'N/A'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Pest Risk:</span> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          result.dataCollection.weather.agriculturalImpact?.pestRisk === 'Low' ? 'bg-green-600 text-white' :
                          result.dataCollection.weather.agriculturalImpact?.pestRisk === 'Moderate' ? 'bg-yellow-600 text-white' :
                          'bg-red-600 text-white'
                        }`}>
                          {result.dataCollection.weather.agriculturalImpact?.pestRisk || 'N/A'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Crop Stress:</span> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          result.dataCollection.weather.agriculturalImpact?.cropStress === 'Low' ? 'bg-green-600 text-white' :
                          result.dataCollection.weather.agriculturalImpact?.cropStress === 'Moderate' ? 'bg-yellow-600 text-white' :
                          'bg-red-600 text-white'
                        }`}>
                          {result.dataCollection.weather.agriculturalImpact?.cropStress || 'N/A'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* 7-Day Weather Forecast */}
                  {result.dataCollection.weather.forecast?.daily && (
                    <div className="mt-4">
                      <h5 className="text-white font-medium mb-2">📅 7-Day Weather Forecast</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        {result.dataCollection.weather.forecast.daily.time?.slice(0, 7).map((date, index) => (
                          <div key={index} className="bg-gray-700 rounded p-2 text-center">
                            <p className="text-gray-400 text-xs">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                            <p className="text-white text-sm font-medium">
                              {result.dataCollection.weather.forecast.daily.temperature_2m_max?.[index] || 'N/A'}°
                            </p>
                            <p className="text-gray-300 text-xs">
                              {result.dataCollection.weather.forecast.daily.temperature_2m_min?.[index] || 'N/A'}°
                            </p>
                            <p className="text-blue-400 text-xs">
                              {result.dataCollection.weather.forecast.daily.precipitation_sum?.[index] || 0}mm
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Environmental Data */}
              {result.dataCollection?.environmental && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">🌱 Environmental & Soil Analysis</h4>
                  
                  {/* Satellite Data */}
                  <div className="mb-4">
                    <h5 className="text-white font-medium mb-2">🛰️ Satellite Analysis</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p><span className="text-gray-400">NDVI Index:</span></p>
                        <div className="flex items-center mt-1">
                          <span className={`px-2 py-1 rounded text-xs ${
                            (result.dataCollection.environmental.satellite?.ndvi || 0) > 0.6 ? 'bg-green-600 text-white' :
                            (result.dataCollection.environmental.satellite?.ndvi || 0) > 0.3 ? 'bg-yellow-600 text-white' :
                            'bg-red-600 text-white'
                          }`}>
                            {result.dataCollection.environmental.satellite?.ndvi?.toFixed(3) || 'N/A'}
                          </span>
                          <span className="text-gray-300 ml-2 text-xs">
                            {(result.dataCollection.environmental.satellite?.ndvi || 0) > 0.6 ? 'Healthy Vegetation' :
                             (result.dataCollection.environmental.satellite?.ndvi || 0) > 0.3 ? 'Moderate Vegetation' :
                             'Poor Vegetation'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p><span className="text-gray-400">Land Surface Temp:</span></p>
                        <p className="text-white text-sm">
                          {result.dataCollection.environmental.satellite?.landSurfaceTemperature?.toFixed(1) || 'N/A'}°C
                        </p>
                      </div>
                      <div>
                        <p><span className="text-gray-400">Dominant Land Use:</span></p>
                        <p className="text-white text-sm">
                          {result.dataCollection.environmental.satellite?.landUse?.dominantCover || 
                           result.dataCollection.environmental.landUse?.dominantCover || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p><span className="text-gray-400">Data Source:</span></p>
                        <p className="text-gray-300 text-xs">
                          {result.dataCollection.environmental.satellite?.source || 'Google Earth Engine'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Soil Analysis */}
                  <div className="mb-4">
                    <h5 className="text-white font-medium mb-2">🌾 Soil Analysis</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p><span className="text-gray-400">Soil pH:</span></p>
                        <div className="flex items-center mt-1">
                          <span className={`px-2 py-1 rounded text-xs ${
                            (result.dataCollection.environmental.soil?.soilPh?.value || 
                             result.dataCollection.environmental.satellite?.soil?.soilPh?.value || 0) >= 6.0 && 
                            (result.dataCollection.environmental.soil?.soilPh?.value || 
                             result.dataCollection.environmental.satellite?.soil?.soilPh?.value || 0) <= 7.5 ? 'bg-green-600 text-white' :
                            'bg-yellow-600 text-white'
                          }`}>
                            {result.dataCollection.environmental.soil?.soilPh?.value || 
                             result.dataCollection.environmental.satellite?.soil?.soilPh?.value || 'N/A'}
                          </span>
                          <span className="text-gray-300 ml-2 text-xs">
                            {result.dataCollection.environmental.soil?.soilPh?.interpretation || 
                             result.dataCollection.environmental.satellite?.soil?.soilPh?.interpretation || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p><span className="text-gray-400">Soil Moisture:</span></p>
                        <div className="flex items-center mt-1">
                          <span className={`px-2 py-1 rounded text-xs ${
                            (result.dataCollection.environmental.soil?.soilMoisture?.value || 
                             result.dataCollection.environmental.satellite?.soil?.soilMoisture?.value || 0) >= 0.3 ? 'bg-green-600 text-white' :
                            (result.dataCollection.environmental.soil?.soilMoisture?.value || 
                             result.dataCollection.environmental.satellite?.soil?.soilMoisture?.value || 0) >= 0.2 ? 'bg-yellow-600 text-white' :
                            'bg-red-600 text-white'
                          }`}>
                            {((result.dataCollection.environmental.soil?.soilMoisture?.value || 
                               result.dataCollection.environmental.satellite?.soil?.soilMoisture?.value || 0) * 100).toFixed(1)}%
                          </span>
                          <span className="text-gray-300 ml-2 text-xs">
                            {result.dataCollection.environmental.soil?.soilMoisture?.interpretation || 
                             result.dataCollection.environmental.satellite?.soil?.soilMoisture?.interpretation || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p><span className="text-gray-400">Soil Temperature:</span></p>
                        <p className="text-white text-sm">
                          {result.dataCollection.environmental.soil?.soilTemperature?.value || 
                           result.dataCollection.environmental.satellite?.soil?.soilTemperature?.value || 'N/A'}°C
                        </p>
                      </div>
                      <div>
                        <p><span className="text-gray-400">Organic Carbon:</span></p>
                        <p className="text-white text-sm">
                          {result.dataCollection.environmental.soil?.soilOrganicCarbon?.value || 
                           result.dataCollection.environmental.satellite?.soil?.soilOrganicCarbon?.value || 'N/A'} g/kg
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Soil Texture Composition */}
                  {(result.dataCollection.environmental.soil?.soilTexture || 
                    result.dataCollection.environmental.satellite?.soil?.soilTexture) && (
                    <div className="mb-4">
                      <h5 className="text-white font-medium mb-2">🏔️ Soil Texture Composition</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-700 rounded p-3">
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="text-center">
                              <p className="text-gray-400 text-xs">Clay</p>
                              <p className="text-white font-medium">
                                {result.dataCollection.environmental.soil?.soilTexture?.clay?.value || 
                                 result.dataCollection.environmental.satellite?.soil?.soilTexture?.clay?.value || 'N/A'}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-400 text-xs">Silt</p>
                              <p className="text-white font-medium">
                                {result.dataCollection.environmental.soil?.soilTexture?.silt?.value || 
                                 result.dataCollection.environmental.satellite?.soil?.soilTexture?.silt?.value || 'N/A'}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-400 text-xs">Sand</p>
                              <p className="text-white font-medium">
                                {result.dataCollection.environmental.soil?.soilTexture?.sand?.value || 
                                 result.dataCollection.environmental.satellite?.soil?.soilTexture?.sand?.value || 'N/A'}%
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-700 rounded p-3">
                          <p><span className="text-gray-400">Soil Type:</span> 
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              (result.dataCollection.environmental.soil?.soilTexture?.texture || 
                               result.dataCollection.environmental.satellite?.soil?.soilTexture?.texture) === 'Loam' ? 'bg-green-600 text-white' :
                              'bg-blue-600 text-white'
                            }`}>
                              {result.dataCollection.environmental.soil?.soilTexture?.texture || 
                               result.dataCollection.environmental.satellite?.soil?.soilTexture?.texture || 'N/A'}
                            </span>
                          </p>
                          <p className="text-gray-300 text-xs mt-2">
                            {result.dataCollection.environmental.soil?.soilTexture?.interpretation || 
                             result.dataCollection.environmental.satellite?.soil?.soilTexture?.interpretation || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Land Use Distribution */}
                  {(result.dataCollection.environmental.landUse?.landCoverTypes || 
                    result.dataCollection.environmental.satellite?.landUse?.landCoverTypes) && (
                    <div>
                      <h5 className="text-white font-medium mb-2">🗺️ Land Use Distribution</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {(result.dataCollection.environmental.landUse?.landCoverTypes || 
                          result.dataCollection.environmental.satellite?.landUse?.landCoverTypes || []).map((landType, index) => (
                          <div key={index} className="bg-gray-700 rounded p-2 text-center">
                            <p className="text-gray-400 text-xs">{landType.type}</p>
                            <p className="text-white text-sm font-medium">{landType.percentage}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Image Analysis Data */}
              {result.dataCollection?.imageAnalysis && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">📸 Image Analysis Data</h4>
                  <div className="space-y-3">
                    {result.dataCollection.imageAnalysis.data && Array.isArray(result.dataCollection.imageAnalysis.data) && result.dataCollection.imageAnalysis.data.length > 0 ? (
                      result.dataCollection.imageAnalysis.data.map((image, index) => (
                        <div key={index} className="bg-gray-700 rounded p-3">
                          <p className="text-gray-300 mb-2">
                            <span className="text-gray-400">Image {index + 1}:</span> 
                            {image.type || 'Unknown type'}
                          </p>
                          {image.disease && image.disease.data && image.disease.data.results && Array.isArray(image.disease.data.results) && image.disease.data.results.length > 0 && (
                            <div className="ml-4">
                              <p className="text-gray-400 text-xs">Disease Analysis:</p>
                              {image.disease.data.results.map((diseaseResult, idx) => (
                                <div key={idx} className="ml-4 text-xs">
                                  <span className="text-gray-300">
                                    {diseaseResult.name || 'Unknown'}: {diseaseResult.confidence || 0}% confidence
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-sm">No images provided for analysis</p>
                    )}
                  </div>
                </div>
              )}

              {/* Agricultural Insights */}
              {result.insights && Array.isArray(result.insights) && result.insights.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">🌱 Agricultural Insights & Analysis</h4>
                  <div className="space-y-4">
                    {result.insights.map((insight, index) => {
                      const insightType = insight.type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                      
                      return (
                        <div key={index} className="bg-gray-700 rounded p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-white font-medium">
                              {insightType === 'Soil Health' ? '🌾' :
                               insightType === 'Crop Suitability' ? '🌱' :
                               insightType === 'Water Management' ? '💧' :
                               insightType === 'Pest Risk' ? '🐛' :
                               insightType === 'Yield Potential' ? '📈' :
                               insightType === 'Climate Adaptation' ? '🌡️' :
                               '📊'} {insightType || `Analysis ${index + 1}`}
                            </h5>
                            {insight.data?.overall && (
                              <span className={`px-3 py-1 rounded text-sm font-medium ${getHealthColor(insight.data.overall)}`}>
                                {insight.data.overall}
                                {insight.data?.score && ` (${insight.data.score}/100)`}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              {/* Specific data based on insight type */}
                              {insight.type === 'soil_health' && (
                                <div>
                                  <p className="text-gray-400 mb-2">Soil Conditions:</p>
                                  {insight.data?.strengths && Array.isArray(insight.data.strengths) && insight.data.strengths.length > 0 && (
                                    <div className="mb-2">
                                      <p className="text-green-400 text-xs mb-1">✅ Strengths:</p>
                                      <ul className="ml-4 text-gray-300">
                                        {insight.data.strengths.map((strength, idx) => (
                                          <li key={idx} className="text-xs">• {strength}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {insight.data?.issues && Array.isArray(insight.data.issues) && insight.data.issues.length > 0 && (
                                    <div>
                                      <p className="text-red-400 text-xs mb-1">⚠️ Issues:</p>
                                      <ul className="ml-4 text-gray-300">
                                        {insight.data.issues.map((issue, idx) => (
                                          <li key={idx} className="text-xs">• {issue}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}

                              {insight.type === 'crop_suitability' && (
                                <div>
                                  <p className="text-gray-400 mb-2">Crop Recommendations:</p>
                                  {insight.data?.bestCrops && Array.isArray(insight.data.bestCrops) && insight.data.bestCrops.length > 0 && (
                                    <div className="mb-2">
                                      <p className="text-green-400 text-xs mb-1">🌟 Best Crops:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {insight.data.bestCrops.map((crop, idx) => (
                                          <span key={idx} className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                                            {crop}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {insight.data?.goodCrops && Array.isArray(insight.data.goodCrops) && insight.data.goodCrops.length > 0 && (
                                    <div>
                                      <p className="text-blue-400 text-xs mb-1">✅ Good Crops:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {insight.data.goodCrops.map((crop, idx) => (
                                          <span key={idx} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                                            {crop}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {insight.type === 'water_management' && (
                                <div>
                                  <p className="text-gray-400 mb-2">Water Requirements:</p>
                                  <div className="space-y-2">
                                    {insight.data?.irrigationNeeds && (
                                      <p><span className="text-gray-400">Irrigation:</span> 
                                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                          insight.data.irrigationNeeds === 'Low' ? 'bg-green-600 text-white' :
                                          insight.data.irrigationNeeds === 'Moderate' ? 'bg-yellow-600 text-white' :
                                          'bg-red-600 text-white'
                                        }`}>
                                          {insight.data.irrigationNeeds}
                                        </span>
                                      </p>
                                    )}
                                    {insight.data?.drainageNeeds && (
                                      <p><span className="text-gray-400">Drainage:</span> 
                                        <span className="text-white ml-2">{insight.data.drainageNeeds}</span>
                                      </p>
                                    )}
                                    {insight.data?.floodRisk && (
                                      <p><span className="text-gray-400">Flood Risk:</span> 
                                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                          insight.data.floodRisk === 'Low' ? 'bg-green-600 text-white' :
                                          insight.data.floodRisk === 'Moderate' ? 'bg-yellow-600 text-white' :
                                          'bg-red-600 text-white'
                                        }`}>
                                          {insight.data.floodRisk}
                                        </span>
                                      </p>
                                    )}
                                    {insight.data?.droughtRisk && (
                                      <p><span className="text-gray-400">Drought Risk:</span> 
                                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                          insight.data.droughtRisk === 'Low' ? 'bg-green-600 text-white' :
                                          insight.data.droughtRisk === 'Moderate' ? 'bg-yellow-600 text-white' :
                                          'bg-red-600 text-white'
                                        }`}>
                                          {insight.data.droughtRisk}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Factors and other data */}
                              {insight.data?.factors && Array.isArray(insight.data.factors) && insight.data.factors.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-gray-400 mb-1">Key Factors:</p>
                                  <ul className="ml-4 text-gray-300">
                                    {insight.data.factors.map((factor, idx) => (
                                      <li key={idx} className="text-xs">• {factor}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            <div>
                              {/* Reasoning and recommendations */}
                              {insight.data?.reasoning && (
                                <div className="mb-3">
                                  <p className="text-gray-400 mb-1">Analysis Reasoning:</p>
                                  <div className="space-y-1">
                                    {Object.entries(insight.data.reasoning).map(([key, value], idx) => (
                                      <p key={idx} className="text-xs">
                                        <span className="text-blue-400">{key}:</span> 
                                        <span className="text-gray-300 ml-1">{value}</span>
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {insight.data?.recommendations && insight.data.recommendations.length > 0 && (
                                <div>
                                  <p className="text-gray-400 mb-1">Recommendations:</p>
                                  <ul className="ml-4 text-gray-300">
                                    {insight.data.recommendations.map((rec, idx) => (
                                      <li key={idx} className="text-xs">• {rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {insight.data?.limitations && insight.data.limitations.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-yellow-400 text-xs mb-1">⚠️ Limitations:</p>
                                  <ul className="ml-4 text-gray-300">
                                    {insight.data.limitations.map((limitation, idx) => (
                                      <li key={idx} className="text-xs">• {limitation}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Crop Recommendations */}
              {result.recommendations && Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
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
                    {typeof result.summary === 'string' ? (
                      <p className="text-gray-300">{result.summary}</p>
                    ) : (
                      <div className="space-y-3">
                        {result.summary.keyFindings && (
                          <div>
                            <h5 className="text-white font-medium mb-2">🔍 Key Findings</h5>
                            <p className="text-gray-300">{result.summary.keyFindings}</p>
                          </div>
                        )}
                        {result.summary.topRecommendations && (
                          <div>
                            <h5 className="text-white font-medium mb-2">💡 Top Recommendations</h5>
                            <p className="text-gray-300">{result.summary.topRecommendations}</p>
                          </div>
                        )}
                        {result.summary.nextSteps && (
                          <div>
                            <h5 className="text-white font-medium mb-2">🚀 Next Steps</h5>
                            <p className="text-gray-300">{result.summary.nextSteps}</p>
                          </div>
                        )}
                      </div>
                    )}
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

              {result.insights?.length > 0 && result.insights[0] && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">🔍 Top Insight</h4>
                  <div className="bg-gray-700 border border-gray-600 rounded p-3">
                    <p className="text-gray-300">
                      {typeof result.insights[0] === 'string' ? result.insights[0] :
                       result.insights[0].message || 
                       result.insights[0].type || 
                       JSON.stringify(result.insights[0])}
                    </p>
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
