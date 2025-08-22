// Google Earth Engine Service for PredictAgri
// Handles satellite imagery, NDVI data, geographic analysis, and comprehensive soil data
// Includes comprehensive error handling and fallback systems

let ee = null

// Function to initialize Google Earth Engine
async function initializeGEE() {
  if (ee) return ee
  
  try {
    const earthengine = await import('@google/earthengine')
    ee = earthengine.default || earthengine
    return ee
  } catch (error) {
    console.warn('🌍 [GEE] Google Earth Engine library not available:', error.message)
    return null
  }
}

const isDebug = false // Disable debug logging

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

      // Check if Google Earth Engine library is available
      const gee = await initializeGEE()
      if (!gee) {
        console.warn('🌍 [GEE] Google Earth Engine library not available, using fallback mode')
        this.fallbackMode = true
        return false
      }

      // Set the global ee variable
      ee = gee

      // Check if we have the required credentials
      const hasCredentials = await this.checkCredentials()
      if (!hasCredentials) {
        console.warn('🌍 [GEE] Google Earth Engine credentials not found, using fallback mode')
        this.fallbackMode = true
        return false
      }

      // Initialize Earth Engine (callback style)
      await new Promise((resolve, reject) => {
        try {
          ee.initialize(null, null, () => resolve(), (err) => reject(err))
        } catch (err) {
          reject(err)
        }
      })
      this.isInitialized = true
      console.log('🌍 [GEE] Google Earth Engine initialized successfully')
      return true
    } catch (error) {
      console.error('🌍 [GEE] Failed to initialize Google Earth Engine:', error?.message || error)
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
      // Check for environment variables (using the names from env.example)
      const hasEmail = !!process.env.GOOGLE_EARTH_ENGINE_CLIENT_EMAIL
      const hasKey = !!process.env.GOOGLE_EARTH_ENGINE_PRIVATE_KEY
      const hasServiceAccount = hasEmail && hasKey

      
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
      const serviceAccountEmail = process.env.GOOGLE_EARTH_ENGINE_CLIENT_EMAIL
      const privateKey = process.env.GOOGLE_EARTH_ENGINE_PRIVATE_KEY.replace(/\\n/g, '\n')

      const credentials = {
        type: 'service_account',
        client_email: serviceAccountEmail,
        private_key: privateKey,
        token_uri: 'https://oauth2.googleapis.com/token'
      }

      if (isDebug) {
        console.log('[GEE][debug] authenticating via private key with:', {
          hasEmail: !!serviceAccountEmail,
          emailDomain: serviceAccountEmail ? serviceAccountEmail.split('@')[1] : undefined,
          hasPrivateKey: !!privateKey,
          privateKeyStartsWith: privateKey ? privateKey.slice(0, 27) : undefined
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
    console.log(`🌍 [GEE] Starting comprehensive soil data fetch for region: ${region.name} (${region.lat}, ${region.lon}) at ${date.toISOString()}`)
    
    try {
      if (this.fallbackMode || !ee) {
        console.log(`🌍 [GEE] Using fallback mode for comprehensive soil data`)
        return this.getFallbackComprehensiveSoilData(region, date)
      }

      console.log(`🌍 [GEE] Checking API limits and initializing...`)
      this.checkApiLimits()
      await this.initialize()

      // Create region geometry
      const regionGeometry = ee.Geometry.Rectangle([
        region.lon - 0.1, region.lat - 0.1,
        region.lon + 0.1, region.lat + 0.1
      ])

      console.log(`🌍 [GEE] Creating region geometry: ${regionGeometry.toString()}`)
      
      // Get multiple soil datasets
      const [soilMoisture, soilTemperature, soilOrganicCarbon, soilPh, soilTexture] = await Promise.all([
        this.getSoilMoistureData(regionGeometry, date),
        this.getSoilTemperatureData(regionGeometry, date),
        this.getSoilOrganicCarbonData(regionGeometry, date),
        this.getSoilPhData(regionGeometry, date),
        this.getSoilTextureData(regionGeometry, date)
      ])

      this.incrementApiCall()

      const result = {
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
      
      return result
    } catch (error) {
      console.error(`🌍 [GEE] Comprehensive soil data fetch failed for region ${region.name}:`, error)
      console.error(`🌍 [GEE] Error details:`, {
        message: error.message,
        stack: error.stack,
        region: region.name,
        coordinates: `${region.lat}, ${region.lon}`,
        date: date.toISOString()
      })
      this.handleError(error)
      return this.getFallbackComprehensiveSoilData(region, date)
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
      
      if (!smapImage) {
        console.warn('No soil moisture data available for the specified region and date, using fallback')
        return { value: null, unit: 'm³/m³', interpretation: 'Unknown' }
      }

      // Validate that the image has data
      const bandNames = await smapImage.bandNames().getInfo()
      if (!bandNames || bandNames.length === 0) {
        console.warn('Soil moisture image has no bands, using fallback')
        return { value: null, unit: 'm³/m³', interpretation: 'Unknown' }
      }
      
      const stats = smapImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 9000,
        maxPixels: 1e6
      })

      // Check if the dictionary contains the expected key
      const hasKey = await stats.contains('soil_moisture_am').getInfo()
      if (!hasKey) {
        console.warn('Soil moisture stats dictionary does not contain expected key, using fallback')
        return { value: null, unit: 'm³/m³', interpretation: 'Unknown' }
      }

      const result = await stats.get('soil_moisture_am').getInfo()
      
      return {
        value: result,
        unit: 'm³/m³',
        interpretation: this.interpretSoilMoisture(result)
      }
    } catch (error) {
      console.error(`🌍 [GEE] Soil moisture data fetch failed:`, {
        message: error.message,
        stack: error.stack,
        regionGeometry: regionGeometry.toString(),
        date: date.toISOString()
      })
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
      
      if (!lstImage) {
        console.warn('No land surface temperature data available for the specified region and date, using fallback')
        return { value: null, unit: '°C', interpretation: 'Unknown' }
      }

      // Validate that the image has data
      const bandNames = await lstImage.bandNames().getInfo()
      if (!bandNames || bandNames.length === 0) {
        console.warn('Land surface temperature image has no bands, using fallback')
        return { value: null, unit: '°C', interpretation: 'Unknown' }
      }
      
      const stats = lstImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 1000,
        maxPixels: 1e6
      })

      // Check if the dictionary contains the expected key
      const hasKey = await stats.contains('LST_Day_1km').getInfo()
      if (!hasKey) {
        console.warn('Land surface temperature stats dictionary does not contain expected key, using fallback')
        return { value: null, unit: '°C', interpretation: 'Unknown' }
      }

      const result = await stats.get('LST_Day_1km').getInfo()
      const tempCelsius = (result * 0.02) - 273.15
      
      return {
        value: tempCelsius,
        unit: '°C',
        interpretation: this.interpretSoilTemperature(tempCelsius)
      }
    } catch (error) {
      console.error(`🌍 [GEE] Soil temperature data fetch failed:`, {
        message: error.message,
        stack: error.stack,
        regionGeometry: regionGeometry.toString(),
        date: date.toISOString()
      })
      return { value: null, unit: '°C', interpretation: 'Unknown' }
    }
  }

  // Get soil organic carbon data
  async getSoilOrganicCarbonData(regionGeometry, date) {
    try {
      // Get SoilGrids250m data for organic carbon - this is an Image, not ImageCollection
      const soilGridsImage = ee.Image('projects/soilgrids-isric/soc_mean')

      // Validate that the image has data
      const bandNames = await soilGridsImage.bandNames().getInfo()
      if (!bandNames || bandNames.length === 0) {
        console.warn('Soil organic carbon image has no bands, using fallback')
        return { value: null, unit: 'g/kg', interpretation: 'Unknown' }
      }

      const stats = soilGridsImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 250,
        maxPixels: 1e6
      })

      // Check if the dictionary contains the expected key
      const hasKey = await stats.contains('soc_mean').getInfo()
      if (!hasKey) {
        console.warn('Soil organic carbon stats dictionary does not contain expected key, using fallback')
        return { value: null, unit: 'g/kg', interpretation: 'Unknown' }
      }
      
      const result = await stats.get('soc_mean').getInfo()
      
      return {
        value: result,
        unit: 'g/kg',
        interpretation: this.interpretOrganicCarbon(result)
      }
    } catch (error) {
      console.error(`🌍 [GEE] Soil organic carbon data fetch failed:`, {
        message: error.message,
        stack: error.stack,
        regionGeometry: regionGeometry.toString(),
        date: date.toISOString()
      })
      return { value: null, unit: 'g/kg', interpretation: 'Unknown' }
    }
  }

  // Get soil pH data
  async getSoilPhData(regionGeometry, date) {
    try {
      // Get SoilGrids250m data for pH - this is an Image, not ImageCollection
      const soilGridsImage = ee.Image('projects/soilgrids-isric/phh2o_mean')

      // Validate that the image has data
      const bandNames = await soilGridsImage.bandNames().getInfo()
      if (!bandNames || bandNames.length === 0) {
        console.warn('Soil pH image has no bands, using fallback')
        return { value: null, unit: 'pH', interpretation: 'Unknown' }
      }
      
      const stats = soilGridsImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 250,
        maxPixels: 1e6
      })

      // Check if the dictionary contains the expected key
      const hasKey = await stats.contains('phh2o_mean').getInfo()
      if (!hasKey) {
        console.warn('Soil pH stats dictionary does not contain expected key, using fallback')
        return { value: null, unit: 'pH', interpretation: 'Unknown' }
      }
      
      const result = await stats.get('phh2o_mean').getInfo()
      
      return {
        value: result,
        unit: 'pH',
        interpretation: this.interpretSoilPh(result)
      }
    } catch (error) {
      console.error(`🌍 [GEE] Soil pH data fetch failed:`, {
        message: error.message,
        stack: error.stack,
        regionGeometry: regionGeometry.toString(),
        date: date.toISOString()
      })
      return { value: null, unit: 'pH', interpretation: 'Unknown' }
    }
  }

  // Get soil texture data
  async getSoilTextureData(regionGeometry, date) {
    try {
      // Get SoilGrids250m data for texture components - these are Images, not ImageCollections
      const clayImage = ee.Image('projects/soilgrids-isric/clay_mean')
      const siltImage = ee.Image('projects/soilgrids-isric/silt_mean')
      const sandImage = ee.Image('projects/soilgrids-isric/sand_mean')

      // Validate that all images have data
      const [clayBands, siltBands, sandBands] = await Promise.all([
        clayImage.bandNames().getInfo(),
        siltImage.bandNames().getInfo(),
        sandImage.bandNames().getInfo()
      ])

      if (!clayBands || clayBands.length === 0 || !siltBands || siltBands.length === 0 || !sandBands || sandBands.length === 0) {
        console.warn('One or more soil texture images have no bands, using fallback')
        return {
          clay: { value: null, unit: '%' },
          silt: { value: null, unit: '%' },
          sand: { value: null, unit: '%' },
          texture: 'Unknown',
          interpretation: 'Unknown'
        }
      }

      const [clayStats, siltStats, sandStats] = await Promise.all([
        clayImage.reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: regionGeometry,
          scale: 250,
          maxPixels: 1e6
        }),
        siltImage.reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: regionGeometry,
          scale: 250,
          maxPixels: 1e6
        }),
        sandImage.reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: regionGeometry,
          scale: 250,
          maxPixels: 1e6
        })
      ])

      // Check if all dictionaries contain the expected keys
      const [hasClayKey, hasSiltKey, hasSandKey] = await Promise.all([
        clayStats.contains('clay_mean').getInfo(),
        siltStats.contains('silt_mean').getInfo(),
        sandStats.contains('sand_mean').getInfo()
      ])

      if (!hasClayKey || !hasSiltKey || !hasSandKey) {
        console.warn('One or more soil texture stats dictionaries do not contain expected keys, using fallback')
        return {
          clay: { value: null, unit: '%' },
          silt: { value: null, unit: '%' },
          sand: { value: null, unit: '%' },
          texture: 'Unknown',
          interpretation: 'Unknown'
        }
      }
      
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
      console.error(`🌍 [GEE] Soil texture data fetch failed:`, {
        message: error.message,
        stack: error.stack,
        regionGeometry: regionGeometry.toString(),
        date: date.toISOString()
      })
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
      if (this.fallbackMode || !ee) {
        return this.getFallbackLandUseData(region, date)
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
      
      const worldCoverImage = worldCoverCollection.first()

      if (!worldCoverImage) {
        console.warn('No land cover data available for the specified region and date, using fallback')
        return this.getFallbackLandUseData(region, date)
      }

      // Validate that the image has data
      const bandNames = await worldCoverImage.bandNames().getInfo()
      if (!bandNames || bandNames.length === 0) {
        console.warn('Land cover image has no bands, using fallback')
        return this.getFallbackLandUseData(region, date)
      }

      const stats = worldCoverImage.reduceRegion({
        reducer: ee.Reducer.frequencyHistogram(),
        geometry: regionGeometry,
        scale: 10,
        maxPixels: 1e6
      })

      // Check if the dictionary contains the expected key
      const hasKey = await stats.contains('Map').getInfo()
      if (!hasKey) {
        console.warn('Land cover stats dictionary does not contain expected key, using fallback')
        return this.getFallbackLandUseData(region, date)
      }

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
      return this.getFallbackLandUseData(region, date)
    }
  }

  // Get NDVI data for a specific region with real satellite imagery
  async getNDVIData(region, date = new Date()) {
    try {
      if (this.fallbackMode || !ee) {
        return this.getFallbackNDVIData(region, date)
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
      
      if (!ndviImage) {
        console.warn('No NDVI data available for the specified region and date, using fallback')
        return this.getFallbackNDVIData(region, date)
      }

      // Validate that the image has data
      const bandNames = await ndviImage.bandNames().getInfo()
      if (!bandNames || bandNames.length === 0) {
        console.warn('NDVI image has no bands, using fallback')
        return this.getFallbackNDVIData(region, date)
      }
      
      // Calculate statistics
      const stats = ndviImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 250,
        maxPixels: 1e6
      })

      // Check if the dictionary contains the expected key
      const hasKey = await stats.contains('NDVI').getInfo()
      if (!hasKey) {
        console.warn('NDVI stats dictionary does not contain expected key, using fallback')
        return this.getFallbackNDVIData(region, date)
      }

      const result = await stats.get('NDVI').getInfo()
      
      // Get real satellite image URL
      const imageUrl = await this.getSatelliteImageUrl(ndviImage, regionGeometry, 'NDVI')
      
      this.incrementApiCall()

      return {
        ndvi: result / 10000, // MODIS NDVI is scaled by 10000
        timestamp: date.toISOString(),
        source: 'Google Earth Engine',
        region: region.name,
        quality: 'high',
        interpretation: this.interpretNDVI(result / 10000),
        satelliteImage: imageUrl,
        imageType: 'NDVI',
        coordinates: { lat: region.lat, lon: region.lon },
        boundingBox: [region.lon - 0.1, region.lat - 0.1, region.lon + 0.1, region.lat + 0.1]
      }
    } catch (error) {
      console.error(`🌍 [GEE] NDVI data fetch failed:`, {
        message: error.message,
        stack: error.stack,
        region: region.name,
        coordinates: `${region.lat}, ${region.lon}`,
        date: date.toISOString()
      })
      this.handleError(error)
      return this.getFallbackNDVIData(region, date)
    }
  }

  // Get real satellite image URL from Google Earth Engine
  async getSatelliteImageUrl(image, geometry, bandName = 'NDVI') {
    try {
      // Create a visualization for the image
      let visParams = {}
      
      if (bandName === 'NDVI') {
        // NDVI visualization parameters
        visParams = {
          min: -0.2,
          max: 1.0,
          palette: ['red', 'yellow', 'green', 'darkgreen']
        }
      } else if (bandName === 'LST') {
        // Land Surface Temperature visualization
        visParams = {
          min: 0,
          max: 50,
          palette: ['blue', 'cyan', 'green', 'yellow', 'red']
        }
      } else {
        // Default visualization
        visParams = {
          min: 0,
          max: 1,
          palette: ['black', 'white']
        }
      }

      // Get the image URL
      const url = await image.getThumbURL({
        format: 'PNG',
        dimensions: '512x512',
        region: geometry,
        ...visParams
      })

      return url
    } catch (error) {
      console.warn('Failed to get satellite image URL:', error.message)
      return null
    }
  }

  // Get comprehensive satellite data with real imagery
  async getComprehensiveSatelliteData(region, date = new Date()) {
    try {
      if (this.fallbackMode || !ee) {
        return this.getFallbackComprehensiveData(region, date)
      }

      this.checkApiLimits()
      await this.initialize()

      // Create region geometry
      const regionGeometry = ee.Geometry.Rectangle([
        region.lon - 0.1, region.lat - 0.1,
        region.lon + 0.1, region.lat + 0.1
      ])

      // Get multiple satellite datasets
      const [ndviData, lstData, rgbData] = await Promise.all([
        this.getNDVIData(region, date),
        this.getLandSurfaceTemperature(region, date),
        this.getRGBSatelliteImage(region, date)
      ])

      return {
        ndvi: ndviData,
        landSurfaceTemperature: lstData,
        rgbImage: rgbData,
        timestamp: date.toISOString(),
        source: 'Google Earth Engine',
        region: region.name,
        quality: 'high',
        dataTypes: ['NDVI', 'Land Surface Temperature', 'RGB Satellite Image']
      }
    } catch (error) {
      console.error('Comprehensive satellite data fetch failed:', error)
      this.handleError(error)
      return this.getFallbackComprehensiveData(region, date)
    }
  }

  // Get RGB satellite image (true color)
  async getRGBSatelliteImage(region, date = new Date()) {
    try {
      if (this.fallbackMode || !ee) {
        return this.getFallbackRGBImage(region, date)
      }

      this.checkApiLimits()
      await this.initialize()

      // Create region geometry
      const regionGeometry = ee.Geometry.Rectangle([
        region.lon - 0.1, region.lat - 0.1,
        region.lon + 0.1, region.lat + 0.1
      ])

      // Get Sentinel-2 true color image
      const sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR')
        .filterBounds(regionGeometry)
        .filterDate(date, new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000)) // 30 days
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) // Low cloud cover
        .sort('CLOUDY_PIXEL_PERCENTAGE')
        .first()

      if (!sentinel2) {
        console.warn('No Sentinel-2 data available, using fallback')
        return this.getFallbackRGBImage(region, date)
      }

      // Create true color visualization
      const rgbImage = sentinel2.select(['B4', 'B3', 'B2']) // Red, Green, Blue bands
      
      // Get image URL
      const imageUrl = await this.getSatelliteImageUrl(rgbImage, regionGeometry, 'RGB')
      
      this.incrementApiCall()

      return {
        imageUrl: imageUrl,
        timestamp: date.toISOString(),
        source: 'Google Earth Engine (Sentinel-2)',
        region: region.name,
        quality: 'high',
        imageType: 'True Color RGB',
        coordinates: { lat: region.lat, lon: region.lon },
        boundingBox: [region.lon - 0.1, region.lat - 0.1, region.lon + 0.1, region.lat + 0.1],
        metadata: {
          satellite: 'Sentinel-2',
          bands: ['B4 (Red)', 'B3 (Green)', 'B2 (Blue)'],
          resolution: '10m',
          cloudCover: await sentinel2.get('CLOUDY_PIXEL_PERCENTAGE').getInfo() || 'Unknown'
        }
      }
    } catch (error) {
      console.error('RGB satellite image fetch failed:', error)
      this.handleError(error)
      return this.getFallbackRGBImage(region, date)
    }
  }

  // Get land surface temperature data
  async getLandSurfaceTemperature(region, date = new Date()) {
    try {
      if (this.fallbackMode || !ee) {
        return this.getFallbackTemperatureData(region, date)
      }

      this.checkApiLimits()
      await this.initialize()

      console.log(`🌍 [GEE] Fetching land surface temperature for region: ${region.name}`)

      const regionGeometry = ee.Geometry.Rectangle([
        region.lon - 0.1, region.lat - 0.1,
        region.lon + 0.1, region.lat + 0.1
      ])
      console.log(`🌍 [GEE] Region geometry created:`, regionGeometry.toString())

      // Get MODIS land surface temperature
      const lstCollection = ee.ImageCollection('MODIS/006/MOD11A1')
        .filterBounds(regionGeometry)
        .filterDate(date, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        .select('LST_Day_1km')
      
      console.log(`🌍 [GEE] LST collection filtered and selected`)

      const lstImage = lstCollection.first()
      console.log(`🌍 [GEE] LST image retrieved:`, lstImage ? lstImage.toString() : 'null')
      
      if (!lstImage) {
        throw new Error('No land surface temperature data available for the specified region and date')
      }

      // Validate that the image has data
      const bandNames = await lstImage.bandNames().getInfo()
      if (!bandNames || bandNames.length === 0) {
        console.warn('Land surface temperature image has no bands, using fallback')
        return this.getFallbackTemperatureData(region, date)
      }
      
      console.log(`🌍 [GEE] Computing LST statistics`)
      const stats = lstImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 1000,
        maxPixels: 1e6
      })

      // Check if the dictionary contains the expected key
      const hasKey = await stats.contains('LST_Day_1km').getInfo()
      if (!hasKey) {
        console.warn('Land surface temperature stats dictionary does not contain expected key, using fallback')
        return this.getFallbackTemperatureData(region, date)
      }

      const result = await stats.get('LST_Day_1km').getInfo()
      const tempCelsius = (result * 0.02) - 273.15
      console.log(`🌍 [GEE] LST result:`, { raw: result, celsius: tempCelsius })
      this.incrementApiCall()

      return {
        temperature: tempCelsius, // Convert from Kelvin to Celsius
        timestamp: date.toISOString(),
        source: 'Google Earth Engine',
        region: region.name,
        quality: 'high'
      }
    } catch (error) {
      console.error(`🌍 [GEE] Land surface temperature fetch failed:`, {
        message: error.message,
        stack: error.stack,
        region: region.name,
        coordinates: `${region.lat}, ${region.lon}`,
        date: date.toISOString()
      })
      this.handleError(error)
      return this.getFallbackTemperatureData(region, date)
    }
  }

  // Get comprehensive satellite data for a region
  async getComprehensiveSatelliteData(region, date = new Date()) {
    try {
      if (this.fallbackMode || !ee) {
        return this.getFallbackComprehensiveData(region, date)
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
      return this.getFallbackComprehensiveData(region, date)
    }
  }

  // Get vegetation health index
  async getVegetationHealthIndex(region, date = new Date()) {
    try {
      if (this.fallbackMode || !ee) {
        return this.getFallbackVegetationHealthData(region, date)
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

      // Validate that both images have data
      if (!ndviImage || !lstImage) {
        console.warn('One or both images (NDVI/LST) are null, using fallback')
        return this.getFallbackVegetationHealthData(region, date)
      }

      const [ndviBands, lstBands] = await Promise.all([
        ndviImage.bandNames().getInfo(),
        lstImage.bandNames().getInfo()
      ])

      if (!ndviBands || ndviBands.length === 0 || !lstBands || lstBands.length === 0) {
        console.warn('One or both images (NDVI/LST) have no bands, using fallback')
        return this.getFallbackVegetationHealthData(region, date)
      }

      // Calculate VHI (Vegetation Health Index)
      const vhi = ndviImage.multiply(0.5).add(lstImage.multiply(0.5))
      
      const stats = vhi.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionGeometry,
        scale: 250,
        maxPixels: 1e6
      })

      // Check if the dictionary contains the expected key
      const hasKey = await stats.contains('NDVI').getInfo()
      if (!hasKey) {
        console.warn('VHI stats dictionary does not contain expected key, using fallback')
        return this.getFallbackVegetationHealthData(region, date)
      }

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
      return this.getFallbackVegetationHealthData(region, date)
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
    
    console.error(`🌍 [GEE] Error occurred (${this.errorCount}/${this.maxErrors}):`, {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
      errorCount: this.errorCount,
      maxErrors: this.maxErrors,
      fallbackMode: this.fallbackMode,
      timestamp: new Date().toISOString()
    })
    
    if (this.errorCount >= this.maxErrors) {
      console.warn(`🌍 [GEE] Too many errors (${this.errorCount}/${this.maxErrors}), switching to fallback mode`)
      this.fallbackMode = true
    }
  }

  // Fallback data generators for fallback mode
  getFallbackNDVIData(region, date) {
    console.log(`🌍 [GEE] Generating fallback NDVI data for region: ${region.name}`)
    const baseNDVI = 0.6 + (Math.random() - 0.5) * 0.4
    const result = {
      ndvi: Math.max(0, Math.min(1, baseNDVI)),
      timestamp: date.toISOString(),
      source: 'Fallback Data',
      region: region.name,
      quality: 'low',
      interpretation: this.interpretNDVI(Math.max(0, Math.min(1, baseNDVI)))
    }
    console.log(`🌍 [GEE] Fallback NDVI data generated:`, { ndvi: result.ndvi, interpretation: result.interpretation })
    return result
  }

  getFallbackTemperatureData(region, date) {
    const baseTemp = 25 + (Math.random() - 0.5) * 20
    return {
      temperature: baseTemp,
      timestamp: date.toISOString(),
      source: 'Fallback Data',
      region: region.name,
      quality: 'low'
    }
  }

  getFallbackComprehensiveSoilData(region, date) {
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
      source: 'Fallback Data',
      region: region.name,
      quality: 'low'
    }
  }

  getFallbackLandUseData(region, date) {
    return {
      landCoverTypes: [
        { type: 'Cultivated and managed vegetation', code: '40', percentage: 60 },
        { type: 'Tree cover', code: '10', percentage: 20 },
        { type: 'Grassland', code: '30', percentage: 15 },
        { type: 'Urban/built-up', code: '50', percentage: 5 }
      ],
      dominantCover: 'Cultivated and managed vegetation',
      timestamp: date.toISOString(),
      source: 'Fallback Data',
      region: region.name,
      quality: 'low'
    }
  }

  getFallbackComprehensiveData(region, date) {
    return {
      ndvi: this.getFallbackNDVIData(region, date).ndvi,
      landSurfaceTemperature: this.getFallbackTemperatureData(region, date).temperature,
      soil: this.getFallbackComprehensiveSoilData(region, date),
      landUse: this.getFallbackLandUseData(region, date),
      timestamp: date.toISOString(),
      source: 'Fallback Data',
      region: region.name,
      quality: 'low',
      dataTypes: ['Fallback NDVI', 'Fallback Temperature', 'Fallback Soil Data', 'Fallback Land Use']
    }
  }

  getFallbackVegetationHealthData(region, date) {
    const vhi = 0.5 + (Math.random() - 0.5) * 0.4
    return {
      vhi: Math.max(0, Math.min(1, vhi)),
      healthStatus: this.interpretVHI(vhi),
      timestamp: date.toISOString(),
      source: 'Fallback Data',
      region: region.name,
      quality: 'low'
    }
  }

  getFallbackRGBImage(region, date) {
    return {
      imageUrl: 'https://via.placeholder.com/512x512/4CAF50/FFFFFF?text=Satellite+Image+Unavailable',
      timestamp: date.toISOString(),
      source: 'Fallback Data',
      region: region.name,
      quality: 'low',
      imageType: 'Placeholder',
      coordinates: { lat: region.lat, lon: region.lon },
      boundingBox: [region.lon - 0.1, region.lat - 0.1, region.lon + 0.1, region.lat + 0.1],
      metadata: {
        satellite: 'Fallback',
        bands: ['Placeholder'],
        resolution: 'Unknown',
        cloudCover: 'Unknown'
      }
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
