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
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
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
            .catch(() => resolve(this.getDefaultLocation()));
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
      
      return {
        lat: parseFloat(data.latitude),
        lon: parseFloat(data.longitude),
        city: data.city,
        region: data.region,
        country: data.country,
        source: 'ip_geolocation',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
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
}

export default LocationService;
