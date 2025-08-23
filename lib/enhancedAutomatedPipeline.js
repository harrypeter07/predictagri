// Enhanced Automated Pipeline Service for PredictAgri
// Integrates farmer location, Google Earth Engine, weather, and image processing
// Provides comprehensive agricultural insights and recommendations

import { farmerLocationService } from './farmerLocationService.js'
import { googleEarthEngineService } from './googleEarthEngineService.js'
import { openMeteoService } from './openMeteoService.js'
import { imageProcessingService } from './imageProcessingService.js'
import { twilioService } from './twilioService.js'
import { Logger } from './logger.js'
import LocationService from './locationService.js'

class EnhancedAutomatedPipeline {
  constructor() {
    this.logger = new Logger({ service: 'EnhancedAutomatedPipeline' })
    this.farmerLocationService = farmerLocationService
    this.weatherService = openMeteoService
    this.geeService = googleEarthEngineService
    this.notificationService = twilioService
    this.locationService = new LocationService()
  }

  // Main pipeline execution for farmer analysis
  async executeFarmerPipeline(farmerInput) {
    const pipelineId = `farmer_pipeline_${Date.now()}`
    
    try {
      console.log(`🚀 [${pipelineId}] Starting enhanced farmer pipeline for:`, {
        farmerId: farmerInput.farmerId,
        selectedCrop: farmerInput.selectedCrop,
        cropId: farmerInput.cropId,
        analysisType: farmerInput.analysisType
      })

      // Step 1: Get exact farmer location and coordinates
      const locationData = await this.getFarmerLocation(farmerInput)
      
      // Step 2: Collect comprehensive environmental data
      const environmentalData = await this.collectEnvironmentalData(locationData.data.coordinates)
      
      // Step 3: Get weather data and forecasts
      const weatherData = await this.collectWeatherData(locationData.data.coordinates)
      
      // Step 4: Process any provided images with OpenCV-like analysis
      const imageAnalysis = await this.processFarmerImages(farmerInput)
      
      // Step 5: Generate comprehensive agricultural insights with crop-specific analysis
      const agriculturalInsights = await this.generateAgriculturalInsights(
        locationData.data,
        environmentalData,
        weatherData,
        imageAnalysis,
        farmerInput.selectedCrop
      )

      // Step 6: Create actionable recommendations with crop-specific guidance
      const recommendations = await this.generateRecommendations(agriculturalInsights, farmerInput.selectedCrop)

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
        cropAnalysis: {
          selectedCrop: farmerInput.selectedCrop,
          cropId: farmerInput.cropId,
          cropSpecificInsights: agriculturalInsights.cropSpecific || []
        },
        location: locationData.data,
        dataCollection: {
          weather: weatherData,
          environmental: environmentalData,
          imageAnalysis: imageAnalysis
        },
        insights: agriculturalInsights,
        recommendations,
        notification: notificationResult,
        summary: this.generateSummary(agriculturalInsights, recommendations, farmerInput.selectedCrop)
      }

      console.log(`✅ [${pipelineId}] Enhanced farmer pipeline completed successfully for crop: ${farmerInput.selectedCrop}`)
      return result

    } catch (error) {
      this.logger.error('farmer_pipeline_failed', { 
        pipelineId, 
        farmerId: farmerInput.farmerId,
        selectedCrop: farmerInput.selectedCrop,
        error: error.message 
      })

      return {
        success: false,
        pipelineId,
        error: error.message,
        timestamp: new Date().toISOString(),
        cropAnalysis: {
          selectedCrop: farmerInput.selectedCrop,
          cropId: farmerInput.cropId,
          error: error.message
        },
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
  async generateAgriculturalInsights(locationData, environmentalData, weatherData, imageAnalysis, selectedCrop) {
    try {
      this.logger.info('agricultural_insights_generation_started')
      
      const insights = {
        soilHealth: this.analyzeSoilHealth(environmentalData.soil, locationData.soilClassification),
        cropSuitability: this.analyzeCropSuitability(selectedCrop, locationData, environmentalData, weatherData),
        waterManagement: this.analyzeWaterManagement(environmentalData, weatherData),
        pestRisk: this.analyzePestRisk(environmentalData, weatherData, imageAnalysis),
        yieldPotential: this.analyzeYieldPotential(environmentalData, weatherData, locationData),
        climateAdaptation: this.analyzeClimateAdaptation(weatherData, locationData),
        imageInsights: this.extractImageInsights(imageAnalysis),
        cropSpecific: this.generateCropSpecificInsights(selectedCrop, locationData, environmentalData, weatherData, imageAnalysis)
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
  async generateRecommendations(insights, selectedCrop) {
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

      // Crop-specific recommendations
      if (insights.cropSpecific) {
        recommendations.push(...this.generateCropSpecificRecommendations(insights.cropSpecific, selectedCrop))
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

  // Generate crop-specific insights based on selected crop
  generateCropSpecificInsights(selectedCrop, locationData, environmentalData, weatherData, imageAnalysis) {
    try {
      const cropInsights = {
        cropName: selectedCrop,
        suitability: this.analyzeCropSuitability(selectedCrop, locationData, environmentalData, weatherData),
        optimalConditions: this.getOptimalConditions(selectedCrop),
        currentConditions: this.analyzeCurrentConditions(selectedCrop, environmentalData, weatherData),
        yieldPotential: this.calculateYieldPotential(selectedCrop, environmentalData, weatherData),
        riskFactors: this.identifyCropSpecificRisks(selectedCrop, weatherData, environmentalData),
        seasonalAnalysis: this.analyzeSeasonalSuitability(selectedCrop, weatherData),
        recommendations: []
      }

      // Generate crop-specific recommendations
      cropInsights.recommendations = this.generateCropSpecificRecommendations(cropInsights, selectedCrop)

      return cropInsights
    } catch (error) {
      this.logger.error('crop_specific_insights_failed', { selectedCrop, error: error.message })
      return {
        cropName: selectedCrop,
        error: 'Failed to generate crop-specific insights',
        fallbackData: this.getCropFallbackData(selectedCrop)
      }
    }
  }

  // Analyze crop suitability based on location and conditions
  analyzeCropSuitability(selectedCrop, locationData, environmentalData, weatherData) {
    const cropRequirements = this.getCropRequirements(selectedCrop)
    const currentConditions = {
      temperature: weatherData.current?.temperature_2m || 25,
      humidity: weatherData.current?.relative_humidity_2m || 65,
      rainfall: weatherData.daily?.precipitation_sum?.[0] || 0,
      soilMoisture: environmentalData.soilMoisture?.value || 0.5,
      ph: environmentalData.soilPh?.value || 6.5
    }

    let suitabilityScore = 0
    const factors = []

    // Temperature suitability
    if (currentConditions.temperature >= cropRequirements.minTemp && 
        currentConditions.temperature <= cropRequirements.maxTemp) {
      suitabilityScore += 25
      factors.push('Optimal temperature range')
    } else if (currentConditions.temperature >= cropRequirements.minTemp - 5 && 
               currentConditions.temperature <= cropRequirements.maxTemp + 5) {
      suitabilityScore += 15
      factors.push('Acceptable temperature range')
    } else {
      factors.push('Temperature outside optimal range')
    }

    // Rainfall suitability
    if (currentConditions.rainfall >= cropRequirements.minRainfall && 
        currentConditions.rainfall <= cropRequirements.maxRainfall) {
      suitabilityScore += 25
      factors.push('Adequate rainfall')
    } else if (currentConditions.rainfall >= cropRequirements.minRainfall * 0.5) {
      suitabilityScore += 15
      factors.push('Moderate rainfall')
    } else {
      factors.push('Insufficient rainfall')
    }

    // Soil moisture suitability
    if (currentConditions.soilMoisture >= cropRequirements.minSoilMoisture && 
        currentConditions.soilMoisture <= cropRequirements.maxSoilMoisture) {
      suitabilityScore += 25
      factors.push('Optimal soil moisture')
    } else {
      factors.push('Soil moisture needs adjustment')
    }

    // pH suitability
    if (currentConditions.ph >= cropRequirements.minPh && 
        currentConditions.ph <= cropRequirements.maxPh) {
      suitabilityScore += 25
      factors.push('Optimal soil pH')
    } else {
      factors.push('Soil pH needs adjustment')
    }

    return {
      score: Math.min(suitabilityScore, 100),
      rating: this.getSuitabilityRating(suitabilityScore),
      factors: factors,
      requirements: cropRequirements,
      currentConditions: currentConditions
    }
  }

  // Get optimal conditions for different crops
  getOptimalConditions(selectedCrop) {
    const cropConditions = {
      'Rice': {
        temperature: { min: 20, max: 35, optimal: 25 },
        rainfall: { min: 100, max: 200, optimal: 150 },
        soilMoisture: { min: 0.6, max: 0.9, optimal: 0.8 },
        ph: { min: 5.5, max: 7.5, optimal: 6.5 },
        season: 'Kharif',
        growthPeriod: '120-150 days'
      },
      'Wheat': {
        temperature: { min: 15, max: 25, optimal: 20 },
        rainfall: { min: 50, max: 100, optimal: 75 },
        soilMoisture: { min: 0.4, max: 0.7, optimal: 0.6 },
        ph: { min: 6.0, max: 7.5, optimal: 6.8 },
        season: 'Rabi',
        growthPeriod: '100-120 days'
      },
      'Maize': {
        temperature: { min: 18, max: 32, optimal: 25 },
        rainfall: { min: 80, max: 150, optimal: 120 },
        soilMoisture: { min: 0.5, max: 0.8, optimal: 0.7 },
        ph: { min: 5.5, max: 7.5, optimal: 6.5 },
        season: 'Kharif',
        growthPeriod: '90-120 days'
      },
      'Cotton': {
        temperature: { min: 20, max: 35, optimal: 28 },
        rainfall: { min: 60, max: 120, optimal: 90 },
        soilMoisture: { min: 0.4, max: 0.7, optimal: 0.6 },
        ph: { min: 5.5, max: 8.5, optimal: 7.0 },
        season: 'Kharif',
        growthPeriod: '150-180 days'
      },
      'Sugarcane': {
        temperature: { min: 20, max: 38, optimal: 30 },
        rainfall: { min: 100, max: 200, optimal: 150 },
        soilMoisture: { min: 0.6, max: 0.9, optimal: 0.8 },
        ph: { min: 6.0, max: 8.0, optimal: 7.0 },
        season: 'Year-round',
        growthPeriod: '300-365 days'
      },
      'Pulses': {
        temperature: { min: 15, max: 30, optimal: 22 },
        rainfall: { min: 40, max: 80, optimal: 60 },
        soilMoisture: { min: 0.3, max: 0.6, optimal: 0.5 },
        ph: { min: 6.0, max: 7.5, optimal: 6.8 },
        season: 'Rabi',
        growthPeriod: '80-100 days'
      },
      'Oilseeds': {
        temperature: { min: 18, max: 32, optimal: 25 },
        rainfall: { min: 50, max: 100, optimal: 75 },
        soilMoisture: { min: 0.4, max: 0.7, optimal: 0.6 },
        ph: { min: 6.0, max: 7.5, optimal: 6.8 },
        season: 'Kharif',
        growthPeriod: '90-120 days'
      },
      'Vegetables': {
        temperature: { min: 15, max: 30, optimal: 22 },
        rainfall: { min: 30, max: 80, optimal: 50 },
        soilMoisture: { min: 0.5, max: 0.8, optimal: 0.7 },
        ph: { min: 6.0, max: 7.0, optimal: 6.5 },
        season: 'Year-round',
        growthPeriod: '60-90 days'
      }
    }

    return cropConditions[selectedCrop] || cropConditions['Wheat'] // Default to Wheat if crop not found
  }

  // Get crop requirements for analysis
  getCropRequirements(selectedCrop) {
    const optimalConditions = this.getOptimalConditions(selectedCrop)
    return {
      minTemp: optimalConditions.temperature.min,
      maxTemp: optimalConditions.temperature.max,
      minRainfall: optimalConditions.rainfall.min,
      maxRainfall: optimalConditions.rainfall.max,
      minSoilMoisture: optimalConditions.soilMoisture.min,
      maxSoilMoisture: optimalConditions.soilMoisture.max,
      minPh: optimalConditions.ph.min,
      maxPh: optimalConditions.ph.max
    }
  }

  // Analyze current conditions for the selected crop
  analyzeCurrentConditions(selectedCrop, environmentalData, weatherData) {
    const currentConditions = {
      temperature: weatherData.current?.temperature_2m || 25,
      humidity: weatherData.current?.relative_humidity_2m || 65,
      rainfall: weatherData.daily?.precipitation_sum?.[0] || 0,
      soilMoisture: environmentalData.soilMoisture?.value || 0.5,
      ph: environmentalData.soilPh?.value || 6.5,
      windSpeed: weatherData.current?.wind_speed_10m || 5
    }

    const optimalConditions = this.getOptimalConditions(selectedCrop)
    const analysis = {
      temperature: {
        current: currentConditions.temperature,
        optimal: optimalConditions.temperature.optimal,
        status: this.getConditionStatus(currentConditions.temperature, optimalConditions.temperature),
        recommendation: this.getTemperatureRecommendation(currentConditions.temperature, optimalConditions.temperature)
      },
      rainfall: {
        current: currentConditions.rainfall,
        optimal: optimalConditions.rainfall.optimal,
        status: this.getConditionStatus(currentConditions.rainfall, optimalConditions.rainfall),
        recommendation: this.getRainfallRecommendation(currentConditions.rainfall, optimalConditions.rainfall)
      },
      soilMoisture: {
        current: currentConditions.soilMoisture,
        optimal: optimalConditions.soilMoisture.optimal,
        status: this.getConditionStatus(currentConditions.soilMoisture, optimalConditions.soilMoisture),
        recommendation: this.getSoilMoistureRecommendation(currentConditions.soilMoisture, optimalConditions.soilMoisture)
      },
      ph: {
        current: currentConditions.ph,
        optimal: optimalConditions.ph.optimal,
        status: this.getConditionStatus(currentConditions.ph, optimalConditions.ph),
        recommendation: this.getPhRecommendation(currentConditions.ph, optimalConditions.ph)
      }
    }

    return analysis
  }

  // Calculate yield potential based on current conditions
  calculateYieldPotential(selectedCrop, environmentalData, weatherData) {
    const suitability = this.analyzeCropSuitability(selectedCrop, {}, environmentalData, weatherData)
    const baseYield = this.getBaseYield(selectedCrop)
    
    // Calculate yield potential based on suitability score
    const yieldMultiplier = suitability.score / 100
    const potentialYield = baseYield * yieldMultiplier

    return {
      baseYield: baseYield,
      potentialYield: potentialYield,
      yieldMultiplier: yieldMultiplier,
      confidence: this.calculateConfidence(suitability.score),
      factors: suitability.factors
    }
  }

  // Identify crop-specific risks
  identifyCropSpecificRisks(selectedCrop, weatherData, environmentalData) {
    const risks = []
    const currentConditions = {
      temperature: weatherData.current?.temperature_2m || 25,
      humidity: weatherData.current?.relative_humidity_2m || 65,
      rainfall: weatherData.daily?.precipitation_sum?.[0] || 0,
      windSpeed: weatherData.current?.wind_speed_10m || 5
    }

    // Temperature risks
    if (currentConditions.temperature > 35) {
      risks.push({
        type: 'High Temperature',
        severity: 'high',
        description: `Temperature ${currentConditions.temperature}°C is above optimal range for ${selectedCrop}`,
        impact: 'Reduced yield, heat stress'
      })
    } else if (currentConditions.temperature < 10) {
      risks.push({
        type: 'Low Temperature',
        severity: 'medium',
        description: `Temperature ${currentConditions.temperature}°C is below optimal range for ${selectedCrop}`,
        impact: 'Slow growth, frost damage risk'
      })
    }

    // Humidity risks
    if (currentConditions.humidity > 80) {
      risks.push({
        type: 'High Humidity',
        severity: 'medium',
        description: `High humidity (${currentConditions.humidity}%) may increase disease risk for ${selectedCrop}`,
        impact: 'Fungal diseases, reduced pollination'
      })
    }

    // Rainfall risks
    if (currentConditions.rainfall > 200) {
      risks.push({
        type: 'Excessive Rainfall',
        severity: 'high',
        description: `Heavy rainfall (${currentConditions.rainfall}mm) may cause waterlogging for ${selectedCrop}`,
        impact: 'Root rot, reduced oxygen availability'
      })
    } else if (currentConditions.rainfall < 20) {
      risks.push({
        type: 'Drought',
        severity: 'high',
        description: `Low rainfall (${currentConditions.rainfall}mm) may cause drought stress for ${selectedCrop}`,
        impact: 'Reduced yield, wilting'
      })
    }

    return risks
  }

  // Analyze seasonal suitability
  analyzeSeasonalSuitability(selectedCrop, weatherData) {
    const optimalConditions = this.getOptimalConditions(selectedCrop)
    const currentMonth = new Date().getMonth() + 1
    
    let seasonalSuitability = 'optimal'
    let seasonalFactors = []

    // Determine current season
    let currentSeason = 'Unknown'
    if (currentMonth >= 6 && currentMonth <= 10) {
      currentSeason = 'Kharif'
    } else if (currentMonth >= 11 || currentMonth <= 3) {
      currentSeason = 'Rabi'
    } else {
      currentSeason = 'Zaid'
    }

    // Check if current season is optimal for the crop
    if (optimalConditions.season === 'Year-round') {
      seasonalSuitability = 'optimal'
      seasonalFactors.push('Crop suitable for year-round cultivation')
    } else if (optimalConditions.season === currentSeason) {
      seasonalSuitability = 'optimal'
      seasonalFactors.push(`Current season (${currentSeason}) is optimal for ${selectedCrop}`)
    } else {
      seasonalSuitability = 'suboptimal'
      seasonalFactors.push(`Current season (${currentSeason}) is not optimal for ${selectedCrop}`)
      seasonalFactors.push(`Optimal season: ${optimalConditions.season}`)
    }

    return {
      currentSeason: currentSeason,
      optimalSeason: optimalConditions.season,
      suitability: seasonalSuitability,
      factors: seasonalFactors,
      recommendation: this.getSeasonalRecommendation(currentSeason, optimalConditions.season, selectedCrop)
    }
  }

  // Generate crop-specific recommendations
  generateCropSpecificRecommendations(cropInsights, selectedCrop) {
    const recommendations = []

    // Add recommendations based on suitability analysis
    if (cropInsights.suitability) {
      if (cropInsights.suitability.score < 50) {
        recommendations.push({
          category: 'Crop Selection',
          priority: 'high',
          action: `Consider alternative crops better suited to current conditions`,
          reasoning: `Current conditions are not optimal for ${selectedCrop} (suitability score: ${cropInsights.suitability.score}%)`
        })
      } else if (cropInsights.suitability.score < 75) {
        recommendations.push({
          category: 'Management',
          priority: 'medium',
          action: `Implement additional management practices to improve conditions for ${selectedCrop}`,
          reasoning: `Conditions are acceptable but could be improved (suitability score: ${cropInsights.suitability.score}%)`
        })
      }
    }

    // Add recommendations based on current conditions
    if (cropInsights.currentConditions) {
      Object.entries(cropInsights.currentConditions).forEach(([condition, analysis]) => {
        if (analysis.recommendation) {
          recommendations.push({
            category: `${condition.charAt(0).toUpperCase() + condition.slice(1)} Management`,
            priority: analysis.status === 'poor' ? 'high' : 'medium',
            action: analysis.recommendation,
            reasoning: `Current ${condition} (${analysis.current}) is ${analysis.status} for ${selectedCrop}`
          })
        }
      })
    }

    // Add recommendations based on risks
    if (cropInsights.riskFactors && cropInsights.riskFactors.length > 0) {
      cropInsights.riskFactors.forEach(risk => {
        recommendations.push({
          category: 'Risk Management',
          priority: risk.severity,
          action: `Implement measures to mitigate ${risk.type.toLowerCase()}`,
          reasoning: risk.description
        })
      })
    }

    // Add seasonal recommendations
    if (cropInsights.seasonalAnalysis) {
      if (cropInsights.seasonalAnalysis.recommendation) {
        recommendations.push({
          category: 'Seasonal Planning',
          priority: 'medium',
          action: cropInsights.seasonalAnalysis.recommendation,
          reasoning: `Seasonal analysis for ${selectedCrop}`
        })
      }
    }

    return recommendations
  }

  // Helper methods for condition analysis
  getConditionStatus(current, optimal) {
    const tolerance = 0.2 // 20% tolerance
    const min = optimal * (1 - tolerance)
    const max = optimal * (1 + tolerance)
    
    if (current >= min && current <= max) return 'optimal'
    if (current >= min * 0.8 && current <= max * 1.2) return 'acceptable'
    return 'poor'
  }

  getSuitabilityRating(score) {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Poor'
  }

  getBaseYield(selectedCrop) {
    const baseYields = {
      'Rice': 4.5, // tons per hectare
      'Wheat': 3.2,
      'Maize': 3.8,
      'Cotton': 2.1,
      'Sugarcane': 70.0,
      'Pulses': 1.8,
      'Oilseeds': 2.5,
      'Vegetables': 25.0
    }
    return baseYields[selectedCrop] || 3.0
  }

  calculateConfidence(score) {
    if (score >= 80) return 'High'
    if (score >= 60) return 'Medium'
    return 'Low'
  }

  // Temperature recommendation
  getTemperatureRecommendation(current, optimal) {
    if (current > optimal.max) {
      return 'Consider shade structures or irrigation to reduce temperature stress'
    } else if (current < optimal.min) {
      return 'Consider row covers or delayed planting to avoid cold stress'
    }
    return 'Temperature is within optimal range'
  }

  // Rainfall recommendation
  getRainfallRecommendation(current, optimal) {
    if (current > optimal.max) {
      return 'Implement drainage systems to prevent waterlogging'
    } else if (current < optimal.min) {
      return 'Consider irrigation systems to supplement rainfall'
    }
    return 'Rainfall is within optimal range'
  }

  // Soil moisture recommendation
  getSoilMoistureRecommendation(current, optimal) {
    if (current > optimal.max) {
      return 'Improve drainage and avoid over-irrigation'
    } else if (current < optimal.min) {
      return 'Increase irrigation frequency or mulching'
    }
    return 'Soil moisture is within optimal range'
  }

  // pH recommendation
  getPhRecommendation(current, optimal) {
    if (current > optimal.max) {
      return 'Apply acidic amendments like sulfur to lower pH'
    } else if (current < optimal.min) {
      return 'Apply lime or other alkaline amendments to raise pH'
    }
    return 'Soil pH is within optimal range'
  }

  // Seasonal recommendation
  getSeasonalRecommendation(currentSeason, optimalSeason, selectedCrop) {
    if (optimalSeason === 'Year-round') {
      return `${selectedCrop} can be grown year-round with proper management`
    } else if (currentSeason === optimalSeason) {
      return `Current season (${currentSeason}) is optimal for ${selectedCrop}`
    } else {
      return `Consider planting ${selectedCrop} during ${optimalSeason} season for best results`
    }
  }

  // Get fallback data for crops
  getCropFallbackData(selectedCrop) {
    return {
      cropName: selectedCrop,
      suitability: { score: 50, rating: 'Fair', factors: ['Limited data available'] },
      optimalConditions: this.getOptimalConditions(selectedCrop),
      recommendations: [
        {
          category: 'General',
          priority: 'medium',
          action: `Follow standard practices for ${selectedCrop} cultivation`,
          reasoning: 'Limited data available for specific recommendations'
        }
      ]
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

  generateSummary(insights, recommendations, selectedCrop) {
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
    // Get agricultural region information based on coordinates
    const regionInfo = this.locationService.getAgriculturalRegion(coordinates.lat, coordinates.lon)
    
    // Generate realistic fallback data based on actual location
    const baseNDVI = this.generateRealisticNDVI(coordinates.lat, coordinates.lon)
    const soilData = this.generateRealisticSoilData(regionInfo)
    
    return {
      satellite: {
        ndvi: baseNDVI.value,
        ndviInterpretation: baseNDVI.interpretation,
        landSurfaceTemperature: this.generateRealisticTemperature(coordinates.lat),
        source: 'Location-Based Fallback Data',
        quality: 'medium',
        region: regionInfo.region,
        state: regionInfo.state
      },
      soil: {
        soilMoisture: { 
          value: soilData.moisture, 
          unit: 'm³/m³', 
          interpretation: soilData.moistureInterpretation 
        },
        soilTemperature: { 
          value: soilData.temperature, 
          unit: '°C', 
          interpretation: soilData.temperatureInterpretation 
        },
        soilOrganicCarbon: { 
          value: soilData.organicCarbon, 
          unit: 'g/kg', 
          interpretation: soilData.organicCarbonInterpretation 
        },
        soilPh: { 
          value: soilData.ph, 
          unit: 'pH', 
          interpretation: soilData.phInterpretation 
        },
        soilTexture: soilData.texture,
        soilType: regionInfo.soilType,
        region: regionInfo.region
      },
      landUse: {
        landCoverTypes: [
          { type: 'Cultivated and managed vegetation', percentage: 65 },
          { type: 'Tree cover', percentage: 25 },
          { type: 'Grassland', percentage: 10 }
        ],
        dominantCover: 'Cultivated and managed vegetation',
        majorCrops: regionInfo.majorCrops,
        climate: regionInfo.climate
      },
      timestamp: new Date().toISOString(),
      source: 'Location-Based Fallback Data',
      note: 'Using agricultural region data for coordinates: ' + coordinates.lat + ', ' + coordinates.lon
    }
  }

  // Generate realistic NDVI based on location and season
  generateRealisticNDVI(lat, lon) {
    const now = new Date()
    const month = now.getMonth() + 1 // 1-12
    
    // Seasonal NDVI variations for Indian agriculture
    let baseNDVI = 0.6 // Default moderate vegetation
    
    if (lat >= 20 && lat <= 22 && lon >= 78 && lon <= 80) {
      // Vidarbha region (Nagpur area)
      if (month >= 6 && month <= 9) {
        baseNDVI = 0.75 + Math.random() * 0.15 // Monsoon season - high vegetation
      } else if (month >= 10 && month <= 12) {
        baseNDVI = 0.65 + Math.random() * 0.15 // Post-monsoon - moderate vegetation
      } else {
        baseNDVI = 0.45 + Math.random() * 0.15 // Summer - lower vegetation
      }
    } else if (lat >= 18 && lat <= 20 && lon >= 72 && lon <= 74) {
      // Konkan region (Mumbai area)
      if (month >= 6 && month <= 9) {
        baseNDVI = 0.8 + Math.random() * 0.15 // Monsoon - very high vegetation
      } else {
        baseNDVI = 0.7 + Math.random() * 0.15 // Year-round moderate vegetation
      }
    } else if (lat >= 28 && lat <= 30 && lon >= 76 && lon <= 78) {
      // Haryana region
      if (month >= 10 && month <= 4) {
        baseNDVI = 0.7 + Math.random() * 0.15 // Rabi season - wheat, etc.
      } else if (month >= 6 && month <= 9) {
        baseNDVI = 0.75 + Math.random() * 0.15 // Kharif season - rice, etc.
      } else {
        baseNDVI = 0.5 + Math.random() * 0.15 // Transition period
      }
    }
    
    // Add some realistic variation
    const variation = (Math.random() - 0.5) * 0.1
    const finalNDVI = Math.max(0.1, Math.min(1.0, baseNDVI + variation))
    
    let interpretation = 'Moderate vegetation density'
    if (finalNDVI >= 0.8) interpretation = 'Very high vegetation density'
    else if (finalNDVI >= 0.6) interpretation = 'High vegetation density'
    else if (finalNDVI >= 0.4) interpretation = 'Moderate vegetation density'
    else if (finalNDVI >= 0.2) interpretation = 'Low vegetation density'
    else interpretation = 'Very low vegetation density'
    
    return {
      value: parseFloat(finalNDVI.toFixed(3)),
      interpretation: interpretation
    }
  }

  // Generate realistic soil data based on region
  generateRealisticSoilData(regionInfo) {
    let soilData = {
      moisture: 0.25,
      moistureInterpretation: 'Moderate',
      temperature: 22,
      temperatureInterpretation: 'Warm',
      organicCarbon: 12,
      organicCarbonInterpretation: 'Moderate organic content',
      ph: 6.8,
      phInterpretation: 'Neutral',
      texture: {
        clay: 25,
        silt: 35,
        sand: 40,
        texture: 'Loam',
        interpretation: 'Ideal soil texture, balanced properties'
      }
    }
    
    // Adjust based on region characteristics
    if (regionInfo.region === 'Vidarbha') {
      soilData.moisture = 0.2 + Math.random() * 0.1
      soilData.temperature = 25 + Math.random() * 5
      soilData.organicCarbon = 8 + Math.random() * 4
      soilData.ph = 7.0 + Math.random() * 0.5
      soilData.texture = {
        clay: 35 + Math.random() * 10,
        silt: 30 + Math.random() * 10,
        sand: 25 + Math.random() * 10,
        texture: 'Clay Loam',
        interpretation: 'Black cotton soil typical of Vidarbha region'
      }
    } else if (regionInfo.region === 'Konkan') {
      soilData.moisture = 0.3 + Math.random() * 0.1
      soilData.temperature = 20 + Math.random() * 3
      soilData.organicCarbon = 15 + Math.random() * 5
      soilData.ph = 5.5 + Math.random() * 0.5
      soilData.texture = {
        clay: 20 + Math.random() * 10,
        silt: 25 + Math.random() * 10,
        sand: 45 + Math.random() * 10,
        texture: 'Sandy Loam',
        interpretation: 'Laterite soil typical of Konkan region'
      }
    } else if (regionInfo.region === 'Haryana') {
      soilData.moisture = 0.15 + Math.random() * 0.1
      soilData.temperature = 28 + Math.random() * 5
      soilData.organicCarbon = 6 + Math.random() * 3
      soilData.ph = 7.5 + Math.random() * 0.5
      soilData.texture = {
        clay: 20 + Math.random() * 10,
        silt: 40 + Math.random() * 10,
        sand: 30 + Math.random() * 10,
        texture: 'Silt Loam',
        interpretation: 'Alluvial soil typical of Haryana region'
      }
    }
    
    // Update interpretations based on values
    soilData.moistureInterpretation = soilData.moisture < 0.2 ? 'Low' : 
                                    soilData.moisture < 0.3 ? 'Moderate' : 'High'
    
    soilData.temperatureInterpretation = soilData.temperature < 20 ? 'Cool' : 
                                       soilData.temperature < 25 ? 'Warm' : 'Hot'
    
    soilData.organicCarbonInterpretation = soilData.organicCarbon < 8 ? 'Low organic content' : 
                                          soilData.organicCarbon < 15 ? 'Moderate organic content' : 'High organic content'
    
    soilData.phInterpretation = soilData.ph < 6.0 ? 'Acidic' : 
                               soilData.ph < 7.0 ? 'Slightly acidic' : 
                               soilData.ph < 7.5 ? 'Neutral' : 'Alkaline'
    
    return soilData
  }

  // Generate realistic temperature based on latitude and season
  generateRealisticTemperature(lat) {
    const now = new Date()
    const month = now.getMonth() + 1
    
    let baseTemp = 25 // Default temperature
    
    if (lat >= 20 && lat <= 22) {
      // Central India (Nagpur area)
      if (month >= 3 && month <= 6) {
        baseTemp = 35 + Math.random() * 8 // Summer - very hot
      } else if (month >= 6 && month <= 9) {
        baseTemp = 28 + Math.random() * 5 // Monsoon - warm
      } else if (month >= 10 && month <= 12) {
        baseTemp = 22 + Math.random() * 8 // Post-monsoon - moderate
      } else {
        baseTemp = 18 + Math.random() * 7 // Winter - cool
      }
    } else if (lat >= 18 && lat <= 20) {
      // Western India (Mumbai area)
      baseTemp = 28 + Math.random() * 5 // More consistent coastal climate
    } else if (lat >= 28 && lat <= 30) {
      // Northern India (Haryana area)
      if (month >= 4 && month <= 6) {
        baseTemp = 38 + Math.random() * 8 // Summer - very hot
      } else if (month >= 10 && month <= 12) {
        baseTemp = 20 + Math.random() * 8 // Post-monsoon - moderate
      } else if (month >= 1 && month <= 3) {
        baseTemp = 15 + Math.random() * 8 // Winter - cold
      } else {
        baseTemp = 25 + Math.random() * 8 // Transition periods
      }
    }
    
    return Math.round(baseTemp + (Math.random() - 0.5) * 4)
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
      
      // Check for SMS limit exceeded (Twilio trial accounts have 9 SMS/day limit)
      if (process.env.SMS_LIMIT_EXCEEDED === 'true') {
        this.logger.info('sms_limit_exceeded', { 
          farmerId: farmerInput.farmerId,
          reason: 'Daily SMS limit exceeded - will retry tomorrow'
        })
        return { success: true, method: 'Skipped', reason: 'Daily SMS limit exceeded - will retry tomorrow' }
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
        // Check if it's a daily limit exceeded error
        if (result.sms?.error && result.sms.error.includes('exceeded the 9 daily messages limit')) {
          this.logger.warn('sms_daily_limit_exceeded', { 
            farmerId: farmerInput.farmerId,
            error: 'Daily SMS limit exceeded - will retry tomorrow',
            suggestion: 'Upgrade Twilio account or wait for daily reset'
          })
          // Set environment flag to skip future SMS attempts today
          process.env.SMS_LIMIT_EXCEEDED = 'true'
          return { success: true, method: 'Skipped', reason: 'Daily SMS limit exceeded - will retry tomorrow' }
        } else {
          this.logger.warn('sms_notification_failed', { 
            farmerId: farmerInput.farmerId,
            error: result.error 
          })
        }
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

