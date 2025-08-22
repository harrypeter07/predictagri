// Google Earth Engine Service for PredictAgri
// Handles satellite imagery, NDVI data, and geographic analysis
// Includes comprehensive error handling and fallback systems

const ee = require('@google/earthengine')
const isDebug = (process.env.DEBUG && process.env.DEBUG.includes('google-earth-engine')) || process.env.EE_DEBUG === '1'
if (isDebug) {
  try {
    console.log('[GEE][debug] ee loaded. keys:', Object.keys(ee || {}))
    console.log('[GEE][debug] ee.data available:', !!(ee && ee.data))
  } catch {}
}

class GoogleEarthEngineService {
  constructor() {
    this.isInitialized = false
    this.apiCallCount = 0
    this.maxApiCalls = 1000 // Daily limit for free tier
    this.lastResetTime = new Date()
    this.errorCount = 0
    this.maxErrors = 5
    this.fallbackMode = false
  }

  // Initialize Google Earth Engine
  async initialize() {
    try {
      if (this.isInitialized) return true

      // Check if we have the required credentials
      const hasCredentials = await this.checkCredentials()
      if (isDebug) {
        console.log('[GEE][debug] hasCredentials:', hasCredentials)
      }
      if (!hasCredentials) {
        console.warn('Google Earth Engine credentials not found, using fallback mode')
        this.fallbackMode = true
        return false
      }

      // Initialize Earth Engine (callback style)
      if (isDebug) console.log('[GEE][debug] initializing ee...')
      await new Promise((resolve, reject) => {
        try {
          ee.initialize(null, null, () => resolve(), (err) => reject(err))
        } catch (err) {
          reject(err)
        }
      })
      this.isInitialized = true
      console.log('Google Earth Engine initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize Google Earth Engine:', error?.message || error)
      if (isDebug) {
        console.error('[GEE][debug] init error stack:', error?.stack)
      }
      this.fallbackMode = true
      return false
    }
  }

  // Check if we have valid credentials
  async checkCredentials() {
    try {
      // Check for environment variables
      const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
      const hasKey = !!process.env.GOOGLE_PRIVATE_KEY
      const hasProject = !!process.env.GOOGLE_PROJECT_ID
      const hasServiceAccount = hasEmail && hasKey
      if (isDebug) {
        console.log('[GEE][debug] env presence:', {
          GOOGLE_SERVICE_ACCOUNT_EMAIL: hasEmail,
          GOOGLE_PRIVATE_KEY: hasKey,
          GOOGLE_PROJECT_ID: hasProject
        })
      }
      
      if (hasServiceAccount) {
        // Authenticate with service account
        await this.authenticateServiceAccount()
        return true
      }

      // Check for user authentication
      const hasUserAuth = await this.checkUserAuthentication()
      return hasUserAuth
    } catch (error) {
      console.error('Credential check failed:', error)
      return false
    }
  }

  // Authenticate with service account
  async authenticateServiceAccount() {
    try {
      const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
      const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      const projectId = process.env.GOOGLE_PROJECT_ID

      const credentials = {
        type: 'service_account',
        client_email: serviceAccountEmail,
        private_key: privateKey,
        project_id: projectId,
        token_uri: 'https://oauth2.googleapis.com/token'
      }

      if (isDebug) {
        console.log('[GEE][debug] authenticating via private key with:', {
          hasEmail: !!serviceAccountEmail,
          emailDomain: serviceAccountEmail ? serviceAccountEmail.split('@')[1] : undefined,
          hasPrivateKey: !!privateKey,
          privateKeyStartsWith: privateKey ? privateKey.slice(0, 27) : undefined,
          projectIdPresent: !!projectId
        })
      }

      await new Promise((resolve, reject) => {
        try {
          if (!ee || !ee.data || !ee.data.authenticateViaPrivateKey) {
            const err = new Error('ee.data.authenticateViaPrivateKey is not available')
            return reject(err)
          }
          ee.data.authenticateViaPrivateKey(credentials, () => resolve(), (err) => reject(err))
        } catch (err) {
          reject(err)
        }
      })

      console.log('Service account authentication successful')
    } catch (error) {
      console.error('Service account authentication failed:', error?.message || error)
      if (isDebug) {
        const resp = error?.response
        console.error('[GEE][debug] auth error details:', {
          code: error?.code,
          stack: error?.stack,
          responseStatus: resp?.status,
          responseData: resp?.data,
          responseHeaders: resp?.headers
        })
      }
      throw error
    }
  }

  // Check user authentication
  async checkUserAuthentication() {
    try {
      // This would typically check for user login state
      // For now, we'll assume it's not available
      return false
    } catch (error) {
      console.error('User authentication check failed:', error)
      return false
    }
  }

  // Check API call limits
  checkApiLimits() {
    const now = new Date()
    const hoursSinceReset = (now - this.lastResetTime) / (1000 * 60 * 60)
    
    // Reset counter if 24 hours have passed
    if (hoursSinceReset >= 24) {
      this.apiCallCount = 0
      this.lastResetTime = now
      this.errorCount = 0
    }

    // Check if we've exceeded limits
    if (this.apiCallCount >= this.maxApiCalls) {
      throw new Error('Daily API call limit exceeded. Please try again tomorrow or upgrade your plan.')
    }

    if (this.errorCount >= this.maxErrors) {
      throw new Error('Too many consecutive errors. Switching to fallback mode.')
    }

    return true
  }

  // Increment API call counter
  incrementApiCall() {
    this.apiCallCount++
    console.log(`API call ${this.apiCallCount}/${this.maxApiCalls} used today`)
  }

  // Get NDVI data for a specific region
  async getNDVIData(region, date = new Date()) {
    try {
      if (this.fallbackMode) {
        return this.getMockNDVIData(region, date)
      }

      this.checkApiLimits()
      await this.initialize()

      // Create region geometry
      const regionGeometry = ee.Geometry.Rectangle([
        region.lon - 0.1, region.lat - 0.1,
        region.lon + 0.1, region.lat + 0.1
      ])

      // Get MODIS NDVI data
      const ndviCollection = ee.ImageCollection('MODIS/006/MOD13Q1')
        .filterBounds(regionGeometry)
        .filterDate(date, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        .select('NDVI')

      // Get the most recent image
      const ndviImage = ndviCollection.first()
      
      // Calculate statistics
      const stats = ndviImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 250,
        maxPixels: 1e6
      })

      const result = await stats.get('NDVI').getInfo()
      this.incrementApiCall()

      return {
        ndvi: result / 10000, // MODIS NDVI is scaled by 10000
        timestamp: date.toISOString(),
        source: 'Google Earth Engine',
        region: region.name,
        quality: 'high'
      }
    } catch (error) {
      console.error('NDVI data fetch failed:', error)
      this.handleError(error)
      return this.getMockNDVIData(region, date)
    }
  }

  // Get land surface temperature data
  async getLandSurfaceTemperature(region, date = new Date()) {
    try {
      if (this.fallbackMode) {
        return this.getMockTemperatureData(region, date)
      }

      this.checkApiLimits()
      await this.initialize()

      const regionGeometry = ee.Geometry.Rectangle([
        region.lon - 0.1, region.lat - 0.1,
        region.lon + 0.1, region.lat + 0.1
      ])

      // Get MODIS land surface temperature
      const lstCollection = ee.ImageCollection('MODIS/006/MOD11A1')
        .filterBounds(regionGeometry)
        .filterDate(date, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        .select('LST_Day_1km')

      const lstImage = lstCollection.first()
      
      const stats = lstImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 1000,
        maxPixels: 1e6
      })

      const result = await stats.get('LST_Day_1km').getInfo()
      this.incrementApiCall()

      return {
        temperature: (result * 0.02) - 273.15, // Convert from Kelvin to Celsius
        timestamp: date.toISOString(),
        source: 'Google Earth Engine',
        region: region.name,
        quality: 'high'
      }
    } catch (error) {
      console.error('Land surface temperature fetch failed:', error)
      this.handleError(error)
      return this.getMockTemperatureData(region, date)
    }
  }

  // Get soil moisture data
  async getSoilMoisture(region, date = new Date()) {
    try {
      if (this.fallbackMode) {
        return this.getMockSoilMoistureData(region, date)
      }

      this.checkApiLimits()
      await this.initialize()

      const regionGeometry = ee.Geometry.Rectangle([
        region.lon - 0.1, region.lat - 0.1,
        region.lon + 0.1, region.lat + 0.1
      ])

      // Get SMAP soil moisture data
      const smapCollection = ee.ImageCollection('NASA/SMAP/SPL3SMP_E/005')
        .filterBounds(regionGeometry)
        .filterDate(date, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        .select('soil_moisture_am')

      const smapImage = smapCollection.first()
      
      const stats = smapImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 9000,
        maxPixels: 1e6
      })

      const result = await stats.get('soil_moisture_am').getInfo()
      this.incrementApiCall()

      return {
        soilMoisture: result,
        timestamp: date.toISOString(),
        source: 'Google Earth Engine',
        region: region.name,
        quality: 'high'
      }
    } catch (error) {
      console.error('Soil moisture fetch failed:', error)
      this.handleError(error)
      return this.getMockSoilMoistureData(region, date)
    }
  }

  // Get comprehensive satellite data for a region
  async getComprehensiveSatelliteData(region, date = new Date()) {
    try {
      if (this.fallbackMode) {
        return this.getMockComprehensiveData(region, date)
      }

      this.checkApiLimits()
      await this.initialize()

      // Get all data types in parallel
      const [ndviData, temperatureData, soilMoistureData] = await Promise.all([
        this.getNDVIData(region, date),
        this.getLandSurfaceTemperature(region, date),
        this.getSoilMoisture(region, date)
      ])

      return {
        ndvi: ndviData.ndvi,
        landSurfaceTemperature: temperatureData.temperature,
        soilMoisture: soilMoistureData.soilMoisture,
        timestamp: date.toISOString(),
        source: 'Google Earth Engine',
        region: region.name,
        quality: 'high',
        dataTypes: ['NDVI', 'Land Surface Temperature', 'Soil Moisture']
      }
    } catch (error) {
      console.error('Comprehensive satellite data fetch failed:', error)
      this.handleError(error)
      return this.getMockComprehensiveData(region, date)
    }
  }

  // Get vegetation health index
  async getVegetationHealthIndex(region, date = new Date()) {
    try {
      if (this.fallbackMode) {
        return this.getMockVegetationHealthData(region, date)
      }

      this.checkApiLimits()
      await this.initialize()

      const regionGeometry = ee.Geometry.Rectangle([
        region.lon - 0.1, region.lat - 0.1,
        region.lon + 0.1, region.lat + 0.1
      ])

      // Calculate VHI using NDVI and temperature
      const ndviCollection = ee.ImageCollection('MODIS/006/MOD13Q1')
        .filterBounds(regionGeometry)
        .filterDate(date, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        .select('NDVI')

      const lstCollection = ee.ImageCollection('MODIS/006/MOD11A1')
        .filterBounds(regionGeometry)
        .filterDate(date, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        .select('LST_Day_1km')

      const ndviImage = ndviCollection.first()
      const lstImage = lstCollection.first()

      // Calculate VHI (Vegetation Health Index)
      const vhi = ndviImage.multiply(0.5).add(lstImage.multiply(0.5))
      
      const stats = vhi.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 250,
        maxPixels: 1e6
      })

      const result = await stats.get('NDVI').getInfo()
      this.incrementApiCall()

      return {
        vhi: result,
        healthStatus: this.interpretVHI(result),
        timestamp: date.toISOString(),
        source: 'Google Earth Engine',
        region: region.name,
        quality: 'high'
      }
    } catch (error) {
      console.error('Vegetation health index fetch failed:', error)
      this.handleError(error)
      return this.getMockVegetationHealthData(region, date)
    }
  }

  // Interpret VHI values
  interpretVHI(vhi) {
    if (vhi > 0.6) return 'Excellent'
    if (vhi > 0.4) return 'Good'
    if (vhi > 0.2) return 'Fair'
    return 'Poor'
  }

  // Handle errors and implement fallback logic
  handleError(error) {
    this.errorCount++
    
    if (this.errorCount >= this.maxErrors) {
      console.warn('Too many errors, switching to fallback mode')
      this.fallbackMode = true
    }

    // Log error details for debugging
    console.error('Google Earth Engine Error:', {
      message: error.message,
      code: error.code,
      errorCount: this.errorCount,
      fallbackMode: this.fallbackMode
    })
  }

  // Mock data generators for fallback mode
  getMockNDVIData(region, date) {
    const baseNDVI = 0.6 + (Math.random() - 0.5) * 0.4
    return {
      ndvi: Math.max(0, Math.min(1, baseNDVI)),
      timestamp: date.toISOString(),
      source: 'Mock Data (Fallback)',
      region: region.name,
      quality: 'low'
    }
  }

  getMockTemperatureData(region, date) {
    const baseTemp = 25 + (Math.random() - 0.5) * 20
    return {
      temperature: baseTemp,
      timestamp: date.toISOString(),
      source: 'Mock Data (Fallback)',
      region: region.name,
      quality: 'low'
    }
  }

  getMockSoilMoistureData(region, date) {
    const baseMoisture = 0.4 + (Math.random() - 0.5) * 0.4
    return {
      soilMoisture: Math.max(0, Math.min(1, baseMoisture)),
      timestamp: date.toISOString(),
      source: 'Mock Data (Fallback)',
      region: region.name,
      quality: 'low'
    }
  }

  getMockComprehensiveData(region, date) {
    return {
      ndvi: this.getMockNDVIData(region, date).ndvi,
      landSurfaceTemperature: this.getMockTemperatureData(region, date).temperature,
      soilMoisture: this.getMockSoilMoistureData(region, date).soilMoisture,
      timestamp: date.toISOString(),
      source: 'Mock Data (Fallback)',
      region: region.name,
      quality: 'low',
      dataTypes: ['Mock NDVI', 'Mock Temperature', 'Mock Soil Moisture']
    }
  }

  getMockVegetationHealthData(region, date) {
    const vhi = 0.5 + (Math.random() - 0.5) * 0.4
    return {
      vhi: Math.max(0, Math.min(1, vhi)),
      healthStatus: this.interpretVHI(vhi),
      timestamp: date.toISOString(),
      source: 'Mock Data (Fallback)',
      region: region.name,
      quality: 'low'
    }
  }

  // Get service status
  getServiceStatus() {
    return {
      isInitialized: this.isInitialized,
      fallbackMode: this.fallbackMode,
      apiCallCount: this.apiCallCount,
      maxApiCalls: this.maxApiCalls,
      errorCount: this.errorCount,
      maxErrors: this.maxErrors,
      lastResetTime: this.lastResetTime,
      remainingCalls: this.maxApiCalls - this.apiCallCount
    }
  }

  // Reset error counter
  resetErrorCounter() {
    this.errorCount = 0
    console.log('Error counter reset')
  }

  // Force fallback mode
  enableFallbackMode() {
    this.fallbackMode = true
    console.log('Fallback mode enabled manually')
  }

  // Disable fallback mode
  disableFallbackMode() {
    this.fallbackMode = false
    console.log('Fallback mode disabled')
  }
}

export const googleEarthEngineService = new GoogleEarthEngineService()
export default googleEarthEngineService
