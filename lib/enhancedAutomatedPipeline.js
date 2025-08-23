// Enhanced Automated Pipeline Service for PredictAgri
// Integrates farmer location, Google Earth Engine, weather, and image processing
// Provides comprehensive agricultural insights and recommendations

import { farmerLocationService } from './farmerLocationService.js'
import { googleEarthEngineService } from './googleEarthEngineService.js'
import { openMeteoService } from './openMeteoService.js'
import { imageProcessingService } from './imageProcessingService.js'
import { twilioService } from './twilioService.js'
import { Logger } from './logger.js'

class EnhancedAutomatedPipeline {
  constructor() {
    this.logger = new Logger({ service: 'EnhancedAutomatedPipeline' })
    this.farmerLocationService = farmerLocationService
    this.weatherService = openMeteoService
    this.geeService = googleEarthEngineService
    this.notificationService = twilioService
  }

  // Main pipeline execution for farmer analysis
  async executeFarmerPipeline(farmerInput) {
    const pipelineId = `farmer_pipeline_${Date.now()}`
    
    try {


      // Step 1: Get exact farmer location and coordinates
      const locationData = await this.getFarmerLocation(farmerInput)
      
      // Step 2: Collect comprehensive environmental data
      const environmentalData = await this.collectEnvironmentalData(locationData.data.coordinates)
      
      // Step 3: Get weather data and forecasts
      const weatherData = await this.collectWeatherData(locationData.data.coordinates)
      
      // Step 4: Process any provided images with OpenCV-like analysis
      const imageAnalysis = await this.processFarmerImages(farmerInput)
      
      // Step 5: Generate comprehensive agricultural insights
      const agriculturalInsights = await this.generateAgriculturalInsights(
        locationData.data,
        environmentalData,
        weatherData,
        imageAnalysis
      )

      // Step 6: Create actionable recommendations
      const recommendations = await this.generateRecommendations(agriculturalInsights)

      // Step 7: Send SMS notification with processed data
      const notificationResult = await this.sendSMSNotification(
        farmerInput,
        agriculturalInsights,
        recommendations,
        weatherData
      )

      const result = {
        success: true,
        pipelineId,
        timestamp: new Date().toISOString(),
        farmerId: farmerInput.farmerId,
        location: locationData.data,
        dataCollection: {
          weather: weatherData,
          environmental: environmentalData,
          imageAnalysis: imageAnalysis
        },
        insights: agriculturalInsights,
        recommendations,
        notification: notificationResult,
        summary: this.generateSummary(agriculturalInsights, recommendations)
      }

      return result

    } catch (error) {
      this.logger.error('farmer_pipeline_failed', { 
        pipelineId, 
        farmerId: farmerInput.farmerId,
        error: error.message 
      })

      return {
        success: false,
        pipelineId,
        error: error.message,
        timestamp: new Date().toISOString(),
        fallbackData: await this.getFallbackData(farmerInput)
      }
    }
  }

  // Step 1: Get exact farmer location and coordinates
  async getFarmerLocation(farmerInput) {
    try {
      // Preprocess farmer input to handle different data structures
      let processedInput = { ...farmerInput }
      
      // Handle case where coordinates are nested in location object
      if (farmerInput.location && farmerInput.location.coordinates && !farmerInput.coordinates) {
        processedInput.coordinates = farmerInput.location.coordinates
      }
      
      // Handle case where address information is in location object
      if (farmerInput.location && !farmerInput.address) {
        const { village, district, state } = farmerInput.location
        if (village || district || state) {
          processedInput.address = [village, district, state].filter(Boolean).join(', ')
        }
      }
      
      const locationData = await this.farmerLocationService.getFarmerLocationData(processedInput)
      
      if (!locationData.success) {
        this.logger.warn('location_data_fallback_used', { 
          farmerId: farmerInput.farmerId,
          error: locationData.error 
        })
      }

      this.logger.info('location_data_collection_completed', { 
        farmerId: farmerInput.farmerId,
        coordinates: `${locationData.data.coordinates.lat}, ${locationData.data.coordinates.lon}`,
        confidence: locationData.data.confidence
      })

      return locationData
    } catch (error) {
      this.logger.error('location_data_collection_failed', { 
        farmerId: farmerInput.farmerId,
        error: error.message 
      })
      throw error
    }
  }

  // Step 2: Collect comprehensive environmental data from Google Earth Engine
  async collectEnvironmentalData(coordinates) {
    try {
      this.logger.info('environmental_data_collection_started', { coordinates })
      
      const region = {
        name: 'Farmer Field',
        lat: coordinates.lat,
        lon: coordinates.lon
      }

      // Get comprehensive satellite and soil data
      const [satelliteData, soilData, landUseData] = await Promise.all([
        this.geeService.getComprehensiveSatelliteData(region),
        this.geeService.getComprehensiveSoilData(region),
        this.geeService.getLandUseData(region)
      ])

      const environmentalData = {
        satellite: satelliteData,
        soil: soilData,
        landUse: landUseData,
        timestamp: new Date().toISOString(),
        source: 'Google Earth Engine + Enhanced Analysis'
      }

      this.logger.info('environmental_data_collection_completed', { 
        coordinates,
        dataTypes: Object.keys(environmentalData).filter(key => key !== 'timestamp' && key !== 'source')
      })

      return environmentalData
    } catch (error) {
      this.logger.error('environmental_data_collection_failed', { 
        coordinates, 
        error: error.message 
      })
      
      // Return fallback data when services are unavailable
      return this.getFallbackEnvironmentalData(coordinates)
    }
  }

  // Step 3: Collect weather data and forecasts
  async collectWeatherData(coordinates) {
    try {
      this.logger.info('weather_data_collection_started', { coordinates })
      
      const [currentWeather, dailyForecast] = await Promise.all([
        this.weatherService.getCurrent(coordinates.lat, coordinates.lon),
        this.weatherService.getDaily(coordinates.lat, coordinates.lon)
      ])

      // Enhance weather data with agricultural insights
      const enhancedWeather = this.enhanceWeatherData(currentWeather, dailyForecast)
      
      this.logger.info('weather_data_collection_completed', { 
        coordinates,
        currentTemp: enhancedWeather.current?.temperature,
        forecastDays: enhancedWeather.forecast?.daily?.time?.length || 0
      })

      return enhancedWeather
    } catch (error) {
      this.logger.error('weather_data_collection_failed', { 
        coordinates, 
        error: error.message 
      })
      
      return this.getFallbackWeatherData(coordinates)
    }
  }

  // Step 4: Process farmer images with OpenCV-like analysis
  async processFarmerImages(farmerInput) {
    try {
      if (!farmerInput.images && !farmerInput.imageBase64) {
        this.logger.info('no_images_provided', { farmerId: farmerInput.farmerId })
        return { success: true, data: null, message: 'No images provided for analysis' }
      }

      this.logger.info('image_processing_started', { 
        farmerId: farmerInput.farmerId,
        imageCount: farmerInput.images?.length || 1
      })

      let imageResults = []

      if (farmerInput.images && Array.isArray(farmerInput.images)) {
        // Process multiple images
        for (let i = 0; i < farmerInput.images.length; i++) {
          const image = farmerInput.images[i]
          const result = await this.processSingleImage(image, `image_${i + 1}`)
          imageResults.push(result)
        }
      } else if (farmerInput.imageBase64) {
        // Process single base64 image
        const result = await this.processSingleImage(
          { data: farmerInput.imageBase64, type: 'base64' }, 
          'main_image'
        )
        imageResults.push(result)
      }

      const analysisSummary = this.summarizeImageAnalysis(imageResults)
      
      this.logger.info('image_processing_completed', { 
        farmerId: farmerInput.farmerId,
        processedImages: imageResults.length,
        analysisTypes: analysisSummary.analysisTypes
      })

      return {
        success: true,
        data: imageResults,
        summary: analysisSummary,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      this.logger.error('image_processing_failed', { 
        farmerId: farmerInput.farmerId,
        error: error.message 
      })
      
      return {
        success: false,
        error: error.message,
        data: this.getFallbackImageAnalysis(),
        timestamp: new Date().toISOString()
      }
    }
  }

  // Process a single image with comprehensive analysis
  async processSingleImage(image, imageId) {
    try {
      let imageBuffer
      
      if (image.type === 'base64') {
        imageBuffer = Buffer.from(image.data, 'base64')
      } else if (image.url) {
        const response = await fetch(image.url)
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
        const arrayBuffer = await response.arrayBuffer()
        imageBuffer = Buffer.from(arrayBuffer)
      } else if (image.file) {
        imageBuffer = image.file
      } else {
        throw new Error('Invalid image format')
      }

      // Perform comprehensive image analysis
      const [comprehensiveAnalysis, cropHealthAnalysis, soilAnalysis, diseaseAnalysis] = await Promise.all([
        imageProcessingService.analyzeAgriculturalImage(imageBuffer, 'comprehensive'),
        imageProcessingService.analyzeAgriculturalImage(imageBuffer, 'crop-health'),
        imageProcessingService.analyzeAgriculturalImage(imageBuffer, 'soil-analysis'),
        imageProcessingService.analyzeAgriculturalImage(imageBuffer, 'disease-detection')
      ])

      return {
        imageId,
        timestamp: new Date().toISOString(),
        comprehensive: comprehensiveAnalysis,
        cropHealth: cropHealthAnalysis,
        soil: soilAnalysis,
        disease: diseaseAnalysis,
        metadata: {
          size: imageBuffer.length,
          analysisTypes: ['comprehensive', 'crop-health', 'soil-analysis', 'disease-detection']
        }
      }

    } catch (error) {
      this.logger.error('single_image_processing_failed', { 
        imageId, 
        error: error.message 
      })
      
      return {
        imageId,
        error: error.message,
        timestamp: new Date().toISOString(),
        data: this.getFallbackSingleImageAnalysis(imageId)
      }
    }
  }

  // Step 5: Generate comprehensive agricultural insights
  async generateAgriculturalInsights(locationData, environmentalData, weatherData, imageAnalysis) {
    try {
      this.logger.info('agricultural_insights_generation_started')
      
      const insights = {
        soilHealth: this.analyzeSoilHealth(environmentalData.soil, locationData.soilClassification),
        cropSuitability: this.analyzeCropSuitability(locationData, environmentalData, weatherData),
        waterManagement: this.analyzeWaterManagement(environmentalData, weatherData),
        pestRisk: this.analyzePestRisk(environmentalData, weatherData, imageAnalysis),
        yieldPotential: this.analyzeYieldPotential(environmentalData, weatherData, locationData),
        climateAdaptation: this.analyzeClimateAdaptation(weatherData, locationData),
        imageInsights: this.extractImageInsights(imageAnalysis),
        timestamp: new Date().toISOString()
      }

      this.logger.info('agricultural_insights_generation_completed', { 
        insightTypes: Object.keys(insights).filter(key => key !== 'timestamp')
      })

      return insights
    } catch (error) {
      this.logger.error('agricultural_insights_generation_failed', { error: error.message })
              return this.getFallbackAgriculturalInsights()
    }
  }

  // Step 6: Generate actionable recommendations
  async generateRecommendations(insights) {
    try {
      this.logger.info('recommendations_generation_started')
      
      const recommendations = []

      // Soil management recommendations
      if (insights.soilHealth) {
        recommendations.push(...this.generateSoilRecommendations(insights.soilHealth))
      }

      // Crop selection recommendations
      if (insights.cropSuitability) {
        recommendations.push(...this.generateCropRecommendations(insights.cropSuitability))
      }

      // Water management recommendations
      if (insights.waterManagement) {
        recommendations.push(...this.generateWaterRecommendations(insights.waterManagement))
      }

      // Pest management recommendations
      if (insights.pestRisk) {
        recommendations.push(...this.generatePestRecommendations(insights.pestRisk))
      }

      // Climate adaptation recommendations
      if (insights.climateAdaptation) {
        recommendations.push(...this.generateClimateRecommendations(insights.climateAdaptation))
      }

      // Image-based recommendations
      if (insights.imageInsights) {
        recommendations.push(...this.generateImageBasedRecommendations(insights.imageInsights))
      }

      // Prioritize recommendations by impact and urgency
      const prioritizedRecommendations = this.prioritizeRecommendations(recommendations)

      this.logger.info('recommendations_generation_completed', { 
        totalRecommendations: recommendations.length,
        prioritizedCount: prioritizedRecommendations.length
      })

      return prioritizedRecommendations
    } catch (error) {
      this.logger.error('recommendations_generation_failed', { error: error.message })
              return this.getFallbackRecommendations()
    }
  }

  // Analysis methods
  analyzeSoilHealth(soilData, classification) {
    const health = {
      overall: 'Good',
      score: 75,
      issues: [],
      strengths: [],
      recommendations: []
    }

    if (soilData.soilMoisture) {
      if (soilData.soilMoisture.value < 0.15) {
        health.issues.push('Low soil moisture')
        health.recommendations.push('Consider irrigation or mulching')
      } else if (soilData.soilMoisture.value > 0.4) {
        health.issues.push('Excessive soil moisture')
        health.recommendations.push('Improve drainage')
      } else {
        health.strengths.push('Optimal soil moisture')
      }
    }

    if (soilData.soilPh) {
      if (soilData.soilPh.value < 5.5) {
        health.issues.push('Acidic soil')
        health.recommendations.push('Apply lime to raise pH')
      } else if (soilData.soilPh.value > 8.5) {
        health.issues.push('Alkaline soil')
        health.recommendations.push('Apply sulfur to lower pH')
      } else {
        health.strengths.push('Optimal soil pH')
      }
    }

    // Calculate overall health score
    health.score = Math.max(0, Math.min(100, 100 - (health.issues.length * 15) + (health.strengths.length * 10)))
    
    if (health.score >= 80) health.overall = 'Excellent'
    else if (health.score >= 60) health.overall = 'Good'
    else if (health.score >= 40) health.overall = 'Fair'
    else health.overall = 'Poor'

    return health
  }

  analyzeCropSuitability(locationData, environmentalData, weatherData) {
    const suitability = {
      bestCrops: [],
      goodCrops: [],
      avoidCrops: [],
      reasoning: {}
    }

    // Get dynamic coordinates for location-based recommendations
    const lat = locationData.coordinates?.lat || 0
    const lon = locationData.coordinates?.lon || 0
    const weather = weatherData.current
    
    // Dynamic crop recommendations based on actual coordinates and conditions
    const cropDatabase = this.getCropRecommendationsByLocation(lat, lon, weather, environmentalData)
    
    // Temperature-based filtering
    const currentTemp = weather?.temperature_2m || weather?.temperature || 25
    const humidity = weather?.relative_humidity_2m || weather?.humidity || 60
    
    // Filter crops based on current environmental conditions
    cropDatabase.forEach(crop => {
      let suitabilityScore = 0
      let reasons = []
      
      // Temperature suitability
      if (currentTemp >= crop.tempRange.min && currentTemp <= crop.tempRange.max) {
        suitabilityScore += 3
        reasons.push(`Optimal temperature (${currentTemp}°C)`)
      } else if (Math.abs(currentTemp - crop.tempRange.optimal) <= 5) {
        suitabilityScore += 2
        reasons.push(`Suitable temperature (${currentTemp}°C)`)
      } else {
        suitabilityScore -= 1
        reasons.push(`Temperature challenge (${currentTemp}°C)`)
      }
      
      // Humidity suitability
      if (humidity >= crop.humidityRange.min && humidity <= crop.humidityRange.max) {
        suitabilityScore += 2
        reasons.push(`Good humidity (${humidity}%)`)
      }
      
      // Soil suitability (from environmental data)
      if (environmentalData.soil && environmentalData.soil.soilMoisture) {
        const moisture = environmentalData.soil.soilMoisture.value
        if (moisture >= crop.moistureNeeds.min && moisture <= crop.moistureNeeds.max) {
          suitabilityScore += 2
          reasons.push('Suitable soil moisture')
        }
      }
      
      // NDVI/vegetation health consideration
      if (environmentalData.satellite && environmentalData.satellite.ndvi) {
        const ndvi = environmentalData.satellite.ndvi.value
        if (ndvi > 0.5) {
          suitabilityScore += 1
          reasons.push('Good vegetation health')
        }
      }
      
      // Categorize based on score
      suitability.reasoning[crop.name] = reasons.join(', ')
      
      if (suitabilityScore >= 5) {
        suitability.bestCrops.push(crop.name)
      } else if (suitabilityScore >= 3) {
        suitability.goodCrops.push(crop.name)
      } else if (suitabilityScore <= 0) {
        suitability.avoidCrops.push(crop.name)
      }
    })

    // Fallback to zone-based if no dynamic recommendations
    if (suitability.bestCrops.length === 0) {
      const zone = locationData.agriculturalZone
      const soil = locationData.soilClassification
      
      // Zone-based recommendations as fallback
      if (zone.zone === 'Northern Plains') {
        suitability.bestCrops.push('Wheat', 'Rice', 'Cotton')
        suitability.goodCrops.push('Sugarcane', 'Pulses')
      } else if (zone.zone === 'Central Plateau') {
        suitability.bestCrops.push('Cotton', 'Soybean', 'Pulses')
        suitability.goodCrops.push('Oilseeds', 'Wheat')
      } else if (zone.zone === 'Southern Peninsula') {
        suitability.bestCrops.push('Rice', 'Coconut', 'Spices')
        suitability.goodCrops.push('Coffee', 'Tea')
      } else {
        // Default recommendations based on coordinates
        this.getDefaultCropsByRegion(lat, lon, suitability)
      }

      // Soil-based adjustments
      if (soil.type === 'Black Soil') {
        suitability.bestCrops.push('Cotton')
        suitability.reasoning['Cotton'] = 'Black soil is ideal for cotton cultivation'
      } else if (soil.type === 'Red Soil') {
        suitability.bestCrops.push('Pulses', 'Groundnut')
        suitability.reasoning['Pulses'] = 'Red soil is suitable for pulse crops'
      }
    }

    // Weather-based adjustments
    if (weather && weather.temperature > 30) {
      suitability.avoidCrops.push('Wheat')
      suitability.reasoning['Wheat'] = 'High temperature may affect wheat growth'
    }

    // Remove duplicates and return
    suitability.bestCrops = [...new Set(suitability.bestCrops)]
    suitability.goodCrops = [...new Set(suitability.goodCrops)]
    suitability.avoidCrops = [...new Set(suitability.avoidCrops)]

    return suitability
  }

  analyzeWaterManagement(environmentalData, weatherData) {
    const waterManagement = {
      irrigationNeeds: 'Moderate',
      drainageNeeds: 'Low',
      waterConservation: [],
      floodRisk: 'Low',
      droughtRisk: 'Moderate'
    }

    if (environmentalData.soil && environmentalData.soil.soilMoisture) {
      const moisture = environmentalData.soil.soilMoisture.value
      if (moisture < 0.2) {
        waterManagement.irrigationNeeds = 'High'
        waterManagement.droughtRisk = 'High'
        waterManagement.waterConservation.push('Implement drip irrigation')
        waterManagement.waterConservation.push('Use mulching to retain moisture')
      } else if (moisture > 0.35) {
        waterManagement.drainageNeeds = 'High'
        waterManagement.floodRisk = 'Moderate'
        waterManagement.waterConservation.push('Improve field drainage')
      }
    }

    if (weatherData.forecast && weatherData.forecast.daily) {
      const precipitation = weatherData.forecast.daily.precipitation_sum
      if (precipitation && precipitation.some(p => p > 50)) {
        waterManagement.floodRisk = 'High'
        waterManagement.waterConservation.push('Prepare for heavy rainfall')
      }
    }

    return waterManagement
  }

  analyzePestRisk(environmentalData, weatherData, imageAnalysis) {
    const pestRisk = {
      overall: 'Low',
      factors: [],
      recommendations: []
    }

    // Weather-based pest risk
    if (weatherData.current && weatherData.current.relative_humidity_2m > 80) {
      pestRisk.factors.push('High humidity - favorable for fungal diseases')
      pestRisk.recommendations.push('Monitor for fungal infections')
    }

    if (weatherData.current && weatherData.current.temperature_2m > 25) {
      pestRisk.factors.push('Warm temperature - favorable for insect pests')
      pestRisk.recommendations.push('Check for insect infestations')
    }

    // Image-based pest detection
    if (imageAnalysis && imageAnalysis.data) {
      imageAnalysis.data.forEach(image => {
        if (image.disease && image.disease.data && image.disease.data.results) {
          const diseases = image.disease.data.results
          // Check if diseases is an array and has elements with high confidence
          if (Array.isArray(diseases) && diseases.some(d => d.confidence > 0.7)) {
            pestRisk.factors.push('Disease detected in field images')
            pestRisk.recommendations.push('Implement disease management strategies')
          } else if (diseases && typeof diseases === 'object' && diseases.diseaseProbability > 0.7) {
            // Handle case where diseases is a single object with diseaseProbability
            pestRisk.factors.push('Disease detected in field images')
            pestRisk.recommendations.push('Implement disease management strategies')
          }
        }
      })
    }

    // Calculate overall risk
    if (pestRisk.factors.length >= 3) pestRisk.overall = 'High'
    else if (pestRisk.factors.length >= 1) pestRisk.overall = 'Moderate'

    return pestRisk
  }

  analyzeYieldPotential(environmentalData, weatherData, locationData) {
    const yieldPotential = {
      overall: 'Good',
      score: 75,
      factors: [],
      limitations: []
    }

    // NDVI-based assessment
    if (environmentalData.satellite && environmentalData.satellite.ndvi) {
      const ndvi = environmentalData.satellite.ndvi
      if (ndvi > 0.6) {
        yieldPotential.factors.push('High vegetation density')
        yieldPotential.score += 15
      } else if (ndvi < 0.3) {
        yieldPotential.limitations.push('Low vegetation density')
        yieldPotential.score -= 20
      }
    }

    // Soil health impact
    if (locationData.soilClassification) {
      if (locationData.soilClassification.npk.n === 'High') {
        yieldPotential.factors.push('High nitrogen content')
        yieldPotential.score += 10
      }
      if (locationData.soilClassification.npk.p === 'High') {
        yieldPotential.factors.push('High phosphorus content')
        yieldPotential.score += 10
      }
    }

    // Weather impact
    if (weatherData.current && weatherData.current.temperature_2m) {
      const temp = weatherData.current.temperature_2m
      if (temp >= 20 && temp <= 30) {
        yieldPotential.factors.push('Optimal temperature range')
        yieldPotential.score += 10
      } else if (temp > 35 || temp < 10) {
        yieldPotential.limitations.push('Temperature stress')
        yieldPotential.score -= 15
      }
    }

    // Calculate final score
    yieldPotential.score = Math.max(0, Math.min(100, yieldPotential.score))
    
    if (yieldPotential.score >= 80) yieldPotential.overall = 'Excellent'
    else if (yieldPotential.score >= 60) yieldPotential.overall = 'Good'
    else if (yieldPotential.score >= 40) yieldPotential.overall = 'Fair'
    else yieldPotential.overall = 'Poor'

    return yieldPotential
  }

  analyzeClimateAdaptation(weatherData, locationData) {
    const adaptation = {
      strategies: [],
      risks: [],
      opportunities: []
    }

    if (weatherData.forecast && weatherData.forecast.daily) {
      const temps = weatherData.forecast.daily.temperature_2m_max
      const precip = weatherData.forecast.daily.precipitation_sum

      if (temps && temps.some(t => t > 35)) {
        adaptation.risks.push('Heat stress periods')
        adaptation.strategies.push('Implement shade structures')
        adaptation.strategies.push('Use heat-tolerant crop varieties')
      }

      if (precip && precip.some(p => p > 30)) {
        adaptation.risks.push('Heavy rainfall events')
        adaptation.strategies.push('Improve drainage systems')
        adaptation.strategies.push('Plant flood-tolerant crops')
      }
    }

    // Zone-specific adaptations
    if (locationData.agriculturalZone) {
      if (locationData.agriculturalZone.zone === 'Himalayan Region') {
        adaptation.strategies.push('Use cold-tolerant crop varieties')
        adaptation.opportunities.push('High-value medicinal herbs')
      } else if (locationData.agriculturalZone.zone === 'Coastal Region') {
        adaptation.strategies.push('Salt-tolerant crop varieties')
        adaptation.opportunities.push('Integrated fish farming')
      }
    }

    return adaptation
  }

  extractImageInsights(imageAnalysis) {
    const insights = {
      cropHealth: 'Unknown',
      soilConditions: 'Unknown',
      diseasePresence: 'Unknown',
      weedInfestation: 'Unknown',
      recommendations: []
    }

    if (!imageAnalysis || !imageAnalysis.data) return insights

    imageAnalysis.data.forEach(image => {
      if (image.cropHealth && image.cropHealth.data && image.cropHealth.data.results) {
        const health = image.cropHealth.data.results
        if (health.overallHealth) {
          insights.cropHealth = health.overallHealth
        }
      }

      if (image.disease && image.disease.data && image.disease.data.results) {
        const diseases = image.disease.data.results
        if (diseases.length > 0) {
          insights.diseasePresence = 'Detected'
          insights.recommendations.push('Implement disease management program')
        }
      }

      if (image.soil && image.soil.data && image.soil.data.results) {
        const soil = image.soil.data.results
        if (soil.soilType) {
          insights.soilConditions = soil.soilType
        }
      }
    })

    return insights
  }

  // Helper method to get crop recommendations based on location and environmental conditions
  getCropRecommendationsByLocation(lat, lon, weather, environmentalData) {
    // Comprehensive crop database with environmental requirements
    const cropDatabase = [
      {
        name: 'Rice',
        tempRange: { min: 20, max: 35, optimal: 25 },
        humidityRange: { min: 70, max: 90 },
        moistureNeeds: { min: 0.5, max: 0.8 },
        season: 'Kharif',
        regions: ['all'] // Suitable for most regions
      },
      {
        name: 'Wheat',
        tempRange: { min: 15, max: 25, optimal: 20 },
        humidityRange: { min: 50, max: 70 },
        moistureNeeds: { min: 0.3, max: 0.6 },
        season: 'Rabi',
        regions: ['northern', 'central']
      },
      {
        name: 'Cotton',
        tempRange: { min: 20, max: 35, optimal: 28 },
        humidityRange: { min: 50, max: 80 },
        moistureNeeds: { min: 0.4, max: 0.7 },
        season: 'Kharif',
        regions: ['central', 'southern']
      },
      {
        name: 'Soybean',
        tempRange: { min: 22, max: 30, optimal: 26 },
        humidityRange: { min: 60, max: 85 },
        moistureNeeds: { min: 0.4, max: 0.7 },
        season: 'Kharif',
        regions: ['central']
      },
      {
        name: 'Maize',
        tempRange: { min: 20, max: 30, optimal: 25 },
        humidityRange: { min: 60, max: 80 },
        moistureNeeds: { min: 0.4, max: 0.6 },
        season: 'All',
        regions: ['all']
      },
      {
        name: 'Sugarcane',
        tempRange: { min: 25, max: 35, optimal: 30 },
        humidityRange: { min: 75, max: 95 },
        moistureNeeds: { min: 0.6, max: 0.9 },
        season: 'All',
        regions: ['northern', 'southern']
      },
      {
        name: 'Pulses',
        tempRange: { min: 18, max: 28, optimal: 23 },
        humidityRange: { min: 40, max: 70 },
        moistureNeeds: { min: 0.3, max: 0.5 },
        season: 'Rabi',
        regions: ['all']
      },
      {
        name: 'Groundnut',
        tempRange: { min: 22, max: 30, optimal: 26 },
        humidityRange: { min: 50, max: 75 },
        moistureNeeds: { min: 0.3, max: 0.6 },
        season: 'Kharif',
        regions: ['southern', 'western']
      },
      {
        name: 'Millets',
        tempRange: { min: 25, max: 35, optimal: 30 },
        humidityRange: { min: 30, max: 60 },
        moistureNeeds: { min: 0.2, max: 0.4 },
        season: 'Kharif',
        regions: ['all'] // Drought resistant, suitable everywhere
      },
      {
        name: 'Turmeric',
        tempRange: { min: 24, max: 32, optimal: 28 },
        humidityRange: { min: 70, max: 90 },
        moistureNeeds: { min: 0.5, max: 0.8 },
        season: 'All',
        regions: ['southern']
      }
    ]

    // Filter crops suitable for the current region
    const regionType = this.getRegionType(lat, lon)
    return cropDatabase.filter(crop => 
      crop.regions.includes('all') || crop.regions.includes(regionType)
    )
  }

  // Helper method to determine region type based on coordinates
  getRegionType(lat, lon) {
    if (lat > 26) return 'northern'      // Northern India
    if (lat > 20) return 'central'       // Central India
    if (lat > 15) return 'southern'      // Southern India
    if (lon > 75) return 'eastern'       // Eastern India
    return 'western'                     // Western India
  }

  // Helper method for default crop recommendations by region
  getDefaultCropsByRegion(lat, lon, suitability) {
    const regionType = this.getRegionType(lat, lon)
    
    switch (regionType) {
      case 'northern':
        suitability.bestCrops.push('Wheat', 'Rice', 'Sugarcane')
        suitability.goodCrops.push('Maize', 'Pulses')
        break
      case 'central':
        suitability.bestCrops.push('Soybean', 'Cotton', 'Maize')
        suitability.goodCrops.push('Wheat', 'Pulses')
        break
      case 'southern':
        suitability.bestCrops.push('Rice', 'Cotton', 'Groundnut')
        suitability.goodCrops.push('Turmeric', 'Pulses')
        break
      case 'western':
        suitability.bestCrops.push('Cotton', 'Sugarcane', 'Groundnut')
        suitability.goodCrops.push('Millets', 'Pulses')
        break
      case 'eastern':
        suitability.bestCrops.push('Rice', 'Maize', 'Pulses')
        suitability.goodCrops.push('Sugarcane', 'Cotton')
        break
      default:
        suitability.bestCrops.push('Rice', 'Maize', 'Pulses')
        suitability.goodCrops.push('Cotton', 'Millets')
    }
  }

  // Recommendation generation methods
  generateSoilRecommendations(soilHealth) {
    const recommendations = []
    
    if (soilHealth.overall === 'Poor') {
      recommendations.push({
        priority: 'High',
        category: 'Soil Management',
        action: 'Conduct soil testing and implement soil improvement program',
        impact: 'High',
        timeframe: '3-6 months'
      })
    }

    if (soilHealth.issues.includes('Low soil moisture')) {
      recommendations.push({
        priority: 'High',
        category: 'Water Management',
        action: 'Implement irrigation system or improve water retention',
        impact: 'High',
        timeframe: '1-2 months'
      })
    }

    return recommendations
  }

  generateCropRecommendations(cropSuitability) {
    const recommendations = []
    
    if (cropSuitability.bestCrops.length > 0) {
      recommendations.push({
        priority: 'High',
        category: 'Crop Selection',
        action: `Focus on: ${cropSuitability.bestCrops.join(', ')}`,
        impact: 'High',
        timeframe: 'Next season'
      })
    }

    if (cropSuitability.avoidCrops.length > 0) {
      recommendations.push({
        priority: 'Medium',
        category: 'Crop Selection',
        action: `Avoid: ${cropSuitability.avoidCrops.join(', ')}`,
        impact: 'Medium',
        timeframe: 'Next season'
      })
    }

    return recommendations
  }

  generateWaterRecommendations(waterManagement) {
    const recommendations = []
    
    if (waterManagement.irrigationNeeds === 'High') {
      recommendations.push({
        priority: 'High',
        category: 'Water Management',
        action: 'Install efficient irrigation system',
        impact: 'High',
        timeframe: '2-3 months'
      })
    }

    if (waterManagement.drainageNeeds === 'High') {
      recommendations.push({
        priority: 'High',
        category: 'Water Management',
        action: 'Improve field drainage',
        impact: 'High',
        timeframe: '1-2 months'
      })
    }

    return recommendations
  }

  generatePestRecommendations(pestRisk) {
    const recommendations = []
    
    if (pestRisk.overall === 'High') {
      recommendations.push({
        priority: 'High',
        category: 'Pest Management',
        action: 'Implement integrated pest management program',
        impact: 'High',
        timeframe: 'Immediate'
      })
    }

    if (pestRisk.factors.includes('High humidity - favorable for fungal diseases')) {
      recommendations.push({
        priority: 'Medium',
        category: 'Disease Prevention',
        action: 'Apply preventive fungicides and improve air circulation',
        impact: 'Medium',
        timeframe: '1-2 weeks'
      })
    }

    return recommendations
  }

  generateClimateRecommendations(climateAdaptation) {
    const recommendations = []
    
    if (climateAdaptation.strategies.length > 0) {
      recommendations.push({
        priority: 'Medium',
        category: 'Climate Adaptation',
        action: `Implement: ${climateAdaptation.strategies.slice(0, 3).join(', ')}`,
        impact: 'Medium',
        timeframe: '3-6 months'
      })
    }

    return recommendations
  }

  generateImageBasedRecommendations(imageInsights) {
    const recommendations = []
    
    if (imageInsights.diseasePresence === 'Detected') {
      recommendations.push({
        priority: 'High',
        category: 'Disease Management',
        action: 'Schedule field inspection and implement treatment plan',
        impact: 'High',
        timeframe: '1-2 weeks'
      })
    }

    if (imageInsights.cropHealth === 'Poor') {
      recommendations.push({
        priority: 'High',
        category: 'Crop Management',
        action: 'Investigate causes and implement corrective measures',
        impact: 'High',
        timeframe: '2-4 weeks'
      })
    }

    return recommendations
  }

  // Utility methods
  enhanceWeatherData(current, daily) {
    return {
      current: {
        temperature: current?.current?.temperature_2m,
        humidity: current?.current?.relative_humidity_2m,
        windSpeed: current?.current?.wind_speed_10m,
        timestamp: current?.current?.time
      },
      forecast: daily,
      agriculturalImpact: this.calculateWeatherAgriculturalImpact(current, daily)
    }
  }

  calculateWeatherAgriculturalImpact(current, daily) {
    const impact = {
      irrigation: 'Not needed',
      pestRisk: 'Low',
      cropStress: 'Low'
    }

    if (current?.current?.temperature_2m > 30) {
      impact.irrigation = 'May be needed'
      impact.cropStress = 'Moderate'
    }

    if (current?.current?.relative_humidity_2m > 80) {
      impact.pestRisk = 'Moderate'
    }

    return impact
  }

  summarizeImageAnalysis(imageResults) {
    const summary = {
      totalImages: imageResults.length,
      analysisTypes: [],
      issues: [],
      overallHealth: 'Unknown'
    }

    imageResults.forEach(image => {
      if (image.metadata && image.metadata.analysisTypes) {
        summary.analysisTypes.push(...image.metadata.analysisTypes)
      }
    })

    summary.analysisTypes = [...new Set(summary.analysisTypes)]

    return summary
  }

  prioritizeRecommendations(recommendations) {
    return recommendations.sort((a, b) => {
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
      const impactOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
      
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      return impactOrder[b.impact] - impactOrder[a.impact]
    })
  }

  generateSummary(insights, recommendations) {
    return {
      keyFindings: [
        `Soil Health: ${insights.soilHealth?.overall || 'Unknown'}`,
        `Crop Suitability: ${insights.cropSuitability?.bestCrops?.length || 0} recommended crops`,
        `Water Management: ${insights.waterManagement?.irrigationNeeds || 'Unknown'} irrigation needs`,
        `Pest Risk: ${insights.pestRisk?.overall || 'Unknown'}`,
        `Yield Potential: ${insights.yieldPotential?.overall || 'Unknown'}`
      ],
      topRecommendations: recommendations.slice(0, 5).map(r => r.action),
      nextSteps: [
        'Review detailed analysis report',
        'Prioritize high-impact recommendations',
        'Schedule follow-up field inspection',
        'Monitor implementation progress'
      ]
    }
  }

  // Fallback data methods
  async getFallbackData(farmerInput) {
    return {
      location: await this.farmerLocationService.getFarmerLocationData(farmerInput),
                    environmental: this.getFallbackEnvironmentalData(farmerInput.coordinates || { lat: 0, lon: 0 }),
      weather: this.getFallbackWeatherData(farmerInput.coordinates || { lat: 0, lon: 0 }),
              imageAnalysis: this.getFallbackImageAnalysis(),
              insights: this.getFallbackAgriculturalInsights(),
              recommendations: this.getFallbackRecommendations()
    }
  }

  getFallbackEnvironmentalData(coordinates) {
    return {
      satellite: {
        ndvi: 0.65,
        landSurfaceTemperature: 28,
        source: 'Fallback Data',
        quality: 'low'
      },
      soil: {
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
        }
      },
      landUse: {
        landCoverTypes: [
          { type: 'Cultivated and managed vegetation', percentage: 70 },
          { type: 'Tree cover', percentage: 20 },
          { type: 'Grassland', percentage: 10 }
        ],
        dominantCover: 'Cultivated and managed vegetation'
      },
      timestamp: new Date().toISOString(),
              source: 'Fallback Data'
    }
  }

  getFallbackWeatherData(coordinates) {
    return {
      current: {
        temperature: 28,
        humidity: 65,
        windSpeed: 12,
        timestamp: new Date().toISOString()
      },
      forecast: {
        daily: {
          time: ['2024-01-01', '2024-01-02', '2024-01-03'],
          temperature_2m_max: [30, 32, 29],
          precipitation_sum: [0, 5, 0]
        }
      },
      agriculturalImpact: {
        irrigation: 'May be needed',
        pestRisk: 'Low',
        cropStress: 'Low'
      }
    }
  }

  getFallbackImageAnalysis() {
    return {
      success: true,
      data: [{
        imageId: 'fallback_image_1',
        timestamp: new Date().toISOString(),
        comprehensive: { success: true, data: { results: { overallHealth: 'Good' } } },
        cropHealth: { success: true, data: { results: { overallHealth: 'Good' } } },
        soil: { success: true, data: { results: { soilType: 'Loam' } } },
        disease: { success: true, data: { results: [] } },
        metadata: {
          size: 1024000,
          analysisTypes: ['comprehensive', 'crop-health', 'soil-analysis', 'disease-detection']
        }
      }],
      summary: {
        totalImages: 1,
        analysisTypes: ['comprehensive', 'crop-health', 'soil-analysis', 'disease-detection'],
        issues: [],
        overallHealth: 'Good'
      },
      timestamp: new Date().toISOString()
    }
  }

  getFallbackSingleImageAnalysis(imageId) {
    return {
      overallHealth: 'Good',
      soilType: 'Loam',
      diseasePresence: 'None detected',
      weedInfestation: 'Low'
    }
  }

  getFallbackAgriculturalInsights() {
    return {
      soilHealth: { overall: 'Good', score: 75, issues: [], strengths: ['Optimal soil moisture'], recommendations: [] },
      cropSuitability: { bestCrops: ['Wheat', 'Cotton'], goodCrops: ['Pulses'], avoidCrops: [], reasoning: {} },
      waterManagement: { irrigationNeeds: 'Moderate', drainageNeeds: 'Low', waterConservation: [], floodRisk: 'Low', droughtRisk: 'Moderate' },
      pestRisk: { overall: 'Low', factors: [], recommendations: [] },
      yieldPotential: { overall: 'Good', score: 75, factors: ['High vegetation density'], limitations: [] },
      climateAdaptation: { strategies: [], risks: [], opportunities: [] },
      imageInsights: { cropHealth: 'Good', soilConditions: 'Loam', diseasePresence: 'None', weedInfestation: 'Low', recommendations: [] },
      timestamp: new Date().toISOString()
    }
  }

  getFallbackRecommendations() {
    return [
      {
        priority: 'Medium',
        category: 'Soil Management',
        action: 'Conduct regular soil testing',
        impact: 'Medium',
        timeframe: '3-6 months'
      },
      {
        priority: 'Low',
        category: 'Water Management',
        action: 'Monitor soil moisture levels',
        impact: 'Low',
        timeframe: 'Ongoing'
      }
    ]
  }

  // Send SMS notification with processed pipeline data
  async sendSMSNotification(farmerInput, insights, recommendations, weatherData) {
    try {
      // Get farmer's phone number from input or use default
      const phoneNumber = farmerInput.phoneNumber || '+919322909257'
      const language = farmerInput.language || 'hi' // Default to Hindi for Indian farmers
      
      // Check if we should skip notifications (e.g., for testing or when limits are exceeded)
      if (process.env.SKIP_NOTIFICATIONS === 'true' || process.env.NODE_ENV === 'test') {
        this.logger.info('notifications_skipped', { 
          farmerId: farmerInput.farmerId,
          reason: process.env.SKIP_NOTIFICATIONS === 'true' ? 'SKIP_NOTIFICATIONS flag' : 'test environment'
        })
        return { success: true, method: 'Skipped', reason: 'Notifications disabled' }
      }
      
      // Create comprehensive agricultural alert with processed data
      const alertData = {
        type: 'enhanced_pipeline_analysis',
        severity: 'medium',
        region: farmerInput.region || 'Agricultural Analysis',
        crop: 'Field Analysis',
        recommendation: this.generateSMSMessage(insights, recommendations, weatherData, language)
      }

      this.logger.info('sending_sms_notification', { 
        farmerId: farmerInput.farmerId,
        phoneNumber: phoneNumber.substring(0, 8) + '***', // Mask for privacy
        language 
      })

      // Send both SMS and voice notification
      const result = await this.notificationService.sendAgriculturalAlert(phoneNumber, alertData, language)

      if (result.success) {
        this.logger.info('sms_notification_sent_successfully', { 
          farmerId: farmerInput.farmerId,
          method: result.sms?.success ? 'SMS + Voice' : result.voice?.success ? 'Voice' : 'Failed'
        })
      } else {
        this.logger.warn('sms_notification_failed', { 
          farmerId: farmerInput.farmerId,
          error: result.error 
        })
      }

      return result
    } catch (error) {
      this.logger.error('sms_notification_error', { 
        farmerId: farmerInput.farmerId,
        error: error.message 
      })
      return { success: false, error: error.message }
    }
  }

  // Generate comprehensive SMS message with processed data
  generateSMSMessage(insights, recommendations, weatherData, language = 'hi') {
    const messages = {
      'en': {
        prefix: '🌾 Agricultural Analysis Complete: ',
        weather: 'Weather: ',
        soil: 'Soil Health: ',
        yield: 'Yield Potential: ',
        risk: 'Risk Level: ',
        topRec: 'Top Recommendation: ',
        suffix: ' Check app for details.'
      },
      'hi': {
        prefix: '🌾 कृषि विश्लेषण पूरा: ',
        weather: 'मौसम: ',
        soil: 'मिट्टी स्वास्थ्य: ',
        yield: 'उपज क्षमता: ',
        risk: 'जोखिम स्तर: ',
        topRec: 'मुख्य सिफारिश: ',
        suffix: ' विवरण के लिए ऐप देखें।'
      },
      'mr': {
        prefix: '🌾 शेती विश्लेषण पूर्ण: ',
        weather: 'हवामान: ',
        soil: 'माती आरोग्य: ',
        yield: 'उत्पादन क्षमता: ',
        risk: 'धोका पातळी: ',
        topRec: 'मुख्य शिफारस: ',
        suffix: ' तपशीलांसाठी ऍप तपासा।'
      }
    }

    const msg = messages[language] || messages['hi']
    let message = msg.prefix

    // Add weather information
    if (weatherData?.current) {
      message += `${msg.weather}${weatherData.current.temperature}°C, ${weatherData.current.humidity}% humidity. `
    }

    // Add soil health
    if (insights?.soilHealth?.overall) {
      message += `${msg.soil}${insights.soilHealth.overall}. `
    }

    // Add yield potential
    if (insights?.yieldPotential?.overall) {
      message += `${msg.yield}${insights.yieldPotential.overall}. `
    }

    // Add risk assessment
    if (insights?.pestRisk?.overall) {
      message += `${msg.risk}${insights.pestRisk.overall}. `
    }

    // Add top recommendation
    if (recommendations && recommendations.length > 0) {
      const topRec = recommendations.find(r => r.priority === 'High') || recommendations[0]
      message += `${msg.topRec}${topRec.action}. `
    }

    message += msg.suffix

    // Ensure message is within SMS limits (160 characters for single SMS)
    if (message.length > 160) {
      message = message.substring(0, 157) + '...'
    }

    return message
  }
}

export const enhancedAutomatedPipeline = new EnhancedAutomatedPipeline()
export default enhancedAutomatedPipeline
