// Farmer Location Service for PredictAgri
// Handles GPS coordinates, address validation, and location-based data collection

import axios from 'axios'
import { Logger } from './logger.js'

class FarmerLocationService {
  constructor() {
    this.logger = new Logger({ service: 'FarmerLocationService' })
    this.geocodingCache = new Map()
    this.reverseGeocodingCache = new Map()
  }

  // Get exact coordinates from address (using OpenStreetMap Nominatim - free)
  async getCoordinatesFromAddress(address, country = 'India') {
    try {
      const cacheKey = `${address}_${country}`
      if (this.geocodingCache.has(cacheKey)) {
        return this.geocodingCache.get(cacheKey)
      }

      const searchAddress = `${address}, ${country}`
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&addressdetails=1`
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'PredictAgri-FarmerLocationService/1.0'
        }
      })

      if (response.data && response.data.length > 0) {
        const result = response.data[0]
        const locationData = {
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          displayName: result.display_name,
          address: result.address,
          confidence: this.calculateAddressConfidence(result, searchAddress),
          source: 'OpenStreetMap',
          timestamp: new Date().toISOString()
        }

        this.geocodingCache.set(cacheKey, locationData)
        this.logger.info('coordinates_fetched', { address, coordinates: `${locationData.lat}, ${locationData.lon}` })
        return locationData
      }

      throw new Error('No coordinates found for address')
    } catch (error) {
      this.logger.error('geocoding_failed', { address, error: error.message })
      return this.getFallbackCoordinates(address)
    }
  }

  // Get address from coordinates (reverse geocoding)
  async getAddressFromCoordinates(lat, lon) {
    try {
      const cacheKey = `${lat}_${lon}`
      if (this.reverseGeocodingCache.has(cacheKey)) {
        return this.reverseGeocodingCache.get(cacheKey)
      }

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&zoom=18`
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'PredictAgri-FarmerLocationService/1.0'
        }
      })

      if (response.data) {
        const result = response.data
        const addressData = {
          displayName: result.display_name,
          address: result.address,
          coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
          source: 'OpenStreetMap',
          timestamp: new Date().toISOString()
        }

        this.reverseGeocodingCache.set(cacheKey, addressData)
        return addressData
      }

      throw new Error('No address found for coordinates')
    } catch (error) {
      this.logger.error('reverse_geocoding_failed', { lat, lon, error: error.message })
      return this.getFallbackAddress(lat, lon)
    }
  }

  // Validate GPS coordinates
  validateCoordinates(lat, lon) {
    const isValidLat = lat >= -90 && lat <= 90
    const isValidLon = lon >= -180 && lon <= 180
    
    if (!isValidLat || !isValidLon) {
      return {
        valid: false,
        errors: [
          ...(isValidLat ? [] : ['Latitude must be between -90 and 90']),
          ...(isValidLon ? [] : ['Longitude must be between -180 and 180'])
        ]
      }
    }

    return { valid: true, errors: [] }
  }

  // Get location metadata (elevation, timezone, etc.)
  async getLocationMetadata(lat, lon) {
    try {
      // Get timezone data
      let timezoneData = null
      
      // Only try to fetch timezone if we have a valid API key
      if (process.env.TIMEZONE_API_KEY && process.env.TIMEZONE_API_KEY !== 'demo') {
        try {
          const timezoneUrl = `https://api.timezonedb.com/v2.1/get-time-zone?key=${process.env.TIMEZONE_API_KEY}&format=json&by=position&lat=${lat}&lng=${lon}`
          const timezoneResponse = await axios.get(timezoneUrl)
          if (timezoneResponse.data && timezoneResponse.data.status === 'OK') {
            timezoneData = {
              timezone: timezoneResponse.data.zoneName,
              gmtOffset: timezoneResponse.data.gmtOffset,
              dst: timezoneResponse.data.dst
            }
          }
        } catch (e) {
          this.logger.warn('timezone_fetch_failed', { error: e.message })
        }
      } else {
        this.logger.info('timezone_skipped', { reason: 'No valid API key provided' })
      }

      // Get elevation data (using OpenTopoData - free)
      let elevationData = null
      try {
        const elevationUrl = `https://api.opentopodata.org/v1/aster30m?locations=${lat},${lon}`
        const elevationResponse = await axios.get(elevationUrl)
        if (elevationResponse.data && elevationResponse.data.results) {
          elevationData = {
            elevation: elevationResponse.data.results[0].elevation,
            source: 'ASTER30m'
          }
        }
      } catch (e) {
        this.logger.warn('elevation_fetch_failed', { error: e.message })
        // Use fallback elevation data
        elevationData = {
          elevation: 200, // Default elevation in meters
          source: 'Fallback Data'
        }
      }

      return {
        coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
        timezone: timezoneData,
        elevation: elevationData,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('metadata_fetch_failed', { lat, lon, error: error.message })
      return this.getFallbackLocationMetadata(lat, lon)
    }
  }

  // Get comprehensive location data for a farmer
  async getFarmerLocationData(farmerInput) {
    try {
      let coordinates, address, metadata

      if (farmerInput.coordinates) {
        // If coordinates are provided, validate and get address
        const validation = this.validateCoordinates(farmerInput.coordinates.lat, farmerInput.coordinates.lon)
        if (!validation.valid) {
          throw new Error(`Invalid coordinates: ${validation.errors.join(', ')}`)
        }
        
        coordinates = farmerInput.coordinates
        address = await this.getAddressFromCoordinates(coordinates.lat, coordinates.lon)
        metadata = await this.getLocationMetadata(coordinates.lat, coordinates.lon)
      } else if (farmerInput.address) {
        // If address is provided, get coordinates
        coordinates = await this.getCoordinatesFromAddress(farmerInput.address, farmerInput.country)
        address = { displayName: farmerInput.address, coordinates }
        metadata = await this.getLocationMetadata(coordinates.lat, coordinates.lon)
      } else {
        throw new Error('Either coordinates or address must be provided')
      }

      // Calculate agricultural zone classification
      const agriculturalZone = this.classifyAgriculturalZone(coordinates.lat, coordinates.lon)
      
      // Get soil type classification based on coordinates
      const soilClassification = this.classifySoilType(coordinates.lat, coordinates.lon)

      const locationData = {
        farmerId: farmerInput.farmerId,
        coordinates,
        address,
        metadata,
        agriculturalZone,
        soilClassification,
        confidence: coordinates.confidence || 0.8,
        timestamp: new Date().toISOString()
      }

      this.logger.info('farmer_location_data_retrieved', { 
        farmerId: farmerInput.farmerId, 
        coordinates: `${coordinates.lat}, ${coordinates.lon}` 
      })

      return {
        success: true,
        data: locationData
      }
    } catch (error) {
      this.logger.error('farmer_location_data_failed', { 
        farmerInput, 
        error: error.message 
      })
      return {
        success: false,
        error: error.message,
        data: this.getFallbackFarmerLocationData(farmerInput)
      }
    }
  }

  // Classify agricultural zone based on coordinates
  classifyAgriculturalZone(lat, lon) {
    // Simple classification based on latitude and general Indian agricultural zones
    if (lat >= 28 && lat <= 37) {
      return { zone: 'Northern Plains', characteristics: ['Wheat', 'Rice', 'Cotton', 'Sugarcane'] }
    } else if (lat >= 20 && lat < 28) {
      return { zone: 'Central Plateau', characteristics: ['Cotton', 'Soybean', 'Pulses', 'Oilseeds'] }
    } else if (lat >= 8 && lat < 20) {
      return { zone: 'Southern Peninsula', characteristics: ['Rice', 'Coconut', 'Spices', 'Coffee'] }
    } else if (lat >= 37 && lat <= 42) {
      return { zone: 'Himalayan Region', characteristics: ['Apples', 'Temperate Fruits', 'Medicinal Herbs'] }
    } else {
      return { zone: 'Coastal Region', characteristics: ['Rice', 'Coconut', 'Fish Farming', 'Mangroves'] }
    }
  }

  // Classify soil type based on coordinates
  classifySoilType(lat, lon) {
    // Simplified soil classification based on Indian soil map
    if (lat >= 28 && lat <= 37) {
      return { 
        type: 'Alluvial Soil', 
        characteristics: ['Rich in minerals', 'Good water retention', 'Suitable for cereals'],
        npk: { n: 'High', p: 'Medium', k: 'Medium' }
      }
    } else if (lat >= 20 && lat < 28) {
      return { 
        type: 'Black Soil', 
        characteristics: ['High clay content', 'Good moisture retention', 'Suitable for cotton'],
        npk: { n: 'Medium', p: 'High', k: 'Low' }
      }
    } else if (lat >= 8 && lat < 20) {
      return { 
        type: 'Red Soil', 
        characteristics: ['Iron-rich', 'Well-drained', 'Suitable for pulses'],
        npk: { n: 'Low', p: 'Medium', k: 'High' }
      }
    } else {
      return { 
        type: 'Laterite Soil', 
        characteristics: ['Iron and aluminum rich', 'Well-drained', 'Suitable for plantation crops'],
        npk: { n: 'Low', p: 'Low', k: 'Medium' }
      }
    }
  }

  // Calculate address confidence score
  calculateAddressConfidence(result, searchAddress) {
    let confidence = 0.5 // Base confidence
    
    // Check if country matches
    if (result.address && result.address.country && 
        result.address.country.toLowerCase().includes('india')) {
      confidence += 0.2
    }
    
    // Check if state/province matches
    if (result.address && result.address.state) {
      confidence += 0.1
    }
    
    // Check if city matches
    if (result.address && result.address.city) {
      confidence += 0.1
    }
    
    // Check display name similarity
    const searchWords = searchAddress.toLowerCase().split(' ')
    const displayWords = result.display_name.toLowerCase().split(' ')
    const commonWords = searchWords.filter(word => displayWords.includes(word))
    confidence += (commonWords.length / searchWords.length) * 0.1
    
    return Math.min(confidence, 1.0)
  }

  // Fallback data generators for when services are unavailable
  getFallbackCoordinates(address) {
    const fallbackCoords = {
      'Nagpur, Maharashtra': { lat: 21.1458, lon: 79.0882 },
      'Punjab Region': { lat: 30.3753, lon: 69.3451 },
      'Haryana Plains': { lat: 29.0588, lon: 76.0856 },
      'Uttar Pradesh Central': { lat: 26.8467, lon: 80.9462 },
      'Maharashtra Western': { lat: 19.0760, lon: 72.8777 },
      'Karnataka Southern': { lat: 12.9716, lon: 77.5946 },
      'Tamil Nadu Coastal': { lat: 13.0827, lon: 80.2707 },
      'Gujarat Western': { lat: 23.0225, lon: 72.5714 },
      'Rajasthan Northern': { lat: 26.9124, lon: 75.7873 }
    }

    for (const [key, coords] of Object.entries(fallbackCoords)) {
      if (address.toLowerCase().includes(key.toLowerCase())) {
        return {
          ...coords,
          displayName: key,
          address: { country: 'India', state: key.split(', ')[1] || 'Unknown' },
          confidence: 0.9,
          source: 'Fallback Data',
          timestamp: new Date().toISOString()
        }
      }
    }

    // Default fallback coordinates (Delhi)
    return {
      lat: 28.6139,
      lon: 77.2090,
      displayName: 'Delhi, India',
      address: { country: 'India', state: 'Delhi' },
      confidence: 0.7,
      source: 'Fallback Data',
      timestamp: new Date().toISOString()
    }
  }

  getFallbackAddress(lat, lon) {
    return {
      displayName: 'Unknown Location',
      address: { country: 'India' },
      coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
      source: 'Fallback Data',
      timestamp: new Date().toISOString()
    }
  }

  getFallbackLocationMetadata(lat, lon) {
    return {
      coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
      timezone: { timezone: 'Asia/Kolkata', gmtOffset: 19800, dst: false },
      elevation: { elevation: 200, source: 'Fallback Data' },
      timestamp: new Date().toISOString()
    }
  }

  getFallbackFarmerLocationData(farmerInput) {
    const fallbackCoords = { lat: 21.1458, lon: 79.0882 } // Nagpur
    return {
      farmerId: farmerInput.farmerId || 'fallback_farmer_001',
      coordinates: fallbackCoords,
      address: { displayName: 'Nagpur, Maharashtra, India', coordinates: fallbackCoords },
      metadata: this.getFallbackLocationMetadata(fallbackCoords.lat, fallbackCoords.lon),
      agriculturalZone: this.classifyAgriculturalZone(fallbackCoords.lat, fallbackCoords.lon),
      soilClassification: this.classifySoilType(fallbackCoords.lat, fallbackCoords.lon),
      confidence: 0.8,
      timestamp: new Date().toISOString()
    }
  }

  // Clear cache
  clearCache() {
    this.geocodingCache.clear()
    this.reverseGeocodingCache.clear()
    this.logger.info('cache_cleared')
  }

  // Get cache statistics
  getCacheStats() {
    return {
      geocodingCacheSize: this.geocodingCache.size,
      reverseGeocodingCacheSize: this.reverseGeocodingCache.size,
      totalCacheSize: this.geocodingCache.size + this.reverseGeocodingCache.size
    }
  }
}

export const farmerLocationService = new FarmerLocationService()
export default farmerLocationService
