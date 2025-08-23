'use client'

import { useState, useRef, useEffect } from 'react'
import { locationService } from '../../lib/locationService'
import { marathiTTSService } from '../../lib/marathiTTSService'

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
  const [chatHistory, setChatHistory] = useState([])
  const [permissionStatus, setPermissionStatus] = useState('unknown')
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState(null)
  const [useDeviceSTT, setUseDeviceSTT] = useState(false)
  const [speechLogs, setSpeechLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  const [geminiStatus, setGeminiStatus] = useState(null)
  const [checkingGemini, setCheckingGemini] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechVolume, setSpeechVolume] = useState(0)

  
  const recognitionRef = useRef(null)
  const synthRef = useRef(null)
  const chatContainerRef = useRef(null)
  const deviceSTTRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const microphoneRef = useRef(null)
  const animationFrameRef = useRef(null)

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const SpeechSynthesis = window.speechSynthesis
    
    if (SpeechRecognition && SpeechSynthesis) {
      setSpeechSupported(true)
      
      // Initialize speech recognition with proper configuration
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false // Changed to false to avoid continuous errors
      recognitionRef.current.interimResults = true // Get interim results
      recognitionRef.current.maxAlternatives = 1
      recognitionRef.current.lang = getLanguageCode(language)
      
      // Speech recognition event handlers
      recognitionRef.current.onstart = () => {
        addSpeechLog('SUCCESS', 'Speech recognition started')
        setIsListening(true)
        setIsRecording(true)
        setTranscript('')
        setResult(null)
        setRetryCount(0) // Reset retry count on new start
        
        // Set a timeout to automatically stop if no speech is detected
        setTimeout(() => {
          if (isListening && transcript.trim() === '') {
            addSpeechLog('WARNING', 'No speech detected, stopping recognition')
            stopRecording()
          }
        }, 10000) // 10 second timeout
      }
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript
          const confidence = event.results[i][0].confidence
          
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart
            addSpeechLog('SUCCESS', 'Final transcript received', { transcript: transcriptPart, confidence })
          } else {
            interimTranscript += transcriptPart
            addSpeechLog('INFO', 'Interim transcript received', { transcript: transcriptPart })
          }
        }
        
        // Update transcript in real-time
        if (finalTranscript) {
          setQuery(prev => prev + ' ' + finalTranscript)
          setTranscript(prev => prev + ' ' + finalTranscript)
        } else if (interimTranscript) {
          setTranscript(interimTranscript)
        }
      }
      
             recognitionRef.current.onend = () => {
         addSpeechLog('INFO', 'Speech recognition ended')
         setIsListening(false)
         setIsRecording(false)
         
         // Store the transcript before clearing it
         const finalTranscript = transcript.trim()
         
         // Auto-send the transcribed text to AI immediately
         if (finalTranscript) {
           addSpeechLog('INFO', 'Auto-sending transcribed text to AI', { transcript: finalTranscript })
           
           // Set the query to the transcribed text
           setQuery(finalTranscript)
           
           // Automatically ask the AI after a short delay
           setTimeout(() => {
             console.log('🚀 Auto-sending to AI:', finalTranscript)
             ask()
           }, 500) // 500ms delay to ensure state is updated
         } else {
           addSpeechLog('WARNING', 'No transcript to auto-send', { transcript, finalTranscript })
         }
         
         // Clear transcript after a longer delay to ensure auto-send works
         setTimeout(() => {
           setTranscript('')
         }, 3000) // 3 second delay
       }
      
      recognitionRef.current.onerror = (event) => {
        addSpeechLog('ERROR', 'Speech recognition error', { error: event.error, details: event })
        setIsListening(false)
        setIsRecording(false)
        
        let errorMessage = 'Speech recognition error'
        let userMessage = 'Voice input failed'
        let shouldRetry = false
        let isNoSpeechError = false
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected'
            userMessage = 'No speech detected. Please speak clearly into the microphone.'
            shouldRetry = true
            isNoSpeechError = true
            break
          case 'audio-capture':
            errorMessage = 'Microphone access denied'
            userMessage = 'Microphone access denied. Please allow microphone permissions.'
            break
          case 'not-allowed':
            errorMessage = 'Microphone permission denied'
            userMessage = 'Microphone permission denied. Please check browser settings.'
            break
          case 'network':
            errorMessage = 'Network error'
            userMessage = 'Network error. Please check your internet connection.'
            shouldRetry = true
            break
          case 'service-not-allowed':
            errorMessage = 'Service not allowed'
            userMessage = 'Speech recognition service not available.'
            break
          case 'aborted':
            errorMessage = 'Speech recognition aborted'
            userMessage = 'Voice input was cancelled.'
            break
          default:
            errorMessage = `Speech recognition error: ${event.error}`
            userMessage = `Voice input failed: ${event.error}`
        }
        
        setLastError({ error: event.error, message: errorMessage })
        
        // For no-speech errors, provide immediate helpful feedback
        if (isNoSpeechError) {
          setResult({ 
            success: false, 
            error: userMessage,
            technicalError: errorMessage,
            canRetry: true,
            isNoSpeech: true
          })
          
          // Don't auto-retry immediately for no-speech, let user decide
          return
        }
        
        if (shouldRetry && retryCount < 3) {
          setRetryCount(prev => prev + 1)
          setResult({ 
            success: false, 
            error: `${userMessage} (Retry ${retryCount + 1}/3)`,
            technicalError: errorMessage,
            canRetry: true
          })
          
          // Auto-retry after a short delay
          setTimeout(() => {
            if (retryCount < 3) {
              console.log(`🔄 Auto-retrying speech recognition (${retryCount + 1}/3)...`)
              startRecording()
            }
          }, 2000)
        } else {
          setRetryCount(0)
          setResult({ 
            success: false, 
            error: userMessage,
            technicalError: errorMessage,
            canRetry: false
          })
        }
      }
      
      // Initialize speech synthesis
      synthRef.current = SpeechSynthesis
      
      // Check microphone permissions
      checkMicrophonePermission()
      
      // Initialize device STT
      initializeDeviceSTT()
    }
    
    // Get user location for context
    getUserLocation()
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      cleanupAudio()
    }
  }, [language])

  // Add speech recognition logs
  const addSpeechLog = (type, message, data = null) => {
    const log = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    }
    setSpeechLogs(prev => [...prev, log])
    console.log(`🎤 [${type}] ${message}`, data)
  }

  // Clear speech logs
  const clearSpeechLogs = () => {
    setSpeechLogs([])
    addSpeechLog('INFO', 'Speech logs cleared')
  }

  // Reload speech recognition
  const reloadSpeechRecognition = () => {
    addSpeechLog('INFO', 'Reloading speech recognition...')
    
    try {
      // Stop any ongoing recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      
      // Stop audio analysis
      stopAudioAnalysis()
      
      // Reset state
      setIsRecording(false)
      setIsListening(false)
      setTranscript('')
      setResult(null)
      setRetryCount(0)
      setLastError(null)
      
      // Reinitialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.maxAlternatives = 1
        recognitionRef.current.lang = getLanguageCode(language)
        
        // Reattach event handlers
        recognitionRef.current.onstart = () => {
          addSpeechLog('SUCCESS', 'Speech recognition started')
          setIsListening(true)
          setIsRecording(true)
          setTranscript('')
          setResult(null)
          setRetryCount(0)
          
          // Start audio analysis
          startAudioAnalysis()
          
          setTimeout(() => {
            if (isListening && transcript.trim() === '') {
              addSpeechLog('WARNING', 'No speech detected, stopping recognition')
              stopRecording()
            }
          }, 10000)
        }
        
        recognitionRef.current.onresult = (event) => {
          let finalTranscript = ''
          let interimTranscript = ''
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPart = event.results[i][0].transcript
            const confidence = event.results[i][0].confidence
            
            if (event.results[i].isFinal) {
              finalTranscript += transcriptPart
              addSpeechLog('SUCCESS', 'Final transcript received', { transcript: transcriptPart, confidence })
            } else {
              interimTranscript += transcriptPart
              addSpeechLog('INFO', 'Interim transcript received', { transcript: transcriptPart })
            }
          }
          
          if (finalTranscript) {
            setQuery(prev => prev + ' ' + finalTranscript)
            setTranscript(prev => prev + ' ' + finalTranscript)
          } else if (interimTranscript) {
            setTranscript(interimTranscript)
          }
        }
        
                 recognitionRef.current.onend = () => {
           addSpeechLog('INFO', 'Speech recognition ended')
           setIsListening(false)
           setIsRecording(false)
           
           // Stop audio analysis
           stopAudioAnalysis()
           
           // Store the transcript before clearing it
           const finalTranscript = transcript.trim()
           
           // Auto-send the transcribed text to AI immediately
           if (finalTranscript) {
             addSpeechLog('INFO', 'Auto-sending transcribed text to AI', { transcript: finalTranscript })
             
             // Set the query to the transcribed text
             setQuery(finalTranscript)
             
             // Automatically ask the AI after a short delay
             setTimeout(() => {
               console.log('🚀 Auto-sending to AI (reloaded):', finalTranscript)
               ask()
             }, 500) // 500ms delay to ensure state is updated
           } else {
             addSpeechLog('WARNING', 'No transcript to auto-send (reloaded)', { transcript, finalTranscript })
           }
           
           // Clear transcript after a longer delay to ensure auto-send works
           setTimeout(() => {
             setTranscript('')
           }, 3000) // 3 second delay
         }
        
        recognitionRef.current.onerror = (event) => {
          addSpeechLog('ERROR', 'Speech recognition error', { error: event.error, details: event })
          setIsListening(false)
          setIsRecording(false)
          
          // Stop audio analysis
          stopAudioAnalysis()
          
          let errorMessage = 'Speech recognition error'
          let userMessage = 'Voice input failed'
          let shouldRetry = false
          let isNoSpeechError = false
          
          switch (event.error) {
            case 'no-speech':
              errorMessage = 'No speech detected'
              userMessage = 'No speech detected. Please speak clearly into the microphone.'
              shouldRetry = true
              isNoSpeechError = true
              break
            case 'audio-capture':
              errorMessage = 'Microphone access denied'
              userMessage = 'Microphone access denied. Please allow microphone permissions.'
              break
            case 'not-allowed':
              errorMessage = 'Microphone permission denied'
              userMessage = 'Microphone permission denied. Please check browser settings.'
              break
            case 'network':
              errorMessage = 'Network error'
              userMessage = 'Network error. Please check your internet connection.'
              shouldRetry = true
              break
            case 'service-not-allowed':
              errorMessage = 'Service not allowed'
              userMessage = 'Speech recognition service not available.'
              break
            case 'aborted':
              errorMessage = 'Speech recognition aborted'
              userMessage = 'Voice input was cancelled.'
              break
            default:
              errorMessage = `Speech recognition error: ${event.error}`
              userMessage = `Voice input failed: ${event.error}`
          }
          
          setLastError({ error: event.error, message: errorMessage })
          
          if (isNoSpeechError) {
            setResult({ 
              success: false, 
              error: userMessage,
              technicalError: errorMessage,
              canRetry: true,
              isNoSpeech: true
            })
            return
          }
          
          if (shouldRetry && retryCount < 3) {
            setRetryCount(prev => prev + 1)
            setResult({ 
              success: false, 
              error: `${userMessage} (Retry ${retryCount + 1}/3)`,
              technicalError: errorMessage,
              canRetry: true
            })
            
            setTimeout(() => {
              if (retryCount < 3) {
                addSpeechLog('INFO', `Auto-retrying speech recognition (${retryCount + 1}/3)`)
                startRecording()
              }
            }, 2000)
          } else {
            setRetryCount(0)
            setResult({ 
              success: false, 
              error: userMessage,
              technicalError: errorMessage,
              canRetry: false
            })
          }
        }
        
        addSpeechLog('SUCCESS', 'Speech recognition reloaded successfully')
      }
    } catch (error) {
      addSpeechLog('ERROR', 'Failed to reload speech recognition', { error: error.message })
    }
  }

  // Check Gemini service status
  const checkGeminiStatus = async () => {
    setCheckingGemini(true)
    try {
      const response = await fetch('/api/voice/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const status = await response.json()
        setGeminiStatus(status)
        addSpeechLog('INFO', 'Gemini status checked', status)
      } else {
        const error = await response.text()
        setGeminiStatus({
          status: 'ERROR',
          message: 'Failed to check Gemini status',
          details: error
        })
        addSpeechLog('ERROR', 'Failed to check Gemini status', { error })
      }
    } catch (error) {
      setGeminiStatus({
        status: 'ERROR',
        message: 'Network error checking Gemini status',
        details: error.message
      })
      addSpeechLog('ERROR', 'Network error checking Gemini status', { error: error.message })
    } finally {
      setCheckingGemini(false)
    }
  }

  // Initialize device speech-to-text (voice typing)
  const initializeDeviceSTT = () => {
    try {
      // Check if device has built-in speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        addSpeechLog('INFO', 'Device STT available')
        
        // Try to use device's native speech input
        if (document.createElement('input').webkitSpeech !== undefined) {
          addSpeechLog('SUCCESS', 'Device voice typing supported')
          return true
        }
      }
      
      addSpeechLog('WARNING', 'Device voice typing not supported')
      return false
    } catch (error) {
      addSpeechLog('ERROR', 'Failed to initialize device STT', { error: error.message })
      return false
    }
  }

  // Initialize audio analysis for visual feedback
  const initializeAudioAnalysis = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addSpeechLog('WARNING', 'Audio analysis not supported')
        return false
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        },
        video: false 
      })

      microphoneRef.current = stream
      
      // Create audio context and analyser
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = 0.8
      
      addSpeechLog('SUCCESS', 'Audio analysis initialized')
      return true
    } catch (error) {
      addSpeechLog('ERROR', 'Failed to initialize audio analysis', { error: error.message })
      return false
    }
  }

  // Start audio analysis for visual feedback
  const startAudioAnalysis = () => {
    if (!analyserRef.current) return
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

    
    const updateVolume = () => {
      analyserRef.current.getByteFrequencyData(dataArray)
      
      // Calculate average volume
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length
      
      // Normalize to 0-100
      const normalizedVolume = Math.min(100, (average / 128) * 100)
      setSpeechVolume(normalizedVolume)
      
                // Check if speech has stopped (very low volume for 2 seconds)
          if (normalizedVolume < 5) {
            if (!isSpeaking) {
              setIsSpeaking(false)
              
              // Auto-stop recording if no speech detected and no transcript
              if (isRecording && transcript.trim() === '') {
                setTimeout(() => {
                  if (isRecording && transcript.trim() === '') {
                    addSpeechLog('WARNING', 'No speech detected, auto-stopping')
                    stopRecording()
                  }
                }, 2000)
              }
            }
          } else {
            setIsSpeaking(true)
          }
      
      animationFrameRef.current = requestAnimationFrame(updateVolume)
    }
    
    updateVolume()
  }

  // Stop audio analysis
  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setIsSpeaking(false)
    setSpeechVolume(0)
  }

  // Cleanup audio resources
  const cleanupAudio = () => {
    stopAudioAnalysis()
    
    if (microphoneRef.current) {
      microphoneRef.current.getTracks().forEach(track => track.stop())
      microphoneRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    analyserRef.current = null
  }

  // Check microphone permission status
  const checkMicrophonePermission = async () => {
    try {
      // First, try to get current permission status
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({ name: 'microphone' })
        setPermissionStatus(permission.state)
        
        permission.onchange = () => {
          setPermissionStatus(permission.state)
        }
      }
      
      // Also check if we can actually access the microphone
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // This will trigger permission request if not already granted
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true,
            video: false 
          })
          
          // Stop the test stream immediately
          stream.getTracks().forEach(track => track.stop())
          
          // Update permission status
          if (navigator.permissions) {
            const updatedPermission = await navigator.permissions.query({ name: 'microphone' })
            setPermissionStatus(updatedPermission.state)
          } else {
            setPermissionStatus('granted') // Assume granted if we got the stream
          }
          
          addSpeechLog('SUCCESS', 'Microphone permission granted and working')
        } catch (mediaError) {
          addSpeechLog('ERROR', 'Microphone access failed', { error: mediaError.name, message: mediaError.message })
          
          if (mediaError.name === 'NotAllowedError') {
            setPermissionStatus('denied')
            setResult({ 
              success: false, 
              error: 'Microphone permission denied. Please allow microphone access in your browser settings.',
              canRetry: false
            })
          } else if (mediaError.name === 'NotFoundError') {
            setPermissionStatus('not-found')
            setResult({ 
              success: false, 
              error: 'No microphone found. Please connect a microphone and try again.',
              canRetry: false
            })
          } else {
            setPermissionStatus('error')
            setResult({ 
              success: false, 
              error: `Microphone error: ${mediaError.message}`,
              canRetry: false
            })
          }
        }
      }
    } catch (error) {
      addSpeechLog('WARNING', 'Permission API not supported', { error: error.message })
      setPermissionStatus('unknown')
    }
  }

  // Explicitly request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      setResult({ 
        success: false, 
        error: '🎤 Requesting microphone permission...',
        isRequesting: true
      })
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setResult({ 
          success: false, 
          error: 'Microphone access not supported in this browser',
          canRetry: false
        })
        return false
      }
      
      // Explicitly request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false 
      })
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop())
      
      // Update permission status
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' })
        setPermissionStatus(permission.state)
      } else {
        setPermissionStatus('granted')
      }
      
      setResult({ 
        success: true, 
        error: '✅ Microphone permission granted! You can now use voice input.',
        isRequesting: false
      })
      
      addSpeechLog('SUCCESS', 'Microphone permission explicitly granted')
      return true
      
    } catch (error) {
      addSpeechLog('ERROR', 'Failed to request microphone permission', { error: error.name, message: error.message })
      
      let errorMessage = 'Failed to get microphone permission'
      let canRetry = true
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings and try again.'
        canRetry = true
        setPermissionStatus('denied')
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.'
        canRetry = false
        setPermissionStatus('not-found')
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Microphone access not supported in this browser'
        canRetry = false
        setPermissionStatus('not-supported')
      } else {
        errorMessage = `Microphone error: ${error.message}`
        canRetry = true
        setPermissionStatus('error')
      }
      
      setResult({ 
        success: false, 
        error: errorMessage,
        canRetry,
        isRequesting: false
      })
      
      return false
    }
  }

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

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

  const startRecording = async () => {
    if (!speechSupported) {
      setResult({ success: false, error: 'Speech recognition not supported in this browser' })
      return
    }
    
    try {
      // First, explicitly request microphone permission
      const permissionGranted = await requestMicrophonePermission()
      
      if (!permissionGranted) {
        // Permission request failed, don't proceed
        return
      }
      
      // Initialize audio analysis for visual feedback
      await initializeAudioAnalysis()
      
      // Check if we can actually access the microphone
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            },
            video: false 
          })
          
          // Stop the test stream
          stream.getTracks().forEach(track => track.stop())
          addSpeechLog('SUCCESS', 'Microphone access confirmed')
          
        } catch (mediaError) {
          addSpeechLog('ERROR', 'Microphone access failed', { error: mediaError.name, message: mediaError.message })
          setResult({ 
            success: false, 
            error: 'Microphone access failed. Please check your microphone and browser permissions.',
            canRetry: true
          })
          return
        }
      }
      
      if (recognitionRef.current) {
        // Reset state
        setTranscript('')
        setResult(null)
        setQuery('')
        setRetryCount(0)
        
        // Configure language
        recognitionRef.current.lang = getLanguageCode(language)
        
        // Start recognition
        recognitionRef.current.start()
        addSpeechLog('INFO', 'Starting speech recognition...')
        
        // Start audio analysis for visual feedback
        startAudioAnalysis()
        
        // Show user feedback
        setResult({ 
          success: false, 
          error: '🎤 Listening... Please speak now',
          isListening: true
        })
      }
    } catch (error) {
      addSpeechLog('ERROR', 'Failed to start recording', { error: error.message })
      setResult({ 
        success: false, 
        error: `Failed to start recording: ${error.message}`,
        canRetry: true
      })
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop()
      console.log('⏹️ Stopping speech recognition...')
    }
    
    // Stop audio analysis
    stopAudioAnalysis()
  }

  const speakResponse = (text) => {
    if (!text) return

    // Use Marathi TTS service for Marathi language
    if (language === 'mr') {
      const result = marathiTTSService.speak(text, {
        onStart: () => {
          setIsSpeaking(true)
          console.log('🎤 Marathi TTS started speaking')
        },
        onEnd: () => {
          setIsSpeaking(false)
          console.log('✅ Marathi TTS finished speaking')
        },
        onError: (error) => {
          setIsSpeaking(false)
          console.error('❌ Marathi TTS error:', error)
          // Fallback to default speech synthesis
          fallbackSpeak(text)
        }
      })

      if (!result.success) {
        console.warn('⚠️ Marathi TTS failed, falling back to default:', result.error)
        fallbackSpeak(text)
      }
      return
    }

    // Use default speech synthesis for other languages
    fallbackSpeak(text)
  }

  // Fallback speech synthesis for non-Marathi languages
  const fallbackSpeak = (text) => {
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
      
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      
      synthRef.current.speak(utterance)
    }
  }

  const clearChatHistory = () => {
    setChatHistory([])
    setResult(null)
    setTranscript('')
    setQuery('')
  }

  const ask = async () => {
    const inputText = transcript.trim() || query.trim()
    
    console.log('🤖 Ask function called with:', { transcript: transcript.trim(), query: query.trim(), inputText })
    
    if (!inputText) {
      setResult({ success: false, error: 'Please enter a question or use voice input' })
      return
    }

    try {
      setLoading(true)
      setResult(null)
      
      // Add user message to chat history
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: inputText,
        timestamp: new Date().toISOString(),
        language
      }
      setChatHistory(prev => [...prev, userMessage])
      
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
          audioInput: inputText,
          language, 
          context: { 
            query: inputText,
            location: locationContext,
            timestamp: new Date().toISOString()
          }
        })
      })
      
      const json = await res.json()
      setResult(json)
      
      // Add assistant response to chat history
      if (json.success) {
        const assistantMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: json.response,
          timestamp: new Date().toISOString(),
          language,
          pipelineData: json.pipelineData,
          recommendations: json.recommendations
        }
        setChatHistory(prev => [...prev, assistantMessage])
        
        // Speak the response if available
        speakResponse(json.response)
      } else {
        // Add error message to chat history
        const errorMessage = {
          id: Date.now() + 1,
          type: 'error',
          content: json.error,
          timestamp: new Date().toISOString(),
          language
        }
        setChatHistory(prev => [...prev, errorMessage])
      }
      
    } catch (e) {
      const errorResult = { success: false, error: e.message }
      setResult(errorResult)
      
      // Add error to chat history
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: e.message,
        timestamp: new Date().toISOString(),
        language
      }
      setChatHistory(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
      setQuery('')
      setTranscript('')
    }
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">🎤 Voice Assistant (Gemini)</h3>
        <div className="flex items-center gap-2">
          {userLocation && (
            <div className="text-xs text-gray-400">
              📍 {userLocation.city || `${userLocation.lat.toFixed(2)}, ${userLocation.lon.toFixed(2)}`}
            </div>
          )}
          {chatHistory.length > 0 && (
            <button
              onClick={clearChatHistory}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-400 hover:border-red-300"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>
      
      {/* Speech Support Status */}
      <div className="mb-4">
        {speechSupported ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-green-400 text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                Voice recognition enabled
              </div>
              <div className="text-xs text-gray-400">
                Microphone: {permissionStatus === 'granted' ? '✅ Allowed' : 
                            permissionStatus === 'denied' ? '❌ Denied' : 
                            permissionStatus === 'prompt' ? '⏳ Prompt' : 
                            permissionStatus === 'not-found' ? '🔍 Not Found' :
                            permissionStatus === 'not-supported' ? '🚫 Not Supported' :
                            permissionStatus === 'error' ? '⚠️ Error' :
                            '❓ Unknown'}
              </div>
            </div>
            
            {/* Live Speech Status */}
            {isRecording && (
              <div className="bg-green-900 border border-green-700 rounded p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-200 text-sm font-medium">🎤 Live Speech Detection:</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    isSpeaking ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {isSpeaking ? 'ACTIVE' : 'WAITING'}
                  </span>
                </div>
                <div className="flex items-end justify-center gap-1 h-6">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-100 ${
                        isSpeaking && speechVolume > (i * 16.67)
                          ? 'bg-green-300'
                          : 'bg-gray-500'
                      }`}
                      style={{
                        height: isSpeaking && speechVolume > (i * 16.67)
                          ? `${Math.max(3, (speechVolume / 100) * 20)}px`
                          : '3px'
                      }}
                    />
                  ))}
                </div>
                <div className="text-center mt-1">
                  <span className="text-green-300 text-xs">
                    {isSpeaking ? `Volume: ${Math.round(speechVolume)}%` : 'No speech detected'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Gemini Status */}
            <div className="bg-gray-800 border border-gray-700 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-300 text-sm font-medium">🤖 Gemini AI Status:</div>
                <div className="flex gap-2">
                  <button
                    onClick={checkGeminiStatus}
                    disabled={checkingGemini}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-xs"
                  >
                    {checkingGemini ? 'Checking...' : 'Check Status'}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/voice/test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ language })
                        })
                        
                        if (response.ok) {
                          const result = await response.json()
                          if (result.success) {
                            addSpeechLog('SUCCESS', 'Model test successful', { response: result.response, model: result.modelName })
                            setResult({ 
                              success: true, 
                              error: `✅ Model test successful! Response: "${result.response}"`,
                              isTest: true
                            })
                          } else {
                            addSpeechLog('ERROR', 'Model test failed', { error: result.error })
                            setResult({ 
                              success: false, 
                              error: `❌ Model test failed: ${result.error}`,
                              isTest: true
                            })
                          }
                        }
                      } catch (error) {
                        addSpeechLog('ERROR', 'Model test request failed', { error: error.message })
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                  >
                    🧪 Test
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/voice/model-info', {
                          method: 'GET',
                          headers: { 'Content-Type': 'application/json' }
                        })
                        
                        if (response.ok) {
                          const modelInfo = await response.json()
                          addSpeechLog('INFO', 'Model info retrieved', modelInfo)
                          setResult({ 
                            success: true, 
                            error: `📊 Model Info: ${modelInfo.status} • ${modelInfo.modelName} • API Key: ${modelInfo.apiKeyConfigured ? '✅' : '❌'}`,
                            isModelInfo: true
                          })
                        }
                      } catch (error) {
                        addSpeechLog('ERROR', 'Failed to get model info', { error: error.message })
                      }
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs"
                  >
                    ℹ️ Info
                  </button>
                </div>
              </div>
              
              {geminiStatus ? (
                <div className={`text-sm ${
                  geminiStatus.status === 'HEALTHY' ? 'text-green-400' : 'text-red-400'
                }`}>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      geminiStatus.status === 'HEALTHY' ? 'bg-green-400' : 'bg-red-400'
                    }`}></span>
                    {geminiStatus.message}
                  </div>
                  {geminiStatus.details && (
                    <div className="text-xs text-gray-400 mt-1 ml-4">
                      {geminiStatus.details}
                    </div>
                  )}
                  {geminiStatus.modelInfo && (
                    <div className="text-xs text-gray-400 mt-1 ml-4">
                      Model: {geminiStatus.modelInfo.modelName} • API Key: {geminiStatus.modelInfo.apiKeyConfigured ? '✅' : '❌'}
                    </div>
                  )}
                  {geminiStatus.errorType && (
                    <div className="text-xs text-red-400 mt-1 ml-4">
                      Error Type: {geminiStatus.errorType}
                      {geminiStatus.errorCode && ` (Code: ${geminiStatus.errorCode})`}
                    </div>
                  )}
                  {geminiStatus.technicalDetails && (
                    <div className="text-xs text-red-400 mt-1 ml-4">
                      Technical: {geminiStatus.technicalDetails}
                    </div>
                  )}
                  {geminiStatus.suggestions && geminiStatus.suggestions.length > 0 && (
                    <div className="text-xs text-yellow-400 mt-2 ml-4">
                      <div className="font-medium">Suggestions:</div>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {geminiStatus.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 text-sm">
                  Click &quot;Check Status&quot; to verify Gemini AI service
                </div>
              )}
            </div>
            
            {/* Permission Request Button */}
            {permissionStatus !== 'granted' && (
              <div className="bg-yellow-900 border border-yellow-700 rounded p-3">
                <div className="text-yellow-200 text-sm mb-2">
                  🔒 Microphone permission required for voice input
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={requestMicrophonePermission}
                    disabled={result?.isRequesting}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm flex items-center"
                  >
                    {result?.isRequesting ? (
                      <>
                        <span className="animate-spin mr-2">⚡</span>
                        Requesting...
                      </>
                    ) : (
                      '🎤 Request Microphone Permission'
                    )}
                  </button>
                  
                  {permissionStatus === 'denied' && (
                    <button
                      onClick={() => {
                        setResult({ 
                          success: false, 
                          error: 'To enable microphone access:\n\n1. Click the lock icon 🔒 in your browser address bar\n2. Change microphone permission to "Allow"\n3. Refresh the page\n4. Try requesting permission again',
                          canRetry: false
                        })
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
                    >
                      ℹ️ How to Enable
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* User guidance */}
            <div className="bg-blue-900 border border-blue-700 rounded p-3 text-sm">
              <div className="text-blue-200 font-medium mb-2">🎤 How to use voice input:</div>
              <div className="text-blue-100 space-y-1 text-xs">
                <div>1. {permissionStatus === 'granted' ? '✅' : '🔒'} Grant microphone permission (if not already done)</div>
                <div>2. Click the microphone button 🎤 to start recording</div>
                <div>3. Speak clearly in your selected language</div>
                <div>4. Your speech will appear in real-time below</div>
                <div>5. <strong>🎯 Speech automatically sends to AI when you stop talking!</strong></div>
                <div>6. No need to press &quot;Ask Assistant&quot; - it happens automatically</div>
              </div>
            </div>
            
            {/* Test voice button - only show if permission granted */}
            {permissionStatus === 'granted' && (
              <div className="text-center">
                <button
                  onClick={() => {
                    if (!isRecording) {
                      startRecording()
                      setTimeout(() => {
                        if (isRecording) {
                          stopRecording()
                        }
                      }, 5000) // Auto-stop after 5 seconds for testing
                    }
                  }}
                  disabled={isRecording}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                >
                  {isRecording ? 'Testing...' : '🧪 Test Voice Input (5s)'}
                </button>
              </div>
            )}
            
            {/* Speech Logs */}
            <div className="bg-gray-800 border border-gray-700 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-300 text-sm font-medium">📊 Speech Recognition Logs:</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
                  >
                    {showLogs ? 'Hide Logs' : 'Show Logs'}
                  </button>
                  <button
                    onClick={reloadSpeechRecognition}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                  >
                    🔄 Reload
                  </button>
                  <button
                    onClick={clearSpeechLogs}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              {showLogs && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {speechLogs.length === 0 ? (
                    <div className="text-gray-400 text-xs">No logs yet</div>
                  ) : (
                    speechLogs.slice(-10).map((log) => (
                      <div key={log.id} className={`text-xs p-1 rounded ${
                        log.type === 'ERROR' ? 'bg-red-900 text-red-200' :
                        log.type === 'WARNING' ? 'bg-yellow-900 text-yellow-200' :
                        log.type === 'SUCCESS' ? 'bg-green-900 text-green-200' :
                        'bg-gray-700 text-gray-200'
                      }`}>
                        <span className="font-mono">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className="ml-1">[{log.type}]</span>
                        <span className="ml-1">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
              
              <div className="text-xs text-gray-400 mt-1">
                {speechLogs.length} total logs • Click &quot;Show Logs&quot; to view recent activity
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center text-yellow-400 text-sm">
            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
            Voice recognition not supported - text input only
          </div>
        )}
      </div>

      {/* Chat History */}
      {chatHistory.length > 0 && (
        <div 
          ref={chatContainerRef}
          className="bg-gray-800 border border-gray-700 rounded p-4 mb-4 max-h-96 overflow-y-auto"
        >
          <div className="text-gray-400 text-sm mb-3 font-semibold">💬 Chat History:</div>
          <div className="space-y-3">
            {chatHistory.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : message.type === 'error'
                    ? 'bg-red-600 text-white'
                    : 'bg-green-600 text-white'
                }`}>
                  <div className="text-xs opacity-75 mb-1">
                    {message.type === 'user' ? '👤 You' : message.type === 'error' ? '❌ Error' : '🤖 Assistant'} • {formatTimestamp(message.timestamp)}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Show pipeline data for assistant messages */}
                  {message.type === 'assistant' && message.pipelineData && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <div className="text-xs opacity-75 mb-1">📊 Pipeline Data:</div>
                      <div className="text-xs space-y-1">
                        {message.pipelineData.weather && (
                          <div>🌤️ Weather data available</div>
                        )}
                        {message.pipelineData.environmental && (
                          <div>🌱 Environmental analysis completed</div>
                        )}
                        {message.pipelineData.insights && message.pipelineData.insights.length > 0 && (
                          <div>💡 {message.pipelineData.insights.length} insights generated</div>
                        )}
                        {message.pipelineData.recommendations && message.pipelineData.recommendations.length > 0 && (
                          <div>🎯 {message.pipelineData.recommendations.length} recommendations</div>
                        )}
                        {message.pipelineData.notification && (
                          <div className={`${message.pipelineData.notification.success ? 'text-green-400' : 'text-red-400'}`}>
                            📱 {message.pipelineData.notification.success ? 'SMS sent successfully' : 'SMS failed'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Input and Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <div className="md:col-span-2 relative">
          {/* Prominent Speech Visualizer */}
          {isRecording && (
            <div className="mb-3 p-3 bg-blue-900 border border-blue-700 rounded">
              <div className="text-center mb-2">
                <span className="text-blue-300 text-sm font-medium">
                  {isSpeaking ? '🎤 Speaking Detected' : '🔇 Listening for Speech...'}
                </span>
              </div>
              <div className="flex justify-center items-end gap-1 h-12">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 rounded-full transition-all duration-150 ${
                      isSpeaking && speechVolume > (i * 8.33)
                        ? 'bg-green-400 shadow-lg'
                        : 'bg-blue-400'
                    }`}
                    style={{
                      height: isSpeaking && speechVolume > (i * 8.33)
                        ? `${Math.max(6, (speechVolume / 100) * 40)}px`
                        : '6px'
                    }}
                  />
                ))}
              </div>
              <div className="text-center mt-2">
                <span className="text-blue-200 text-xs">
                  Volume: {Math.round(speechVolume)}% • {isSpeaking ? 'Active Speech' : 'Waiting for Input'}
                </span>
              </div>
            </div>
          )}
          
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
              disabled={loading || permissionStatus !== 'granted'}
              className={`absolute right-2 top-2 p-2 rounded transition-all ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-lg' 
                  : permissionStatus === 'granted'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-110'
                  : 'bg-gray-500 text-gray-300 cursor-not-allowed'
              }`}
              title={isRecording ? 'Stop recording' : 
                     permissionStatus === 'granted' ? 'Start recording' : 
                     'Microphone permission required'}
            >
              {isRecording ? '⏹️' : '🎤'}
            </button>
          )}
          
          {/* Status indicator */}
          {speechSupported && (
            <div className="absolute -bottom-6 left-0 text-xs">
              {isRecording ? (
                <span className="text-red-400 flex items-center">
                  <span className="animate-pulse mr-1">🔴</span>
                  Recording...
                </span>
              ) : isListening ? (
                <span className="text-blue-400 flex items-center">
                  <span className="animate-pulse mr-1">🔵</span>
                  Listening...
                </span>
              ) : (
                <span className="text-gray-400 flex items-center">
                  <span className="mr-1">⚪</span>
                  Ready to record
                </span>
              )}
            </div>
          )}
          
          {/* Visual Speech Indicator */}
          {isRecording && (
            <div className="absolute -bottom-16 left-0">
              <div className="flex items-end gap-1 h-8">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-100 ${
                      isSpeaking && speechVolume > (i * 12.5)
                        ? 'bg-green-400 animate-pulse'
                        : 'bg-gray-400'
                    }`}
                    style={{
                      height: isSpeaking && speechVolume > (i * 12.5)
                        ? `${Math.max(4, (speechVolume / 100) * 24)}px`
                        : '4px'
                    }}
                  />
                ))}
              </div>
              <div className="text-xs text-green-400 mt-1">
                {isSpeaking ? '🎤 Speaking...' : '🔇 Silent'}
              </div>
            </div>
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
        
        {/* Device STT Toggle */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-300">Device STT:</label>
          <input
            type="checkbox"
            checked={useDeviceSTT}
            onChange={(e) => setUseDeviceSTT(e.target.checked)}
            disabled={isListening}
            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
          />
        </div>
        
        <button
          onClick={ask}
          disabled={loading || isListening || (!query.trim() && !transcript.trim())}
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
          <div className="text-blue-300 text-sm mb-1 flex items-center">
            <span className="animate-pulse mr-2">🎤</span>
            Live Voice Input:
          </div>
          <div className="text-white font-medium">{transcript}</div>
          <div className="text-blue-300 text-xs mt-1">
            {isListening ? 'Listening... Speak clearly' : 'Processing...'}
          </div>
        </div>
      )}

      {/* Auto-send indicator */}
      {transcript && !isListening && (
        <div className="bg-green-900 border border-green-700 rounded p-3 mb-3">
          <div className="text-green-300 text-sm mb-1 flex items-center">
            <span className="animate-pulse mr-2">🚀</span>
            Auto-sending to AI...
          </div>
          <div className="text-white font-medium">{transcript}</div>
          <div className="text-green-300 text-xs mt-1">
            Your voice input is being automatically sent to the AI assistant
          </div>
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

      {/* Current Result Display (for immediate feedback) */}
      {result && !result.success && (
        <div className="mt-4">
          <div className={`border rounded p-4 ${
            result.isTest || result.isModelInfo 
              ? 'bg-blue-900 border-blue-700' 
              : 'bg-red-900 border-red-700'
          }`}>
            <div className={`text-sm mb-2 ${
              result.isTest || result.isModelInfo ? 'text-blue-300' : 'text-red-300'
            }`}>
              {result.isTest ? 'Model Test Result:' : 
               result.isModelInfo ? 'Model Information:' : 'Error:'}
            </div>
            <div className="text-white">{result.error}</div>
            {result.technicalError && (
              <div className="text-red-400 text-xs mt-2">
                Technical: {result.technicalError}
              </div>
            )}
            
            {/* Retry options */}
            {result.canRetry && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setRetryCount(0)
                    setResult(null)
                    startRecording()
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                >
                  🔄 Retry Now
                </button>
                <button
                  onClick={() => {
                    setRetryCount(0)
                    setResult(null)
                    setLastError(null)
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                >
                  ✖️ Dismiss
                </button>
              </div>
            )}
            
            {/* Gemini-specific retry options */}
            {!result.success && !result.isTest && !result.isModelInfo && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={checkGeminiStatus}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                >
                  🔍 Check Gemini Status
                </button>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/voice/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ language })
                      })
                      
                      if (response.ok) {
                        const testResult = await response.json()
                        if (testResult.success) {
                          addSpeechLog('SUCCESS', 'Gemini retry successful', testResult)
                          setResult({ 
                            success: true, 
                            error: `✅ Gemini is now working! Response: "${testResult.response}"`,
                            isRetry: true
                          })
                        } else {
                          addSpeechLog('ERROR', 'Gemini retry failed', { error: testResult.error })
                        }
                      }
                    } catch (error) {
                      addSpeechLog('ERROR', 'Gemini retry request failed', { error: error.message })
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  🔄 Retry Gemini
                </button>
                <button
                  onClick={() => {
                    setResult(null)
                    setLastError(null)
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                >
                  ✖️ Dismiss
                </button>
              </div>
            )}
            
            {/* Helpful tips */}
            {result.isNoSpeech && (
              <div className="mt-3 p-2 bg-yellow-900 border border-yellow-700 rounded text-xs text-yellow-200">
                💡 <strong>Tips for better voice recognition:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  <li>Speak clearly and at a normal pace</li>
                  <li>Ensure your microphone is working and not muted</li>
                  <li>Reduce background noise</li>
                  <li>Try speaking closer to the microphone</li>
                  <li>Check if your browser has microphone permissions</li>
                </ul>
              </div>
            )}
            
            {/* Gemini troubleshooting tips */}
            {!result.success && !result.isTest && !result.isModelInfo && (
              <div className="mt-3 p-2 bg-blue-900 border border-blue-700 rounded text-xs text-blue-200">
                🔧 <strong>Gemini AI Troubleshooting:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  <li>Check if your API key is valid and not expired</li>
                  <li>Verify you have sufficient quota remaining</li>
                  <li>Ensure you are using a supported model</li>
                  <li>Check your internet connection</li>
                  <li>Try again in a few minutes</li>
                  <li>Use the &quot;Check Status&quot; button above for detailed diagnostics</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
