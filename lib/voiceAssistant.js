// Gemini Voice Assistant for Farmers - Multilingual Support
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Logger } from './logger.js'
import { enhancedAutomatedPipeline } from './enhancedAutomatedPipeline.js'
import { openMeteoService } from './openMeteoService.js'

class VoiceAssistant {
  constructor() {
    this.apiKey = process.env.GOOGLE_GEMINI_API_KEY
    this.logger = new Logger({ service: 'VoiceAssistant' })
    
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey)
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' })
    }
  }

  // Process voice input and generate response
  async processVoiceInput(audioInput, language = 'en', context = {}) {
    if (!this.model) {
      this.logger.warn('gemini_not_configured', { message: 'Gemini API key not found' })
      return {
        success: false,
        error: 'Voice assistant not configured',
        response: 'Please configure Gemini API key for voice assistance.'
      }
    }

    try {
      this.logger.info('voice_input_processing', { language, context })
      
      // Convert audio to text (simplified - in real app, use speech-to-text)
      const textInput = await this.audioToText(audioInput, language)
      
      // Check if this is a pipeline-related query
      const isPipelineQuery = this.isPipelineQuery(textInput, language)
      
      let response, pipelineData = null
      
      if (isPipelineQuery) {
        // Execute pipeline analysis for comprehensive agricultural data
        const contextWithLanguage = { ...context, language }
        pipelineData = await this.executePipelineAnalysis(contextWithLanguage)
        response = await this.generatePipelineResponse(textInput, language, context, pipelineData)
      } else {
        // Generate contextual response for general queries
        response = await this.generateResponse(textInput, language, context)
      }
      
      // Convert response to speech
      const audioResponse = await this.textToSpeech(response, language)
      
      this.logger.info('voice_input_processed', { language, responseLength: response.length, hasPipelineData: !!pipelineData })
      
      return {
        success: true,
        textInput,
        response,
        audioResponse,
        language,
        pipelineData: pipelineData ? {
          weather: pipelineData.weather,
          environmental: pipelineData.environmental,
          insights: pipelineData.insights,
          recommendations: pipelineData.recommendations,
          notification: pipelineData.notification
        } : null
      }
    } catch (error) {
      this.logger.error('voice_input_failed', { error: error.message, language })
      return {
        success: false,
        error: error.message,
        response: this.getFallbackResponse(language)
      }
    }
  }

  // Convert audio to text (placeholder - integrate with actual STT service)
  async audioToText(audioInput, language) {
    // In a real implementation, use Google Speech-to-Text or similar
    // For now, return the text input directly if it's already text
    if (typeof audioInput === 'string') {
      this.logger.info('text_input_received', { language, inputLength: audioInput.length })
      return audioInput
    }
    
    // If it's actual audio data, this would be processed with STT
    this.logger.info('audio_to_text_placeholder', { language, audioType: typeof audioInput })
    return 'कृपया माझ्या पिकांची माहिती द्या' // "Please provide information about my crops" in Marathi
  }

  // Check if query requires pipeline analysis
  isPipelineQuery(textInput, language) {
    const pipelineKeywords = {
      'en': ['weather', 'soil', 'crop', 'yield', 'irrigation', 'fertilizer', 'pest', 'disease', 'harvest', 'analysis'],
      'hi': ['मौसम', 'मिट्टी', 'फसल', 'उपज', 'सिंचाई', 'खाद', 'कीट', 'रोग', 'कटाई', 'विश्लेषण'],
      'mr': ['हवामान', 'माती', 'पीक', 'उत्पादन', 'सिंचाई', 'खते', 'कीड', 'रोग', 'कापणी', 'विश्लेषण']
    }
    
    const keywords = pipelineKeywords[language] || pipelineKeywords['en']
    const lowerText = textInput.toLowerCase()
    
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
  }

  // Execute pipeline analysis for comprehensive data
  async executePipelineAnalysis(context) {
    try {
      const { location } = context
      
      if (!location || !location.coordinates) {
        this.logger.warn('no_location_for_pipeline', { context })
        return null
      }

      const farmerData = {
        farmerId: `voice_analysis_${Date.now()}`,
        coordinates: location.coordinates,
        region: location.city || location.region || 'Unknown',
        phoneNumber: '+919322909257', // Default phone number for SMS notifications
        language: context.language || 'hi' // Default to Hindi for Indian farmers
      }

      const pipelineResult = await enhancedAutomatedPipeline.executeFarmerPipeline(farmerData)
      
      if (pipelineResult.success) {
        this.logger.info('pipeline_analysis_completed', { 
          farmerId: farmerData.farmerId,
          insightsCount: pipelineResult.insights?.length || 0
        })
        return pipelineResult
      } else {
        this.logger.warn('pipeline_analysis_failed', { error: pipelineResult.error })
        return null
      }
    } catch (error) {
      this.logger.error('pipeline_execution_error', { error: error.message })
      return null
    }
  }

  // Generate response with pipeline data
  async generatePipelineResponse(textInput, language, context, pipelineData) {
    const prompt = this.buildPipelinePrompt(textInput, language, context, pipelineData)
    
    try {
      const result = await this.model.generateContent(prompt)
      const response = result.response.text()
      
      this.logger.info('pipeline_response_generated', { language, responseLength: response.length })
      return response
    } catch (error) {
      this.logger.error('pipeline_response_failed', { error: error.message })
      return this.getFallbackResponse(language)
    }
  }

  // Build prompt with pipeline data
  buildPipelinePrompt(textInput, language, context, pipelineData) {
    const { weather, environmental, insights, recommendations } = pipelineData || {}
    
    const languagePrompts = {
      'en': `You are an agricultural voice assistant with access to real-time pipeline data. Respond in English.
Current context: ${context.location ? `Location: ${context.location.city || 'Unknown'}` : ''}
Weather Data: ${weather ? JSON.stringify(weather.current) : 'Not available'}
Environmental Data: ${environmental ? 'Available' : 'Not available'}
Agricultural Insights: ${insights ? `${insights.length} insights available` : 'Not available'}
Recommendations: ${recommendations ? `${recommendations.length} recommendations available` : 'Not available'}

Farmer's question: ${textInput}

Provide specific, data-driven advice based on the pipeline analysis. Include relevant weather, soil, and crop information.`,
      
      'hi': `आप एक किसान के लिए कृषि वॉइस असिस्टेंट हैं जिनके पास रीयल-टाइम पाइपलाइन डेटा है। हिंदी में जवाब दें।
वर्तमान संदर्भ: ${context.location ? `स्थान: ${context.location.city || 'अज्ञात'}` : ''}
मौसम डेटा: ${weather ? 'उपलब्ध' : 'उपलब्ध नहीं'}
पर्यावरणीय डेटा: ${environmental ? 'उपलब्ध' : 'उपलब्ध नहीं'}
कृषि अंतर्दृष्टि: ${insights ? `${insights.length} अंतर्दृष्टि उपलब्ध` : 'उपलब्ध नहीं'}
सिफारिशें: ${recommendations ? `${recommendations.length} सिफारिशें उपलब्ध` : 'उपलब्ध नहीं'}

किसान का सवाल: ${textInput}

पाइपलाइन विश्लेषण के आधार पर विशिष्ट, डेटा-संचालित सलाह दें। प्रासंगिक मौसम, मिट्टी और फसल जानकारी शामिल करें।`,
      
      'mr': `तुम्ही शेतकऱ्यांसाठी शेती वॉइस असिस्टंट आहात ज्यांच्याकडे रीयल-टाइम पाइपलाइन डेटा आहे। मराठीत उत्तर द्या।
सध्याचा संदर्भ: ${context.location ? `स्थान: ${context.location.city || 'अज्ञात'}` : ''}
हवामान डेटा: ${weather ? 'उपलब्ध' : 'उपलब्ध नाही'}
पर्यावरणीय डेटा: ${environmental ? 'उपलब्ध' : 'उपलब्ध नाही'}
शेती अंतर्दृष्टी: ${insights ? `${insights.length} अंतर्दृष्टी उपलब्ध` : 'उपलब्ध नाही'}
शिफारसी: ${recommendations ? `${recommendations.length} शिफारसी उपलब्ध` : 'उपलब्ध नाही'}

शेतकऱ्याचा प्रश्न: ${textInput}

पाइपलाइन विश्लेषणावर आधारित विशिष्ट, डेटा-संचालित सल्ला द्या। संबंधित हवामान, माती आणि पीक माहिती समाविष्ट करा।`
    }

    return languagePrompts[language] || languagePrompts['en']
  }

  // Generate contextual response using Gemini
  async generateResponse(textInput, language = 'en', context = {}) {
    const prompt = this.buildPrompt(textInput, language, context)
    
    try {
      const result = await this.model.generateContent(prompt)
      const response = result.response.text()
      
      this.logger.info('gemini_response_generated', { language, responseLength: response.length })
      return response
    } catch (error) {
      this.logger.error('gemini_response_failed', { error: error.message })
      return this.getFallbackResponse(language)
    }
  }

  // Build context-aware prompt for Gemini
  buildPrompt(textInput, language, context) {
    const { weather, crops, region, alerts } = context
    
    const languagePrompts = {
      'en': `You are an agricultural voice assistant for farmers. Respond in English.
Current context: Weather: ${weather || 'Unknown'}, Crops: ${crops || 'Unknown'}, Region: ${region || 'Unknown'}
Alerts: ${alerts || 'None'}
Farmer's question: ${textInput}
Provide helpful, practical advice in simple English.`,
      
      'hi': `आप एक किसान के लिए कृषि वॉइस असिस्टेंट हैं। हिंदी में जवाब दें।
वर्तमान संदर्भ: मौसम: ${weather || 'अज्ञात'}, फसलें: ${crops || 'अज्ञात'}, क्षेत्र: ${region || 'अज्ञात'}
चेतावनियां: ${alerts || 'कोई नहीं'}
किसान का सवाल: ${textInput}
सरल हिंदी में उपयोगी, व्यावहारिक सलाह दें।`,
      
      'mr': `तुम्ही शेतकऱ्यांसाठी शेती वॉइस असिस्टंट आहात। मराठीत उत्तर द्या।
सध्याचा संदर्भ: हवामान: ${weather || 'अज्ञात'}, पिके: ${crops || 'अज्ञात'}, प्रदेश: ${region || 'अज्ञात'}
सूचना: ${alerts || 'काहीही नाही'}
शेतकऱ्याचा प्रश्न: ${textInput}
सोप्या मराठीत उपयुक्त, व्यावहारिक सल्ला द्या।`
    }

    return languagePrompts[language] || languagePrompts['en']
  }

  // Convert text to speech (placeholder - integrate with actual TTS service)
  async textToSpeech(text, language) {
    // In a real implementation, use Google Text-to-Speech or similar
    // For now, return a placeholder with actual text for browser TTS
    this.logger.info('text_to_speech_placeholder', { language, textLength: text.length })
    return {
      audioUrl: 'placeholder_audio_url',
      duration: '5s',
      language,
      text: text // Include text for browser TTS
    }
  }

  // Get fallback response in appropriate language
  getFallbackResponse(language) {
    const fallbacks = {
      'en': 'I apologize, but I am having trouble processing your request. Please try again or contact support.',
      'hi': 'माफ़ करें, लेकिन मुझे आपके अनुरोध को संसाधित करने में समस्या हो रही है। कृपया पुनः प्रयास करें या सहायता से संपर्क करें।',
      'mr': 'माफ करा, पण मला तुमचा विनंती प्रक्रिया करण्यात अडचण येत आहे. कृपया पुन्हा प्रयत्न करा किंवा सहाय्याशी संपर्क साधा.'
    }
    
    return fallbacks[language] || fallbacks['en']
  }

  // Handle common agricultural queries
  async handleAgriculturalQuery(query, language, context) {
    const commonQueries = {
      'en': {
        'weather': 'What is the weather forecast for my region?',
        'crops': 'Which crops should I plant this season?',
        'disease': 'How can I identify crop diseases?',
        'irrigation': 'When should I irrigate my crops?',
        'harvest': 'When is the best time to harvest?'
      },
      'hi': {
        'weather': 'मेरे क्षेत्र के लिए मौसम का पूर्वानुमान क्या है?',
        'crops': 'इस मौसम में मुझे कौन सी फसलें लगानी चाहिए?',
        'disease': 'मैं फसल रोगों की पहचान कैसे कर सकता हूं?',
        'irrigation': 'मुझे अपनी फसलों की सिंचाई कब करनी चाहिए?',
        'harvest': 'फसल काटने का सबसे अच्छा समय कब है?'
      },
      'mr': {
        'weather': 'माझ्या प्रदेशासाठी हवामान अंदाज काय आहे?',
        'crops': 'या हंगामात मी कोणती पिके लावावी?',
        'disease': 'मी पिकांच्या रोगांची ओळख कशी करू शकतो?',
        'irrigation': 'मी माझ्या पिकांची सिंचाई कधी करावी?',
        'harvest': 'पीक कापण्याचा सर्वोत्तम वेळ कधी आहे?'
      }
    }

    const langQueries = commonQueries[language] || commonQueries['en']
    
    // Find the best matching query
    const bestMatch = Object.keys(langQueries).find(key => 
      query.toLowerCase().includes(key.toLowerCase())
    )

    if (bestMatch) {
      return this.generateResponse(langQueries[bestMatch], language, context)
    }

    return this.generateResponse(query, language, context)
  }

  // Get voice commands for different languages
  getVoiceCommands(language) {
    const commands = {
      'en': [
        'Tell me about the weather',
        'What crops should I plant?',
        'How to identify diseases?',
        'When to irrigate?',
        'Best harvest time?',
        'Show me alerts'
      ],
      'hi': [
        'मौसम के बारे में बताएं',
        'मुझे कौन सी फसलें लगानी चाहिए?',
        'रोगों की पहचान कैसे करें?',
        'सिंचाई कब करें?',
        'कटाई का सबसे अच्छा समय?',
        'मुझे चेतावनियां दिखाएं'
      ],
      'mr': [
        'हवामानाबद्दल सांगा',
        'मी कोणती पिके लावावी?',
        'रोगांची ओळख कशी करावी?',
        'सिंचाई कधी करावी?',
        'कापणीचा सर्वोत्तम वेळ?',
        'मला सूचना दाखवा'
      ]
    }

    return commands[language] || commands['en']
  }

  // Process emergency voice command
  async processEmergencyCommand(audioInput, language, emergencyType) {
    const emergencyPrompts = {
      'en': {
        'drought': 'Emergency: Drought detected. Immediate action required.',
        'flood': 'Emergency: Flood warning. Evacuate if necessary.',
        'disease': 'Emergency: Crop disease outbreak. Immediate treatment needed.',
        'pest': 'Emergency: Pest infestation. Apply pesticides immediately.'
      },
      'hi': {
        'drought': 'आपातकाल: सूखा पाया गया। तत्काल कार्रवाई आवश्यक।',
        'flood': 'आपातकाल: बाढ़ चेतावनी। आवश्यकता पड़ने पर निकासी करें।',
        'disease': 'आपातकाल: फसल रोग का प्रकोप। तत्काल उपचार आवश्यक।',
        'pest': 'आपातकाल: कीट संक्रमण। तुरंत कीटनाशक लगाएं।'
      },
      'mr': {
        'drought': 'आणीबाणी: दुष्काळ आढळला. त्वरित कृती आवश्यक.',
        'flood': 'आणीबाणी: पूर सूचना. आवश्यक असल्यास स्थलांतर करा.',
        'disease': 'आणीबाणी: पीक रोगाचा प्रादुर्भाव. त्वरित उपचार आवश्यक.',
        'pest': 'आणीबाणी: कीडांचा प्रादुर्भाव. त्वरित कीटकनाशके वापरा.'
      }
    }

    const langPrompts = emergencyPrompts[language] || emergencyPrompts['en']
    const prompt = langPrompts[emergencyType] || langPrompts['drought']

    return this.generateResponse(prompt, language, { emergency: true })
  }
}

export const voiceAssistant = new VoiceAssistant()
export default voiceAssistant
