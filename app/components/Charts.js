'use client'

import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

// Line Chart for Yield Trends Over Time
export const YieldTrendChart = ({ data }) => {
  const chartData = {
    labels: data?.map(d => new Date(d.created_at).toLocaleDateString()) || [],
    datasets: [
      {
        label: 'Yield Prediction',
        data: data?.map(d => d.yield) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6
      },
      {
        label: 'Risk Score',
        data: data?.map(d => d.risk_score * 100) || [],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#ffffff',
          font: { size: 12 }
        }
      },
      title: {
        display: true,
        text: 'Crop Yield Trends & Risk Analysis',
        color: '#ffffff',
        font: { size: 16, weight: 'bold' }
      }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Yield (units)',
          color: '#9ca3af'
        },
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Risk Score (%)',
          color: '#9ca3af'
        },
        ticks: { color: '#9ca3af' },
        grid: { display: false }
      }
    }
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <Line data={chartData} options={options} />
    </div>
  )
}

// Bar Chart for Regional Performance
export const RegionalPerformanceChart = ({ regions, predictions }) => {
  const regionData = regions?.map(region => {
    const regionPredictions = predictions?.filter(p => p.region_id === region.id) || []
    const avgYield = regionPredictions.length > 0 
      ? regionPredictions.reduce((sum, p) => sum + p.yield, 0) / regionPredictions.length 
      : 0
    return {
      name: region.name,
      avgYield: avgYield,
      predictionCount: regionPredictions.length
    }
  }) || []

  const chartData = {
    labels: regionData.map(r => r.name),
    datasets: [
      {
        label: 'Average Yield (units)',
        data: regionData.map(r => r.avgYield),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        borderRadius: 4
      },
      {
        label: 'Number of Predictions',
        data: regionData.map(r => r.predictionCount),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 2,
        borderRadius: 4
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#ffffff' }
      },
      title: {
        display: true,
        text: 'Regional Performance Analysis',
        color: '#ffffff',
        font: { size: 16, weight: 'bold' }
      }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      },
      y: {
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      }
    }
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <Bar data={chartData} options={options} />
    </div>
  )
}

// Doughnut Chart for Crop Distribution
export const CropDistributionChart = ({ crops, predictions }) => {
  const cropData = crops?.map(crop => {
    const cropPredictions = predictions?.filter(p => p.crop_id === crop.id) || []
    return {
      name: crop.name,
      count: cropPredictions.length,
      avgYield: cropPredictions.length > 0 
        ? cropPredictions.reduce((sum, p) => sum + p.yield, 0) / cropPredictions.length 
        : 0
    }
  }).filter(crop => crop.count > 0) || []

  const chartData = {
    labels: cropData.map(c => c.name),
    datasets: [
      {
        data: cropData.map(c => c.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
          'rgb(147, 51, 234)',
          'rgb(236, 72, 153)'
        ],
        borderWidth: 2
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#ffffff' }
      },
      title: {
        display: true,
        text: 'Crop Distribution & Predictions',
        color: '#ffffff',
        font: { size: 16, weight: 'bold' }
      }
    }
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

// Productivity Zone Heatmap Component
export const ProductivityZoneMap = ({ regions, predictions }) => {
  const getProductivityScore = (region) => {
    const regionPredictions = predictions?.filter(p => p.region_id === region.id) || []
    if (regionPredictions.length === 0) return 0
    
    const avgYield = regionPredictions.reduce((sum, p) => sum + p.yield, 0) / regionPredictions.length
    const avgRisk = regionPredictions.reduce((sum, p) => sum + p.risk_score, 0) / regionPredictions.length
    
    // Calculate productivity score (0-100)
    const yieldScore = Math.min(avgYield / 100 * 50, 50) // Max 50 points for yield
    const riskScore = (1 - avgRisk) * 50 // Max 50 points for low risk
    
    return Math.round(yieldScore + riskScore)
  }

  const getZoneColor = (score) => {
    if (score >= 80) return 'bg-green-600'
    if (score >= 60) return 'bg-green-500'
    if (score >= 40) return 'bg-yellow-500'
    if (score >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">Productivity Zones</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {regions?.map(region => {
          const score = getProductivityScore(region)
          return (
            <div key={region.id} className="text-center">
              <div className={`${getZoneColor(score)} p-4 rounded-lg text-white font-bold text-lg mb-2`}>
                {score}
              </div>
              <p className="text-gray-300 text-sm">{region.name}</p>
              <p className="text-gray-400 text-xs">Productivity Score</p>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span className="text-gray-300">High (80-100)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-gray-300">Medium (40-79)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-300">Low (0-39)</span>
        </div>
      </div>
    </div>
  )
}

// Weather Alert Component
export const WeatherAlertSystem = ({ predictions }) => {
  const getWeatherAlerts = () => {
    const alerts = []
    
    predictions?.forEach(prediction => {
      const features = prediction.features
      
      // Temperature alerts
      if (features?.temperature > 35) {
        alerts.push({
          type: 'High Temperature',
          severity: 'high',
          message: `Temperature ${features.temperature}°C exceeds safe limit for ${prediction.crops?.name}`,
          region: prediction.regions?.name
        })
      }
      
      // Humidity alerts
      if (features?.humidity > 80) {
        alerts.push({
          type: 'High Humidity',
          severity: 'medium',
          message: `High humidity (${features.humidity}%) may increase disease risk`,
          region: prediction.regions?.name
        })
      }
      
      // Rainfall alerts
      if (features?.rainfall > 200) {
        alerts.push({
          type: 'Heavy Rainfall',
          severity: 'high',
          message: `Heavy rainfall (${features.rainfall}mm) may cause flooding`,
          region: prediction.regions?.name
        })
      }
      
      // Soil alerts
      if (features?.nitrogen < 25) {
        alerts.push({
          type: 'Low Nitrogen',
          severity: 'medium',
          message: `Nitrogen levels (${features.nitrogen}) are below optimal range`,
          region: prediction.regions?.name
        })
      }
    })
    
    return alerts.slice(0, 5) // Show top 5 alerts
  }

  const alerts = getWeatherAlerts()
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'border-red-500 bg-red-900'
      case 'medium': return 'border-yellow-500 bg-yellow-900'
      case 'low': return 'border-blue-500 bg-blue-900'
      default: return 'border-gray-500 bg-gray-900'
    }
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">🌦️ Weather Alert System</h3>
      {alerts.length === 0 ? (
        <p className="text-gray-400 text-center py-4">No weather alerts at this time</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div key={index} className={`p-3 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-white">{alert.type}</h4>
                  <p className="text-gray-300 text-sm">{alert.message}</p>
                  <p className="text-gray-400 text-xs mt-1">Region: {alert.region}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  alert.severity === 'high' ? 'bg-red-600 text-white' :
                  alert.severity === 'medium' ? 'bg-yellow-600 text-white' :
                  'bg-blue-600 text-white'
                }`}>
                  {alert.severity.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
