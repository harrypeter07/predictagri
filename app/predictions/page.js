'use client'

import { useState, useEffect } from 'react'
// Removed mock data import - using real-time data
import { 
  YieldTrendChart, 
  RegionalPerformanceChart, 
  CropDistributionChart, 
  ProductivityZoneMap, 
  WeatherAlertSystem,
  SoilHealthChart,
  WeatherImpactChart,
  CropPerformanceChart,
  SeasonalAnalysisChart
} from '../components/Charts'
import SatelliteDataDashboard from '../components/SatelliteDataDashboard'
import ImageAnalysisDashboard from '../components/ImageAnalysisDashboard'
import WeatherPanel from '../components/WeatherPanel'
import AgriPipelinePanel from '../components/AgriPipelinePanel'
import NasaPanel from '../components/NasaPanel'
import AlertsPanel from '../components/AlertsPanel'
import VoicePanel from '../components/VoicePanel'

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState([])
  const [regions, setRegions] = useState([])
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCrop, setSelectedCrop] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedUser, setSelectedUser] = useState('')

  const [pipelineResults, setPipelineResults] = useState(null)
  const [aiModelCalls, setAiModelCalls] = useState([])
  const [userLocation, setUserLocation] = useState(null)

  useEffect(() => {
    console.log('🤖 useEffect called - initializing component')
    fetchData()
    // Get user location on component mount
    const getUserLocation = async () => {
      try {
        const { locationService } = await import('../../lib/locationService')
        const location = await locationService.getLocationWithFallback()
        setUserLocation(location)
        console.log('🤖 User location set:', location)
      } catch (error) {
        console.error('Failed to get user location:', error)
      }
    }
    getUserLocation()
  }, [])

  // Debug effect to track AI calls state changes
  useEffect(() => {
    console.log('🤖 AI calls state changed:', aiModelCalls.length, 'calls')
  }, [aiModelCalls])

  const fetchData = async () => {
    try {
      console.log('🤖 fetchData called, current AI calls:', aiModelCalls.length)
      console.log('🤖 AI calls content:', aiModelCalls)
      console.log('🤖 fetchData will NOT clear AI calls')
      const [predictionsRes, regionsRes, cropsRes] = await Promise.all([
        fetch('/api/predictions'),
        fetch('/api/regions'),
        fetch('/api/crops')
      ])

      if (predictionsRes.ok) {
        const predictionsData = await predictionsRes.json()
        setPredictions(predictionsData)
      }

      if (regionsRes.ok) {
        const regionsData = await regionsRes.json()
        setRegions(regionsData)
      }

      if (cropsRes.ok) {
        const cropsData = await cropsRes.json()
        setCrops(cropsData)
      }
    } catch (err) {
      setError('Error fetching data')
    } finally {
      setLoading(false)
    }
  }

  const generatePrediction = async () => {
    if (!selectedCrop || !selectedRegion) {
      setError('Please select both crop and region')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get user location and real-time weather data
      const { locationService } = await import('../../lib/locationService')
      const userLocation = await locationService.getLocationWithFallback()
      const weatherData = await locationService.getCurrentLocationWeather()
      
      const requestData = {
        userId: selectedUser || `user-${Date.now()}`,
        cropId: selectedCrop,
        regionId: selectedRegion,
        location: {
          lat: userLocation.lat,
          lon: userLocation.lon,
          address: userLocation.city ? `${userLocation.city}, ${userLocation.region}` : 'Unknown Location',
          source: userLocation.source
        },
        features: {
          temperature: weatherData.weather?.current?.temperature_2m || 25,
          humidity: weatherData.weather?.current?.relative_humidity_2m || 65,
          rainfall: weatherData.weather?.daily?.precipitation_sum?.[0] || 0,
          wind_speed: weatherData.weather?.current?.wind_speed_10m || 5,
          soil_moisture: Math.max(0.2, Math.min(0.8, 
            (weatherData.weather?.current?.relative_humidity_2m || 65) / 100 * 0.7
          )),
          nitrogen: 40 + Math.random() * 20,
          phosphorus: 30 + Math.random() * 15,
          potassium: 35 + Math.random() * 18,
          ph: 6.0 + Math.random() * 2
        }
      }

      // Log AI model endpoint call
      const aiCall = {
        timestamp: new Date().toISOString(),
        endpoint: '/api/predictions',
        method: 'POST',
        request: requestData,
        status: 'calling'
      }
      console.log('🤖 Adding AI call:', aiCall)
      setAiModelCalls(prev => {
        const newCalls = [...prev, aiCall]
        console.log('🤖 Updated AI calls after prediction:', newCalls)
        console.log('🤖 Previous calls count:', prev.length)
        console.log('🤖 New calls count:', newCalls.length)
        return newCalls
      })

      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      // Update AI call with response
      const updatedCall = {
        ...aiCall,
        status: response.ok ? 'success' : 'error',
        response: result,
        responseTime: Date.now() - new Date(aiCall.timestamp).getTime()
      }
      console.log('🤖 Updating prediction AI call with response:', updatedCall)
      setAiModelCalls(prev => {
        const updated = prev.map(call => 
          call.timestamp === aiCall.timestamp ? updatedCall : call
        )
        console.log('🤖 AI calls after prediction update:', updated)
        return updated
      })

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate prediction')
      }

      // Refresh predictions data (but preserve AI calls)
      const currentAiCalls = [...aiModelCalls] // Create a copy
      console.log('🤖 Before fetchData - AI calls count:', currentAiCalls.length)
      await fetchData()
      console.log('🤖 After fetchData - restoring AI calls count:', currentAiCalls.length)
      setAiModelCalls(currentAiCalls) // Restore AI calls after fetchData
      
      // Show success message
      setError(null)
    } catch (err) {
      setError(err.message)
      // Update AI call with error
      console.log('🤖 Updating prediction AI call with error:', err.message)
      setAiModelCalls(prev => {
        const updated = prev.map(call => 
          call.status === 'calling' ? { ...call, status: 'error', error: err.message } : call
        )
        console.log('🤖 AI calls after prediction error update:', updated)
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const runPipelineAnalysis = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use stored user location for pipeline analysis
      if (!userLocation) {
        setError('Location not available. Please allow location access.')
        return
      }
      
      console.log('📍 Using location for pipeline analysis:', userLocation)
      
      const requestData = {
        farmerData: {
          farmerId: selectedUser || `user-${Date.now()}`,
          coordinates: { lat: userLocation.lat, lon: userLocation.lon },
          address: userLocation.city ? `${userLocation.city}, ${userLocation.region}` : 'Current Location',
          crops: selectedCrop ? [selectedCrop] : ['Wheat', 'Rice', 'Cotton'],
          farmSize: 5.0,
          soilType: 'Clay Loam',
          irrigationType: 'Sprinkler',
          previousYield: 'Good',
          pestIssues: [],
          contactInfo: { phoneNumber: '+919322909257' }
        }
      }

      // Log AI model endpoint call
      const aiCall = {
        timestamp: new Date().toISOString(),
        endpoint: '/api/pipeline',
        method: 'POST',
        request: requestData,
        status: 'calling'
      }
      console.log('🤖 Adding pipeline AI call:', aiCall)
      setAiModelCalls(prev => {
        const newCalls = [...prev, aiCall]
        console.log('🤖 Updated AI calls after pipeline:', newCalls)
        console.log('🤖 Previous calls count:', prev.length)
        console.log('🤖 New calls count:', newCalls.length)
        return newCalls
      })

      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      // Update AI call with response
      const updatedCall = {
        ...aiCall,
        status: response.ok ? 'success' : 'error',
        response: result,
        responseTime: Date.now() - new Date(aiCall.timestamp).getTime()
      }
      console.log('🤖 Updating pipeline AI call with response:', updatedCall)
      setAiModelCalls(prev => {
        const updated = prev.map(call => 
          call.timestamp === aiCall.timestamp ? updatedCall : call
        )
        console.log('🤖 AI calls after pipeline update:', updated)
        return updated
      })

      if (!response.ok) {
        throw new Error(result.error || 'Pipeline analysis failed')
      }

      setPipelineResults(result)
      setError(null)
    } catch (err) {
      setError(err.message)
      // Update AI call with error
      console.log('🤖 Updating pipeline AI call with error:', err.message)
      setAiModelCalls(prev => {
        const updated = prev.map(call => 
          call.status === 'calling' ? { ...call, status: 'error', error: err.message } : call
        )
        console.log('🤖 AI calls after pipeline error update:', updated)
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const clearAiModelCalls = () => {
    console.log('🤖 Clearing AI calls, current count:', aiModelCalls.length)
    setAiModelCalls([])
    console.log('🤖 AI calls cleared')
  }

  // Test function to add a dummy AI call
  const addTestAiCall = () => {
    const testCall = {
      timestamp: new Date().toISOString(),
      endpoint: '/api/test',
      method: 'GET',
      request: { test: true },
      status: 'success',
      response: { success: true },
      responseTime: 100
    }
    console.log('🤖 Adding test AI call:', testCall)
    setAiModelCalls(prev => [...prev, testCall])
  }

  if (loading && predictions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-xl">Loading agricultural insights...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">🌾 Agricultural Predictions & Analytics</h1>
          <p className="text-gray-300 text-lg">Comprehensive analysis of crop performance, weather patterns, and farming recommendations</p>
          
          {/* Current Location Display */}
          <div className="mt-4 p-3 bg-gray-800 rounded-lg inline-block">
            <p className="text-sm text-gray-300">
              📍 Location: {userLocation ? `${userLocation.city || 'Unknown'}, ${userLocation.region || 'Unknown'}` : 'Detecting...'}
            </p>
            {userLocation && (
              <p className="text-xs text-gray-400 mt-1">
                Coordinates: {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)} 
                <span className="ml-2">({userLocation.source})</span>
              </p>
            )}
          </div>
          
                     {/* Debug Info */}
           <div className="mt-2 p-2 bg-gray-700 rounded text-xs">
             <p>Debug: AI Calls: {aiModelCalls.length} | Predictions: {predictions.length}</p>
             <p>AI Calls State: {JSON.stringify(aiModelCalls.map(call => ({ 
               endpoint: call.endpoint, 
               status: call.status, 
               timestamp: call.timestamp 
             })))}</p>
             <p>Component State: Loading={loading.toString()} | Error={error || 'none'}</p>
             <button 
               onClick={addTestAiCall}
               className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
             >
               Test AI Call Display
             </button>
           </div>
        </div>

        {/* AI Model Endpoint Calls */}
        {console.log('🤖 Rendering AI calls section, count:', aiModelCalls.length, 'calls:', aiModelCalls)}
        {aiModelCalls.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-white">🤖 AI Model Endpoint Calls</h2>
              <button
                onClick={clearAiModelCalls}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-4">
              {aiModelCalls.map((call, index) => (
                <div key={index} className="bg-gray-700 rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      call.status === 'success' ? 'bg-green-600 text-white' :
                      call.status === 'error' ? 'bg-red-600 text-white' :
                      'bg-yellow-600 text-white'
                    }`}>
                      {call.status === 'success' ? '✅ Success' :
                       call.status === 'error' ? '❌ Error' : '⏳ Calling...'}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {new Date(call.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-300">
                        <span className="text-gray-400">Endpoint:</span> {call.method} {call.endpoint}
                      </p>
                      {call.responseTime && (
                        <p className="text-gray-300">
                          <span className="text-gray-400">Response Time:</span> {call.responseTime}ms
                        </p>
                      )}
                    </div>
                    <div>
                      {call.error && (
                        <p className="text-red-400">
                          <span className="text-gray-400">Error:</span> {call.error}
                        </p>
                      )}
                    </div>
                    <div>
                      {call.response && call.status === 'success' && (
                        <details className="text-gray-300">
                          <summary className="cursor-pointer text-blue-400">View Response</summary>
                          <pre className="mt-2 text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                            {JSON.stringify(call.response, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pipeline Analysis Panel */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">🚀 Enhanced Pipeline Analysis</h2>
          <AgriPipelinePanel region={selectedRegion || 'current'} />
        </div>

        {/* Pipeline Results Display */}
        {pipelineResults && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">📊 Pipeline Analysis Results</h2>
            <div className="space-y-4">
              {/* Location Data */}
              {pipelineResults.location && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-3">📍 Location Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p><span className="text-gray-400">Coordinates:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.location.coordinates?.lat}, {pipelineResults.location.coordinates?.lon}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Agricultural Zone:</span> 
                        <span className="text-white ml-2">{pipelineResults.location.agriculturalZone?.zone || 'N/A'}</span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Soil Type:</span> 
                        <span className="text-white ml-2">{pipelineResults.location.soilClassification?.type || 'N/A'}</span>
                      </p>
                      <p><span className="text-gray-400">Climate:</span> 
                        <span className="text-white ml-2">{pipelineResults.location.climateData?.type || 'N/A'}</span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Elevation:</span> 
                        <span className="text-white ml-2">{pipelineResults.location.elevation || 'N/A'}m</span>
                      </p>
                      <p><span className="text-gray-400">Address:</span> 
                        <span className="text-white ml-2">{pipelineResults.location.address || 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Weather Data */}
              {pipelineResults.dataCollection?.weather && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-3">🌤️ Weather Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p><span className="text-gray-400">Current Temp:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.weather.current?.temperature_2m || 'N/A'}°C
                        </span>
                      </p>
                      <p><span className="text-gray-400">Humidity:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.weather.current?.relative_humidity_2m || 'N/A'}%
                        </span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Max Temp:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.weather.daily?.temperature_2m_max?.[0] || 'N/A'}°C
                        </span>
                      </p>
                      <p><span className="text-gray-400">Min Temp:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.weather.daily?.temperature_2m_min?.[0] || 'N/A'}°C
                        </span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Precipitation:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.weather.daily?.precipitation_sum?.[0] || 'N/A'} mm
                        </span>
                      </p>
                      <p><span className="text-gray-400">Wind Speed:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.weather.current?.wind_speed_10m || 'N/A'} km/h
                        </span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Source:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.weather.source || 'Open-Meteo API'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Updated:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.weather.timestamp ? 
                            new Date(pipelineResults.dataCollection.weather.timestamp).toLocaleString() : 'N/A'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Environmental Data */}
              {pipelineResults.dataCollection?.environmental && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-3">🌱 Environmental Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p><span className="text-gray-400">NDVI Index:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.environmental.ndvi?.value || 'N/A'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Soil Moisture:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.environmental.soilMoisture?.value || 'N/A'}%
                        </span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Land Use:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.environmental.landUse?.type || 'N/A'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Coverage:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.environmental.coverage || 'N/A'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p><span className="text-gray-400">Source:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.environmental.source || 'N/A'}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Resolution:</span> 
                        <span className="text-white ml-2">
                          {pipelineResults.dataCollection.environmental.resolution || 'N/A'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Agricultural Insights */}
              {pipelineResults.insights && Array.isArray(pipelineResults.insights) && pipelineResults.insights.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-3">🌾 Agricultural Insights</h3>
                  <div className="space-y-3">
                    {pipelineResults.insights.map((insight, index) => (
                      <div key={index} className="bg-gray-600 rounded p-3">
                        <h4 className="text-white font-medium mb-2">{insight.type || `Insight ${index + 1}`}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><span className="text-gray-400">Overall Score:</span> 
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${getHealthColor(insight.data?.overall)}`}>
                                {insight.data?.overall || 'Unknown'}
                              </span>
                            </p>
                            {insight.data?.factors && Array.isArray(insight.data.factors) && insight.data.factors.length > 0 && (
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
                            {insight.data?.recommendations && Array.isArray(insight.data.recommendations) && insight.data.recommendations.length > 0 && (
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
              {pipelineResults.recommendations && Array.isArray(pipelineResults.recommendations) && pipelineResults.recommendations.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-3">💡 Actionable Recommendations</h3>
                  <div className="space-y-3">
                    {pipelineResults.recommendations.map((rec, index) => (
                      <div key={index} className="bg-gray-600 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{rec.category || `Recommendation ${index + 1}`}</h4>
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
              {pipelineResults.notification && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-3">📱 Notification Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="text-gray-400">SMS Status:</span> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          pipelineResults.notification.sms?.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {pipelineResults.notification.sms?.success ? '✅ Sent' : '❌ Failed'}
                        </span>
                      </p>
                      {pipelineResults.notification.sms?.error && (
                        <p className="text-red-400 text-xs mt-1">{pipelineResults.notification.sms.error}</p>
                      )}
                    </div>
                    <div>
                      <p><span className="text-gray-400">Voice Status:</span> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          pipelineResults.notification.voice?.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {pipelineResults.notification.voice?.success ? '✅ Sent' : '❌ Failed'}
                        </span>
                      </p>
                      {pipelineResults.notification.voice?.error && (
                        <p className="text-red-400 text-xs mt-1">{pipelineResults.notification.voice.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prediction Generation Controls */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">🎯 Generate New Predictions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">User ID</label>
              <input
                type="text"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter User ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Crop</label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Crop</option>
                {Array.isArray(crops) && crops.map((crop) => (
                  <option key={crop.id} value={crop.id}>
                    {crop.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Region</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Region</option>
                {Array.isArray(regions) && regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={generatePrediction}
                disabled={loading || !selectedCrop || !selectedRegion}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={runPipelineAnalysis}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
              >
                {loading ? 'Running...' : 'Run Pipeline'}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Pipeline Data Analysis Charts */}
        {pipelineResults && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">📊 Pipeline Data Analysis Charts</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">Soil Health Analysis</h3>
                <SoilHealthChart predictions={predictions} crops={crops} />
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">Weather Impact Analysis</h3>
                <WeatherImpactChart predictions={predictions} crops={crops} />
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">Crop Performance Comparison</h3>
                <CropPerformanceChart predictions={predictions} crops={crops} />
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">Seasonal Analysis</h3>
                <SeasonalAnalysisChart predictions={predictions} crops={crops} />
              </div>
            </div>
          </div>
        )}

        {/* Traditional Charts */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">📈 Traditional Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-3">Yield Trends</h3>
              <YieldTrendChart predictions={predictions} />
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-3">Regional Performance</h3>
              <RegionalPerformanceChart predictions={predictions} regions={regions} />
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-3">Crop Distribution</h3>
              <CropDistributionChart predictions={predictions} crops={crops} />
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-3">Productivity Zones</h3>
              <ProductivityZoneMap predictions={predictions} />
            </div>
          </div>
        </div>

        {/* Additional Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeatherAlertSystem predictions={predictions} />
          <SatelliteDataDashboard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ImageAnalysisDashboard />
          <NasaPanel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AlertsPanel />
          <VoicePanel />
        </div>
      </div>
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
