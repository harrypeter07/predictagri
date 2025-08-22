'use client'

import { useState, useEffect } from 'react'
import { Line, Bar } from 'react-chartjs-2'

export const SatelliteDataDashboard = ({ region }) => {
  const [satelliteData, setSatelliteData] = useState(null)
  const [serviceStatus, setServiceStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDataType, setSelectedDataType] = useState('comprehensive')
  const [historicalData, setHistoricalData] = useState([])

  useEffect(() => {
    if (region?.id) {
      fetchSatelliteData()
      fetchServiceStatus()
    }
  }, [region, selectedDataType])

  const fetchSatelliteData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/satellite?regionId=${region.id}&dataType=${selectedDataType}`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setSatelliteData(data.data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch satellite data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchServiceStatus = async () => {
    try {
      const response = await fetch('/api/satellite/status')
      if (response.ok) {
        const data = await response.json()
        setServiceStatus(data.status)
      }
    } catch (err) {
      console.error('Failed to fetch service status:', err)
    }
  }

  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy': return 'text-green-400'
      case 'attention': return 'text-yellow-400'
      case 'warning': return 'text-orange-400'
      case 'critical': return 'text-red-400'
      case 'degraded': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  const getHealthIcon = (health) => {
    switch (health) {
      case 'healthy': return '🟢'
      case 'attention': return '🟡'
      case 'warning': return '🟠'
      case 'critical': return '🔴'
      case 'degraded': return '🟣'
      default: return '⚪'
    }
  }

  const getQualityColor = (quality) => {
    return quality === 'high' ? 'text-green-400' : 'text-yellow-400'
  }

  const getQualityIcon = (quality) => {
    return quality === 'high' ? '✅' : '⚠️'
  }

  if (loading) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-gray-300">Loading satellite data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <div className="text-center">
          <p className="text-red-400 mb-3">Failed to load satellite data</p>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={fetchSatelliteData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">🛰️ Satellite Data Dashboard</h3>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${getHealthColor(serviceStatus?.health)}`}>
            {getHealthIcon(serviceStatus?.health)} {serviceStatus?.health}
          </span>
        </div>
      </div>

      {/* Service Status */}
      {serviceStatus && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-600">
          <h4 className="text-lg font-semibold text-white mb-3">📊 Service Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">API Calls</p>
              <p className="text-white font-bold">
                {serviceStatus.apiCallCount}/{serviceStatus.maxApiCalls}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Remaining</p>
              <p className="text-white font-bold">{serviceStatus.remainingCalls}</p>
            </div>
            <div>
              <p className="text-gray-400">Errors</p>
              <p className="text-white font-bold">{serviceStatus.errorCount}</p>
            </div>
            <div>
              <p className="text-gray-400">Mode</p>
              <p className={`font-bold ${serviceStatus.fallbackMode ? 'text-yellow-400' : 'text-green-400'}`}>
                {serviceStatus.fallbackMode ? 'Fallback' : 'GEE'}
              </p>
            </div>
          </div>
          {serviceStatus.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <p className="text-xs text-gray-400 mb-2">Recommendations:</p>
              <ul className="text-xs text-gray-300 space-y-1">
                {serviceStatus.recommendations.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Data Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Data Type
        </label>
        <select
          value={selectedDataType}
          onChange={(e) => setSelectedDataType(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="comprehensive">Comprehensive Data</option>
          <option value="ndvi">NDVI (Vegetation Index)</option>
          <option value="temperature">Land Surface Temperature</option>
          <option value="soil-moisture">Soil Moisture</option>
          <option value="vegetation-health">Vegetation Health Index</option>
        </select>
      </div>

      {/* Satellite Data Display */}
      {satelliteData && (
        <div className="space-y-6">
          {/* Data Quality Indicator */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <span className="text-gray-300">Data Quality:</span>
            <span className={`font-semibold ${getQualityColor(satelliteData.quality)}`}>
              {getQualityIcon(satelliteData.quality)} {satelliteData.quality.toUpperCase()}
            </span>
          </div>

          {/* Data Source */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <span className="text-gray-300">Data Source:</span>
            <span className="text-white font-semibold">{satelliteData.source}</span>
          </div>

          {/* Main Data Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedDataType === 'comprehensive' && (
              <>
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                  <h5 className="text-lg font-semibold text-white mb-2">🌱 NDVI</h5>
                  <p className="text-3xl font-bold text-green-400">
                    {(satelliteData.ndvi * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Vegetation density index
                  </p>
                </div>
                
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                  <h5 className="text-lg font-semibold text-white mb-2">🌡️ Temperature</h5>
                  <p className="text-3xl font-bold text-red-400">
                    {satelliteData.landSurfaceTemperature?.toFixed(1)}°C
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Land surface temperature
                  </p>
                </div>
                
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                  <h5 className="text-lg font-semibold text-white mb-2">💧 Soil Moisture</h5>
                  <p className="text-3xl font-bold text-blue-400">
                    {(satelliteData.soilMoisture * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Soil moisture content
                  </p>
                </div>
                
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                  <h5 className="text-lg font-semibold text-white mb-2">📊 Data Types</h5>
                  <div className="space-y-1">
                    {satelliteData.dataTypes?.map((type, index) => (
                      <p key={index} className="text-sm text-gray-300">• {type}</p>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedDataType === 'ndvi' && (
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                <h5 className="text-lg font-semibold text-white mb-2">🌱 NDVI Data</h5>
                <p className="text-3xl font-bold text-green-400">
                  {(satelliteData.ndvi * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Normalized Difference Vegetation Index
                </p>
                <div className="mt-3">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-400 h-2 rounded-full" 
                      style={{ width: `${satelliteData.ndvi * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {selectedDataType === 'temperature' && (
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                <h5 className="text-lg font-semibold text-white mb-2">🌡️ Temperature Data</h5>
                <p className="text-3xl font-bold text-red-400">
                  {satelliteData.temperature?.toFixed(1)}°C
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Land surface temperature from satellite
                </p>
              </div>
            )}

            {selectedDataType === 'soil-moisture' && (
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                <h5 className="text-lg font-semibold text-white mb-2">💧 Soil Moisture Data</h5>
                <p className="text-3xl font-bold text-blue-400">
                  {(satelliteData.soilMoisture * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Soil moisture content from SMAP satellite
                </p>
              </div>
            )}

            {selectedDataType === 'vegetation-health' && (
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                <h5 className="text-lg font-semibold text-white mb-2">🌿 Vegetation Health</h5>
                <p className="text-3xl font-bold text-green-400">
                  {(satelliteData.vhi * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Vegetation Health Index
                </p>
                <div className="mt-3 p-2 bg-gray-700 rounded">
                  <p className="text-sm text-white">
                    Status: <span className="font-semibold">{satelliteData.healthStatus}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-center text-sm text-gray-400">
            Last updated: {new Date(satelliteData.timestamp).toLocaleString()}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button 
              onClick={fetchSatelliteData}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              🔄 Refresh Data
            </button>
            <button 
              onClick={fetchServiceStatus}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              📊 Update Status
            </button>
          </div>
        </div>
      )}

      {/* Fallback Mode Warning */}
      {serviceStatus?.fallbackMode && (
        <div className="mt-6 p-4 bg-yellow-900 border border-yellow-600 rounded-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h4 className="text-lg font-semibold text-yellow-200">Fallback Mode Active</h4>
              <p className="text-yellow-100 text-sm">
                Google Earth Engine is unavailable. Using mock data for demonstration purposes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SatelliteDataDashboard
