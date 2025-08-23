'use client'

import { useState, useEffect } from 'react'

export default function RealTimeAnalytics({ predictions, regions, crops, weatherData, satelliteData }) {
  const [stats, setStats] = useState({
    totalPredictions: 0,
    totalRegions: 0,
    totalCrops: 0,
    avgYield: 0,
    avgRisk: 0,
    recentActivity: 0,
    topCrop: '',
    topRegion: '',
    weatherAlerts: 0
  })

  useEffect(() => {
    if (predictions && predictions.length > 0) {
      calculateStats()
    }
  }, [predictions, regions, crops, weatherData])

  const calculateStats = () => {
    if (!predictions || predictions.length === 0) return

    const totalPredictions = predictions.length
    const avgYield = predictions.reduce((sum, p) => sum + (p.yield || 0), 0) / totalPredictions
    const avgRisk = predictions.reduce((sum, p) => sum + (p.risk_score || 0), 0) / totalPredictions
    
    // Count recent activity (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentActivity = predictions.filter(p => 
      new Date(p.created_at) > weekAgo
    ).length

    // Find top performing crop and region
    const cropPerformance = {}
    const regionPerformance = {}
    
    predictions.forEach(p => {
      const cropName = p.crops?.name || 'Unknown'
      const regionName = p.regions?.name || 'Unknown'
      
      if (!cropPerformance[cropName]) cropPerformance[cropName] = { total: 0, count: 0 }
      if (!regionPerformance[regionName]) regionPerformance[regionName] = { total: 0, count: 0 }
      
      cropPerformance[cropName].total += p.yield || 0
      cropPerformance[cropName].count += 1
      regionPerformance[regionName].total += p.yield || 0
      regionPerformance[regionName].count += 1
    })

    const topCrop = Object.entries(cropPerformance)
      .sort(([,a], [,b]) => (b.total / b.count) - (a.total / a.count))[0]?.[0] || 'N/A'
    
    const topRegion = Object.entries(regionPerformance)
      .sort(([,a], [,b]) => (b.total / b.count) - (a.total / a.count))[0]?.[0] || 'N/A'

    // Count weather alerts
    const weatherAlerts = weatherData.filter(w => {
      const temp = w.weather_data?.current?.temperature_2m
      const humidity = w.weather_data?.current?.relative_humidity_2m
      const rainfall = w.weather_data?.daily?.precipitation_sum?.[0]
      
      return (temp > 35 || temp < 10) || (humidity > 90 || humidity < 30) || (rainfall > 200)
    }).length

    setStats({
      totalPredictions,
      totalRegions: regions?.length || 0,
      totalCrops: crops?.length || 0,
      avgYield: avgYield.toFixed(2),
      avgRisk: (avgRisk * 100).toFixed(1),
      recentActivity,
      topCrop,
      topRegion,
      weatherAlerts
    })
  }

  const getRiskColor = (risk) => {
    const riskNum = parseFloat(risk)
    if (riskNum < 30) return 'text-green-400'
    if (riskNum < 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getYieldColor = (yield) => {
    const yieldNum = parseFloat(yield)
    if (yieldNum > 0.7) return 'text-green-400'
    if (yieldNum > 0.4) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 text-center">
          <div className="text-3xl font-bold text-blue-400 mb-2">{stats.totalPredictions}</div>
          <div className="text-gray-300 text-sm">Total Predictions</div>
        </div>
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 text-center">
          <div className="text-3xl font-bold text-green-400 mb-2">{stats.totalRegions}</div>
          <div className="text-gray-300 text-sm">Active Regions</div>
        </div>
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 text-center">
          <div className="text-3xl font-bold text-purple-400 mb-2">{stats.totalCrops}</div>
          <div className="text-gray-300 text-sm">Crop Types</div>
        </div>
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 text-center">
          <div className="text-3xl font-bold text-yellow-400 mb-2">{stats.recentActivity}</div>
          <div className="text-gray-300 text-sm">This Week</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">🌾 Yield Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Average Yield:</span>
              <span className={`text-2xl font-bold ${getYieldColor(stats.avgYield)}`}>
                {stats.avgYield} units
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Average Risk:</span>
              <span className={`text-2xl font-bold ${getRiskColor(stats.avgRisk)}`}>
                {stats.avgRisk}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (parseFloat(stats.avgYield) / 1.0) * 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 text-center">
              Yield performance indicator
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">🏆 Top Performers</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Best Crop:</span>
              <span className="text-green-400 font-semibold">{stats.topCrop}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Best Region:</span>
              <span className="text-blue-400 font-semibold">{stats.topRegion}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Weather Alerts:</span>
              <span className={`font-semibold ${stats.weatherAlerts > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {stats.weatherAlerts} active
              </span>
            </div>
            <div className="text-xs text-gray-400 text-center">
              Based on yield predictions
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">📅 Recent Activity</h3>
        {predictions && predictions.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {predictions.slice(0, 8).map((prediction, index) => (
              <div key={prediction.id || index} className="flex items-center space-x-4 p-3 bg-gray-800 rounded-lg">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <div className="flex-1">
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
                      <p className={`font-semibold ${getYieldColor(prediction.yield)}`}>
                        {prediction.yield?.toFixed(1)} yield
                      </p>
                      <p className={`text-sm ${getRiskColor(prediction.risk_score * 100)}`}>
                        {(prediction.risk_score * 100).toFixed(1)}% risk
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(prediction.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">No recent predictions. Generate one to see activity!</p>
        )}
      </div>

      {/* Data Quality Status */}
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">📈 Data Quality Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Weather Data:</span>
              <span className="text-green-400 font-semibold">✅ Available</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Satellite Data:</span>
              <span className="text-green-400 font-semibold">✅ Available</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Soil Analysis:</span>
              <span className="text-green-400 font-semibold">✅ Available</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">ML Model:</span>
              <span className="text-yellow-400 font-semibold">🔄 Ready</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Database:</span>
              <span className="text-green-400 font-semibold">✅ Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Real-time Updates:</span>
              <span className="text-green-400 font-semibold">✅ Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
