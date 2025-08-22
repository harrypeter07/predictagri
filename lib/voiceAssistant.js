// Gemini Voice Assistant for Farmers - Multilingual Support
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { Logger } = require('./logger')

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
      
      // Generate contextual response
      const response = await this.generateResponse(textInput, language, context)
      
      // Convert response to speech
      const audioResponse = await this.textToSpeech(response, language)
      
      this.logger.info('voice_input_processed', { language, responseLength: response.length })
      
      return {
        success: true,
        textInput,
        response,
        audioResponse,
        language
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
    // For now, return a placeholder
    this.logger.info('audio_to_text_placeholder', { language })
    return 'कृपया माझ्या पिकांची माहिती द्या' // "Please provide information about my crops" in Marathi
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
    // For now, return a placeholder
    this.logger.info('text_to_speech_placeholder', { language, textLength: text.length })
    return {
      audioUrl: 'placeholder_audio_url',
      duration: '5s',
      language
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

module.exports = VoiceAssistant
