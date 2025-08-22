// NASA Data Service for Agricultural Applications
// Uses working APIs and provides fallbacks for failed endpoints

class NASADataService {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseURLs = {
      eonet: 'https://eonet.gsfc.nasa.gov/api/v3',
      apod: 'https://api.nasa.gov/planetary',
      epic: 'https://api.nasa.gov/EPIC/api',
      earth: 'https://api.nasa.gov/planetary/earth'
    }
  }

  // Get natural disasters affecting agriculture
  async getNaturalDisasters(limit = 10) {
    try {
      const response = await fetch(
        `${this.baseURLs.eonet}/events?api_key=${this.apiKey}&limit=${limit}&category=wildfires,severe-storms,droughts,floods`
      )
      
      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          data: data.events || [],
          count: data.events?.length || 0
        }
      } else {
        console.warn('EONET API failed:', response.status)
        return this.getMockNaturalDisasters()
      }
    } catch (error) {
      console.error('EONET API error:', error.message)
      return this.getMockNaturalDisasters()
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

      const response = await fetch(`${this.baseURLs.earth}/imagery?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          data: data,
          source: 'NASA Earth Imagery'
        }
      } else {
        console.warn('Earth Imagery API failed:', response.status)
        return this.getMockEarthImagery(lat, lon)
      }
    } catch (error) {
      console.error('Earth Imagery API error:', error.message)
      return this.getMockEarthImagery(lat, lon)
    }
  }

  // Get EPIC images (with fallback)
  async getEPICImages() {
    try {
      const response = await fetch(`${this.baseURLs.epic}/natural/latest?api_key=${this.apiKey}`)
      
      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          data: data,
          count: data.length,
          source: 'NASA EPIC'
        }
      } else {
        console.warn('EPIC API failed:', response.status)
        return this.getMockEPICImages()
      }
    } catch (error) {
      console.error('EPIC API error:', error.message)
      return this.getMockEPICImages()
    }
  }

  // Get APOD (Astronomy Picture of the Day)
  async getAPOD() {
    try {
      const response = await fetch(`${this.baseURLs.apod}/apod?api_key=${this.apiKey}`)
      
      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          data: data,
          source: 'NASA APOD'
        }
      } else {
        console.warn('APOD API failed:', response.status)
        return this.getMockAPOD()
      }
    } catch (error) {
      console.error('APOD API error:', error.message)
      return this.getMockAPOD()
    }
  }

  // Get agricultural insights from available data
  async getAgriculturalInsights(region = null) {
    try {
      const [disasters, apod] = await Promise.all([
        this.getNaturalDisasters(5),
        this.getAPOD()
      ])

      const insights = {
        timestamp: new Date().toISOString(),
        naturalDisasters: disasters.data || [],
        weatherEvents: this.analyzeWeatherEvents(disasters.data || []),
        agriculturalRisks: this.assessAgriculturalRisks(disasters.data || []),
        recommendations: this.generateRecommendations(disasters.data || []),
        apod: apod.data || null
      }

      return {
        success: true,
        data: insights
      }
    } catch (error) {
      console.error('Agricultural insights error:', error.message)
      return this.getMockAgriculturalInsights()
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

  // Mock data fallbacks
  getMockNaturalDisasters() {
    return {
      success: true,
      data: [
        {
          id: 'mock-1',
          title: 'Sample Wildfire Alert',
          categories: [{ id: 'wildfires', title: 'Wildfires' }],
          geometry: [{ coordinates: [-119.4179, 36.7783] }]
        }
      ],
      count: 1,
      isMockData: true
    }
  }

  getMockEarthImagery(lat, lon) {
    return {
      success: true,
      data: {
        lat: lat,
        lon: lon,
        date: new Date().toISOString().split('T')[0],
        url: 'https://example.com/mock-satellite-image.jpg',
        caption: 'Mock satellite imagery for agricultural analysis'
      },
      source: 'Mock Data',
      isMockData: true
    }
  }

  getMockEPICImages() {
    return {
      success: true,
      data: [
        {
          identifier: 'mock-epic-1',
          caption: 'Mock Earth imagery for crop monitoring',
          date: new Date().toISOString().split('T')[0]
        }
      ],
      count: 1,
      source: 'Mock Data',
      isMockData: true
    }
  }

  getMockAPOD() {
    return {
      success: true,
      data: {
        title: 'Mock Astronomy Image',
        explanation: 'Mock image for testing purposes',
        url: 'https://example.com/mock-image.jpg',
        date: new Date().toISOString().split('T')[0]
      },
      source: 'Mock Data',
      isMockData: true
    }
  }

  getMockAgriculturalInsights() {
    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        naturalDisasters: this.getMockNaturalDisasters().data,
        weatherEvents: [],
        agriculturalRisks: ['Monitor local weather conditions'],
        recommendations: ['Implement crop monitoring systems'],
        apod: this.getMockAPOD().data
      },
      isMockData: true
    }
  }
}

module.exports = NASADataService
