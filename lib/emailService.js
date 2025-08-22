// Email Service for Agricultural Alerts and Notifications
import nodemailer from 'nodemailer'
import { Logger } from './logger.js'

class EmailService {
  constructor() {
    this.logger = new Logger({ service: 'EmailService' })
    this.transporter = null
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@predictaagri.com'
    this.configured = false
    
    this.initializeTransporter()
  }

  // Initialize email transporter
  initializeTransporter() {
    try {
      // Support multiple email providers
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        // Custom SMTP configuration
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        })
        this.configured = true
        this.logger.info('email_smtp_configured', { host: process.env.SMTP_HOST })
      } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        // Gmail configuration
        this.transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          }
        })
        this.fromEmail = process.env.GMAIL_USER
        this.configured = true
        this.logger.info('email_gmail_configured', { user: process.env.GMAIL_USER })
      } else {
        this.logger.warn('email_not_configured', { 
          message: 'No email credentials found. Email service will use fallback mode.' 
        })
      }
    } catch (error) {
      this.logger.error('email_configuration_failed', { error: error.message })
    }
  }

  // Send agricultural alert via email
  async sendAgriculturalAlert(email, alertData, language = 'en') {
    if (!this.configured || !this.transporter) {
      this.logger.warn('email_not_configured', { message: 'Email service not configured' })
      return this.getFallbackEmailResponse('Agricultural Alert', email)
    }

    try {
      this.logger.info('agricultural_email_sending', { email, type: alertData.type, language })
      
      const emailContent = this.formatAgriculturalEmail(alertData, language)
      
      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      }

      const result = await this.transporter.sendMail(mailOptions)
      
      this.logger.info('agricultural_email_sent', { 
        email, 
        messageId: result.messageId,
        type: alertData.type 
      })
      
      return {
        success: true,
        messageId: result.messageId,
        type: 'agricultural_alert',
        email
      }
    } catch (error) {
      this.logger.error('agricultural_email_failed', { 
        error: error.message, 
        email, 
        type: alertData.type 
      })
      return { success: false, error: error.message }
    }
  }

  // Send weather forecast email
  async sendWeatherForecast(email, weatherData, language = 'en') {
    if (!this.configured || !this.transporter) {
      return this.getFallbackEmailResponse('Weather Forecast', email)
    }

    try {
      this.logger.info('weather_email_sending', { email, language })
      
      const emailContent = this.formatWeatherEmail(weatherData, language)
      
      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      }

      const result = await this.transporter.sendMail(mailOptions)
      
      this.logger.info('weather_email_sent', { 
        email, 
        messageId: result.messageId 
      })
      
      return {
        success: true,
        messageId: result.messageId,
        type: 'weather_forecast',
        email
      }
    } catch (error) {
      this.logger.error('weather_email_failed', { 
        error: error.message, 
        email 
      })
      return { success: false, error: error.message }
    }
  }

  // Send crop insights email
  async sendCropInsights(email, insightsData, language = 'en') {
    if (!this.configured || !this.transporter) {
      return this.getFallbackEmailResponse('Crop Insights', email)
    }

    try {
      this.logger.info('insights_email_sending', { email, language })
      
      const emailContent = this.formatInsightsEmail(insightsData, language)
      
      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      }

      const result = await this.transporter.sendMail(mailOptions)
      
      this.logger.info('insights_email_sent', { 
        email, 
        messageId: result.messageId 
      })
      
      return {
        success: true,
        messageId: result.messageId,
        type: 'crop_insights',
        email
      }
    } catch (error) {
      this.logger.error('insights_email_failed', { 
        error: error.message, 
        email 
      })
      return { success: false, error: error.message }
    }
  }

  // Send yield prediction email
  async sendYieldPrediction(email, yieldData, language = 'en') {
    if (!this.configured || !this.transporter) {
      return this.getFallbackEmailResponse('Yield Prediction', email)
    }

    try {
      this.logger.info('yield_email_sending', { email, language })
      
      const emailContent = this.formatYieldEmail(yieldData, language)
      
      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      }

      const result = await this.transporter.sendMail(mailOptions)
      
      this.logger.info('yield_email_sent', { 
        email, 
        messageId: result.messageId 
      })
      
      return {
        success: true,
        messageId: result.messageId,
        type: 'yield_prediction',
        email
      }
    } catch (error) {
      this.logger.error('yield_email_failed', { 
        error: error.message, 
        email 
      })
      return { success: false, error: error.message }
    }
  }

  // Format agricultural alert email
  formatAgriculturalEmail(alertData, language) {
    const { type, severity, region, crop, recommendation } = alertData
    
    const templates = {
      'en': {
        subject: `🚨 Agricultural Alert: ${type.toUpperCase()} - ${severity.toUpperCase()} Priority`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 20px; text-align: center;">
              <h1>🌾 PredictAgri Alert System</h1>
              <h2>${type.toUpperCase()} ALERT</h2>
            </div>
            
            <div style="padding: 20px; background-color: #f9f9f9;">
              <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #d32f2f; margin-top: 0;">⚠️ Alert Details</h3>
                <ul style="line-height: 1.6;">
                  <li><strong>Type:</strong> ${type}</li>
                  <li><strong>Severity:</strong> ${severity}</li>
                  <li><strong>Region:</strong> ${region}</li>
                  <li><strong>Affected Crop:</strong> ${crop}</li>
                  <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                </ul>
              </div>
              
              <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; border-left: 5px solid #4CAF50;">
                <h3 style="color: #2e7d32; margin-top: 0;">💡 Recommended Action</h3>
                <p style="line-height: 1.6; font-size: 16px;">${recommendation}</p>
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <p style="color: #666;">For immediate assistance, contact:</p>
                <p style="font-weight: bold;">📧 ${process.env.SUPPORT_EMAIL || 'support@predictaagri.com'}</p>
                <p style="font-weight: bold;">📱 ${process.env.SUPPORT_PHONE || '+91-9322909257'}</p>
              </div>
            </div>
            
            <div style="background: #2c3e50; color: white; padding: 15px; text-align: center;">
              <p style="margin: 0;">© 2024 PredictAgri - Smart Farming Solutions</p>
            </div>
          </div>
        `,
        text: `🚨 AGRICULTURAL ALERT - ${type.toUpperCase()}\n\nSeverity: ${severity}\nRegion: ${region}\nCrop: ${crop}\nTime: ${new Date().toLocaleString()}\n\nRecommendation:\n${recommendation}\n\nFor assistance: support@predictaagri.com | +91-9322909257`
      },
      'hi': {
        subject: `🚨 कृषि चेतावनी: ${type.toUpperCase()} - ${severity.toUpperCase()} प्राथमिकता`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 20px; text-align: center;">
              <h1>🌾 प्रिडिक्टएग्री अलर्ट सिस्टम</h1>
              <h2>${type.toUpperCase()} चेतावनी</h2>
            </div>
            
            <div style="padding: 20px; background-color: #f9f9f9;">
              <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #d32f2f; margin-top: 0;">⚠️ चेतावनी विवरण</h3>
                <ul style="line-height: 1.6;">
                  <li><strong>प्रकार:</strong> ${type}</li>
                  <li><strong>गंभीरता:</strong> ${severity}</li>
                  <li><strong>क्षेत्र:</strong> ${region}</li>
                  <li><strong>प्रभावित फसल:</strong> ${crop}</li>
                  <li><strong>समय:</strong> ${new Date().toLocaleString()}</li>
                </ul>
              </div>
              
              <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; border-left: 5px solid #4CAF50;">
                <h3 style="color: #2e7d32; margin-top: 0;">💡 अनुशंसित कार्रवाई</h3>
                <p style="line-height: 1.6; font-size: 16px;">${recommendation}</p>
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <p style="color: #666;">तत्काल सहायता के लिए संपर्क करें:</p>
                <p style="font-weight: bold;">📧 ${process.env.SUPPORT_EMAIL || 'support@predictaagri.com'}</p>
                <p style="font-weight: bold;">📱 ${process.env.SUPPORT_PHONE || '+91-9322909257'}</p>
              </div>
            </div>
            
            <div style="background: #2c3e50; color: white; padding: 15px; text-align: center;">
              <p style="margin: 0;">© 2024 प्रिडिक्टएग्री - स्मार्ट फार्मिंग सॉल्यूशंस</p>
            </div>
          </div>
        `,
        text: `🚨 कृषि चेतावनी - ${type.toUpperCase()}\n\nगंभीरता: ${severity}\nक्षेत्र: ${region}\nफसल: ${crop}\nसमय: ${new Date().toLocaleString()}\n\nसिफारिश:\n${recommendation}\n\nसहायता के लिए: support@predictaagri.com | +91-9322909257`
      }
    }

    return templates[language] || templates['en']
  }

  // Format weather email
  formatWeatherEmail(weatherData, language) {
    const { temperature, humidity, precipitation, region, forecast } = weatherData
    
    const templates = {
      'en': {
        subject: `🌤️ Weather Forecast for ${region}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2196F3, #1976D2); color: white; padding: 20px; text-align: center;">
              <h1>🌤️ Weather Forecast</h1>
              <h2>${region}</h2>
            </div>
            
            <div style="padding: 20px; background-color: #f9f9f9;">
              <div style="background: white; padding: 20px; border-radius: 10px;">
                <h3>Current Conditions</h3>
                <ul>
                  <li><strong>Temperature:</strong> ${temperature}°C</li>
                  <li><strong>Humidity:</strong> ${humidity}%</li>
                  <li><strong>Precipitation:</strong> ${precipitation}mm</li>
                </ul>
                
                ${forecast ? `<h3>Forecast</h3><p>${forecast}</p>` : ''}
              </div>
            </div>
          </div>
        `,
        text: `Weather Forecast for ${region}\n\nTemperature: ${temperature}°C\nHumidity: ${humidity}%\nPrecipitation: ${precipitation}mm\n\n${forecast || ''}`
      }
    }

    return templates[language] || templates['en']
  }

  // Format insights email
  formatInsightsEmail(insightsData, language) {
    const { soilHealth, cropSuitability, recommendations } = insightsData
    
    const templates = {
      'en': {
        subject: `🌾 Agricultural Insights Report`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 20px; text-align: center;">
              <h1>🌾 Agricultural Insights</h1>
            </div>
            
            <div style="padding: 20px; background-color: #f9f9f9;">
              <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3>Soil Health Analysis</h3>
                <p>${soilHealth || 'Soil health analysis completed'}</p>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3>Crop Suitability</h3>
                <p>${cropSuitability || 'Crop suitability analysis completed'}</p>
              </div>
              
              ${recommendations ? `
                <div style="background: #e8f5e8; padding: 20px; border-radius: 10px;">
                  <h3>Recommendations</h3>
                  <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          </div>
        `,
        text: `Agricultural Insights Report\n\nSoil Health: ${soilHealth}\nCrop Suitability: ${cropSuitability}\n\nRecommendations:\n${recommendations ? recommendations.join('\n- ') : 'Analysis completed'}`
      }
    }

    return templates[language] || templates['en']
  }

  // Format yield prediction email
  formatYieldEmail(yieldData, language) {
    const { crop, predictedYield, confidence, factors } = yieldData
    
    const templates = {
      'en': {
        subject: `📈 Yield Prediction for ${crop}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #FF9800, #F57C00); color: white; padding: 20px; text-align: center;">
              <h1>📈 Yield Prediction</h1>
              <h2>${crop}</h2>
            </div>
            
            <div style="padding: 20px; background-color: #f9f9f9;">
              <div style="background: white; padding: 20px; border-radius: 10px;">
                <h3>Prediction Results</h3>
                <ul>
                  <li><strong>Predicted Yield:</strong> ${predictedYield}</li>
                  <li><strong>Confidence:</strong> ${confidence}%</li>
                </ul>
                
                ${factors ? `<h3>Contributing Factors</h3><ul>${factors.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
              </div>
            </div>
          </div>
        `,
        text: `Yield Prediction for ${crop}\n\nPredicted Yield: ${predictedYield}\nConfidence: ${confidence}%\n\nFactors: ${factors ? factors.join(', ') : 'Analysis completed'}`
      }
    }

    return templates[language] || templates['en']
  }

  // Get fallback response when email service is not configured
  getFallbackEmailResponse(type, email) {
    const messageId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.logger.info('email_fallback_response', { type, email, messageId })
    
    return {
      success: true,
      messageId,
      type: 'fallback',
      email,
      note: 'Email service not configured - using fallback response'
    }
  }

  // Test email connection
  async testConnection() {
    if (!this.configured || !this.transporter) {
      return {
        success: false,
        error: 'Email service not configured',
        configured: false
      }
    }

    try {
      const result = await this.transporter.verify()
      this.logger.info('email_connection_test_success')
      
      return {
        success: true,
        configured: true,
        provider: this.transporter.options.service || 'SMTP',
        from: this.fromEmail
      }
    } catch (error) {
      this.logger.error('email_connection_test_failed', { error: error.message })
      
      return {
        success: false,
        error: error.message,
        configured: true
      }
    }
  }
}

export const emailService = new EmailService()
export default emailService
