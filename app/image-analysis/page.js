'use client'

import { useState, useEffect } from 'react'
import ImageAnalysisDashboard from '../components/ImageAnalysisDashboard'

export default function ImageAnalysisPage() {
  const [regions, setRegions] = useState([])
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [regionsRes, cropsRes] = await Promise.all([
        fetch('/api/regions'),
        fetch('/api/crops')
      ])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading image analysis tools...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-white mb-2">Error Loading Data</h1>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">🔍 AI-Powered Image Analysis</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Upload agricultural images to get instant AI-powered insights on crop health, 
            disease detection, soil analysis, and weed identification
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 text-center">
            <div className="text-4xl mb-3">🌱</div>
            <h3 className="text-lg font-semibold text-white mb-2">Crop Health</h3>
            <p className="text-sm text-gray-400">
              Analyze vegetation density, color patterns, and overall plant health
            </p>
          </div>
          
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 text-center">
            <div className="text-4xl mb-3">🦠</div>
            <h3 className="text-lg font-semibold text-white mb-2">Disease Detection</h3>
            <p className="text-sm text-gray-400">
              Identify early signs of plant diseases and pest infestations
            </p>
          </div>
          
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 text-center">
            <div className="text-4xl mb-3">🌍</div>
            <h3 className="text-lg font-semibold text-white mb-2">Soil Analysis</h3>
            <p className="text-sm text-gray-400">
              Assess soil quality, moisture levels, and fertility indicators
            </p>
          </div>
          
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 text-center">
            <div className="text-4xl mb-3">🌿</div>
            <h3 className="text-lg font-semibold text-white mb-2">Weed Detection</h3>
            <p className="text-sm text-gray-400">
              Detect and classify weed types for targeted control strategies
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-8 mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">🚀 How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📷</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">1. Upload Image</h3>
              <p className="text-sm text-gray-400">
                Drag & drop or select agricultural images from your device
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔬</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">2. AI Analysis</h3>
              <p className="text-sm text-gray-400">
                Our advanced algorithms analyze every pixel for insights
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">3. Get Results</h3>
              <p className="text-sm text-gray-400">
                Receive detailed reports with actionable recommendations
              </p>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <ImageAnalysisDashboard regions={regions} crops={crops} />

        {/* Technical Details */}
        <div className="mt-12 bg-gray-900 rounded-lg border border-gray-700 p-8">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">⚙️ Technical Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">📁 Supported Formats</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>JPEG, PNG, BMP, TIFF</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>Maximum file size: 10MB</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>High-resolution images supported</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">🔬 Analysis Capabilities</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>Color pattern recognition</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>Texture analysis algorithms</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>Machine learning-based classification</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mt-12 bg-gray-900 rounded-lg border border-gray-700 p-8">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">🎯 Use Cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
              <h4 className="text-lg font-semibold text-white mb-3">🌾 Precision Agriculture</h4>
              <p className="text-sm text-gray-400">
                Optimize crop management with data-driven insights from field images
              </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
              <h4 className="text-lg font-semibold text-white mb-3">🏥 Plant Health Monitoring</h4>
              <p className="text-sm text-gray-400">
                Early detection of diseases and stress conditions for timely intervention
              </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
              <h4 className="text-lg font-semibold text-white mb-3">💧 Irrigation Management</h4>
              <p className="text-sm text-gray-400">
                Assess soil moisture and optimize water usage based on visual analysis
              </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
              <h4 className="text-lg font-semibold text-white mb-3">🌿 Weed Control</h4>
              <p className="text-sm text-gray-400">
                Identify weed species and coverage for targeted herbicide application
              </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
              <h4 className="text-lg font-semibold text-white mb-3">📈 Yield Prediction</h4>
              <p className="text-sm text-gray-400">
                Combine image analysis with historical data for yield forecasting
              </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
              <h4 className="text-lg font-semibold text-white mb-3">🔬 Research & Development</h4>
              <p className="text-sm text-gray-400">
                Support agricultural research with quantitative image analysis tools
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
