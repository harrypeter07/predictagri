'use client'

import { useState, useEffect } from 'react'
import Navigation from './components/Navigation'
import Link from 'next/link'
import { 
  YieldTrendChart, 
  RegionalPerformanceChart, 
  CropDistributionChart, 
  ProductivityZoneMap, 
  WeatherAlertSystem 
} from './components/Charts'
import EnhancedFarmerAnalysis from './components/EnhancedFarmerAnalysis'
import AgriPipelinePanel from './components/AgriPipelinePanel'

export default function Home() {
  const [predictions, setPredictions] = useState([])
  const [regions, setRegions] = useState([])
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Fetch data on component mount
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
    }
  }

  const generateRealTimePrediction = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Import location service dynamically (client-side only)
      const { locationService } = await import('../lib/locationService')
      
      // Get user's current location
      const userLocation = await locationService.getLocationWithFallback()
      
      // Get real-time weather data for the user's location
      const weatherData = await locationService.getCurrentLocationWeather()
      
      // Create prediction data based on real location and weather
      const realTimeData = {
        userId: `user-${Date.now()}`, // Generate unique user ID
        cropId: 'crop-default', // This could be selected by user
        regionId: `region-${userLocation.lat.toFixed(2)}-${userLocation.lon.toFixed(2)}`,
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
          // Generate estimated soil data based on location and weather
          soil_moisture: Math.max(0.2, Math.min(0.8, 
            (weatherData.weather?.current?.relative_humidity_2m || 65) / 100 * 0.7
          )),
          nitrogen: 40 + Math.random() * 20, // Estimated, could be improved with soil data APIs
          phosphorus: 25 + Math.random() * 15,
          potassium: 20 + Math.random() * 15,
          ph: 6.0 + Math.random() * 2
        },
        timestamp: new Date().toISOString()
      }

      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(realTimeData)
      })

      const data = await response.json()
      
      if (response.ok) {
        setResult({
          ...data,
          location: userLocation,
          weather: weatherData.weather
        })
        // Refresh predictions list
        fetchData()
      } else {
        setError(data.error || 'Failed to generate prediction')
      }
    } catch (err) {
      console.error('Real-time prediction error:', err)
      setError(`Error generating real-time prediction: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Link href="/predictions" className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg text-center transition-colors border border-blue-500">
                <div className="text-3xl mb-2">📊</div>
                <h3 className="font-semibold">Generate Predictions</h3>
                <p className="text-sm opacity-90">Create new crop yield predictions using ONNX ML model</p>
              </Link>
              
              <Link href="/regions" className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg text-center transition-colors border border-green-500">
                <div className="text-3xl mb-2">🗺️</div>
                <h3 className="font-semibold">Manage Regions</h3>
                <p className="text-sm opacity-90">Add and manage agricultural regions</p>
              </Link>
              
              <Link href="/crops" className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg text-center transition-colors border border-purple-500">
                <div className="text-3xl mb-2">🌾</div>
                <h3 className="font-semibold">Manage Crops</h3>
                <p className="text-sm opacity-90">Add and manage crop types</p>
              </Link>
              
              <div className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg text-center transition-colors cursor-pointer border border-blue-500" onClick={generateRealTimePrediction}>
                <div className="text-3xl mb-2">📍</div>
                <h3 className="font-semibold">Real-Time Prediction</h3>
                <p className="text-sm opacity-90">Generate prediction using your location</p>
              </div>
              
              <Link href="/onnx-test" className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg text-center transition-colors border border-purple-500">
                <div className="text-3xl mb-2">🤖</div>
                <h3 className="font-semibold">ONNX Model Test</h3>
                <p className="text-sm opacity-90">Test the machine learning model directly</p>
              </Link>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded">
                {error}
              </div>
            )}

            {result && (
              <div className="mb-4 p-4 bg-green-900 border border-green-700 rounded">
                <h3 className="font-semibold text-green-200 mb-2">✅ Test Prediction Generated!</h3>
                <div className="space-y-1 text-sm text-green-300">
                  <p><strong>Yield:</strong> {result.yield?.toFixed(2)} units</p>
                  <p><strong>Risk Score:</strong> {(result.risk_score * 100).toFixed(1)}%</p>
                  <p><strong>Created:</strong> {new Date(result.created_at).toLocaleString()}</p>
                </div>
              </div>
            )}

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

            {/* Weather Alert System */}
            <div className="mb-8">
              <WeatherAlertSystem predictions={predictions} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Predictions */}
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold text-white">Recent Predictions</h2>
                  <Link href="/predictions" className="text-blue-400 hover:text-blue-300 text-sm">
                    View All →
                  </Link>
                </div>
                
                {predictions.length === 0 ? (
                  <p className="text-gray-400">No predictions yet. Generate one to see results!</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {predictions.slice(0, 5).map((prediction) => (
                      <div key={prediction.id} className="border border-gray-700 rounded p-3 bg-gray-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white">
                              {prediction.crops?.name || 'Unknown Crop'}
                            </p>
                            <p className="text-sm text-gray-400">
                              {prediction.regions?.name || 'Unknown Region'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-400">
                              {prediction.yield?.toFixed(1)} yield
                            </p>
                            <p className="text-sm text-red-400">
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

              {/* System Status */}
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
                <h2 className="text-2xl font-semibold mb-4 text-white">System Status</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-900 rounded border border-blue-700">
                    <span className="font-medium text-blue-200">Total Predictions</span>
                    <span className="text-2xl font-bold text-blue-400">{predictions.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-900 rounded border border-green-700">
                    <span className="font-medium text-green-200">Regions Available</span>
                    <span className="text-2xl font-bold text-green-400">{regions.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-900 rounded border border-purple-700">
                    <span className="font-medium text-purple-200">Crops Supported</span>
                    <span className="text-2xl font-bold text-purple-400">{crops.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-900 rounded border border-orange-700">
                    <span className="font-medium text-orange-200">Database Status</span>
                    <span className="text-green-400 font-semibold">✅ Connected</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-indigo-900 rounded border border-indigo-700">
                    <span className="font-medium text-indigo-200">ML Model Status</span>
                    <span className="text-yellow-400 font-semibold">🔄 Ready for Integration</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="mt-8 bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
              <h2 className="text-2xl font-semibold mb-4 text-white">🚀 Getting Started</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-white">1. Add Sample Data</h3>
                  <p className="text-gray-300 mb-3">Start by adding regions and crops to your database:</p>
                  <div className="space-y-2">
                    <Link href="/regions" className="block text-blue-400 hover:text-blue-300">
                      → Add Regions (with sample data)
                    </Link>
                    <Link href="/crops" className="block text-blue-400 hover:text-blue-300">
                      → Add Crops (with sample data)
                    </Link>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-white">2. Generate Predictions</h3>
                  <p className="text-gray-300 mb-3">Create predictions using the advanced interface:</p>
                  <Link href="/predictions" className="block text-blue-400 hover:text-blue-300">
                    → Go to Predictions Page
                  </Link>
                </div>
              </div>
            </div>

            {/* Features Overview */}
            <div className="mt-8 bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
              <h2 className="text-2xl font-semibold mb-4 text-white">🎯 AgriPredict Features Implemented</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-semibold text-green-400 mb-2">✅ Automated Pipeline</h3>
                  <p className="text-gray-300 text-sm">Soil quality, weather, and satellite data import system</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-semibold text-blue-400 mb-2">✅ ML Model Ready</h3>
                  <p className="text-gray-300 text-sm">Prediction system with region-wise crop analysis</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-semibold text-purple-400 mb-2">✅ Farmer Dashboard</h3>
                  <p className="text-gray-300 text-sm">Advanced visualizations with line charts and heatmaps</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-semibold text-yellow-400 mb-2">✅ Warning System</h3>
                  <p className="text-gray-300 text-sm">Weather-driven alerts for pests, drought, and floods</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-semibold text-indigo-400 mb-2">✅ Demo Flow</h3>
                  <p className="text-gray-300 text-sm">Complete prediction workflow from input to output</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-semibold text-pink-400 mb-2">✅ Productivity Zones</h3>
                  <p className="text-gray-300 text-sm">Geographic analysis with productivity scoring</p>
                </div>
              </div>
            </div>
          </>
        )
      
      case 'farmer-analysis':
        return <EnhancedFarmerAnalysis />
      
      case 'pipeline':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-green-400 mb-2">🚀 Enhanced Automated Pipeline</h2>
              <p className="text-lg text-gray-300">Advanced agricultural data processing with farmer analysis integration</p>
            </div>
            
            <AgriPipelinePanel region="maharashtra" />
            
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">🔧 Pipeline Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <h4 className="font-medium text-white mb-2">Data Sources:</h4>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Google Earth Engine Satellite Data</li>
                    <li>Weather APIs (Open-Meteo)</li>
                    <li>NASA Agricultural Insights</li>
                    <li>Image Processing & Analysis</li>
                    <li>Soil Quality Assessment</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">Analysis Capabilities:</h4>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Crop Suitability Analysis</li>
                    <li>Water Management Assessment</li>
                    <li>Pest Risk Evaluation</li>
                    <li>Yield Potential Prediction</li>
                    <li>Climate Adaptation Strategies</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-green-400 mb-2">🌱 PredictAgri Dashboard</h1>
            <p className="text-lg text-gray-300">AI/ML Solution for Crop Yield Prediction with Advanced Analytics</p>
          </header>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-8 max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('farmer-analysis')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'farmer-analysis'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              🚜 Farmer Analysis
            </button>
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'pipeline'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              🚀 Pipeline
            </button>
          </div>

          {/* Tab Content */}
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
