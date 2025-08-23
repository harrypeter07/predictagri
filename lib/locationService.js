// Real-time location service for PredictAgri
import { openMeteoService } from './openMeteoService.js'

class LocationService {
  constructor() {
    this.currentLocation = null
    this.watchId = null
    this.locationHistory = []
  }

  // Get user's current location using Geolocation API
  async getCurrentLocation(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes cache
    }
    
    const finalOptions = { ...defaultOptions, ...options }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed
          }
          
          this.currentLocation = location
          this.addToHistory(location)
          
          resolve(location)
        },
        (error) => {
          let errorMessage = 'Location access denied'
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out'
              break
          }
          
          reject(new Error(errorMessage))
        },
        finalOptions
      )
    })
  }

  // Watch user's location for continuous updates
  watchLocation(callback, options = {}) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported')
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 60000 // 1 minute cache for watching
    }
    
    const finalOptions = { ...defaultOptions, ...options }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed
        }
        
        this.currentLocation = location
        this.addToHistory(location)
        
        if (callback) callback(location)
      },
      (error) => {
        console.error('Location watch error:', error)
        if (callback) callback(null, error)
      },
      finalOptions
    )

    return this.watchId
  }

  // Stop watching location
  stopWatching() {
    if (this.watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
  }

  // Add location to history
  addToHistory(location) {
    this.locationHistory.push(location)
    
    // Keep only last 50 locations
    if (this.locationHistory.length > 50) {
      this.locationHistory = this.locationHistory.slice(-50)
    }
  }

  // Get location from IP (fallback)
  async getLocationFromIP() {
    try {
      const response = await fetch('https://ipapi.co/json/')
      const data = await response.json()
      
      if (data.latitude && data.longitude) {
        const location = {
          lat: data.latitude,
          lon: data.longitude,
          city: data.city,
          region: data.region,
          country: data.country_name,
          accuracy: 10000, // IP location is less accurate
          timestamp: new Date().toISOString(),
          source: 'ip'
        }
        
        return location
      }
      
      throw new Error('IP location not available')
    } catch (error) {
      console.error('IP location error:', error)
      throw error
    }
  }

  // Get location with fallback strategy
  async getLocationWithFallback() {
    try {
      // Try GPS first
      console.log('📍 Attempting GPS location...')
      const location = await this.getCurrentLocation()
      location.source = 'gps'
      console.log('✅ GPS location successful:', { lat: location.lat, lon: location.lon, accuracy: location.accuracy })
      return location
    } catch (gpsError) {
      console.warn('⚠️ GPS location failed, trying IP location:', gpsError.message)
      
      try {
        // Fallback to IP location
        console.log('🌐 Attempting IP-based location...')
        const ipLocation = await this.getLocationFromIP()
        console.log('✅ IP location successful:', { lat: ipLocation.lat, lon: ipLocation.lon, city: ipLocation.city })
        return ipLocation
      } catch (ipError) {
        console.error('❌ All location methods failed:', ipError.message)
        console.warn('🔄 Using default fallback location')
        
        // Ultimate fallback - return a generic location (can be customized)
        const fallbackLocation = {
          lat: 20.5937, // Center of India (more generic)
          lon: 78.9629,
          city: 'Unknown',
          region: 'India',
          country: 'India',
          accuracy: 100000,
          timestamp: new Date().toISOString(),
          source: 'default',
          note: 'Default location used - please enable location services for better accuracy'
        }
        console.log('📍 Fallback location:', fallbackLocation)
        return fallbackLocation
      }
    }
  }

  // Get address from coordinates (reverse geocoding)
  async getAddressFromCoordinates(lat, lon) {
    // Only try to fetch address if we have a valid API key
    if (process.env.OPENCAGE_API_KEY && process.env.OPENCAGE_API_KEY !== 'demo') {
      try {
        const response = await fetch(
          `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${process.env.OPENCAGE_API_KEY}&limit=1`
        )
        const data = await response.json()
        
        if (data.results && data.results.length > 0) {
          const result = data.results[0]
          return {
            formatted: result.formatted,
            components: result.components,
            confidence: result.confidence
          }
        }
        
        throw new Error('Address not found')
      } catch (error) {
        console.error('Reverse geocoding error:', error)
      }
    } else {
      console.log('OpenCage API skipped - no valid API key provided')
    }
    
    // Fallback to simple coordinate display
    return {
      formatted: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      components: {
        lat: lat,
        lng: lon
      },
      confidence: 0
    }
  }

  // Get weather data for current location
  async getCurrentLocationWeather() {
    const location = await this.getLocationWithFallback()
    
    try {
      const weatherData = await openMeteoService.getCurrentWeather(location.lat, location.lon)
      return {
        location,
        weather: weatherData
      }
    } catch (error) {
      console.error('Weather fetch error:', error)
      return {
        location,
        weather: null,
        error: error.message
      }
    }
  }

  // Check if location has changed significantly
  hasLocationChanged(newLocation, threshold = 100) { // 100 meters threshold
    if (!this.currentLocation) return true
    
    const distance = this.calculateDistance(
      this.currentLocation.lat,
      this.currentLocation.lon,
      newLocation.lat,
      newLocation.lon
    )
    
    return distance > threshold
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000 // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c // Distance in meters
  }

  toRadians(degrees) {
    return degrees * (Math.PI/180)
  }

  // Get user's location preferences
  getLocationPreferences() {
    try {
      const prefs = localStorage.getItem('locationPreferences')
      return prefs ? JSON.parse(prefs) : {
        enableGPS: true,
        enableBackground: false,
        accuracy: 'high',
        updateInterval: 300000 // 5 minutes
      }
    } catch (error) {
      return {
        enableGPS: true,
        enableBackground: false,
        accuracy: 'high',
        updateInterval: 300000
      }
    }
  }

  // Save user's location preferences
  saveLocationPreferences(preferences) {
    try {
      localStorage.setItem('locationPreferences', JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save location preferences:', error)
    }
  }

  // Get location history
  getLocationHistory() {
    return [...this.locationHistory]
  }

  // Clear location history
  clearLocationHistory() {
    this.locationHistory = []
  }

  // Get current location (cached if available)
  getCachedLocation() {
    return this.currentLocation
  }

  // Get location information for a query (geocoding)
  async getLocationInfo(query) {
    try {
      // For now, return a simple response
      // In a real implementation, this would call a geocoding service
      return {
        query,
        coordinates: {
          lat: 19.0760, // Default to Mumbai coordinates
          lon: 72.8777
        },
        formattedAddress: query,
        country: 'India',
        timestamp: new Date().toISOString(),
        source: 'Fallback Data'
      }
    } catch (error) {
      console.error('Location info fetch error:', error)
      throw new Error('Failed to get location information')
    }
  }
}

// Create and export singleton instance
export const locationService = new LocationService()

// Export class for testing
export { LocationService }
