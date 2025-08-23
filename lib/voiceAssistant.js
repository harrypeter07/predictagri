import { GoogleGenerativeAI } from '@google/generative-ai'

class VoiceAssistant {
  constructor() {
    this.genAI = null
    this.model = null
    this.modelName = null
    
    try {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      
      // Try to get generative models in preferred order
      const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
      
      for (const modelName of models) {
        try {
          this.model = this.genAI.getGenerativeModel({ model: modelName })
          this.modelName = modelName
          console.log(`✅ Successfully initialized Gemini model: ${modelName}`)
          break
        } catch (error) {
          console.log(`❌ Failed to initialize ${modelName}:`, error.message)
          continue
        }
      }
      
      if (!this.model) {
        throw new Error('No Gemini models could be initialized')
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize GoogleGenerativeAI:', error.message)
      throw error
    }
  }

  async generateResponse(prompt, context = {}) {
    if (!this.model) {
      throw new Error('Gemini model not initialized')
    }

    try {
      // Build the full prompt with context
      let fullPrompt = prompt
      
      if (context.location) {
        fullPrompt += `\n\nLocation Context: ${JSON.stringify(context.location)}`
      }
      
      if (context.weather) {
        fullPrompt += `\n\nWeather Context: ${JSON.stringify(context.weather)}`
      }
      
      if (context.language) {
        fullPrompt += `\n\nPlease respond in ${context.language === 'hi' ? 'Hindi' : context.language === 'mr' ? 'Marathi' : 'English'}`
      }

      const result = await this.model.generateContent(fullPrompt)
      const response = await result.response
      const text = response.text()
      
      return {
        success: true,
        response: text,
        modelName: this.modelName
      }
      
    } catch (error) {
      console.error('❌ Gemini API error:', error)
      
      // Categorize errors for better handling
      let errorType = 'unknown'
      let errorCode = null
      let technicalDetails = error.message
      
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key')) {
        errorType = 'api_key'
        errorCode = 'INVALID_API_KEY'
      } else if (error.message.includes('quota') || error.message.includes('QUOTA_EXCEEDED')) {
        errorType = 'quota'
        errorCode = 'QUOTA_EXCEEDED'
      } else if (error.message.includes('model') || error.message.includes('not found')) {
        errorType = 'model'
        errorCode = 'MODEL_NOT_FOUND'
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorType = 'network'
        errorCode = 'NETWORK_ERROR'
      } else if (error.message.includes('safety') || error.message.includes('content')) {
        errorType = 'content_safety'
        errorCode = 'CONTENT_SAFETY'
      }
      
      // Try to use alternative model if current one fails
      if (errorType === 'model' || errorType === 'quota') {
        try {
          const fallbackResult = await this.retryWithDifferentModel(prompt, context)
          if (fallbackResult.success) {
            return fallbackResult
          }
        } catch (fallbackError) {
          console.error('❌ Fallback model also failed:', fallbackError.message)
        }
      }
      
      return {
        success: false,
        error: this.getFallbackResponse(errorType),
        errorType,
        errorCode,
        technicalDetails,
        modelName: this.modelName
      }
    }
  }

  async retryWithDifferentModel(prompt, context) {
    if (!this.genAI) return { success: false, error: 'No AI service available' }
    
    const fallbackModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
    const currentModelIndex = fallbackModels.indexOf(this.modelName)
    
    // Try models in order, excluding the current one
    for (let i = 0; i < fallbackModels.length; i++) {
      if (i === currentModelIndex) continue
      
      try {
        const fallbackModel = this.genAI.getGenerativeModel({ model: fallbackModels[i] })
        console.log(`🔄 Trying fallback model: ${fallbackModels[i]}`)
        
        const result = await fallbackModel.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        
        console.log(`✅ Fallback model ${fallbackModels[i]} succeeded`)
        return {
          success: true,
          response: text,
          modelName: fallbackModels[i],
          usedFallback: true
        }
        
      } catch (fallbackError) {
        console.log(`❌ Fallback model ${fallbackModels[i]} failed:`, fallbackError.message)
        continue
      }
    }
    
    throw new Error('All available models failed')
  }

  getFallbackResponse(errorType) {
    const responses = {
      api_key: 'API key is invalid or expired. Please check your configuration.',
      quota: 'API quota exceeded. Please try again later or check your usage limits.',
      model: 'The requested AI model is not available. Please try again.',
      network: 'Network error. Please check your internet connection and try again.',
      content_safety: 'Content blocked due to safety concerns. Please rephrase your request.',
      unknown: 'Unable to process your request at the moment. Please try again later.'
    }
    
    return responses[errorType] || responses.unknown
  }

  async checkGeminiStatus() {
    try {
      if (!this.model) {
        return {
          status: 'ERROR',
          message: 'Gemini model not initialized',
          errorType: 'initialization',
          suggestions: [
            'Check if GEMINI_API_KEY environment variable is set',
            'Verify the API key is valid and not expired',
            'Ensure you have access to Gemini models'
          ]
        }
      }

      // Test the model with a simple prompt
      const testResult = await this.testModelWithSimplePrompt()
      
      if (testResult.success) {
        return {
          status: 'HEALTHY',
          message: 'Gemini AI service is working correctly',
          modelInfo: {
            modelName: this.modelName,
            apiKeyConfigured: !!process.env.GEMINI_API_KEY
          },
          details: `Successfully tested with model: ${this.modelName}`,
          suggestions: [
            'Service is ready for use',
            'All features should work normally'
          ]
        }
      } else {
        return {
          status: 'ERROR',
          message: 'Gemini AI service test failed',
          errorType: testResult.errorType || 'test_failure',
          errorCode: testResult.errorCode,
          technicalDetails: testResult.technicalDetails,
          modelInfo: {
            modelName: this.modelName,
            apiKeyConfigured: !!process.env.GEMINI_API_KEY
          },
          suggestions: [
            'Check your API key configuration',
            'Verify you have sufficient quota',
            'Try again in a few minutes',
            'Contact support if the issue persists'
          ]
        }
      }
      
    } catch (error) {
      return {
        status: 'ERROR',
        message: 'Failed to check Gemini status',
        errorType: 'status_check_failure',
        technicalDetails: error.message,
        suggestions: [
          'Check your internet connection',
          'Verify API key is correct',
          'Try again later'
        ]
      }
    }
  }

  getCurrentModelInfo() {
    return {
      status: this.model ? 'INITIALIZED' : 'NOT_INITIALIZED',
      modelName: this.modelName,
      apiKeyConfigured: !!process.env.GEMINI_API_KEY,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasApiKey: !!process.env.GEMINI_API_KEY
      }
    }
  }

  async testModelWithSimplePrompt() {
    try {
      const testPrompt = 'Hello, please respond with "Test successful" if you can read this.'
      const result = await this.generateResponse(testPrompt)
      
      if (result.success && result.response.toLowerCase().includes('test successful')) {
        return {
          success: true,
          response: result.response,
          modelName: this.modelName
        }
      } else {
        return {
          success: false,
          error: 'Model response did not match expected test pattern',
          errorType: 'test_pattern_mismatch',
          response: result.response
        }
      }
      
    } catch (error) {
      return {
        success: false,
        error: 'Model test failed',
        errorType: 'test_execution_failure',
        technicalDetails: error.message
      }
    }
  }

  // Process voice input from the frontend
  async processVoiceInput(audioInput, language = 'en', context = {}) {
    try {
      // For now, we'll assume the audioInput is already transcribed text
      // In a real implementation, this would process the audio file
      const prompt = typeof audioInput === 'string' ? audioInput : 'Please process this voice input'
      
      const result = await this.generateResponse(prompt, {
        ...context,
        language
      })
      
      return {
        success: true,
        response: result.response,
        language,
        modelName: result.modelName
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        language
      }
    }
  }

  // Get voice commands for a specific language
  getVoiceCommands(language = 'en') {
    const commands = {
      en: [
        'What is the weather like?',
        'Tell me about crop conditions',
        'What are today\'s predictions?',
        'Show me alerts',
        'Help me with farming advice'
      ],
      hi: [
        'मौसम कैसा है?',
        'फसल की स्थिति के बारे में बताएं',
        'आज के पूर्वानुमान क्या हैं?',
        'मुझे अलर्ट दिखाएं',
        'खेती की सलाह में मेरी मदद करें'
      ],
      mr: [
        'हवामान कसा आहे?',
        'पीक स्थितीबद्दल सांगा',
        'आजचे अंदाज काय आहेत?',
        'मला सूचना दाखवा',
        'शेतीच्या सल्ल्यात मला मदत करा'
      ]
    }
    
    return commands[language] || commands.en
  }
}

// Create and export singleton instance
export const voiceAssistant = new VoiceAssistant()

// Export class for testing
export { VoiceAssistant }

// Default export for backward compatibility
export default VoiceAssistant