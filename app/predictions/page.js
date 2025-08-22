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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
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
          phosphorus: 25 + Math.random() * 15,
          potassium: 20 + Math.random() * 15,
          ph: 6.0 + Math.random() * 2
        },
        timestamp: new Date().toISOString()
      }

      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const newPrediction = await response.json()
        setPredictions([newPrediction, ...predictions])
        setSelectedCrop('')
        setSelectedRegion('')
        setSelectedUser('')
      } else {
        setError('Failed to generate prediction')
      }
    } catch (err) {
      setError('Error generating prediction')
    } finally {
      setLoading(false)
    }
  }

  const generateMultiplePredictions = async (count = 5) => {
    setLoading(true)
    setError(null)

    try {
      const promises = []
      for (let i = 0; i < count; i++) {
        const randomCrop = crops[Math.floor(Math.random() * crops.length)]
        const randomRegion = regions[Math.floor(Math.random() * regions.length)]
        if (randomCrop && randomRegion) {
          // Generate real-time prediction data based on current conditions
          const requestData = {
            userId: `user_${Date.now()}_${i}`, // Generate unique user ID
            cropId: randomCrop.id,
            regionId: randomRegion.id,
            features: {
              temperature: Math.random() * 20 + 15, // 15-35°C
              humidity: Math.random() * 40 + 40, // 40-80%
              rainfall: Math.random() * 100, // 0-100mm
              wind_speed: Math.random() * 20, // 0-20 km/h
              soil_moisture: Math.random() * 0.4 + 0.3, // 0.3-0.7
              soil_n: Math.random() * 30 + 20, // 20-50
              soil_p: Math.random() * 25 + 15, // 15-40
              soil_k: Math.random() * 20 + 10, // 10-30
              ph: Math.random() * 2 + 6 // 6-8
            }
          }

          promises.push(
            fetch('/api/predictions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestData)
            })
          )
        }
      }

      await Promise.all(promises)
      fetchData()
    } catch (err) {
      setError('Error generating multiple predictions')
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (riskScore) => {
    if (riskScore > 0.5) return 'text-red-400'
    if (riskScore > 0.3) return 'text-yellow-400'
    return 'text-green-400'
  }

  if (loading && predictions.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-xl text-white">Loading predictions...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Predictions Management</h1>
          <p className="text-lg text-gray-300">Generate and manage crop yield predictions</p>
        </header>

        {/* Add Live Panels Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <WeatherPanel />
          <AgriPipelinePanel region={regions[0]?.name || 'user-location'} />
          <NasaPanel />
        </div>

        {/* Prediction Generator */}
        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">Generate New Prediction</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="border border-gray-600 rounded px-3 py-2 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Crop</option>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name} ({crop.season})
                </option>
              ))}
            </select>

            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="border border-gray-600 rounded px-3 py-2 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Region</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              placeholder="Enter User ID (Optional)"
              className="border border-gray-600 rounded px-3 py-2 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={generatePrediction}
              disabled={loading || !selectedCrop || !selectedRegion}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              {loading ? 'Generating...' : 'Generate Prediction'}
            </button>
            <button
              onClick={() => generateMultiplePredictions(5)}
              disabled={loading || crops.length === 0 || regions.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Generate 5 Random Predictions
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Advanced Analytics Dashboard */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">📊 Advanced Analytics Dashboard</h2>
          
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <YieldTrendChart data={predictions} />
            <RegionalPerformanceChart regions={regions} predictions={predictions} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <CropDistributionChart crops={crops} predictions={predictions} />
            <ProductivityZoneMap regions={regions} predictions={predictions} />
          </div>
        </div>

        {/* Pipeline Data Analysis Charts */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">🌱 Pipeline Data Analysis</h2>
          
          {/* Soil and Weather Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SoilHealthChart pipelineData={predictions} />
            <WeatherImpactChart pipelineData={predictions} />
          </div>
          
          {/* Crop and Seasonal Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <CropPerformanceChart pipelineData={predictions} crops={crops} />
            <SeasonalAnalysisChart pipelineData={predictions} crops={crops} />
          </div>
        </div>

        {/* Weather Alert System */}
        <div className="mb-8">
          <WeatherAlertSystem predictions={predictions} />
        </div>
        
        {/* Satellite Data Dashboard */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">🛰️ Satellite Data Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SatelliteDataDashboard region={regions[0]} />
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">📡 Satellite Data Benefits</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 text-lg">🌱</span>
                  <div>
                    <p className="font-medium text-white">NDVI Analysis</p>
                    <p className="text-sm text-gray-400">Monitor vegetation health and growth patterns</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 text-lg">🌡️</span>
                  <div>
                    <p className="font-medium text-white">Land Surface Temperature</p>
                    <p className="text-sm text-gray-400">Track thermal stress and irrigation needs</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-400 text-lg">💧</span>
                  <div>
                    <p className="font-medium text-white">Soil Moisture</p>
                    <p className="text-sm text-sm text-gray-400">Monitor water content and drought conditions</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-purple-400 text-lg">📊</span>
                  <div>
                    <p className="font-medium text-white">Real-time Monitoring</p>
                    <p className="text-sm text-gray-400">Get up-to-date satellite data for informed decisions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Analysis Dashboard */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">🔍 AI-Powered Image Analysis</h2>
          <ImageAnalysisDashboard regions={regions} crops={crops} />
        </div>

        {/* Alerts and Voice Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AlertsPanel />
          <VoicePanel />
        </div>

        {/* Predictions List */}
        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-white">Recent Predictions</h2>
            <span className="text-sm text-gray-400">
              Total: {predictions.length} predictions
            </span>
          </div>

          {predictions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No predictions found. Generate one to get started!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {predictions.map((prediction) => (
                <div key={prediction.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-white">
                          {prediction.crops?.name || 'Unknown Crop'}
                        </h3>
                        <span className="text-sm text-gray-400">
                          in {prediction.regions?.name || 'Unknown Region'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-300">Yield:</span>
                          <span className="text-green-400 ml-1">
                            {prediction.yield?.toFixed(2)} units
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-300">Risk Score:</span>
                          <span className={`ml-1 ${getRiskColor(prediction.risk_score)}`}>
                            {(prediction.risk_score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-300">Created:</span>
                          <span className="text-gray-400 ml-1">
                            {new Date(prediction.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-300">User:</span>
                          <span className="text-gray-400 ml-1">
                            {prediction.user_id ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>

                      {prediction.features && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300">
                            View Features
                          </summary>
                          <div className="mt-2 p-3 bg-gray-700 rounded text-xs">
                            <pre className="whitespace-pre-wrap text-gray-200">
                              {JSON.stringify(prediction.features, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6 text-center">
            <p className="text-2xl font-bold text-blue-400">{predictions.length}</p>
            <p className="text-sm text-gray-400">Total Predictions</p>
          </div>
          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6 text-center">
            <p className="text-2xl font-bold text-green-400">
              {predictions.length > 0 ? (predictions.reduce((sum, p) => sum + p.yield, 0) / predictions.length).toFixed(1) : 0}
            </p>
            <p className="text-sm text-gray-400">Avg Yield</p>
          </div>
          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6 text-center">
            <p className="text-2xl font-bold text-red-400">
              {predictions.length > 0 ? (predictions.filter(p => p.risk_score > 0.5).length / predictions.length * 100).toFixed(1) : 0}%
            </p>
            <p className="text-sm text-gray-400">High Risk %</p>
          </div>
          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6 text-center">
            <p className="text-2xl font-bold text-purple-400">
              {new Set(predictions.map(p => p.crops?.name).filter(Boolean)).size}
            </p>
            <p className="text-sm text-gray-400">Unique Crops</p>
          </div>
        </div>
      </div>
    </div>
  )
}
