// Free Weather Data Service for PredictAgri
// Uses Open-Meteo API (completely free, no API key required)

import axios from 'axios'

class WeatherService {
  // Get current weather for a specific location
  async getCurrentWeather(lat, lon) {
    try {
      console.log(`🌤️ Fetching weather data for coordinates: ${lat}, ${lon}`)
      
      // Use Open-Meteo API (completely free, no API key required)
      const response = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,pressure_msl&timezone=auto`
      )
      
      if (response.data && response.data.current) {
        const current = response.data.current
        console.log('✅ Weather data fetched successfully:', current)
        
        return {
          temperature: current.temperature_2m,
          humidity: current.relative_humidity_2m,
          pressure: current.pressure_msl,
          wind_speed: current.wind_speed_10m,
          wind_direction: 0, // Open-Meteo doesn't provide this in current
          rainfall: 0, // Will get from daily forecast
          snowfall: 0,
          cloudiness: 0,
          visibility: 10000,
          description: this.getWeatherDescription(current.weather_code),
          icon: this.getWeatherIcon(current.weather_code),
          timestamp: new Date().toISOString()
        }
      } else {
        throw new Error('Invalid weather data response')
      }
    } catch (error) {
      console.error('❌ Weather API error:', error.message)
      console.log('🔄 Using fallback weather data')
      return this.getFallbackWeather(lat, lon)
    }
  }

  // Get daily weather data (compatible with Open-Meteo format)
  async getDaily(lat, lon) {
    try {
      console.log(`📅 Fetching daily weather forecast for coordinates: ${lat}, ${lon}`)
      
      const response = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto`
      )
      
      if (response.data && response.data.daily) {
        console.log('✅ Daily weather data fetched successfully:', response.data.daily)
        return response.data.daily
      } else {
        throw new Error('Invalid daily weather data response')
      }
    } catch (error) {
      console.error('❌ Daily weather API error:', error.message)
      console.log('🔄 Using fallback daily weather data')
      return this.getFallbackDailyWeather()
    }
  }

  // Get weather forecast for next 5 days
  async getWeatherForecast(lat, lon) {
    try {
      console.log(`🌤️ Fetching weather forecast for coordinates: ${lat}, ${lon}`)
      
      const response = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`
      )
      
      if (response.data && response.data.hourly) {
        console.log('✅ Weather forecast fetched successfully')
        return response.data.hourly.time.map((time, index) => ({
          date: new Date(time),
          temperature: response.data.hourly.temperature_2m[index],
          humidity: response.data.hourly.relative_humidity_2m[index],
          wind_speed: response.data.hourly.wind_speed_10m[index]
        }))
      } else {
        throw new Error('Invalid weather forecast response')
      }
    } catch (error) {
      console.error('❌ Weather forecast API error:', error.message)
      console.log('🔄 Using fallback forecast data')
      return this.getFallbackForecast()
    }
  }

  // Get historical weather data (limited free access)
  async getHistoricalWeather(lat, lon, date) {
    // Only try to fetch historical weather if we have a valid API key
    if (OPENWEATHER_API_KEY && OPENWEATHER_API_KEY !== 'demo_key') {
      try {
        const timestamp = Math.floor(new Date(date).getTime() / 1000)
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${OPENWEATHER_API_KEY}&units=metric`
        )
        
        return response.data.data[0]
      } catch (error) {
        console.error('Historical weather API error:', error)
      }
    } else {
      console.log('OpenWeather Historical API skipped - no valid API key provided')
    }
    
    // Fallback to fallback data if API fails or no key
    return this.getFallbackHistoricalWeather(date)
  }

  // Helper method to get weather description from WMO weather codes
  getWeatherDescription(code) {
    const descriptions = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      95: 'Thunderstorm'
    }
    return descriptions[code] || 'Unknown'
  }

  // Helper method to get weather icon from WMO weather codes
  getWeatherIcon(code) {
    const icons = {
      0: '☀️', // Clear sky
      1: '🌤️', // Mainly clear
      2: '⛅', // Partly cloudy
      3: '☁️', // Overcast
      45: '🌫️', // Foggy
      48: '🌫️', // Rime fog
      51: '🌦️', // Light drizzle
      53: '🌧️', // Moderate drizzle
      55: '🌧️', // Dense drizzle
      61: '🌦️', // Slight rain
      63: '🌧️', // Moderate rain
      65: '🌧️', // Heavy rain
      71: '🌨️', // Slight snow
      73: '🌨️', // Moderate snow
      75: '🌨️', // Heavy snow
      95: '⛈️'  // Thunderstorm
    }
    return icons[code] || '❓'
  }

  // Fallback daily weather data
  getFallbackDailyWeather() {
    const today = new Date()
    const dates = []
    const maxTemps = []
    const minTemps = []
    const precip = []
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
      maxTemps.push(25 + Math.random() * 10)
      minTemps.push(15 + Math.random() * 8)
      precip.push(Math.random() > 0.7 ? Math.random() * 20 : 0)
    }
    
    return {
      time: dates,
      temperature_2m_max: maxTemps,
      temperature_2m_min: minTemps,
      precipitation_sum: precip
    }
  }

  // Fallback weather data for when API is unavailable
  getFallbackWeather(lat, lon) {
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
      isFallback: true
    }
  }

  // Fallback forecast data
  getFallbackForecast() {
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

  // Fallback historical weather
  getFallbackHistoricalWeather(date) {
    return {
      temp: 22 + (Math.random() - 0.5) * 10,
      humidity: 65 + (Math.random() - 0.5) * 25,
      pressure: 1013 + (Math.random() - 0.5) * 30,
      wind_speed: Math.random() * 18 + 3,
      rain: Math.random() * 25
    }
  }

  // Helper methods for realistic fallback data
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
