// NASA Data Service for Agricultural Applications - Automated Pipeline
// Uses working APIs and provides fallbacks for failed endpoints with retries

import { Logger } from './logger.js'

// Helper for retrying fetch requests with exponential backoff and timeout
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  const timeout = 3000 // Reduced to 3 second timeout per request for faster fallback
  
  for (let i = 0; i < retries; i++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      })
      
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url, options),
        timeoutPromise
      ])
      
      if (response.status === 503 && i < retries - 1) { // Service Unavailable, retry
        console.log(`NASA API retry ${i + 1}/${retries} due to 503 status`)
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)))
        continue
      }
      
      return response
    } catch (error) {
      if (i < retries - 1) {
        console.log(`NASA API retry ${i + 1}/${retries} due to: ${error.message}`)
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)))
        continue
      }
      throw error // Re-throw if all retries fail
    }
  }
  
  // This should never be reached, but just in case
  throw new Error('All retries failed')
}

// Helper to parse HTML error responses and extract useful information
function parseHtmlError(htmlContent, statusCode) {
  try {
    // Extract title from HTML
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown Error'
    
    // Extract error code if present
    const errorCodeMatch = htmlContent.match(/(\d{3})/)
    const errorCode = errorCodeMatch ? errorCodeMatch[1] : statusCode.toString()
    
    // Extract main error message
    let errorMessage = title
    if (title.includes('Server Error')) {
      errorMessage = `NASA API Server Error (${errorCode})`
    } else if (title.includes('Not Found')) {
      errorMessage = `NASA API Endpoint Not Found (${errorCode})`
    } else if (title.includes('Forbidden')) {
      errorMessage = `NASA API Access Forbidden (${errorCode})`
    } else if (title.includes('Unauthorized')) {
      errorMessage = `NASA API Unauthorized (${errorCode})`
    }
    
    return {
      errorType: 'html_response',
      statusCode: parseInt(errorCode),
      title: title,
      message: errorMessage,
      isHtmlError: true,
      rawHtml: htmlContent.substring(0, 500) // First 500 chars for debugging
    }
  } catch (parseError) {
    return {
      errorType: 'parse_error',
      statusCode: statusCode,
      title: 'HTML Parse Error',
      message: `Failed to parse HTML error response: ${parseError.message}`,
      isHtmlError: true,
      rawHtml: htmlContent.substring(0, 200)
    }
  }
}

// Helper to create user-friendly error messages for frontend
function createUserFriendlyError(errorData, apiName) {
  const baseMessage = `${apiName} is currently unavailable`
  
  if (errorData.statusCode === 503) {
    return {
      userMessage: `${baseMessage} - NASA service is temporarily down`,
      technicalDetails: `Status: ${errorData.statusCode}, Service: ${apiName}`,
      recommendation: 'Please try again in a few minutes',
      severity: 'warning'
    }
  } else if (errorData.statusCode === 500) {
    return {
      userMessage: `${baseMessage} - NASA server error`,
      technicalDetails: `Status: ${errorData.statusCode}, Service: ${apiName}`,
      recommendation: 'This is a NASA server issue, please try again later',
      severity: 'error'
    }
  } else if (errorData.statusCode === 403) {
    return {
      userMessage: `${baseMessage} - API key issue`,
      technicalDetails: `Status: ${errorData.statusCode}, Service: ${apiName}`,
      recommendation: 'Please check your NASA API key configuration',
      severity: 'error'
    }
  } else {
    return {
      userMessage: `${baseMessage}`,
      technicalDetails: `Status: ${errorData.statusCode}, Service: ${apiName}`,
      recommendation: 'Please try again or contact support',
      severity: 'info'
    }
  }
}

class NASADataService {
  constructor(apiKey, context = {}) {
    this.apiKey = apiKey || process.env.NASA_API_KEY
    this.logger = new Logger({ service: 'NASADataService', ...context })
    this.baseURLs = {
      eonet: 'https://eonet.gsfc.nasa.gov/api/v3',
      apod: 'https://api.nasa.gov/planetary',
      epic: 'https://api.nasa.gov/EPIC/api',
      earth: 'https://api.nasa.gov/planetary/earth'
    }
    
    // Log API key status
    if (!this.apiKey || this.apiKey === 'your_nasa_api_key') {
      this.logger.warn('nasa_api_key_missing', { 
        hasKey: !!this.apiKey,
        keyType: typeof this.apiKey 
      })
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
          count: eventCount,
          source: 'NASA EONET',
          timestamp: new Date().toISOString()
        }
      } else {
        const responseText = await response.text()
        
        // Check if response is HTML (error page)
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
          const htmlError = parseHtmlError(responseText, response.status)
          const userError = createUserFriendlyError(htmlError, 'EONET Natural Disasters')
          
          this.logger.warn('eonet_html_error', { 
            status: response.status, 
            error: htmlError,
            userError: userError
          })
          
          return {
            success: false,
            error: userError,
            fallbackData: this.getFallbackNaturalDisasters(),
            source: 'NASA EONET (Error)',
            timestamp: new Date().toISOString()
          }
        } else {
          // Try to parse as JSON error
          try {
            const jsonError = JSON.parse(responseText)
            this.logger.warn('eonet_json_error', { status: response.status, error: jsonError })
          } catch (parseError) {
            this.logger.warn('eonet_unknown_error', { status: response.status, error: responseText })
          }
          
          return {
            success: false,
            error: {
              userMessage: 'Natural Disasters API is currently unavailable',
              technicalDetails: `Status: ${response.status}`,
              recommendation: 'Using fallback data instead'
            },
            fallbackData: this.getFallbackNaturalDisasters(),
            source: 'NASA EONET (Error)',
            timestamp: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      this.logger.error('eonet_fetch_error', { error: error.message })
      return {
        success: false,
        error: {
          userMessage: 'Failed to connect to Natural Disasters API',
          technicalDetails: error.message,
          recommendation: 'Using fallback data instead'
        },
        fallbackData: this.getFallbackNaturalDisasters(),
        source: 'NASA EONET (Error)',
        timestamp: new Date().toISOString()
      }
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
          source: 'NASA Earth Imagery',
          timestamp: new Date().toISOString()
        }
      } else {
        const responseText = await response.text()
        
        // Check if response is HTML (error page)
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
          const htmlError = parseHtmlError(responseText, response.status)
          const userError = createUserFriendlyError(htmlError, 'Earth Imagery')
          
          this.logger.warn('earth_imagery_html_error', { 
            status: response.status, 
            error: htmlError,
            userError: userError
          })
          
          return {
            success: false,
            error: userError,
            fallbackData: this.getFallbackEarthImagery(lat, lon),
            source: 'NASA Earth Imagery (Error)',
            timestamp: new Date().toISOString()
          }
        } else {
          // Try to parse as JSON error
          try {
            const jsonError = JSON.parse(responseText)
            this.logger.warn('earth_imagery_json_error', { status: response.status, error: jsonError })
          } catch (parseError) {
            this.logger.warn('earth_imagery_unknown_error', { status: response.status, error: responseText })
          }
          
          return {
            success: false,
            error: {
              userMessage: 'Earth Imagery API is currently unavailable',
              technicalDetails: `Status: ${response.status}`,
              recommendation: 'Using fallback data instead'
            },
            fallbackData: this.getFallbackEarthImagery(lat, lon),
            source: 'NASA Earth Imagery (Error)',
            timestamp: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      this.logger.error('earth_imagery_fetch_error', { error: error.message })
      return {
        success: false,
        error: {
          userMessage: 'Failed to connect to Earth Imagery API',
          technicalDetails: error.message,
          recommendation: 'Using fallback data instead'
        },
        fallbackData: this.getFallbackEarthImagery(lat, lon),
        source: 'NASA Earth Imagery (Error)',
        timestamp: new Date().toISOString()
      }
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
          source: 'NASA EPIC',
          timestamp: new Date().toISOString()
        }
      } else {
        const responseText = await response.text()
        
        // Check if response is HTML (error page)
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
          const htmlError = parseHtmlError(responseText, response.status)
          const userError = createUserFriendlyError(htmlError, 'EPIC Images')
          
          this.logger.warn('epic_html_error', { 
            status: response.status, 
            error: htmlError,
            userError: userError
          })
          
          return {
            success: false,
            error: userError,
            fallbackData: this.getFallbackEPICImages(),
            source: 'NASA EPIC (Error)',
            timestamp: new Date().toISOString()
          }
        } else {
          // Try to parse as JSON error
          try {
            const jsonError = JSON.parse(responseText)
            this.logger.warn('epic_json_error', { status: response.status, error: jsonError })
          } catch (parseError) {
            this.logger.warn('epic_unknown_error', { status: response.status, error: responseText })
          }
          
          return {
            success: false,
            error: {
              userMessage: 'EPIC Images API is currently unavailable',
              technicalDetails: `Status: ${response.status}`,
              recommendation: 'Using fallback data instead'
            },
            fallbackData: this.getFallbackEPICImages(),
            source: 'NASA EPIC (Error)',
            timestamp: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      this.logger.error('epic_fetch_error', { error: error.message })
      return {
        success: false,
        error: {
          userMessage: 'Failed to connect to EPIC Images API',
          technicalDetails: error.message,
          recommendation: 'Using fallback data instead'
        },
        fallbackData: this.getFallbackEPICImages(),
        source: 'NASA EPIC (Error)',
        timestamp: new Date().toISOString()
      }
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
          source: 'NASA APOD',
          timestamp: new Date().toISOString()
        }
      } else {
        const responseText = await response.text()
        
        // Check if response is HTML (error page)
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
          const htmlError = parseHtmlError(responseText, response.status)
          const userError = createUserFriendlyError(htmlError, 'APOD')
          
          this.logger.warn('apod_html_error', { 
            status: response.status, 
            error: htmlError,
            userError: userError
          })
          
          return {
            success: false,
            error: userError,
            fallbackData: this.getFallbackAPOD(),
            source: 'NASA APOD (Error)',
            timestamp: new Date().toISOString()
          }
        } else {
          // Try to parse as JSON error
          try {
            const jsonError = JSON.parse(responseText)
            this.logger.warn('apod_json_error', { status: response.status, error: jsonError })
          } catch (parseError) {
            this.logger.warn('apod_unknown_error', { status: response.status, error: responseText })
          }
          
          return {
            success: false,
            error: {
              userMessage: 'Astronomy Picture of the Day is currently unavailable',
              technicalDetails: `Status: ${response.status}`,
              recommendation: 'Using fallback data instead'
            },
            fallbackData: this.getFallbackAPOD(),
            source: 'NASA APOD (Error)',
            timestamp: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      this.logger.error('apod_fetch_error', { error: error.message })
      return {
        success: false,
        error: {
          userMessage: 'Failed to connect to APOD API',
          technicalDetails: error.message,
          recommendation: 'Using fallback data instead'
        },
        fallbackData: this.getFallbackAPOD(),
        source: 'NASA APOD (Error)',
        timestamp: new Date().toISOString()
      }
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

export const nasaDataService = new NASADataService(process.env.NASA_API_KEY)
export default nasaDataService
