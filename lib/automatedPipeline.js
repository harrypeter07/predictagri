// Automated Pipeline Service - AgriPredict Core
// Integrates NASA data, weather, alerts, and voice assistant

const NASADataService = require('./nasaDataService')
const OpenMeteoService = require('./openMeteoService')
const TwilioService = require('./twilioService')
const VoiceAssistant = require('./voiceAssistant')
const { Logger } = require('./logger')

class AutomatedPipeline {
  constructor() {
    this.logger = new Logger({ service: 'AutomatedPipeline' })
    this.nasaService = new NASADataService(process.env.NASA_API_KEY)
    this.weatherService = new OpenMeteoService()
    this.twilioService = new TwilioService()
    this.voiceAssistant = new VoiceAssistant()
  }

  // Main pipeline execution
  async executePipeline(region, farmerData = {}) {
    const pipelineId = `pipeline_${Date.now()}`
    this.logger.info('pipeline_started', { pipelineId, region, farmerData })
    
    try {
      // Step 1: Collect all data sources
      const dataCollection = await this.collectData(region)
      
      // Step 2: Analyze and generate insights
      const insights = await this.generateInsights(dataCollection, region)
      
      // Step 3: Generate predictions
      const predictions = await this.generatePredictions(insights, region)
      
      // Step 4: Check for alerts
      const alerts = await this.checkAlerts(insights, predictions, region)
      
      // Step 5: Send notifications if needed
      const notifications = await this.sendNotifications(alerts, farmerData)
      
      // Step 6: Update voice assistant context
      const voiceContext = await this.updateVoiceContext(insights, predictions, alerts)
      
      this.logger.info('pipeline_completed', { 
        pipelineId, 
        dataSources: Object.keys(dataCollection).length,
        insightsCount: insights.length,
        predictionsCount: predictions.length,
        alertsCount: alerts.length,
        notificationsSent: notifications.length
      })
      
      return {
        success: true,
        pipelineId,
        timestamp: new Date().toISOString(),
        dataCollection,
        insights,
        predictions,
        alerts,
        notifications,
        voiceContext
      }
    } catch (error) {
      this.logger.error('pipeline_failed', { pipelineId, error: error.message })
      return {
        success: false,
        pipelineId,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  // Step 1: Collect data from all sources
  async collectData(region) {
    this.logger.info('data_collection_started', { region })
    
    const { lat, lon } = this.getRegionCoordinates(region)
    
    try {
      const [nasaData, weatherData] = await Promise.all([
        this.nasaService.getAgriculturalInsights(region, lat, lon),
        this.weatherService.getCurrent(lat, lon)
      ])
      
      this.logger.info('data_collection_completed', { 
        nasaSuccess: nasaData.success,
        weatherSuccess: weatherData ? true : false
      })
      
      return {
        nasa: nasaData,
        weather: weatherData,
        region: { name: region, lat, lon },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('data_collection_failed', { error: error.message })
      throw error
    }
  }

  // Step 2: Generate insights from collected data
  async generateInsights(dataCollection, region) {
    this.logger.info('insights_generation_started', { region })
    
    const insights = []
    
    try {
      // Weather insights
      if (dataCollection.weather?.current) {
        const weather = dataCollection.weather.current
        insights.push({
          type: 'weather',
          severity: this.assessWeatherSeverity(weather),
          message: this.generateWeatherInsight(weather),
          data: weather
        })
      }
      
      // NASA natural disaster insights
      if (dataCollection.nasa?.data?.naturalDisasters) {
        const disasters = dataCollection.nasa.data.naturalDisasters
        disasters.forEach(disaster => {
          insights.push({
            type: 'natural_disaster',
            severity: this.assessDisasterSeverity(disaster),
            message: this.generateDisasterInsight(disaster),
            data: disaster
          })
        })
      }
      
      // Agricultural recommendations
      if (dataCollection.nasa?.data?.recommendations) {
        insights.push({
          type: 'recommendation',
          severity: 'medium',
          message: dataCollection.nasa.data.recommendations.join('. '),
          data: dataCollection.nasa.data.recommendations
        })
      }
      
      this.logger.info('insights_generation_completed', { insightsCount: insights.length })
      return insights
    } catch (error) {
      this.logger.error('insights_generation_failed', { error: error.message })
      throw error
    }
  }

  // Step 3: Generate predictions based on insights
  async generatePredictions(insights, region) {
    this.logger.info('predictions_generation_started', { region })
    
    const predictions = []
    
    try {
      // Yield prediction based on weather and conditions
      const yieldPrediction = this.predictYield(insights, region)
      if (yieldPrediction) {
        predictions.push(yieldPrediction)
      }
      
      // Risk predictions
      const riskPredictions = this.predictRisks(insights, region)
      predictions.push(...riskPredictions)
      
      // Weather predictions
      const weatherPredictions = this.predictWeather(insights, region)
      predictions.push(...weatherPredictions)
      
      this.logger.info('predictions_generation_completed', { predictionsCount: predictions.length })
      return predictions
    } catch (error) {
      this.logger.error('predictions_generation_failed', { error: error.message })
      throw error
    }
  }

  // Step 4: Check for alerts based on insights and predictions
  async checkAlerts(insights, predictions, region) {
    this.logger.info('alerts_check_started', { region })
    
    const alerts = []
    
    try {
      // High severity insights become alerts
      insights.forEach(insight => {
        if (insight.severity === 'high') {
          alerts.push({
            type: 'insight_alert',
            severity: 'high',
            message: insight.message,
            data: insight.data
          })
        }
      })
      
      // Critical predictions become alerts
      predictions.forEach(prediction => {
        if (prediction.severity === 'critical') {
          alerts.push({
            type: 'prediction_alert',
            severity: 'critical',
            message: prediction.message,
            data: prediction.data
          })
        }
      })
      
      this.logger.info('alerts_check_completed', { alertsCount: alerts.length })
      return alerts
    } catch (error) {
      this.logger.error('alerts_check_failed', { error: error.message })
      throw error
    }
  }

  // Step 5: Send notifications via Twilio
  async sendNotifications(alerts, farmerData) {
    this.logger.info('notifications_sending_started', { alertsCount: alerts.length })
    
    const notifications = []
    
    try {
      for (const alert of alerts) {
        if (farmerData.phoneNumber) {
          const notification = await this.twilioService.sendAgriculturalAlert(
            farmerData.phoneNumber,
            {
              type: alert.type,
              severity: alert.severity,
              region: farmerData.region || 'Unknown',
              crop: farmerData.crops || 'Unknown',
              recommendation: alert.message
            },
            farmerData.language || 'en'
          )
          
          notifications.push({
            alertId: alert.type,
            phoneNumber: farmerData.phoneNumber,
            result: notification
          })
        }
      }
      
      this.logger.info('notifications_sending_completed', { notificationsCount: notifications.length })
      return notifications
    } catch (error) {
      this.logger.error('notifications_sending_failed', { error: error.message })
      throw error
    }
  }

  // Step 6: Update voice assistant context
  async updateVoiceContext(insights, predictions, alerts) {
    this.logger.info('voice_context_update_started')
    
    try {
      const context = {
        weather: this.summarizeWeather(insights),
        crops: this.summarizeCrops(predictions),
        region: 'Agricultural Region',
        alerts: this.summarizeAlerts(alerts)
      }
      
      this.logger.info('voice_context_update_completed')
      return context
    } catch (error) {
      this.logger.error('voice_context_update_failed', { error: error.message })
      throw error
    }
  }

  // Helper methods
  getRegionCoordinates(region) {
    // Default to Kansas coordinates
    const regionMap = {
      'kansas': { lat: 38.5111, lon: -96.8005 },
      'iowa': { lat: 41.8780, lon: -93.0977 },
      'california': { lat: 36.7783, lon: -119.4179 },
      'maharashtra': { lat: 19.7515, lon: 75.7139 },
      'punjab': { lat: 31.1471, lon: 75.3412 }
    }
    
    return regionMap[region.toLowerCase()] || regionMap['kansas']
  }

  assessWeatherSeverity(weather) {
    const temp = weather.temperature_2m
    const humidity = weather.relative_humidity_2m
    
    if (temp > 35 || temp < 5) return 'high'
    if (humidity > 85 || humidity < 20) return 'medium'
    return 'low'
  }

  assessDisasterSeverity(disaster) {
    const severityMap = {
      'wildfires': 'high',
      'severe-storms': 'medium',
      'droughts': 'high',
      'floods': 'medium'
    }
    
    const category = disaster.categories?.[0]?.id
    return severityMap[category] || 'medium'
  }

  generateWeatherInsight(weather) {
    const temp = weather.temperature_2m
    const humidity = weather.relative_humidity_2m
    
    if (temp > 35) {
      return 'High temperature detected. Consider irrigation and shade protection.'
    } else if (temp < 5) {
      return 'Low temperature detected. Protect crops from frost damage.'
    } else if (humidity > 85) {
      return 'High humidity detected. Monitor for fungal diseases.'
    } else if (humidity < 20) {
      return 'Low humidity detected. Consider additional irrigation.'
    }
    
    return 'Weather conditions are favorable for crop growth.'
  }

  generateDisasterInsight(disaster) {
    const category = disaster.categories?.[0]?.id
    const title = disaster.title
    
    switch (category) {
      case 'wildfires':
        return `Wildfire alert: ${title}. Implement fire breaks and protect livestock.`
      case 'droughts':
        return `Drought alert: ${title}. Consider drought-resistant crops and water conservation.`
      case 'floods':
        return `Flood alert: ${title}. Ensure proper drainage and protect equipment.`
      case 'severe-storms':
        return `Storm alert: ${title}. Secure equipment and protect crops.`
      default:
        return `Natural event: ${title}. Monitor conditions closely.`
    }
  }

  predictYield(insights, region) {
    // Simple yield prediction based on weather conditions
    const weatherInsight = insights.find(i => i.type === 'weather')
    if (!weatherInsight) return null
    
    const temp = weatherInsight.data.temperature_2m
    let yieldChange = 0
    
    if (temp > 35) yieldChange = -15
    else if (temp > 30) yieldChange = -5
    else if (temp < 5) yieldChange = -20
    else if (temp < 10) yieldChange = -10
    else yieldChange = 5
    
    return {
      type: 'yield_prediction',
      severity: yieldChange < -10 ? 'high' : 'medium',
      message: `Predicted yield change: ${yieldChange > 0 ? '+' : ''}${yieldChange}% based on current weather conditions.`,
      data: { yieldChange, temperature: temp }
    }
  }

  predictRisks(insights, region) {
    const risks = []
    
    insights.forEach(insight => {
      if (insight.severity === 'high') {
        risks.push({
          type: 'risk_prediction',
          severity: 'critical',
          message: `High risk detected: ${insight.message}`,
          data: insight.data
        })
      }
    })
    
    return risks
  }

  predictWeather(insights, region) {
    const weatherInsight = insights.find(i => i.type === 'weather')
    if (!weatherInsight) return []
    
    const predictions = []
    const temp = weatherInsight.data.temperature_2m
    
    if (temp > 35) {
      predictions.push({
        type: 'weather_prediction',
        severity: 'high',
        message: 'High temperatures expected to continue. Prepare for heat stress.',
        data: { predictedTemp: temp + 2 }
      })
    }
    
    return predictions
  }

  summarizeWeather(insights) {
    const weatherInsight = insights.find(i => i.type === 'weather')
    return weatherInsight ? weatherInsight.message : 'Weather data unavailable'
  }

  summarizeCrops(predictions) {
    const yieldPrediction = predictions.find(p => p.type === 'yield_prediction')
    return yieldPrediction ? yieldPrediction.message : 'Crop predictions unavailable'
  }

  summarizeAlerts(alerts) {
    if (alerts.length === 0) return 'No active alerts'
    return `${alerts.length} active alert(s): ${alerts.map(a => a.message).join('. ')}`
  }
}

module.exports = AutomatedPipeline
