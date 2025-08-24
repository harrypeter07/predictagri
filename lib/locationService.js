/**
 * Location Service for PredictAgri
 * Handles user location detection and fallback coordinates
 */

class LocationService {
  constructor() {
    this.defaultLocations = {
      nagpur: { lat: 21.1458, lon: 79.0882, name: 'Nagpur, Maharashtra' },
      mumbai: { lat: 19.0760, lon: 72.8777, name: 'Mumbai, Maharashtra' },
      pune: { lat: 18.5204, lon: 73.8567, name: 'Pune, Maharashtra' },
      delhi: { lat: 28.7041, lon: 77.1025, name: 'Delhi, NCR' },
      bangalore: { lat: 12.9716, lon: 77.5946, name: 'Bangalore, Karnataka' },
      chennai: { lat: 13.0827, lon: 80.2707, name: 'Chennai, Tamil Nadu' },
      kolkata: { lat: 22.5726, lon: 88.3639, name: 'Kolkata, West Bengal' },
      hyderabad: { lat: 17.3850, lon: 78.4867, name: 'Hyderabad, Telangana' }
    };
  }

  /**
   * Get user's current location using browser geolocation
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || !navigator.geolocation) {
        // Server-side fallback
        this.getIPBasedLocation()
          .then(resolve)
          .catch(() => {
            console.warn('IP geolocation failed, using default location');
            resolve(this.getDefaultLocation());
          });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'browser_geolocation',
            timestamp: new Date().toISOString()
          };
          resolve(location);
        },
        (error) => {
          console.warn('Geolocation failed:', error.message);
          // Fallback to IP-based location or default
          this.getIPBasedLocation()
            .then(resolve)
            .catch(() => {
              console.warn('IP geolocation failed, using default location');
              resolve(this.getDefaultLocation());
            });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  /**
   * Get location based on IP address (fallback)
   */
  async getIPBasedLocation() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      const lat = parseFloat(data.latitude);
      const lon = parseFloat(data.longitude);
      
      // Validate that we got valid coordinates
      if (isNaN(lat) || isNaN(lon) || !this.validateCoordinates(lat, lon)) {
        throw new Error('Invalid coordinates from IP geolocation');
      }
      
      return {
        lat: lat,
        lon: lon,
        city: data.city,
        region: data.region,
        country: data.country,
        source: 'ip_geolocation',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('IP geolocation failed:', error.message);
      throw new Error('IP geolocation failed');
    }
  }

  /**
   * Get default location (Nagpur as primary)
   */
  getDefaultLocation() {
    return {
      ...this.defaultLocations.nagpur,
      source: 'default_location',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get location by name
   */
  getLocationByName(name) {
    const location = this.defaultLocations[name.toLowerCase()];
    if (location) {
      return {
        ...location,
        source: 'named_location',
        timestamp: new Date().toISOString()
      };
    }
    return this.getDefaultLocation();
  }

  /**
   * Get agricultural region info based on coordinates
   */
  getAgriculturalRegion(lat, lon) {
    // Simple region classification based on coordinates
    if (lat >= 20 && lat <= 22 && lon >= 78 && lon <= 80) {
      return {
        region: 'Vidarbha',
        state: 'Maharashtra',
        climate: 'Tropical Savanna',
        soilType: 'Black Cotton Soil',
        majorCrops: ['Cotton', 'Soybean', 'Turmeric', 'Orange']
      };
    } else if (lat >= 18 && lat <= 20 && lon >= 72 && lon <= 74) {
      return {
        region: 'Konkan',
        state: 'Maharashtra',
        climate: 'Tropical Monsoon',
        soilType: 'Laterite Soil',
        majorCrops: ['Rice', 'Coconut', 'Cashew', 'Mango']
      };
    } else if (lat >= 28 && lat <= 30 && lon >= 76 && lon <= 78) {
      return {
        region: 'Haryana',
        state: 'Haryana',
        climate: 'Semi-arid',
        soilType: 'Alluvial Soil',
        majorCrops: ['Wheat', 'Rice', 'Bajra', 'Cotton']
      };
    } else {
      return {
        region: 'General',
        state: 'India',
        climate: 'Tropical',
        soilType: 'Mixed',
        majorCrops: ['Rice', 'Wheat', 'Pulses', 'Vegetables']
      };
    }
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(lat, lon) {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Get location with fallback - tries multiple methods
   */
  async getLocationWithFallback() {
    try {
      // First try browser geolocation
      const location = await this.getCurrentLocation();
      return location;
    } catch (error) {
      console.warn('Location fallback chain failed:', error);
      // Return default location as last resort
      return this.getDefaultLocation();
    }
  }

  /**
   * Get address from coordinates (reverse geocoding)
   */
  async getAddressFromCoordinates(lat, lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&zoom=18`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PredictAgri-LocationService/1.0'
        }
      })

      if (response.ok) {
        const result = await response.json()
        return {
          displayName: result.display_name,
          address: result.address,
          components: result.address,
          coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
          source: 'OpenStreetMap',
          timestamp: new Date().toISOString()
        };
      }

      throw new Error('No address found for coordinates')
    } catch (error) {
      console.warn('Reverse geocoding failed:', error.message)
      // Return fallback address data
      return {
        displayName: `Location at ${lat}, ${lon}`,
        address: {},
        components: {
          city: 'Unknown City',
          town: 'Unknown Town',
          village: 'Unknown Village',
          state: 'Unknown State',
          country: 'Unknown Country'
        },
        coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
        source: 'fallback',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get location information by query (geocoding)
   */
  async getLocationInfo(query) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PredictAgri-LocationService/1.0'
        }
      })

      if (response.ok) {
        const results = await response.json()
        if (results && results.length > 0) {
          const result = results[0]
          return {
            displayName: result.display_name,
            address: result.address,
            coordinates: { 
              lat: parseFloat(result.lat), 
              lon: parseFloat(result.lon) 
            },
            source: 'OpenStreetMap',
            timestamp: new Date().toISOString()
          };
        }
      }

      throw new Error('No location found for query')
    } catch (error) {
      console.warn('Geocoding failed:', error.message)
      // Return fallback location data
      return {
        displayName: `Location: ${query}`,
        address: {},
        coordinates: { lat: 0, lon: 0 },
        source: 'fallback',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get current location weather data (placeholder for weather integration)
   */
  async getCurrentLocationWeather() {
    try {
      const location = await this.getLocationWithFallback();
      // This would integrate with weather service
      // For now, return mock data
      return {
        location: location,
        weather: {
          current: {
            temperature_2m: 25 + Math.random() * 10,
            relative_humidity_2m: 60 + Math.random() * 30,
            wind_speed_10m: 5 + Math.random() * 10
          },
          daily: {
            precipitation_sum: [0, 0, 0, 0, 0, 0, 0]
          }
        }
      };
    } catch (error) {
      console.warn('Weather data fetch failed:', error);
      return {
        location: this.getDefaultLocation(),
        weather: null
      };
    }
  }
}

export default LocationService;
