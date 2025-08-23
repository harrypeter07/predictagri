// Twilio Service for SMS Alerts Only (Voice calls removed)
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

  // Send SMS alert only (voice calls removed)
  async sendAgriculturalAlert(phoneNumber, alertData, language = 'en') {
    try {
      if (!this.client) {
        this.logger.warn('twilio_not_configured', { message: 'Twilio credentials not found' })
        return { success: false, error: 'Twilio not configured' }
      }

      const message = this.generateAlertMessage(alertData, language)
      
      this.logger.info('sending_sms_alert', { 
        phoneNumber: phoneNumber.substring(0, 8) + '***',
        language,
        messageLength: message.length
      })

      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: phoneNumber
      })

      this.logger.info('sms_alert_sent_successfully', { 
        messageId: result.sid,
        phoneNumber: phoneNumber.substring(0, 8) + '***'
      })

      return {
        success: true,
        sms: {
          success: true,
          messageId: result.sid,
          status: result.status
        },
        voice: {
          success: false,
          error: 'Voice calls disabled'
        }
      }

    } catch (error) {
      this.logger.error('sms_alert_failed', { 
        phoneNumber: phoneNumber.substring(0, 8) + '***',
        error: error.message 
      })

      return {
        success: false,
        sms: {
          success: false,
          error: error.message
        },
        voice: {
          success: false,
          error: 'Voice calls disabled'
        }
      }
    }
  }

  // Generate alert message based on type and language
  generateAlertMessage(alertData, language = 'en') {
    const messages = {
      'en': {
        weather_alert: '🌤️ Weather Alert: ',
        pest_alert: '🐛 Pest Alert: ',
        disease_alert: '🦠 Disease Alert: ',
        irrigation_alert: '💧 Irrigation Alert: ',
        harvest_alert: '🌾 Harvest Alert: ',
        general_alert: '📢 Agricultural Alert: ',
        severity_high: '🚨 HIGH PRIORITY: ',
        severity_medium: '⚠️ MEDIUM PRIORITY: ',
        severity_low: 'ℹ️ LOW PRIORITY: ',
        action_required: 'Action Required: ',
        monitor: 'Monitor: ',
        check: 'Check: '
      },
      'hi': {
        weather_alert: '🌤️ मौसम चेतावनी: ',
        pest_alert: '🐛 कीट चेतावनी: ',
        disease_alert: '🦠 रोग चेतावनी: ',
        irrigation_alert: '💧 सिंचाई चेतावनी: ',
        harvest_alert: '🌾 कटाई चेतावनी: ',
        general_alert: '📢 कृषि चेतावनी: ',
        severity_high: '🚨 उच्च प्राथमिकता: ',
        severity_medium: '⚠️ मध्यम प्राथमिकता: ',
        severity_low: 'ℹ️ कम प्राथमिकता: ',
        action_required: 'कार्रवाई आवश्यक: ',
        monitor: 'निगरानी: ',
        check: 'जांच: '
      },
      'mr': {
        weather_alert: '🌤️ हवामान सूचना: ',
        pest_alert: '🐛 कीड सूचना: ',
        disease_alert: '🦠 रोग सूचना: ',
        irrigation_alert: '💧 पाणी सूचना: ',
        harvest_alert: '🌾 कापणी सूचना: ',
        general_alert: '📢 शेती सूचना: ',
        severity_high: '🚨 उच्च प्राधान्य: ',
        severity_medium: '⚠️ मध्यम प्राधान्य: ',
        severity_low: 'ℹ️ कमी प्राधान्य: ',
        action_required: 'कारवाई आवश्यक: ',
        monitor: 'देखरेख: ',
        check: 'तपास: '
      }
    }

    const msg = messages[language] || messages['en']
    let message = ''

    // Add severity prefix
    switch (alertData.severity?.toLowerCase()) {
      case 'high':
        message += msg.severity_high
        break
      case 'medium':
        message += msg.severity_medium
        break
      case 'low':
        message += msg.severity_low
        break
      default:
        message += msg.general_alert
    }

    // Add alert type prefix
    switch (alertData.type?.toLowerCase()) {
      case 'weather':
        message += msg.weather_alert
        break
      case 'pest':
        message += msg.pest_alert
        break
      case 'disease':
        message += msg.disease_alert
        break
      case 'irrigation':
        message += msg.irrigation_alert
        break
      case 'harvest':
        message += msg.harvest_alert
        break
      default:
        message += msg.general_alert
    }

    // Add region and crop info
    if (alertData.region) {
      message += `${alertData.region}`
    }
    if (alertData.crop) {
      message += ` - ${alertData.crop}`
    }
    message += ': '

    // Add recommendation
    if (alertData.recommendation) {
      message += alertData.recommendation
    } else {
      message += 'Please check your field conditions.'
    }

    // Ensure message is within SMS limits (160 characters for single SMS)
    if (message.length > 160) {
      message = message.substring(0, 157) + '...'
    }

    return message
  }

  // Test SMS functionality
  async testSMS(phoneNumber, message = 'Test SMS from PredictAgri') {
    try {
      if (!this.client) {
        return { success: false, error: 'Twilio not configured' }
      }

      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: phoneNumber
      })

      return {
        success: true,
        messageId: result.sid,
        status: result.status
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export const twilioService = new TwilioService()
export default twilioService
