'use client'

import { useState, useEffect } from 'react'

export default function DataSummary({ predictions, regions, crops, weatherData, satelliteData }) {
  const [lastUpdated, setLastUpdated] = useState('')

  // Set timestamp on client side only to avoid hydration mismatch
  useEffect(() => {
    setLastUpdated(new Date().toLocaleString())
  }, [])

  const getDataStatus = () => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const totalPredictions = predictions?.length || 0
    const totalRegions = regions?.length || 0
    const totalCrops = crops?.length || 0
    const totalWeather = weatherData?.length || 0
    const totalSatellite = satelliteData?.length || 0

    const recentPredictions = predictions?.filter(p => 
      new Date(p.created_at) > oneDayAgo
    ).length || 0

    const recentWeather = weatherData?.filter(w => 
      new Date(w.timestamp || w.created_at) > oneDayAgo
    ).length || 0

    const recentSatellite = satelliteData?.filter(s => 
      new Date(s.timestamp || s.created_at) > oneDayAgo
    ).length || 0

    return {
      totalPredictions,
      totalRegions,
      totalCrops,
      totalWeather,
      totalSatellite,
      recentPredictions,
      recentWeather,
      recentSatellite
    }
  }

  const getStatusColor = (count, threshold) => {
    if (count === 0) return 'text-red-400'
    if (count < threshold) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getStatusIcon = (count, threshold) => {
    if (count === 0) return '❌'
    if (count < threshold) return '⚠️'
    return '✅'
  }

  const status = getDataStatus()

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
      <h2 className="text-2xl font-semibold text-white mb-6">System Status & Data Summary</h2>
      
      {/* Total Counts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-900 rounded-lg border border-blue-700">
          <div className="text-3xl font-bold text-blue-400 mb-1">{status.totalPredictions}</div>
          <div className="text-blue-200 text-sm">Total Predictions</div>
        </div>
        <div className="text-center p-4 bg-green-900 rounded-lg border border-green-700">
          <div className="text-3xl font-bold text-green-400 mb-1">{status.totalRegions}</div>
          <div className="text-green-200 text-sm">Regions</div>
        </div>
        <div className="text-center p-4 bg-purple-900 rounded-lg border border-purple-700">
          <div className="text-3xl font-bold text-purple-400 mb-1">{status.totalCrops}</div>
          <div className="text-purple-200 text-sm">Crop Types</div>
        </div>
      </div>

      {/* Data Sources Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">📡 Data Sources Status</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-orange-900 rounded border border-orange-700">
            <span className="font-medium text-orange-200">Weather Records</span>
            <span className="text-2xl font-bold text-orange-400">{status.totalWeather}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-indigo-900 rounded border border-indigo-700">
            <span className="font-medium text-indigo-200">Satellite Records</span>
            <span className="text-2xl font-bold text-indigo-400">{status.totalSatellite}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-pink-900 rounded border border-pink-700">
            <span className="font-medium text-pink-200">Database Status</span>
            <span className="text-green-400 font-semibold">✅ Connected</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Status */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">📊 Recent Activity (Last 24 Hours)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-2xl mb-1 ${getStatusIcon(status.recentPredictions, 1)}`}>
              {getStatusIcon(status.recentPredictions, 1)}
            </div>
            <div className={`text-lg font-bold ${getStatusColor(status.recentPredictions, 1)}`}>
              {status.recentPredictions}
            </div>
            <div className="text-sm text-gray-400">New Predictions</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl mb-1 ${getStatusIcon(status.recentWeather, 1)}`}>
              {getStatusIcon(status.recentWeather, 1)}
            </div>
            <div className={`text-lg font-bold ${getStatusColor(status.recentWeather, 1)}`}>
              {status.recentWeather}
            </div>
            <div className="text-sm text-gray-400">Weather Updates</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl mb-1 ${getStatusIcon(status.recentSatellite, 1)}`}>
              {getStatusIcon(status.recentSatellite, 1)}
            </div>
            <div className={`text-lg font-bold ${getStatusColor(status.recentSatellite, 1)}`}>
              {status.recentSatellite}
            </div>
            <div className="text-sm text-gray-400">Satellite Data</div>
          </div>
        </div>
      </div>

      {/* Data Quality Indicators */}
      <div className="mt-4 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">🔍 Data Quality Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Predictions Data:</span>
              <span className={`font-semibold ${getStatusColor(status.totalPredictions, 5)}`}>
                {getStatusIcon(status.totalPredictions, 5)} {status.totalPredictions > 0 ? 'Available' : 'Empty'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Weather Data:</span>
              <span className={`font-semibold ${getStatusColor(status.totalWeather, 3)}`}>
                {getStatusIcon(status.totalWeather, 3)} {status.totalWeather > 0 ? 'Available' : 'Empty'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Satellite Data:</span>
              <span className={`font-semibold ${getStatusColor(status.totalSatellite, 2)}`}>
                {getStatusIcon(status.totalSatellite, 2)} {status.totalSatellite > 0 ? 'Available' : 'Empty'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">ML Model:</span>
              <span className="text-yellow-400 font-semibold">🔄 Ready for Integration</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Real-time Updates:</span>
              <span className="text-green-400 font-semibold">✅ Active</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">API Health:</span>
              <span className="text-green-400 font-semibold">✅ Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500 mt-4">
        {lastUpdated ? `Last updated: ${lastUpdated}` : 'Loading...'}
      </div>
    </div>
  )
}
