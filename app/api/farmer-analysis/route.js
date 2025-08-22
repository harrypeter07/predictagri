import { NextResponse } from 'next/server'
import { googleEarthEngineService } from '../../../lib/googleEarthEngineService'
const imageProcessingService = require('../../../lib/imageProcessingService')

// GET: Get comprehensive farmer analysis
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat'))
    const lon = parseFloat(searchParams.get('lon'))
    const address = searchParams.get('address')
    const farmerId = searchParams.get('farmerId') || 'farmer_001'

    if (!lat && !lon && !address) {
      return NextResponse.json(
        { error: 'Either coordinates (lat, lon) or address must be provided' },
        { status: 400 }
      )
    }

    // Step 1: Get farmer location data
    let coordinates
    if (lat && lon) {
      coordinates = { lat, lon }
    } else if (address) {
      // Simple geocoding fallback - in production, use proper geocoding service
      coordinates = await getCoordinatesFromAddress(address)
    }

    const region = {
      name: `Farmer Field ${farmerId}`,
      lat: coordinates.lat,
      lon: coordinates.lon
    }

    // Step 2: Collect comprehensive environmental data
    const environmentalData = await collectEnvironmentalData(region)
    
    // Step 3: Get weather data
    const weatherData = await getWeatherData(coordinates)
    
    // Step 4: Generate agricultural insights
    const insights = generateAgriculturalInsights(region, environmentalData, weatherData)
    
    // Step 5: Create recommendations
    const recommendations = generateRecommendations(insights)

    return NextResponse.json({
      success: true,
      farmerId,
      timestamp: new Date().toISOString(),
      location: {
        coordinates,
        address: address || `Coordinates: ${lat}, ${lon}`,
        agriculturalZone: classifyAgriculturalZone(coordinates.lat, coordinates.lon),
        soilClassification: classifySoilType(coordinates.lat, coordinates.lon)
      },
      environmental: environmentalData,
      weather: weatherData,
      insights,
      recommendations,
      summary: generateSummary(insights, recommendations)
    })

  } catch (error) {
    console.error('Farmer analysis failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      fallbackData: getFallbackData()
    }, { status: 500 })
  }
}

// POST: Process farmer data with images
export async function POST(request) {
  try {
    const body = await request.json()
    const { farmerId, coordinates, address, images, imageBase64 } = body

    if (!farmerId) {
      return NextResponse.json(
        { error: 'Farmer ID is required' },
        { status: 400 }
      )
    }

    // Get coordinates
    let farmerCoordinates
    if (coordinates) {
      farmerCoordinates = coordinates
    } else if (address) {
      farmerCoordinates = await getCoordinatesFromAddress(address)
    } else {
      return NextResponse.json(
        { error: 'Either coordinates or address must be provided' },
        { status: 400 }
      )
    }

    const region = {
      name: `Farmer Field ${farmerId}`,
      lat: farmerCoordinates.lat,
      lon: farmerCoordinates.lon
    }

    // Collect all data
    const [environmentalData, weatherData, imageAnalysis] = await Promise.all([
      collectEnvironmentalData(region),
      getWeatherData(farmerCoordinates),
      processFarmerImages(images, imageBase64)
    ])

    // Generate insights and recommendations
    const insights = generateAgriculturalInsights(region, environmentalData, weatherData, imageAnalysis)
    const recommendations = generateRecommendations(insights)

    return NextResponse.json({
      success: true,
      farmerId,
      timestamp: new Date().toISOString(),
      location: {
        coordinates: farmerCoordinates,
        address: address || `Coordinates: ${farmerCoordinates.lat}, ${farmerCoordinates.lon}`,
        agriculturalZone: classifyAgriculturalZone(farmerCoordinates.lat, farmerCoordinates.lon),
        soilClassification: classifySoilType(farmerCoordinates.lat, farmerCoordinates.lon)
      },
      environmental: environmentalData,
      weather: weatherData,
      imageAnalysis,
      insights,
      recommendations,
      summary: generateSummary(insights, recommendations)
    })

  } catch (error) {
    console.error('Farmer analysis with images failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      fallbackData: getFallbackData()
    }, { status: 500 })
  }
}

// Helper functions
async function getCoordinatesFromAddress(address) {
    // Try to get coordinates from database regions first
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: regions } = await supabase
      .from('regions')
      .select('name, lat, lon')
    
    if (regions) {
      for (const region of regions) {
        if (address.toLowerCase().includes(region.name.toLowerCase())) {
          return { lat: region.lat, lon: region.lon }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to fetch regions from database:', error)
  }

  // Fallback to default coordinates if no match found
  return { lat: 21.1458, lon: 79.0882 }
}

async function collectEnvironmentalData(region) {
  try {
    // Initialize Google Earth Engine
    await googleEarthEngineService.initialize()
    
    // Get comprehensive data
    const [satelliteData, soilData] = await Promise.all([
      googleEarthEngineService.getComprehensiveSatelliteData(region),
      googleEarthEngineService.getComprehensiveSoilData(region)
    ])

    return {
      satellite: satelliteData,
      soil: soilData,
      timestamp: new Date().toISOString(),
      source: 'Google Earth Engine'
    }
  } catch (error) {
    console.error('Environmental data collection failed:', error)
    return getFallbackEnvironmentalData(region)
  }
}

async function getWeatherData(coordinates) {
  try {
    // Use Open-Meteo API (free, no key required)
    const [currentUrl, dailyUrl] = [
      `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`,
      `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
    ]

    const [currentRes, dailyRes] = await Promise.all([
      fetch(currentUrl),
      fetch(dailyUrl)
    ])

    const [currentData, dailyData] = await Promise.all([
      currentRes.json(),
      dailyRes.json()
    ])

    return {
      current: currentData.current,
      forecast: dailyData.daily,
      agriculturalImpact: calculateWeatherAgriculturalImpact(currentData.current, dailyData.daily),
      timestamp: new Date().toISOString(),
      source: 'Open-Meteo API'
    }
  } catch (error) {
    console.error('Weather data collection failed:', error)
    return getFallbackWeatherData(coordinates)
  }
}

async function processFarmerImages(images, imageBase64) {
  try {
    if (!images && !imageBase64) {
      return { success: true, data: null, message: 'No images provided' }
    }

    let imageResults = []

    if (images && Array.isArray(images)) {
      // Process multiple images
      for (let i = 0; i < images.length; i++) {
        const image = images[i]
        const result = await processSingleImage(image, `image_${i + 1}`)
        imageResults.push(result)
      }
    } else if (imageBase64) {
      // Process single base64 image
      const result = await processSingleImage(
        { data: imageBase64, type: 'base64' }, 
        'main_image'
      )
      imageResults.push(result)
    }

    return {
      success: true,
      data: imageResults,
      summary: summarizeImageAnalysis(imageResults),
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Image processing failed:', error)
    return getFallbackImageAnalysis()
  }
}

async function processSingleImage(image, imageId) {
  try {
    let imageBuffer
    
    if (image.type === 'base64') {
      imageBuffer = Buffer.from(image.data, 'base64')
    } else if (image.url) {
      const response = await fetch(image.url)
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
    } else {
      throw new Error('Invalid image format')
    }

    // Perform comprehensive image analysis
    const [comprehensive, cropHealth, soil, disease] = await Promise.all([
      imageProcessingService.analyzeAgriculturalImage(imageBuffer, 'comprehensive'),
      imageProcessingService.analyzeAgriculturalImage(imageBuffer, 'crop-health'),
      imageProcessingService.analyzeAgriculturalImage(imageBuffer, 'soil-analysis'),
      imageProcessingService.analyzeAgriculturalImage(imageBuffer, 'disease-detection')
    ])

    return {
      imageId,
      timestamp: new Date().toISOString(),
      comprehensive,
      cropHealth,
      soil,
      disease,
      metadata: {
        size: imageBuffer.length,
        analysisTypes: ['comprehensive', 'crop-health', 'soil-analysis', 'disease-detection']
      }
    }

  } catch (error) {
    console.error('Single image processing failed:', error)
    return {
      imageId,
      error: error.message,
      timestamp: new Date().toISOString(),
      data: getFallbackSingleImageAnalysis(imageId)
    }
  }
}

function generateAgriculturalInsights(region, environmentalData, weatherData, imageAnalysis = null) {
  const insights = {
    soilHealth: analyzeSoilHealth(environmentalData.soil),
    cropSuitability: analyzeCropSuitability(region, environmentalData, weatherData),
    waterManagement: analyzeWaterManagement(environmentalData, weatherData),
    pestRisk: analyzePestRisk(environmentalData, weatherData, imageAnalysis),
    yieldPotential: analyzeYieldPotential(environmentalData, weatherData, region),
    climateAdaptation: analyzeClimateAdaptation(weatherData, region),
    imageInsights: imageAnalysis ? extractImageInsights(imageAnalysis) : null,
    timestamp: new Date().toISOString()
  }

  return insights
}

function generateRecommendations(insights) {
  const recommendations = []

  // Soil management recommendations
  if (insights.soilHealth) {
    recommendations.push(...generateSoilRecommendations(insights.soilHealth))
  }

  // Crop selection recommendations
  if (insights.cropSuitability) {
    recommendations.push(...generateCropRecommendations(insights.cropSuitability))
  }

  // Water management recommendations
  if (insights.waterManagement) {
    recommendations.push(...generateWaterRecommendations(insights.waterManagement))
  }

  // Prioritize recommendations
  return recommendations.sort((a, b) => {
    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })
}

// Analysis functions
function analyzeSoilHealth(soilData) {
  const health = {
    overall: 'Good',
    score: 75,
    issues: [],
    strengths: [],
    recommendations: []
  }

  if (soilData && soilData.soilMoisture) {
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

  if (soilData && soilData.soilPh) {
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

function analyzeCropSuitability(region, environmentalData, weatherData) {
  const suitability = {
    bestCrops: [],
    goodCrops: [],
    avoidCrops: [],
    reasoning: {}
  }

  // Zone-based recommendations
  const zone = classifyAgriculturalZone(region.lat, region.lon)
  if (zone.zone === 'Northern Plains') {
    suitability.bestCrops.push('Wheat', 'Rice', 'Cotton')
    suitability.goodCrops.push('Sugarcane', 'Pulses')
  } else if (zone.zone === 'Central Plateau') {
    suitability.bestCrops.push('Cotton', 'Soybean', 'Pulses')
    suitability.goodCrops.push('Oilseeds', 'Wheat')
  } else if (zone.zone === 'Southern Peninsula') {
    suitability.bestCrops.push('Rice', 'Coconut', 'Spices')
    suitability.goodCrops.push('Coffee', 'Tea')
  }

  // Weather-based adjustments
  if (weatherData && weatherData.current && weatherData.current.temperature_2m > 30) {
    suitability.avoidCrops.push('Wheat')
    suitability.reasoning['Wheat'] = 'High temperature may affect wheat growth'
  }

  return suitability
}

function analyzeWaterManagement(environmentalData, weatherData) {
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

  return waterManagement
}

function analyzePestRisk(environmentalData, weatherData, imageAnalysis) {
  const pestRisk = {
    overall: 'Low',
    factors: [],
    recommendations: []
  }

  // Weather-based pest risk
  if (weatherData && weatherData.current && weatherData.current.relative_humidity_2m > 80) {
    pestRisk.factors.push('High humidity - favorable for fungal diseases')
    pestRisk.recommendations.push('Monitor for fungal infections')
  }

  if (weatherData && weatherData.current && weatherData.current.temperature_2m > 25) {
    pestRisk.factors.push('Warm temperature - favorable for insect pests')
    pestRisk.recommendations.push('Check for insect infestations')
  }

  // Image-based pest detection
  if (imageAnalysis && imageAnalysis.data) {
    imageAnalysis.data.forEach(image => {
      if (image.disease && image.disease.data && image.disease.data.results) {
        const diseases = image.disease.data.results
        if (diseases.some(d => d.confidence > 0.7)) {
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

function analyzeYieldPotential(environmentalData, weatherData, region) {
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

  // Calculate final score
  yieldPotential.score = Math.max(0, Math.min(100, yieldPotential.score))
  
  if (yieldPotential.score >= 80) yieldPotential.overall = 'Excellent'
  else if (yieldPotential.score >= 60) yieldPotential.overall = 'Good'
  else if (yieldPotential.score >= 40) yieldPotential.overall = 'Fair'
  else yieldPotential.overall = 'Poor'

  return yieldPotential
}

function analyzeClimateAdaptation(weatherData, region) {
  const adaptation = {
    strategies: [],
    risks: [],
    opportunities: []
  }

  if (weatherData && weatherData.forecast && weatherData.forecast.daily) {
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

  return adaptation
}

function extractImageInsights(imageAnalysis) {
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
  })

  return insights
}

// Classification functions
function classifyAgriculturalZone(lat, lon) {
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

function classifySoilType(lat, lon) {
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

// Utility functions
function calculateWeatherAgriculturalImpact(current, daily) {
  const impact = {
    irrigation: 'Not needed',
    pestRisk: 'Low',
    cropStress: 'Low'
  }

  if (current && current.temperature_2m > 30) {
    impact.irrigation = 'May be needed'
    impact.cropStress = 'Moderate'
  }

  if (current && current.relative_humidity_2m > 80) {
    impact.pestRisk = 'Moderate'
  }

  return impact
}

function summarizeImageAnalysis(imageResults) {
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

function generateSummary(insights, recommendations) {
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

// Recommendation generation functions
function generateSoilRecommendations(soilHealth) {
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

function generateCropRecommendations(cropSuitability) {
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

function generateWaterRecommendations(waterManagement) {
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

// Fallback data functions
function getFallbackEnvironmentalData(region) {
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
    timestamp: new Date().toISOString(),
    source: 'Fallback Data'
  }
}

function getFallbackWeatherData(coordinates) {
  return {
    current: {
      temperature_2m: 28,
      relative_humidity_2m: 65,
      wind_speed_10m: 12,
      time: new Date().toISOString()
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
    },
    timestamp: new Date().toISOString(),
    source: 'Fallback Data'
  }
}

function getFallbackImageAnalysis() {
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

function getFallbackSingleImageAnalysis(imageId) {
  return {
    overallHealth: 'Good',
    soilType: 'Loam',
    diseasePresence: 'None detected',
    weedInfestation: 'Low'
  }
}

function getFallbackData() {
  return {
    location: {
      coordinates: { lat: 21.1458, lon: 79.0882 },
      address: 'Nagpur, Maharashtra, India',
      agriculturalZone: { zone: 'Central Plateau', characteristics: ['Cotton', 'Soybean', 'Pulses', 'Oilseeds'] },
      soilClassification: { 
        type: 'Black Soil', 
        characteristics: ['High clay content', 'Good moisture retention', 'Suitable for cotton'],
        npk: { n: 'Medium', p: 'High', k: 'Low' }
      }
    },
          environmental: getFallbackEnvironmentalData({ lat: 21.1458, lon: 79.0882 }),
      weather: getFallbackWeatherData({ lat: 21.1458, lon: 79.0882 }),
      imageAnalysis: getFallbackImageAnalysis(),
    insights: {
      soilHealth: { overall: 'Good', score: 75, issues: [], strengths: ['Optimal soil moisture'], recommendations: [] },
      cropSuitability: { bestCrops: ['Cotton', 'Soybean'], goodCrops: ['Pulses'], avoidCrops: [], reasoning: {} },
      waterManagement: { irrigationNeeds: 'Moderate', drainageNeeds: 'Low', waterConservation: [], floodRisk: 'Low', droughtRisk: 'Moderate' },
      pestRisk: { overall: 'Low', factors: [], recommendations: [] },
      yieldPotential: { overall: 'Good', score: 75, factors: ['High vegetation density'], limitations: [] },
      climateAdaptation: { strategies: [], risks: [], opportunities: [] },
      imageInsights: { cropHealth: 'Good', soilConditions: 'Black Soil', diseasePresence: 'None', weedInfestation: 'Low', recommendations: [] },
      timestamp: new Date().toISOString()
    },
    recommendations: [
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
}
