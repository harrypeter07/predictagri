'use client'

import { Line, Bar, Doughnut, Radar, Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
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
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
)

// Line Chart for Yield Trends Over Time
export const YieldTrendChart = ({ predictions }) => {
  // Process real data from database
  const processedData = predictions && Array.isArray(predictions) && predictions.length > 0 ? predictions : []
  
  // Sort data by creation date for proper trend visualization
  const sortedData = processedData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  
  const chartData = {
    labels: sortedData.map(d => new Date(d.created_at).toLocaleDateString()) || [],
    datasets: [
      {
        label: 'Yield Prediction',
        data: sortedData.map(d => d.yield) || [],
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
        label: 'Risk Score (%)',
        data: sortedData.map(d => (d.risk_score * 100).toFixed(1)) || [],
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
        text: processedData.length > 0 ? 'Crop Yield Trends & Risk Analysis' : 'No Yield Data Available',
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

  if (processedData.length === 0) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">📈 Yield Trends</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No yield data available</p>
            <p className="text-gray-500 text-sm">Generate predictions to see yield trends</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <Line data={chartData} options={options} />
    </div>
  )
}

// Bar Chart for Regional Performance
export const RegionalPerformanceChart = ({ regions, predictions }) => {
  // Process real data from database
  const processedRegions = regions && Array.isArray(regions) && regions.length > 0 ? regions : []
  const processedPredictions = predictions && Array.isArray(predictions) && predictions.length > 0 ? predictions : []
  
  const regionData = processedRegions.map(region => {
    const regionPredictions = processedPredictions.filter(p => p.region_id === region.id) || []
    const avgYield = regionPredictions.length > 0 
      ? regionPredictions.reduce((sum, p) => sum + (p.yield || 0), 0) / regionPredictions.length 
      : 0
    const avgRisk = regionPredictions.length > 0
      ? regionPredictions.reduce((sum, p) => sum + (p.risk_score || 0), 0) / regionPredictions.length
      : 0
    return {
      name: region.name,
      avgYield: avgYield,
      avgRisk: avgRisk,
      predictionCount: regionPredictions.length
    }
  }).filter(region => region.predictionCount > 0) || []

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
        label: 'Average Risk Score (%)',
        data: regionData.map(r => (r.avgRisk * 100).toFixed(1)),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
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
        text: processedPredictions.length > 0 ? 'Regional Performance Analysis' : 'No Regional Data Available',
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

  if (processedPredictions.length === 0) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">🌍 Regional Performance</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No regional performance data available</p>
            <p className="text-gray-500 text-sm">Generate predictions to see regional analysis</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <Bar data={chartData} options={options} />
    </div>
  )
}

// Doughnut Chart for Crop Distribution
export const CropDistributionChart = ({ crops, predictions }) => {
  // Process real data from database
  const processedCrops = crops && Array.isArray(crops) && crops.length > 0 ? crops : []
  const processedPredictions = predictions && Array.isArray(predictions) && predictions.length > 0 ? predictions : []
  
  const cropData = processedCrops.map(crop => {
    const cropPredictions = processedPredictions.filter(p => p.crop_id === crop.id) || []
    return {
      name: crop.name,
      count: cropPredictions.length,
      avgYield: cropPredictions.length > 0 
        ? cropPredictions.reduce((sum, p) => sum + (p.yield || 0), 0) / cropPredictions.length 
        : 0,
      avgRisk: cropPredictions.length > 0
        ? cropPredictions.reduce((sum, p) => sum + (p.risk_score || 0), 0) / cropPredictions.length
        : 0
    }
  }).filter(crop => crop.count > 0) || []

  const chartData = {
    labels: cropData.map(c => c.name),
    datasets: [
      {
        data: cropData.map(c => c.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)',
          'rgba(83, 102, 255, 0.8)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
          'rgba(83, 102, 255, 1)'
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
        text: processedPredictions.length > 0 ? 'Crop Distribution Analysis' : 'No Crop Data Available',
        color: '#ffffff',
        font: { size: 16, weight: 'bold' }
      }
    }
  }

  if (processedPredictions.length === 0) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">🌾 Crop Distribution</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No crop distribution data available</p>
            <p className="text-gray-500 text-sm">Generate predictions to see crop analysis</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

// Enhanced Prediction Trends Chart
export const PredictionTrendsChart = ({ predictions, crops, regions }) => {
  const processedPredictions = predictions && Array.isArray(predictions) && predictions.length > 0 ? predictions : []
  const processedCrops = crops && Array.isArray(crops) && crops.length > 0 ? crops : []
  const processedRegions = regions && Array.isArray(regions) && regions.length > 0 ? regions : []
  
  if (processedPredictions.length === 0) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">📊 Prediction Trends</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No prediction data available</p>
            <p className="text-gray-500 text-sm">Generate predictions to see trends</p>
          </div>
        </div>
      </div>
    )
  }

  // Sort predictions by date
  const sortedPredictions = processedPredictions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  
  // Group by crop for trend analysis
  const cropTrends = processedCrops.map(crop => {
    const cropPredictions = sortedPredictions.filter(p => p.crop_id === crop.id)
    return {
      name: crop.name,
      predictions: cropPredictions,
      avgYield: cropPredictions.length > 0 
        ? cropPredictions.reduce((sum, p) => sum + (p.yield || 0), 0) / cropPredictions.length 
        : 0,
      avgRisk: cropPredictions.length > 0
        ? cropPredictions.reduce((sum, p) => sum + (p.risk_score || 0), 0) / cropPredictions.length
        : 0
    }
  }).filter(crop => crop.predictions.length > 0)

  const chartData = {
    labels: sortedPredictions.map(p => new Date(p.created_at).toLocaleDateString()),
    datasets: [
      {
        label: 'Yield Predictions',
        data: sortedPredictions.map(p => p.yield),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      },
      {
        label: 'Risk Scores (%)',
        data: sortedPredictions.map(p => (p.risk_score * 100).toFixed(1)),
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
        text: 'Prediction Trends Over Time',
        color: '#ffffff',
        font: { size: 16, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          afterBody: function(context) {
            const index = context[0].dataIndex
            const prediction = sortedPredictions[index]
            if (prediction) {
              const crop = processedCrops.find(c => c.id === prediction.crop_id)
              const region = processedRegions.find(r => r.id === prediction.region_id)
              return [
                `Crop: ${crop?.name || 'Unknown'}`,
                `Region: ${region?.name || 'Unknown'}`,
                `Date: ${new Date(prediction.created_at).toLocaleString()}`
              ]
            }
            return []
          }
        }
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

// NEW: Soil Health Analysis Chart
export const SoilHealthChart = ({ pipelineData }) => {
  const processSoilData = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null
    
    const soilMetrics = data.map(item => {
      const features = item.features || {}
      return {
        nitrogen: features.nitrogen || features.soil_n || 0,
        phosphorus: features.phosphorus || features.soil_p || 0,
        potassium: features.potassium || features.soil_k || 0,
        ph: features.ph || 7,
        moisture: features.soil_moisture || 0.5,
        temperature: features.temperature || 25
      }
    })

    // Calculate averages
    const avgMetrics = {
      nitrogen: soilMetrics.reduce((sum, m) => sum + m.nitrogen, 0) / soilMetrics.length,
      phosphorus: soilMetrics.reduce((sum, m) => sum + m.phosphorus, 0) / soilMetrics.length,
      potassium: soilMetrics.reduce((sum, m) => sum + m.potassium, 0) / soilMetrics.length,
      ph: soilMetrics.reduce((sum, m) => sum + m.ph, 0) / soilMetrics.length,
      moisture: soilMetrics.reduce((sum, m) => sum + m.moisture, 0) / soilMetrics.length * 100,
      temperature: soilMetrics.reduce((sum, m) => sum + m.temperature, 0) / soilMetrics.length
    }

    // Calculate optimal ranges based on actual data patterns
    const maxValues = {
      nitrogen: Math.max(...soilMetrics.map(m => m.nitrogen)),
      phosphorus: Math.max(...soilMetrics.map(m => m.phosphorus)),
      potassium: Math.max(...soilMetrics.map(m => m.potassium)),
      ph: Math.max(...soilMetrics.map(m => m.ph)),
      moisture: Math.max(...soilMetrics.map(m => m.moisture)),
      temperature: Math.max(...soilMetrics.map(m => m.temperature))
    }
    
    const minValues = {
      nitrogen: Math.min(...soilMetrics.map(m => m.nitrogen)),
      phosphorus: Math.min(...soilMetrics.map(m => m.phosphorus)),
      potassium: Math.min(...soilMetrics.map(m => m.potassium)),
      ph: Math.min(...soilMetrics.map(m => m.ph)),
      moisture: Math.min(...soilMetrics.map(m => m.moisture)),
      temperature: Math.min(...soilMetrics.map(m => m.temperature))
    }

    return {
      labels: ['Nitrogen', 'Phosphorus', 'Potassium', 'pH', 'Moisture (%)', 'Temperature (°C)'],
      datasets: [
        {
          label: 'Current Levels',
          data: [
            avgMetrics.nitrogen,
            avgMetrics.phosphorus,
            avgMetrics.potassium,
            avgMetrics.ph,
            avgMetrics.moisture,
            avgMetrics.temperature
          ],
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(34, 197, 94)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6
        },
        {
          label: 'Data Range (Min-Max)',
          data: [
            (minValues.nitrogen + maxValues.nitrogen) / 2,
            (minValues.phosphorus + maxValues.phosphorus) / 2,
            (minValues.potassium + maxValues.potassium) / 2,
            (minValues.ph + maxValues.ph) / 2,
            (minValues.moisture + maxValues.moisture) / 2,
            (minValues.temperature + maxValues.temperature) / 2
          ],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6
        }
      ]
    }
  }

  const chartData = processSoilData(pipelineData)
  
  if (!chartData) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">🌱 Soil Health Analysis</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No soil data available</p>
            <p className="text-gray-500 text-sm">Generate predictions or run pipeline to see soil analysis</p>
          </div>
        </div>
      </div>
    )
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
        text: 'Soil Health Analysis',
        color: '#ffffff',
        font: { size: 16, weight: 'bold' }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' },
        pointLabels: { color: '#9ca3af' }
      }
    }
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <Radar data={chartData} options={options} />
    </div>
  )
}

// NEW: Weather Impact Analysis Chart
export const WeatherImpactChart = ({ pipelineData }) => {
  const processWeatherData = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null
    
    const weatherMetrics = data.map(item => {
      const features = item.features || {}
      return {
        temperature: features.temperature || 25,
        humidity: features.humidity || 65,
        rainfall: features.rainfall || 0,
        windSpeed: features.wind_speed || 5,
        yield: item.yield || 0,
        risk: item.risk_score || 0
      }
    })

    return {
      datasets: [
        {
          label: 'Temperature vs Yield',
          data: weatherMetrics.map(m => ({
            x: m.temperature,
            y: m.yield
          })),
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1
        },
        {
          label: 'Humidity vs Risk',
          data: weatherMetrics.map(m => ({
            x: m.humidity,
            y: m.risk * 100
          })),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }
      ]
    }
  }

  const chartData = processWeatherData(pipelineData)
  
  if (!chartData) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">🌤️ Weather Impact Analysis</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No weather impact data available</p>
            <p className="text-gray-500 text-sm">Generate predictions or run pipeline to see weather analysis</p>
          </div>
        </div>
      </div>
    )
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
        text: 'Weather Impact Analysis',
        color: '#ffffff',
        font: { size: 16, weight: 'bold' }
      }
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'Temperature (°C) / Humidity (%)',
          color: '#9ca3af'
        },
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      },
      y: {
        title: {
          display: true,
          text: 'Yield / Risk Score',
          color: '#9ca3af'
        },
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      }
    }
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <Scatter data={chartData} options={options} />
    </div>
  )
}

// NEW: Crop Performance Comparison Chart
export const CropPerformanceChart = ({ pipelineData, crops }) => {
  const processCropData = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0 || !crops || !Array.isArray(crops)) return null
    
    const cropPerformance = crops.map(crop => {
      const cropData = data.filter(item => item.crop_id === crop.id)
      if (cropData.length === 0) return null
      
      const avgYield = cropData.reduce((sum, item) => sum + (item.yield || 0), 0) / cropData.length
      const avgRisk = cropData.reduce((sum, item) => sum + (item.risk_score || 0), 0) / cropData.length
      const avgTemp = cropData.reduce((sum, item) => sum + (item.features?.temperature || 25), 0) / cropData.length
      
      return {
        name: crop.name,
        yield: avgYield,
        risk: avgRisk * 100,
        temperature: avgTemp,
        count: cropData.length
      }
    }).filter(Boolean)

    if (cropPerformance.length === 0) return null

    return {
      labels: cropPerformance.map(c => c.name),
      datasets: [
        {
          label: 'Average Yield (units)',
          data: cropPerformance.map(c => c.yield),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2,
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Risk Score (%)',
          data: cropPerformance.map(c => c.risk),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 2,
          borderRadius: 4,
          yAxisID: 'y1'
        }
      ]
    }
  }

  const chartData = processCropData(pipelineData)
  
  if (!chartData) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">🌾 Crop Performance Comparison</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No crop performance data available</p>
            <p className="text-gray-500 text-sm">Generate predictions or run pipeline to see crop comparison</p>
          </div>
        </div>
      </div>
    )
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
        text: 'Crop Performance Comparison',
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
      <Bar data={chartData} options={options} />
    </div>
  )
}

// NEW: Seasonal Analysis Chart
export const SeasonalAnalysisChart = ({ pipelineData, crops }) => {
  const processSeasonalData = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0 || !crops || !Array.isArray(crops)) return null
    
    const seasonalData = {}
    
    data.forEach(item => {
      const crop = crops.find(c => c.id === item.crop_id)
      if (!crop) return
      
      const season = crop.season || 'Unknown'
      if (!seasonalData[season]) {
        seasonalData[season] = { yield: [], risk: [], count: 0 }
      }
      
      seasonalData[season].yield.push(item.yield || 0)
      seasonalData[season].risk.push(item.risk_score || 0)
      seasonalData[season].count++
    })

    const seasons = Object.keys(seasonalData)
    if (seasons.length === 0) return null
    
    return {
      labels: seasons,
      datasets: [
        {
          label: 'Average Yield (units)',
          data: seasons.map(season => {
            const avgYield = seasonalData[season].yield.reduce((sum, y) => sum + y, 0) / seasonalData[season].yield.length
            return avgYield
          }),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2,
          borderRadius: 4
        },
        {
          label: 'Average Risk (%)',
          data: seasons.map(season => {
            const avgRisk = seasonalData[season].risk.reduce((sum, r) => sum + r, 0) / seasonalData[season].risk.length
            return avgRisk * 100
          }),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 2,
          borderRadius: 4
        },
        {
          label: 'Number of Predictions',
          data: seasons.map(season => seasonalData[season].count),
          backgroundColor: 'rgba(147, 51, 234, 0.8)',
          borderColor: 'rgb(147, 51, 234)',
          borderWidth: 2,
          borderRadius: 4
        }
      ]
    }
  }

  const chartData = processSeasonalData(pipelineData)
  
  if (!chartData) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">📅 Seasonal Analysis</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No seasonal data available</p>
            <p className="text-gray-500 text-sm">Generate predictions or run pipeline to see seasonal analysis</p>
          </div>
        </div>
      </div>
    )
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
        text: 'Seasonal Performance Analysis',
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
