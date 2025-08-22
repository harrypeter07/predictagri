// Twilio Service for SMS and Voice Alerts
import twilio from 'twilio'
import { Logger } from './logger.js'

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID
    this.authToken = process.env.TWILIO_AUTH_TOKEN
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER
    this.logger = new Logger({ service: 'TwilioService' })
    
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken)
    }
  }

  // Send SMS alert to farmer
  async sendSMSAlert(phoneNumber, message, language = 'en') {
    if (!this.client) {
      this.logger.warn('twilio_not_configured', { message: 'Twilio credentials not found' })
      return { success: false, error: 'Twilio not configured' }
    }

    try {
      this.logger.info('sms_alert_sending', { phoneNumber, language })
      
      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: phoneNumber
      })

      this.logger.info('sms_alert_sent', { sid: result.sid, status: result.status })
      return { success: true, sid: result.sid, status: result.status }
    } catch (error) {
      this.logger.error('sms_alert_failed', { error: error.message, phoneNumber })
      return { success: false, error: error.message }
    }
  }

  // Send voice call alert (TTS)
  async sendVoiceAlert(phoneNumber, message, language = 'en') {
    if (!this.client) {
      this.logger.warn('twilio_not_configured', { message: 'Twilio credentials not found' })
      return { success: false, error: 'Twilio not configured' }
    }

    try {
      this.logger.info('voice_alert_sending', { phoneNumber, language })
      
      // Create TwiML for voice call
      const twiml = new twilio.twiml.VoiceResponse()
      
      // Set language-specific voice
      const voiceParams = this.getVoiceParams(language)
      twiml.say(voiceParams, message)
      
      const result = await this.client.calls.create({
        twiml: twiml.toString(),
        from: this.phoneNumber,
        to: phoneNumber
      })

      this.logger.info('voice_alert_sent', { sid: result.sid, status: result.status })
      return { success: true, sid: result.sid, status: result.status }
    } catch (error) {
      this.logger.error('voice_alert_failed', { error: error.message, phoneNumber })
      return { success: false, error: error.message }
    }
  }

  // Get voice parameters for different languages
  getVoiceParams(language) {
    const voiceMap = {
      'en': { voice: 'alice', language: 'en-US' },
      'hi': { voice: 'alice', language: 'hi-IN' },
      'mr': { voice: 'alice', language: 'mr-IN' },
      'default': { voice: 'alice', language: 'en-US' }
    }
    
    return voiceMap[language] || voiceMap.default
  }

  // Send agricultural alert with multilingual support
  async sendAgriculturalAlert(phoneNumber, alertData, language = 'en') {
    const message = this.formatAgriculturalMessage(alertData, language)
    
    // Send both SMS and voice for critical alerts
    const [smsResult, voiceResult] = await Promise.all([
      this.sendSMSAlert(phoneNumber, message, language),
      this.sendVoiceAlert(phoneNumber, message, language)
    ])

    return {
      success: smsResult.success || voiceResult.success,
      sms: smsResult,
      voice: voiceResult
    }
  }

  // Format agricultural message in different languages
  formatAgriculturalMessage(alertData, language) {
    const { type, severity, region, crop, recommendation } = alertData
    
    const messages = {
      'en': {
        drought: `🚨 DROUGHT ALERT for ${region}: ${crop} crops at risk. ${recommendation}`,
        flood: `🌊 FLOOD ALERT for ${region}: ${crop} crops threatened. ${recommendation}`,
        pest: `🐛 PEST ALERT for ${region}: ${crop} crops affected. ${recommendation}`,
        disease: `🦠 DISEASE ALERT for ${region}: ${crop} crops infected. ${recommendation}`,
        default: `⚠️ AGRICULTURAL ALERT for ${region}: ${recommendation}`
      },
      'hi': {
        drought: `🚨 सूखा चेतावनी ${region} के लिए: ${crop} फसलें खतरे में। ${recommendation}`,
        flood: `🌊 बाढ़ चेतावनी ${region} के लिए: ${crop} फसलें खतरे में। ${recommendation}`,
        pest: `🐛 कीट चेतावनी ${region} के लिए: ${crop} फसलें प्रभावित। ${recommendation}`,
        disease: `🦠 रोग चेतावनी ${region} के लिए: ${crop} फसलें संक्रमित। ${recommendation}`,
        default: `⚠️ कृषि चेतावनी ${region} के लिए: ${recommendation}`
      },
      'mr': {
        drought: `🚨 दुष्काळ सूचना ${region} साठी: ${crop} पिके धोक्यात। ${recommendation}`,
        flood: `🌊 पूर सूचना ${region} साठी: ${crop} पिके धोक्यात। ${recommendation}`,
        pest: `🐛 कीड सूचना ${region} साठी: ${crop} पिके प्रभावित। ${recommendation}`,
        disease: `🦠 रोग सूचना ${region} साठी: ${crop} पिके संक्रमित। ${recommendation}`,
        default: `⚠️ शेती सूचना ${region} साठी: ${recommendation}`
      }
    }

    const langMessages = messages[language] || messages['en']
    return langMessages[type] || langMessages.default
  }

  // Send weather-driven warning
  async sendWeatherWarning(phoneNumber, weatherData, language = 'en') {
    const { temperature, humidity, precipitation, region, crop } = weatherData
    
    let alertType = 'default'
    let recommendation = this.getWeatherRecommendation(temperature, humidity, precipitation, language)
    
    if (temperature > 35) {
      alertType = 'drought'
    } else if (precipitation > 50) {
      alertType = 'flood'
    } else if (humidity > 80) {
      alertType = 'disease'
    }

    return this.sendAgriculturalAlert(phoneNumber, {
      type: alertType,
      severity: 'medium',
      region,
      crop,
      recommendation
    }, language)
  }

  // Get weather recommendations in different languages
  getWeatherRecommendation(temperature, humidity, precipitation, language) {
    const recommendations = {
      'en': {
        highTemp: 'High temperature detected. Consider irrigation and shade protection.',
        heavyRain: 'Heavy rainfall expected. Ensure proper drainage.',
        highHumidity: 'High humidity detected. Monitor for fungal diseases.',
        default: 'Monitor weather conditions closely.'
      },
      'hi': {
        highTemp: 'उच्च तापमान का पता चला है। सिंचाई और छाया संरक्षण पर विचार करें।',
        heavyRain: 'भारी बारिश की उम्मीद है। उचित जल निकासी सुनिश्चित करें।',
        highHumidity: 'उच्च आर्द्रता का पता चला है। फंगल रोगों की निगरानी करें।',
        default: 'मौसम की स्थिति की बारीकी से निगरानी करें।'
      },
      'mr': {
        highTemp: 'उच्च तापमान आढळले आहे. सिंचन आणि सावली संरक्षणाचा विचार करा.',
        heavyRain: 'जड पाऊस अपेक्षित आहे. योग्य जलनिःसारण सुनिश्चित करा.',
        highHumidity: 'उच्च आर्द्रता आढळली आहे. फंगल रोगांचे निरीक्षण करा.',
        default: 'हवामान परिस्थितीचे जवळून निरीक्षण करा.'
      }
    }

    const langRecs = recommendations[language] || recommendations['en']
    
    if (temperature > 35) {
      return langRecs.highTemp
    } else if (precipitation > 50) {
      return langRecs.heavyRain
    } else if (humidity > 80) {
      return langRecs.highHumidity
    }
    
    return langRecs.default
  }

  // Send yield prediction alert
  async sendYieldAlert(phoneNumber, yieldData, language = 'en') {
    const { crop, region, predictedYield, averageYield, percentage } = yieldData
    
    let alertType = 'default'
    let recommendation = this.getYieldRecommendation(percentage, language)
    
    if (percentage < -10) {
      alertType = 'drought'
    } else if (percentage > 10) {
      alertType = 'default'
    }

    const yieldMessage = this.formatYieldMessage(crop, predictedYield, percentage, language)

    return this.sendAgriculturalAlert(phoneNumber, {
      type: alertType,
      severity: 'medium',
      region,
      crop,
      recommendation: `${yieldMessage} ${recommendation}`
    }, language)
  }

  // Get yield recommendations in different languages
  getYieldRecommendation(percentage, language) {
    const recommendations = {
      'en': {
        below: 'Below average yield expected. Consider drought-resistant varieties.',
        above: 'Above average yield expected. Plan for storage and marketing.',
        normal: 'Monitor crop health and weather conditions.'
      },
      'hi': {
        below: 'औसत से कम उपज की उम्मीद है। सूखा प्रतिरोधी किस्मों पर विचार करें।',
        above: 'औसत से अधिक उपज की उम्मीद है। भंडारण और विपणन की योजना बनाएं।',
        normal: 'फसल स्वास्थ्य और मौसम की स्थिति की निगरानी करें।'
      },
      'mr': {
        below: 'सरासरीपेक्षा कम उत्पादन अपेक्षित आहे. दुष्काळ प्रतिरोधक जातींचा विचार करा.',
        above: 'सरासरीपेक्षा जास्त उत्पादन अपेक्षित आहे. साठवण आणि विपणनाची योजना करा.',
        normal: 'पीक आरोग्य आणि हवामान परिस्थितीचे निरीक्षण करा.'
      }
    }

    const langRecs = recommendations[language] || recommendations['en']
    
    if (percentage < -10) {
      return langRecs.below
    } else if (percentage > 10) {
      return langRecs.above
    }
    
    return langRecs.normal
  }

  // Format yield message in different languages
  formatYieldMessage(crop, predictedYield, percentage, language) {
    const messages = {
      'en': `${crop} yield prediction: ${predictedYield} tons (${percentage}% vs average).`,
      'hi': `${crop} उपज पूर्वानुमान: ${predictedYield} टन (औसत से ${percentage}%)।`,
      'mr': `${crop} उत्पादन अंदाज: ${predictedYield} टन (सरासरीपेक्षा ${percentage}%)।`
    }

    return messages[language] || messages['en']
  }
}

export const twilioService = new TwilioService()
export default twilioService
