'use client'

import { useState, useEffect } from 'react'
import { weatherService } from '../../lib/weatherService'

export const RealWeatherWidget = ({ region }) => {
  const [weatherData, setWeatherData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    if (region?.lat && region?.lon) {
      fetchWeatherData()
    }
  }, [region])

  const fetchWeatherData = async () => {
    try {
      setLoading(true)
      const data = await weatherService.getCurrentWeather(region.lat, region.lon)
      setWeatherData(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError('Failed to fetch weather data')
      console.error('Weather fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getWeatherIcon = (iconCode) => {
    const iconMap = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    }
    return iconMap[iconCode] || '🌤️'
  }

  const getTemperatureColor = (temp) => {
    if (temp > 30) return 'text-red-400'
    if (temp > 20) return 'text-green-400'
    if (temp > 10) return 'text-blue-400'
    return 'text-blue-600'
  }

  const getHumidityColor = (humidity) => {
    if (humidity > 80) return 'text-blue-400'
    if (humidity > 60) return 'text-green-400'
    if (humidity > 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (loading) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-gray-300">Loading weather data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <div className="text-center">
          <p className="text-red-400 mb-3">{error}</p>
          <button 
            onClick={fetchWeatherData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!weatherData) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
        <p className="text-gray-400 text-center">No weather data available</p>
      </div>
    )
  }

  const agriculturalSummary = weatherService.getAgriculturalSummary(weatherData)

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">🌤️ Real-Time Weather</h3>
        <div className="text-4xl">
          {getWeatherIcon(weatherData.icon)}
        </div>
      </div>

      {/* Current Weather Display */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Temperature</p>
          <p className={`text-2xl font-bold ${getTemperatureColor(weatherData.temperature)}`}>
            {weatherData.temperature.toFixed(1)}°C
          </p>
        </div>
        
        <div className="text-center p-3 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Humidity</p>
          <p className={`text-2xl font-bold ${getHumidityColor(weatherData.humidity)}`}>
            {weatherData.humidity}%
          </p>
        </div>
        
        <div className="text-center p-3 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Rainfall</p>
          <p className="text-2xl font-bold text-blue-400">
            {weatherData.rainfall.toFixed(1)}mm
          </p>
        </div>
        
        <div className="text-center p-3 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Wind Speed</p>
          <p className="text-2xl font-bold text-gray-300">
            {weatherData.wind_speed.toFixed(1)} km/h
          </p>
        </div>
      </div>

      {/* Weather Description */}
      <div className="mb-4 p-3 bg-gray-800 rounded-lg">
        <p className="text-gray-300 text-center capitalize">
          {weatherData.description}
        </p>
      </div>

      {/* Risk Assessment */}
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-white mb-3">⚠️ Risk Assessment</h4>
        <div className={`p-3 rounded-lg border-l-4 ${
          agriculturalSummary.riskAssessment.severity === 'high' ? 'border-red-500 bg-red-900' :
          agriculturalSummary.riskAssessment.severity === 'medium' ? 'border-yellow-500 bg-yellow-900' :
          'border-green-500 bg-green-900'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-white font-medium">
              {agriculturalSummary.riskAssessment.severity.toUpperCase()} RISK
            </span>
            <span className="text-white font-bold">
              {(agriculturalSummary.riskAssessment.riskScore * 100).toFixed(0)}%
            </span>
          </div>
          {agriculturalSummary.riskAssessment.riskFactors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-200 mb-1">Risk Factors:</p>
              <ul className="text-xs text-gray-300 space-y-1">
                {agriculturalSummary.riskAssessment.riskFactors.map((factor, index) => (
                  <li key={index}>• {factor}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Agricultural Recommendations */}
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-white mb-3">🌱 Recommendations</h4>
        <div className="space-y-2">
          {agriculturalSummary.recommendations.map((rec, index) => (
            <div key={index} className="p-3 bg-gray-800 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-300">{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Weather Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Pressure:</span>
          <span className="text-gray-300">{weatherData.pressure} hPa</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Visibility:</span>
          <span className="text-gray-300">{(weatherData.visibility / 1000).toFixed(1)} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Cloudiness:</span>
          <span className="text-gray-300">{weatherData.cloudiness}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Wind Direction:</span>
          <span className="text-gray-300">{weatherData.wind_direction}°</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Region: {region?.name || 'Unknown'}</span>
          <span>
            {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : 'Never updated'}
          </span>
        </div>
        {weatherData.isMock && (
          <p className="text-xs text-yellow-500 mt-1 text-center">
            ⚠️ Using mock data (API key not configured)
          </p>
        )}
        <button 
          onClick={fetchWeatherData}
          className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          🔄 Refresh Weather Data
        </button>
      </div>
    </div>
  )
}

export default RealWeatherWidget
