// Free Weather Data Service for PredictAgri
// Uses OpenWeatherMap API (free tier: 1000 calls/day)

import axios from 'axios'

// You can get a free API key from: https://openweathermap.org/api
const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'demo_key'

class WeatherService {
  // Get current weather for a specific location
  async getCurrentWeather(lat, lon) {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
      )
      
      return {
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        wind_speed: response.data.wind.speed,
        wind_direction: response.data.wind.deg,
        rainfall: response.data.rain?.['1h'] || 0,
        snowfall: response.data.snow?.['1h'] || 0,
        cloudiness: response.data.clouds.all,
        visibility: response.data.visibility,
        description: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Weather API error:', error)
      // Fallback to mock data if API fails
      return this.getMockWeather(lat, lon)
    }
  }

  // Get weather forecast for next 5 days
  async getWeatherForecast(lat, lon) {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
      )
      
      return response.data.list.map(item => ({
        date: new Date(item.dt * 1000),
        temperature: item.main.temp,
        humidity: item.main.humidity,
        rainfall: item.rain?.['3h'] || 0,
        wind_speed: item.wind.speed,
        description: item.weather[0].description
      }))
    } catch (error) {
      console.error('Forecast API error:', error)
      return this.getMockForecast()
    }
  }

  // Get historical weather data (limited free access)
  async getHistoricalWeather(lat, lon, date) {
    try {
      const timestamp = Math.floor(new Date(date).getTime() / 1000)
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${OPENWEATHER_API_KEY}&units=metric`
      )
      
      return response.data.data[0]
    } catch (error) {
      console.error('Historical weather API error:', error)
      return this.getMockHistoricalWeather(date)
    }
  }

  // Mock weather data for fallback and testing
  getMockWeather(lat, lon) {
    // Generate realistic weather based on location and season
    const season = this.getSeason()
    const baseTemp = this.getBaseTemperature(lat, season)
    const baseHumidity = this.getBaseHumidity(season)
    
    return {
      temperature: baseTemp + (Math.random() - 0.5) * 10,
      humidity: baseHumidity + (Math.random() - 0.5) * 20,
      pressure: 1013 + (Math.random() - 0.5) * 50,
      wind_speed: Math.random() * 20 + 5,
      wind_direction: Math.random() * 360,
      rainfall: season === 'monsoon' ? Math.random() * 50 : Math.random() * 10,
      snowfall: season === 'winter' ? Math.random() * 20 : 0,
      cloudiness: Math.random() * 100,
      visibility: 10000 + Math.random() * 5000,
      description: 'Partly cloudy',
      icon: '02d',
      timestamp: new Date().toISOString(),
      isMock: true
    }
  }

  // Mock forecast data
  getMockForecast() {
    const forecast = []
    for (let i = 1; i <= 5; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      
      forecast.push({
        date: date,
        temperature: 20 + (Math.random() - 0.5) * 15,
        humidity: 60 + (Math.random() - 0.5) * 30,
        rainfall: Math.random() * 30,
        wind_speed: Math.random() * 15 + 5,
        description: 'Variable conditions'
      })
    }
    return forecast
  }

  // Mock historical weather
  getMockHistoricalWeather(date) {
    return {
      temp: 22 + (Math.random() - 0.5) * 10,
      humidity: 65 + (Math.random() - 0.5) * 25,
      pressure: 1013 + (Math.random() - 0.5) * 30,
      wind_speed: Math.random() * 18 + 3,
      rain: Math.random() * 25
    }
  }

  // Helper methods for realistic mock data
  getSeason() {
    const month = new Date().getMonth()
    if (month >= 2 && month <= 4) return 'spring'
    if (month >= 5 && month <= 7) return 'summer'
    if (month >= 8 && month <= 10) return 'autumn'
    return 'winter'
  }

  getBaseTemperature(lat, season) {
    // Temperature varies by latitude and season
    const isNorthern = lat > 0
    const seasonalAdjustment = {
      spring: 20,
      summer: 30,
      autumn: 15,
      winter: 5
    }
    
    let baseTemp = seasonalAdjustment[season]
    
    // Adjust for latitude (colder at higher latitudes)
    if (isNorthern) {
      if (lat > 60) baseTemp -= 15 // Arctic
      else if (lat > 45) baseTemp -= 10 // Temperate
      else if (lat > 30) baseTemp -= 5 // Subtropical
    } else {
      if (lat < -60) baseTemp -= 20 // Antarctic
      else if (lat < -45) baseTemp -= 10 // Southern temperate
      else if (lat < -30) baseTemp -= 5 // Southern subtropical
    }
    
    return baseTemp
  }

  getBaseHumidity(season) {
    const seasonalHumidity = {
      spring: 70,
      summer: 60,
      autumn: 75,
      winter: 80
    }
    return seasonalHumidity[season]
  }

  // Calculate weather-based risk factors for agriculture
  calculateWeatherRisk(weatherData) {
    let riskScore = 0
    let riskFactors = []

    // Temperature risks
    if (weatherData.temperature > 35) {
      riskScore += 0.3
      riskFactors.push('High temperature stress')
    } else if (weatherData.temperature < 5) {
      riskScore += 0.2
      riskFactors.push('Low temperature stress')
    }

    // Humidity risks
    if (weatherData.humidity > 85) {
      riskScore += 0.2
      riskFactors.push('High humidity - disease risk')
    } else if (weatherData.humidity < 30) {
      riskScore += 0.15
      riskFactors.push('Low humidity - drought risk')
    }

    // Rainfall risks
    if (weatherData.rainfall > 50) {
      riskScore += 0.25
      riskFactors.push('Heavy rainfall - flooding risk')
    } else if (weatherData.rainfall < 5) {
      riskScore += 0.2
      riskFactors.push('Low rainfall - drought risk')
    }

    // Wind risks
    if (weatherData.wind_speed > 15) {
      riskScore += 0.15
      riskFactors.push('High winds - crop damage risk')
    }

    return {
      riskScore: Math.min(riskScore, 1.0),
      riskFactors,
      severity: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low'
    }
  }

  // Get agricultural weather summary
  getAgriculturalSummary(weatherData) {
    const risk = this.calculateWeatherRisk(weatherData)
    
    return {
      currentConditions: {
        temperature: `${weatherData.temperature.toFixed(1)}°C`,
        humidity: `${weatherData.humidity}%`,
        rainfall: `${weatherData.rainfall.toFixed(1)}mm`,
        wind: `${weatherData.wind_speed.toFixed(1)} km/h`
      },
      riskAssessment: risk,
      recommendations: this.getRecommendations(weatherData, risk),
      timestamp: weatherData.timestamp
    }
  }

  // Get agricultural recommendations based on weather
  getRecommendations(weatherData, risk) {
    const recommendations = []

    if (weatherData.temperature > 30) {
      recommendations.push('Consider additional irrigation to prevent heat stress')
    }
    
    if (weatherData.humidity > 80) {
      recommendations.push('Monitor for fungal diseases - ensure good air circulation')
    }
    
    if (weatherData.rainfall > 40) {
      recommendations.push('Check drainage systems - prevent waterlogging')
    }
    
    if (weatherData.wind_speed > 12) {
      recommendations.push('Protect young crops from wind damage')
    }

    if (risk.riskScore > 0.6) {
      recommendations.push('High risk conditions - implement protective measures')
    }

    return recommendations.length > 0 ? recommendations : ['Weather conditions are favorable for crop growth']
  }
}

export const weatherService = new WeatherService()
export default weatherService
