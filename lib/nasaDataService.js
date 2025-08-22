// NASA Data Service for Agricultural Applications - Automated Pipeline
// Uses working APIs and provides fallbacks for failed endpoints with retries

import { Logger } from './logger.js'

// Helper for retrying fetch requests with exponential backoff
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.status === 503 && i < retries - 1) { // Service Unavailable, retry
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)))
        continue
      }
      return response
    } catch (error) {
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)))
        continue
      }
      throw error // Re-throw if all retries fail
    }
  }
}

class NASADataService {
  constructor(apiKey, context = {}) {
    this.apiKey = apiKey
    this.logger = new Logger({ service: 'NASADataService', ...context })
    this.baseURLs = {
      eonet: 'https://eonet.gsfc.nasa.gov/api/v3',
      apod: 'https://api.nasa.gov/planetary',
      epic: 'https://api.nasa.gov/EPIC/api',
      earth: 'https://api.nasa.gov/planetary/earth'
    }
  }

  // Get natural disasters affecting agriculture
  async getNaturalDisasters(limit = 10) {
    const url = `${this.baseURLs.eonet}/events?api_key=${this.apiKey}&limit=${limit}&category=wildfires,severe-storms,droughts,floods`
    this.logger.info('eonet_request', { url })
    
    try {
      const response = await fetchWithRetry(url) // Use fetchWithRetry
      
      if (response.ok) {
        const data = await response.json()
        const eventCount = data.events?.length || 0
        this.logger.info('eonet_success', { count: eventCount })
        
        return {
          success: true,
          data: data.events || [],
          count: eventCount
        }
      } else {
        const errorText = await response.text()
        this.logger.warn('eonet_api_failed', { status: response.status, error: errorText })
        return this.getFallbackNaturalDisasters() // Fallback to fallback data
      }
    } catch (error) {
      this.logger.error('eonet_fetch_error', { error: error.message })
      return this.getFallbackNaturalDisasters() // Fallback to fallback data
    }
  }

  // Get Earth imagery (with fallback)
  async getEarthImagery(lat, lon, date = null) {
    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        lat: lat.toString(),
        lon: lon.toString(),
        dim: '0.15'
      })
      
      if (date) {
        params.append('date', date)
      }

      const url = `${this.baseURLs.earth}/imagery?${params}`
      this.logger.info('earth_imagery_request', { url, lat, lon })
      
      const response = await fetchWithRetry(url) // Use fetchWithRetry
      
      if (response.ok) {
        const data = await response.json()
        this.logger.info('earth_imagery_success')
        return {
          success: true,
          data: data,
          source: 'NASA Earth Imagery'
        }
      } else {
        const errorText = await response.text()
        this.logger.warn('earth_imagery_api_failed', { status: response.status, error: errorText })
        return this.getFallbackEarthImagery(lat, lon)
      }
    } catch (error) {
      this.logger.error('earth_imagery_fetch_error', { error: error.message })
      return this.getFallbackEarthImagery(lat, lon)
    }
  }

  // Get EPIC images (with fallback)
  async getEPICImages() {
    const url = `${this.baseURLs.epic}/natural/latest?api_key=${this.apiKey}`
    this.logger.info('epic_request', { url })
    
    try {
      const response = await fetchWithRetry(url) // Use fetchWithRetry
      
      if (response.ok) {
        const data = await response.json()
        this.logger.info('epic_success', { count: data.length })
        return {
          success: true,
          data: data,
          count: data.length,
          source: 'NASA EPIC'
        }
      } else {
        const errorText = await response.text()
        this.logger.warn('epic_api_failed', { status: response.status, error: errorText })
        return this.getFallbackEPICImages()
      }
    } catch (error) {
      this.logger.error('epic_fetch_error', { error: error.message })
      return this.getFallbackEPICImages()
    }
  }

  // Get APOD (Astronomy Picture of the Day)
  async getAPOD() {
    const url = `${this.baseURLs.apod}/apod?api_key=${this.apiKey}`
    this.logger.info('apod_request', { url })
    
    try {
      const response = await fetchWithRetry(url) // Use fetchWithRetry
      
      if (response.ok) {
        const data = await response.json()
        this.logger.info('apod_success')
        return {
          success: true,
          data: data,
          source: 'NASA APOD'
        }
      } else {
        const errorText = await response.text()
        this.logger.warn('apod_api_failed', { status: response.status, error: errorText })
        return this.getFallbackAPOD()
      }
    } catch (error) {
      this.logger.error('apod_fetch_error', { error: error.message })
      return this.getFallbackAPOD()
    }
  }

  // Get agricultural insights from available data
  async getAgriculturalInsights(region = null, lat, lon) {
    this.logger.info('agricultural_insights_request', { region, lat, lon })
    
    try {
      const [disasters, apod, epic, earthImagery] = await Promise.all([
        this.getNaturalDisasters(5),
        this.getAPOD(),
        this.getEPICImages(),
        this.getEarthImagery(lat, lon) // Pass lat/lon for earth imagery
      ])

      const insights = {
        timestamp: new Date().toISOString(),
        naturalDisasters: disasters.data || [],
        weatherEvents: this.analyzeWeatherEvents(disasters.data || []),
        agriculturalRisks: this.assessAgriculturalRisks(disasters.data || []),
        recommendations: this.generateRecommendations(disasters.data || []),
        apod: apod.data || null,
        epicImagery: epic.data || null,
        earthImagery: earthImagery.data || null
      }

      this.logger.info('agricultural_insights_success')
      return {
        success: true,
        data: insights
      }
    } catch (error) {
      this.logger.error('agricultural_insights_error', { error: error.message })
      return this.getFallbackAgriculturalInsights()
    }
  }

  // Assess agricultural risks from natural events
  assessAgriculturalRisks(events) {
    const risks = []
    
    events.forEach(event => {
      const category = event.categories?.[0]?.id
      
      switch (category) {
        case 'wildfires':
          risks.push('Crop destruction and soil damage')
          break
        case 'severe-storms':
          risks.push('Crop damage and delayed planting')
          break
        case 'droughts':
          risks.push('Water scarcity and crop failure')
          break
        case 'floods':
          risks.push('Soil contamination and crop destruction')
          break
        default:
          risks.push('General weather-related risks')
      }
    })
    
    return risks.length > 0 ? risks : ['Monitor local weather conditions']
  }

  // Analyze weather events for agricultural impact
  analyzeWeatherEvents(events) {
    const weatherEvents = events.filter(event => 
      event.categories?.some(cat => 
        ['severe-storms', 'wildfires', 'droughts', 'floods'].includes(cat.id)
      )
    )

    return weatherEvents.map(event => ({
      id: event.id,
      title: event.title,
      category: event.categories?.[0]?.title || 'Unknown',
      severity: this.assessSeverity(event),
      agriculturalImpact: this.assessAgriculturalImpact(event),
      location: event.geometry?.[0]?.coordinates || []
    }))
  }

  // Assess severity of natural events
  assessSeverity(event) {
    // Simple severity assessment based on event type
    const severityMap = {
      'wildfires': 'high',
      'severe-storms': 'medium',
      'droughts': 'high',
      'floods': 'medium'
    }
    
    const category = event.categories?.[0]?.id
    return severityMap[category] || 'unknown'
  }

  // Assess agricultural impact
  assessAgriculturalImpact(event) {
    const impactMap = {
      'wildfires': 'Destroys crops, damages soil, affects livestock',
      'severe-storms': 'Crop damage, soil erosion, delayed planting',
      'droughts': 'Crop failure, water scarcity, reduced yields',
      'floods': 'Crop destruction, soil contamination, delayed harvest'
    }
    
    const category = event.categories?.[0]?.id
    return impactMap[category] || 'Unknown agricultural impact'
  }

  // Generate agricultural recommendations
  generateRecommendations(events) {
    const recommendations = []
    
    events.forEach(event => {
      const category = event.categories?.[0]?.id
      
      switch (category) {
        case 'wildfires':
          recommendations.push('Implement fire breaks, monitor air quality, protect livestock')
          break
        case 'severe-storms':
          recommendations.push('Secure equipment, protect crops with covers, monitor drainage')
          break
        case 'droughts':
          recommendations.push('Implement irrigation systems, use drought-resistant crops, conserve water')
          break
        case 'floods':
          recommendations.push('Improve drainage, elevate equipment, monitor water quality')
          break
      }
    })
    
    return recommendations.length > 0 ? recommendations : ['Monitor weather conditions', 'Maintain crop health monitoring']
  }

  // Fallback data generators
  getFallbackNaturalDisasters() {
    this.logger.warn('eonet_fallback_data', { message: 'Using fallback data for natural disasters.' })
    return {
      success: false,
      data: [
        {
          id: 'fallback-1',
          title: 'Sample Wildfire Alert',
          categories: [{ id: 'wildfires', title: 'Wildfires' }],
          geometry: [{ coordinates: [-119.4179, 36.7783] }]
        }
      ],
      count: 1,
      isFallbackData: true
    }
  }

  getFallbackEarthImagery(lat, lon) {
    this.logger.warn('earth_imagery_fallback_data', { message: 'Using fallback data for Earth imagery.' })
    return {
      success: false,
      data: {
        lat: lat,
        lon: lon,
        date: new Date().toISOString().split('T')[0],
              url: 'https://example.com/fallback-satellite-image.jpg',
      caption: 'Fallback satellite imagery for agricultural analysis'
    },
    source: 'Fallback Data',
    isFallbackData: true
    }
  }

  getFallbackEPICImages() {
    this.logger.warn('epic_fallback_data', { message: 'Using fallback data for EPIC images.' })
    return {
      success: false,
      data: [
        {
                  identifier: 'fallback-epic-1',
        caption: 'Fallback Earth imagery for crop monitoring',
          date: new Date().toISOString().split('T')[0]
        }
      ],
      count: 1,
      source: 'Fallback Data',
      isFallbackData: true
    }
  }

  getFallbackAPOD() {
    this.logger.warn('apod_fallback_data', { message: 'Using fallback data for APOD.' })
    return {
      success: false,
      data: {
              title: 'Fallback Astronomy Image',
      explanation: 'Fallback image for testing purposes',
      url: 'https://example.com/fallback-image.jpg',
        date: new Date().toISOString().split('T')[0]
      },
      source: 'Fallback Data',
      isFallbackData: true
    }
  }

  getFallbackAgriculturalInsights() {
    this.logger.warn('agricultural_insights_fallback_data', { message: 'Using fallback data for agricultural insights.' })
    return {
      success: false,
      data: {
        timestamp: new Date().toISOString(),
        naturalDisasters: this.getFallbackNaturalDisasters().data,
        weatherEvents: [],
        agriculturalRisks: ['Monitor local weather conditions'],
        recommendations: ['Implement crop monitoring systems'],
        apod: this.getFallbackAPOD().data
      },
      isFallbackData: true
    }
  }
}

export const nasaDataService = new NASADataService()
export default nasaDataService
