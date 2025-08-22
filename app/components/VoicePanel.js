'use client'

import { useState, useRef, useEffect } from 'react'
import { locationService } from '../../lib/locationService'

export default function VoicePanel() {
  const [language, setLanguage] = useState('en')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [transcript, setTranscript] = useState('')
  
  const recognitionRef = useRef(null)
  const synthRef = useRef(null)

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const SpeechSynthesis = window.speechSynthesis
    
    if (SpeechRecognition && SpeechSynthesis) {
      setSpeechSupported(true)
      
      // Initialize speech recognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = getLanguageCode(language)
      
      recognitionRef.current.onstart = () => {
        setIsListening(true)
        setTranscript('')
      }
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart
          } else {
            interimTranscript += transcriptPart
          }
        }
        
        if (finalTranscript) {
          setQuery(finalTranscript)
          setTranscript(finalTranscript)
        } else {
          setTranscript(interimTranscript)
        }
      }
      
      recognitionRef.current.onend = () => {
        setIsListening(false)
        setIsRecording(false)
      }
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        setIsRecording(false)
        setResult({ success: false, error: `Speech recognition error: ${event.error}` })
      }
      
      // Initialize speech synthesis
      synthRef.current = SpeechSynthesis
    }
    
    // Get user location for context
    getUserLocation()
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [language])

  const getUserLocation = async () => {
    try {
      const location = await locationService.getLocationWithFallback()
      setUserLocation(location)
    } catch (error) {
      console.error('Failed to get user location:', error)
    }
  }

  const getLanguageCode = (lang) => {
    const codes = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'mr': 'mr-IN'
    }
    return codes[lang] || 'en-US'
  }

  const startRecording = () => {
    if (!speechSupported) {
      setResult({ success: false, error: 'Speech recognition not supported in this browser' })
      return
    }
    
    if (recognitionRef.current) {
      setIsRecording(true)
      recognitionRef.current.lang = getLanguageCode(language)
      recognitionRef.current.start()
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const speakResponse = (text) => {
    if (synthRef.current && text) {
      // Cancel any ongoing speech
      synthRef.current.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = getLanguageCode(language)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 0.8
      
      // Find appropriate voice for the language
      const voices = synthRef.current.getVoices()
      const voice = voices.find(v => v.lang.startsWith(getLanguageCode(language).substring(0, 2)))
      if (voice) {
        utterance.voice = voice
      }
      
      synthRef.current.speak(utterance)
    }
  }

  const ask = async () => {
    if (!query.trim()) {
      setResult({ success: false, error: 'Please enter a question or use voice input' })
      return
    }

    try {
      setLoading(true)
      setResult(null)
      
      // Get current weather and location context
      let locationContext = {}
      if (userLocation) {
        try {
          const weatherData = await locationService.getCurrentLocationWeather()
          locationContext = {
            location: userLocation,
            weather: weatherData.weather,
            address: await locationService.getAddressFromCoordinates(userLocation.lat, userLocation.lon)
          }
        } catch (error) {
          console.error('Failed to get location context:', error)
          locationContext = { location: userLocation }
        }
      }
      
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audioInput: transcript || query,
          language, 
          context: { 
            query: query,
            location: locationContext,
            timestamp: new Date().toISOString()
          }
        })
      })
      
      const json = await res.json()
      setResult(json)
      
      // Speak the response if available
      if (json.success && json.response) {
        speakResponse(json.response)
      }
      
    } catch (e) {
      setResult({ success: false, error: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">🎤 Voice Assistant (Gemini)</h3>
        {userLocation && (
          <div className="text-xs text-gray-400">
            📍 {userLocation.city || `${userLocation.lat.toFixed(2)}, ${userLocation.lon.toFixed(2)}`}
          </div>
        )}
      </div>
      
      {/* Speech Support Status */}
      <div className="mb-4">
        {speechSupported ? (
          <div className="flex items-center text-green-400 text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
            Voice recognition enabled
          </div>
        ) : (
          <div className="flex items-center text-yellow-400 text-sm">
            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
            Voice recognition not supported - text input only
          </div>
        )}
      </div>

      {/* Query Input and Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <div className="md:col-span-2 relative">
          <input
            className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 pr-10"
            placeholder={isListening ? "Listening..." : "Ask a question or click mic..."}
            value={isListening ? transcript : query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && ask()}
            disabled={isListening}
          />
          {speechSupported && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              className={`absolute right-2 top-2 p-1 rounded ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {isRecording ? '⏹️' : '🎤'}
            </button>
          )}
        </div>
        
        <select
          className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isListening}
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>
        
        <button
          onClick={ask}
          disabled={loading || isListening || !query.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded flex items-center justify-center"
        >
          {loading ? (
            <>
              <span className="animate-spin mr-2">⚡</span>
              Thinking...
            </>
          ) : (
            'Ask Assistant'
          )}
        </button>
      </div>

      {/* Real-time transcript display */}
      {(isListening && transcript) && (
        <div className="bg-blue-900 border border-blue-700 rounded p-3 mb-3">
          <div className="text-blue-300 text-sm mb-1">Voice Input:</div>
          <div className="text-white">{transcript}</div>
        </div>
      )}

      {/* Location Context Display */}
      {userLocation && (
        <div className="bg-gray-800 border border-gray-700 rounded p-3 mb-3">
          <div className="text-gray-400 text-sm mb-1">Location Context:</div>
          <div className="text-white text-sm">
            {userLocation.source === 'gps' && '📍 '}
            {userLocation.source === 'ip' && '🌐 '}
            {userLocation.source === 'default' && '⚠️ '}
            {userLocation.city && userLocation.region 
              ? `${userLocation.city}, ${userLocation.region}` 
              : `${userLocation.lat.toFixed(4)}, ${userLocation.lon.toFixed(4)}`}
            <span className="text-gray-500 ml-2">
              ({userLocation.source} location)
            </span>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="mt-4">
          {result.success ? (
            <div className="bg-green-900 border border-green-700 rounded p-4">
              <div className="text-green-300 text-sm mb-2">Assistant Response:</div>
              <div className="text-white whitespace-pre-wrap">{result.response}</div>
              {result.recommendations && (
                <div className="mt-3">
                  <div className="text-green-300 text-sm mb-1">Recommendations:</div>
                  <ul className="text-white text-sm space-y-1">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-400 mr-2">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-900 border border-red-700 rounded p-4">
              <div className="text-red-300 text-sm mb-2">Error:</div>
              <div className="text-white">{result.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
