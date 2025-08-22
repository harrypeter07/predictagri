// Google Earth Engine Service for PredictAgri
// Handles satellite imagery, NDVI data, geographic analysis, and comprehensive soil data
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

  // Get comprehensive soil data for a region
  async getComprehensiveSoilData(region, date = new Date()) {
    try {
      if (this.fallbackMode) {
        return this.getMockComprehensiveSoilData(region, date)
      }

      this.checkApiLimits()
      await this.initialize()

      // Create region geometry
      const regionGeometry = ee.Geometry.Rectangle([
        region.lon - 0.1, region.lat - 0.1,
        region.lon + 0.1, region.lat + 0.1
      ])

      // Get multiple soil datasets
      const [soilMoisture, soilTemperature, soilOrganicCarbon, soilPh, soilTexture] = await Promise.all([
        this.getSoilMoistureData(regionGeometry, date),
        this.getSoilTemperatureData(regionGeometry, date),
        this.getSoilOrganicCarbonData(regionGeometry, date),
        this.getSoilPhData(regionGeometry, date),
        this.getSoilTextureData(regionGeometry, date)
      ])

      this.incrementApiCall()

      return {
        soilMoisture,
        soilTemperature,
        soilOrganicCarbon,
        soilPh,
        soilTexture,
        timestamp: date.toISOString(),
        source: 'Google Earth Engine',
        region: region.name,
        quality: 'high'
      }
    } catch (error) {
      console.error('Comprehensive soil data fetch failed:', error)
      this.handleError(error)
      return this.getMockComprehensiveSoilData(region, date)
    }
  }

  // Get soil moisture data
  async getSoilMoistureData(regionGeometry, date) {
    try {
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
      
      return {
        value: result,
        unit: 'm³/m³',
        interpretation: this.interpretSoilMoisture(result)
      }
    } catch (error) {
      console.error('Soil moisture data fetch failed:', error)
      return { value: null, unit: 'm³/m³', interpretation: 'Unknown' }
    }
  }

  // Get soil temperature data
  async getSoilTemperatureData(regionGeometry, date) {
    try {
      // Get MODIS land surface temperature as proxy for soil temperature
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
      const tempCelsius = (result * 0.02) - 273.15
      
      return {
        value: tempCelsius,
        unit: '°C',
        interpretation: this.interpretSoilTemperature(tempCelsius)
      }
    } catch (error) {
      console.error('Soil temperature data fetch failed:', error)
      return { value: null, unit: '°C', interpretation: 'Unknown' }
    }
  }

  // Get soil organic carbon data
  async getSoilOrganicCarbonData(regionGeometry, date) {
    try {
      // Get SoilGrids250m data for organic carbon
      const soilGridsCollection = ee.ImageCollection('projects/soilgrids-isric/clay_mean')
        .filterBounds(regionGeometry)
        .first()

      const stats = soilGridsCollection.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 250,
        maxPixels: 1e6
      })

      const result = await stats.get('clay_mean').getInfo()
      
      return {
        value: result,
        unit: 'g/kg',
        interpretation: this.interpretOrganicCarbon(result)
      }
    } catch (error) {
      console.error('Soil organic carbon data fetch failed:', error)
      return { value: null, unit: 'g/kg', interpretation: 'Unknown' }
    }
  }

  // Get soil pH data
  async getSoilPhData(regionGeometry, date) {
    try {
      // Get SoilGrids250m data for pH
      const soilGridsCollection = ee.ImageCollection('projects/soilgrids-isric/phh2o_mean')
        .filterBounds(regionGeometry)
        .first()

      const stats = soilGridsCollection.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 250,
        maxPixels: 1e6
      })

      const result = await stats.get('phh2o_mean').getInfo()
      
      return {
        value: result,
        unit: 'pH',
        interpretation: this.interpretSoilPh(result)
      }
    } catch (error) {
      console.error('Soil pH data fetch failed:', error)
      return { value: null, unit: 'pH', interpretation: 'Unknown' }
    }
  }

  // Get soil texture data
  async getSoilTextureData(regionGeometry, date) {
    try {
      // Get SoilGrids250m data for texture components
      const [clayCollection, siltCollection, sandCollection] = await Promise.all([
        ee.ImageCollection('projects/soilgrids-isric/clay_mean').first(),
        ee.ImageCollection('projects/soilgrids-isric/silt_mean').first(),
        ee.ImageCollection('projects/soilgrids-isric/sand_mean').first()
      ])

      const [clayStats, siltStats, sandStats] = await Promise.all([
        clayCollection.reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: regionGeometry,
          scale: 250,
          maxPixels: 1e6
        }),
        siltCollection.reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: regionGeometry,
          scale: 250,
          maxPixels: 1e6
        }),
        sandCollection.reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: regionGeometry,
          scale: 250,
          maxPixels: 1e6
        })
      ])

      const clay = await clayStats.get('clay_mean').getInfo()
      const silt = await siltStats.get('silt_mean').getInfo()
      const sand = await sandStats.get('sand_mean').getInfo()
      
      const texture = this.classifySoilTexture(clay, silt, sand)
      
      return {
        clay: { value: clay, unit: '%' },
        silt: { value: silt, unit: '%' },
        sand: { value: sand, unit: '%' },
        texture: texture,
        interpretation: this.interpretSoilTexture(texture)
      }
    } catch (error) {
      console.error('Soil texture data fetch failed:', error)
      return {
        clay: { value: null, unit: '%' },
        silt: { value: null, unit: '%' },
        sand: { value: null, unit: '%' },
        texture: 'Unknown',
        interpretation: 'Unknown'
      }
    }
  }

  // Get land use and land cover data
  async getLandUseData(region, date = new Date()) {
    try {
      if (this.fallbackMode) {
        return this.getMockLandUseData(region, date)
      }

      this.checkApiLimits()
      await this.initialize()

      const regionGeometry = ee.Geometry.Rectangle([
        region.lon - 0.1, region.lat - 0.1,
        region.lon + 0.1, region.lat + 0.1
      ])

      // Get ESA WorldCover data
      const worldCoverCollection = ee.ImageCollection('ESA/WorldCover/v100')
        .filterBounds(regionGeometry)
        .filterDate(date, new Date(date.getTime() + 365 * 24 * 60 * 60 * 1000))
        .first()

      const stats = worldCoverCollection.reduceRegion({
        reducer: ee.Reducer.frequencyHistogram(),
        geometry: regionGeometry,
        scale: 10,
        maxPixels: 1e6
      })

      const result = await stats.get('Map').getInfo()
      
      // Process the frequency histogram to get dominant land cover
      const landCoverTypes = this.processLandCoverHistogram(result)
      
      this.incrementApiCall()

      return {
        landCoverTypes,
        dominantCover: landCoverTypes[0]?.type || 'Unknown',
        timestamp: date.toISOString(),
        source: 'Google Earth Engine (ESA WorldCover)',
        region: region.name,
        quality: 'high'
      }
    } catch (error) {
      console.error('Land use data fetch failed:', error)
      this.handleError(error)
      return this.getMockLandUseData(region, date)
    }
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
        quality: 'high',
        interpretation: this.interpretNDVI(result / 10000)
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

  // Get comprehensive satellite data for a region
  async getComprehensiveSatelliteData(region, date = new Date()) {
    try {
      if (this.fallbackMode) {
        return this.getMockComprehensiveData(region, date)
      }

      this.checkApiLimits()
      await this.initialize()

      // Get all data types in parallel
      const [ndviData, temperatureData, soilData, landUseData] = await Promise.all([
        this.getNDVIData(region, date),
        this.getLandSurfaceTemperature(region, date),
        this.getComprehensiveSoilData(region, date),
        this.getLandUseData(region, date)
      ])

      return {
        ndvi: ndviData.ndvi,
        landSurfaceTemperature: temperatureData.temperature,
        soil: soilData,
        landUse: landUseData,
        timestamp: date.toISOString(),
        source: 'Google Earth Engine',
        region: region.name,
        quality: 'high',
        dataTypes: ['NDVI', 'Land Surface Temperature', 'Comprehensive Soil Data', 'Land Use Classification']
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

  // Interpretation methods
  interpretNDVI(ndvi) {
    if (ndvi > 0.6) return 'High vegetation density'
    if (ndvi > 0.4) return 'Moderate vegetation density'
    if (ndvi > 0.2) return 'Low vegetation density'
    if (ndvi > 0.1) return 'Sparse vegetation'
    return 'Bare soil or water'
  }

  interpretSoilMoisture(moisture) {
    if (moisture > 0.4) return 'Very wet'
    if (moisture > 0.3) return 'Wet'
    if (moisture > 0.2) return 'Moderate'
    if (moisture > 0.1) return 'Dry'
    return 'Very dry'
  }

  interpretSoilTemperature(temp) {
    if (temp > 30) return 'Very hot'
    if (temp > 25) return 'Hot'
    if (temp > 20) return 'Warm'
    if (temp > 15) return 'Moderate'
    if (temp > 10) return 'Cool'
    return 'Cold'
  }

  interpretOrganicCarbon(carbon) {
    if (carbon > 20) return 'Very high organic content'
    if (carbon > 15) return 'High organic content'
    if (carbon > 10) return 'Moderate organic content'
    if (carbon > 5) return 'Low organic content'
    return 'Very low organic content'
  }

  interpretSoilPh(ph) {
    if (ph < 5.5) return 'Acidic'
    if (ph < 6.5) return 'Slightly acidic'
    if (ph < 7.5) return 'Neutral'
    if (ph < 8.5) return 'Slightly alkaline'
    return 'Alkaline'
  }

  classifySoilTexture(clay, silt, sand) {
    // USDA soil texture classification
    if (clay >= 40) return 'Clay'
    if (clay >= 27 && clay < 40) return 'Clay Loam'
    if (clay >= 20 && clay < 27) return 'Silty Clay Loam'
    if (clay >= 20 && clay < 35 && silt >= 40) return 'Silty Clay'
    if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50) return 'Loam'
    if (silt >= 50 && clay < 27) return 'Silt Loam'
    if (sand >= 50 && clay < 20) return 'Sandy Loam'
    if (sand >= 70) return 'Sand'
    return 'Loam'
  }

  interpretSoilTexture(texture) {
    const interpretations = {
      'Clay': 'High water retention, slow drainage, good for rice',
      'Clay Loam': 'Good water retention, moderate drainage, versatile',
      'Silty Clay Loam': 'High fertility, good water retention',
      'Silty Clay': 'High fertility, moderate drainage',
      'Loam': 'Ideal soil texture, balanced properties',
      'Silt Loam': 'Good fertility, moderate drainage',
      'Sandy Loam': 'Good drainage, moderate fertility',
      'Sand': 'Fast drainage, low fertility, good for root crops'
    }
    return interpretations[texture] || 'Unknown soil texture'
  }

  interpretVHI(vhi) {
    if (vhi > 0.6) return 'Excellent'
    if (vhi > 0.4) return 'Good'
    if (vhi > 0.2) return 'Fair'
    return 'Poor'
  }

  // Process land cover histogram
  processLandCoverHistogram(histogram) {
    if (!histogram) return []
    
    const landCoverMap = {
      '10': 'Tree cover',
      '20': 'Shrubland',
      '30': 'Grassland',
      '40': 'Cultivated and managed vegetation',
      '50': 'Urban/built-up',
      '60': 'Bare/sparse vegetation',
      '70': 'Snow and ice',
      '80': 'Permanent water bodies',
      '90': 'Herbaceous vegetation',
      '95': 'Mangroves',
      '100': 'Moss and lichen'
    }

    const entries = Object.entries(histogram)
      .map(([key, value]) => ({
        type: landCoverMap[key] || `Unknown (${key})`,
        code: key,
        percentage: (value / Object.values(histogram).reduce((a, b) => a + b, 0)) * 100
      }))
      .sort((a, b) => b.percentage - a.percentage)

    return entries
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
      quality: 'low',
      interpretation: this.interpretNDVI(Math.max(0, Math.min(1, baseNDVI)))
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

  getMockComprehensiveSoilData(region, date) {
    return {
      soilMoisture: { value: 0.25, unit: 'm³/m³', interpretation: 'Moderate' },
      soilTemperature: { value: 22, unit: '°C', interpretation: 'Warm' },
      soilOrganicCarbon: { value: 12, unit: 'g/kg', interpretation: 'Moderate organic content' },
      soilPh: { value: 6.8, unit: 'pH', interpretation: 'Neutral' },
      soilTexture: {
        clay: { value: 25, unit: '%' },
        silt: { value: 35, unit: '%' },
        sand: { value: 40, unit: '%' },
        texture: 'Loam',
        interpretation: 'Ideal soil texture, balanced properties'
      },
      timestamp: date.toISOString(),
      source: 'Mock Data (Fallback)',
      region: region.name,
      quality: 'low'
    }
  }

  getMockLandUseData(region, date) {
    return {
      landCoverTypes: [
        { type: 'Cultivated and managed vegetation', code: '40', percentage: 60 },
        { type: 'Tree cover', code: '10', percentage: 20 },
        { type: 'Grassland', code: '30', percentage: 15 },
        { type: 'Urban/built-up', code: '50', percentage: 5 }
      ],
      dominantCover: 'Cultivated and managed vegetation',
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
      soil: this.getMockComprehensiveSoilData(region, date),
      landUse: this.getMockLandUseData(region, date),
      timestamp: date.toISOString(),
      source: 'Mock Data (Fallback)',
      region: region.name,
      quality: 'low',
      dataTypes: ['Mock NDVI', 'Mock Temperature', 'Mock Soil Data', 'Mock Land Use']
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
