class MarathiTTSService {
  constructor() {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synthesis = window.speechSynthesis
      this.availableVoices = []
      this.marathiVoice = null
      this.isInitialized = false
      this.currentUtterance = null
      
      this.initializeVoices()
    } else {
      // Server-side or no speech synthesis support
      this.synthesis = null
      this.availableVoices = []
      this.marathiVoice = null
      this.isInitialized = false
      this.currentUtterance = null
    }
  }

  // Initialize available voices
  initializeVoices() {
    if (this.synthesis) {
      // Get available voices
      const loadVoices = () => {
        this.availableVoices = this.synthesis.getVoices()
        this.findMarathiVoice()
        this.isInitialized = true
      }

      // Handle voice loading
      if (this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = loadVoices
      }
      
      // Try to load voices immediately
      loadVoices()
    }
  }

  // Find the best available Marathi voice
  findMarathiVoice() {
    // Priority order for Marathi voices
    const marathiVoicePatterns = [
      'mr-IN',      // Marathi (India)
      'hi-IN',      // Hindi (India) - often works for Marathi
      'bn-IN',      // Bengali (India) - sometimes works
      'gu-IN',      // Gujarati (India) - sometimes works
      'ta-IN',      // Tamil (India) - sometimes works
      'te-IN',      // Telugu (India) - sometimes works
      'kn-IN',      // Kannada (India) - sometimes works
      'ml-IN',      // Malayalam (India) - sometimes works
      'pa-IN'       // Punjabi (India) - sometimes works
    ]

    // First try to find exact Marathi voice
    this.marathiVoice = this.availableVoices.find(voice => 
      voice.lang === 'mr-IN' || 
      voice.name.toLowerCase().includes('marathi') ||
      voice.name.toLowerCase().includes('mr')
    )

    // If no Marathi voice, try Indian languages
    if (!this.marathiVoice) {
      for (const pattern of marathiVoicePatterns) {
        this.marathiVoice = this.availableVoices.find(voice => 
          voice.lang === pattern
        )
        if (this.marathiVoice) break
      }
    }

    // If still no voice, use any available voice
    if (!this.marathiVoice && this.availableVoices.length > 0) {
      this.marathiVoice = this.availableVoices[0]
    }

    console.log('🎤 Marathi TTS Voice found:', this.marathiVoice)
  }

  // Get available voices info
  getAvailableVoices() {
    return this.availableVoices.map(voice => ({
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService,
      default: voice.default
    }))
  }

  // Speak Marathi text
  speak(text, options = {}) {
    if (!this.synthesis || !text) {
      console.error('❌ Speech synthesis not available or no text provided')
      return { success: false, error: 'Speech synthesis not available' }
    }

    try {
      // Cancel any ongoing speech
      this.synthesis.cancel()

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text)
      
      // Store reference to current utterance
      this.currentUtterance = utterance
      
      // Set language to Marathi
      utterance.lang = 'mr-IN'
      
      // Set voice if available
      if (this.marathiVoice) {
        utterance.voice = this.marathiVoice
      }

      // Apply options
      utterance.rate = options.rate || 0.9      // Slightly slower for better clarity
      utterance.pitch = options.pitch || 1.0    // Normal pitch
      utterance.volume = options.volume || 0.8  // Slightly lower volume
      
      // Add event handlers
      utterance.onstart = () => {
        console.log('🎤 Marathi TTS started speaking')
        if (options.onStart) options.onStart()
      }
      
      utterance.onend = () => {
        console.log('✅ Marathi TTS finished speaking')
        this.currentUtterance = null
        if (options.onEnd) options.onEnd()
      }
      
      utterance.onerror = (event) => {
        // "interrupted" is not a real error - it happens when speech is cancelled
        if (event.error === 'interrupted') {
          console.log('ℹ️ Marathi TTS interrupted (normal when stopping)')
          this.currentUtterance = null
          if (options.onEnd) options.onEnd()
          return
        }
        
        console.error('❌ Marathi TTS error:', event.error)
        this.currentUtterance = null
        if (options.onError) options.onError(event.error)
      }

      // Start speaking
      this.synthesis.speak(utterance)

      return { 
        success: true, 
        voice: this.marathiVoice?.name || 'Default',
        language: 'mr-IN'
      }

    } catch (error) {
      console.error('❌ Failed to speak Marathi text:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  }

  // Stop speaking
  stop() {
    if (this.synthesis) {
      // Cancel any ongoing speech
      this.synthesis.cancel()
      console.log('⏹️ Marathi TTS stopped')
      
      // Reset speaking state
      if (this.currentUtterance) {
        this.currentUtterance = null
      }
      
      return { success: true }
    }
    return { success: false, error: 'Speech synthesis not available' }
  }

  // Pause speaking
  pause() {
    if (this.synthesis) {
      this.synthesis.pause()
      console.log('⏸️ Marathi TTS paused')
      return { success: true }
    }
    return { success: false, error: 'Speech synthesis not available' }
  }

  // Resume speaking
  resume() {
    if (this.synthesis) {
      this.synthesis.resume()
      console.log('▶️ Marathi TTS resumed')
      return { success: true }
    }
    return { success: false, error: 'Speech synthesis not available' }
  }

  // Check if speaking
  isSpeaking() {
    return this.synthesis ? this.synthesis.speaking : false
  }

  // Check if paused
  isPaused() {
    return this.synthesis ? this.synthesis.paused : false
  }

  // Get service status
  getStatus() {
    return {
      available: !!this.synthesis,
      initialized: this.isInitialized,
      voicesCount: this.availableVoices.length,
      marathiVoice: this.marathiVoice ? {
        name: this.marathiVoice.name,
        lang: this.marathiVoice.lang
      } : null,
      speaking: this.isSpeaking(),
      paused: this.isPaused(),
      currentUtterance: this.currentUtterance ? {
        text: this.currentUtterance.text,
        lang: this.currentUtterance.lang
      } : null
    }
  }

  // Test Marathi TTS with sample text
  test() {
    const testText = 'नमस्कार, हा मराठी टेक्स्ट-टू-स्पीच टेस्ट आहे. आपण यशस्वीरित्या ऐकू शकता का?'
    
    console.log('🧪 Testing Marathi TTS with:', testText)
    
    return this.speak(testText, {
      onStart: () => console.log('✅ Test started'),
      onEnd: () => console.log('✅ Test completed'),
      onError: (error) => console.error('❌ Test failed:', error)
    })
  }
}

// Create and export singleton instance
export const marathiTTSService = new MarathiTTSService()

// Export class for testing
export { MarathiTTSService }

// Default export for backward compatibility
export default MarathiTTSService
