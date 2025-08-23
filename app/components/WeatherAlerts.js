'use client'

export default function WeatherAlerts({ weatherData }) {
  const getWeatherAlerts = () => {
    if (!weatherData || weatherData.length === 0) return []
    
    const alerts = []
    
    weatherData.forEach(weather => {
      const temp = weather.weather_data?.current?.temperature_2m
      const humidity = weather.weather_data?.current?.relative_humidity_2m
      const rainfall = weather.weather_data?.daily?.precipitation_sum?.[0]
      const regionName = weather.regions?.name || 'Unknown Region'
      
      // Temperature alerts
      if (temp > 35) {
        alerts.push({
          type: 'High Temperature',
          severity: 'high',
          message: `Temperature ${temp}°C exceeds safe limit for crops`,
          region: regionName,
          timestamp: weather.timestamp
        })
      } else if (temp < 10) {
        alerts.push({
          type: 'Low Temperature',
          severity: 'medium',
          message: `Temperature ${temp}°C may affect crop growth`,
          region: regionName,
          timestamp: weather.timestamp
        })
      }
      
      // Humidity alerts
      if (humidity > 80) {
        alerts.push({
          type: 'High Humidity',
          severity: 'medium',
          message: `High humidity (${humidity}%) may increase disease risk`,
          region: regionName,
          timestamp: weather.timestamp
        })
      } else if (humidity < 30) {
        alerts.push({
          type: 'Low Humidity',
          severity: 'medium',
          message: `Low humidity (${humidity}%) may cause drought stress`,
          region: regionName,
          timestamp: weather.timestamp
        })
      }
      
      // Rainfall alerts
      if (rainfall > 200) {
        alerts.push({
          type: 'Heavy Rainfall',
          severity: 'high',
          message: `Heavy rainfall (${rainfall}mm) may cause flooding`,
          region: regionName,
          timestamp: weather.timestamp
        })
      } else if (rainfall < 5 && temp > 30) {
        alerts.push({
          type: 'Drought Warning',
          severity: 'high',
          message: `Low rainfall (${rainfall}mm) with high temperature may cause drought`,
          region: regionName,
          timestamp: weather.timestamp
        })
      }
    })
    
    // Sort by severity and timestamp, show top 6 alerts
    return alerts
      .sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 }
        if (severityOrder[b.severity] !== severityOrder[a.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity]
        }
        return new Date(b.timestamp) - new Date(a.timestamp)
      })
      .slice(0, 6)
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

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return '🚨'
      case 'medium': return '⚠️'
      case 'low': return 'ℹ️'
      default: return '📢'
    }
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">🌦️ Weather Alert System</h3>
      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-gray-400">No weather alerts at this time</p>
          <p className="text-gray-500 text-sm mt-1">All regions are experiencing normal weather conditions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{getSeverityIcon(alert.severity)}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white">{alert.type}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      alert.severity === 'high' ? 'bg-red-600 text-white' :
                      alert.severity === 'medium' ? 'bg-yellow-600 text-white' :
                      'bg-blue-600 text-white'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{alert.message}</p>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>Region: {alert.region}</span>
                    <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {weatherData && weatherData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Monitoring {weatherData.length} regions for weather conditions
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
