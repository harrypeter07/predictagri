import { enhancedLogger } from './enhancedLogger.js'

// Input validation schemas
const validationSchemas = {
  coordinates: {
    lat: { type: 'number', min: -90, max: 90, required: true },
    lon: { type: 'number', min: -180, max: 180, required: true }
  },
  
  phoneNumber: {
    pattern: /^\+?[1-9]\d{1,14}$/,
    message: 'Phone number must be in international format (e.g., +1234567890)'
  },
  
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email format'
  },
  
  imageUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff'],
    maxDimensions: { width: 4096, height: 4096 }
  },
  
  region: {
    pattern: /^[a-zA-Z\s\-_]+$/,
    minLength: 2,
    maxLength: 100,
    message: 'Region name must be 2-100 characters, letters, spaces, hyphens, and underscores only'
  },
  
  cropName: {
    pattern: /^[a-zA-Z\s\-_]+$/,
    minLength: 2,
    maxLength: 50,
    message: 'Crop name must be 2-50 characters, letters, spaces, hyphens, and underscores only'
  },
  
  userId: {
    pattern: /^[a-zA-Z0-9\-_]+$/,
    minLength: 1,
    maxLength: 50,
    message: 'User ID must be 1-50 characters, alphanumeric, hyphens, and underscores only'
  }
}

class SecurityMiddleware {
  constructor() {
    this.logger = enhancedLogger.with({ service: 'SecurityMiddleware' })
    this.rateLimitStore = new Map()
    this.rateLimitWindow = 60000 // 1 minute
    this.maxRequestsPerWindow = 100
  }

  // CORS configuration
  corsConfig = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://yourdomain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }

  // Security headers
  securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }

  // Validate input data against schema
  validateInput(data, schema) {
    const errors = []

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field]

      // Check if required
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`)
        continue
      }

      // Skip validation if value is not provided and not required
      if (value === undefined || value === null) continue

      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}`)
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(rules.message || `${field} format is invalid`)
      }

      // Length validation
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`)
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be no more than ${rules.maxLength} characters`)
      }

      // Numeric range validation
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`)
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${field} must be no more than ${rules.max}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Validate coordinates
  validateCoordinates(lat, lon) {
    return this.validateInput({ lat, lon }, validationSchemas.coordinates)
  }

  // Validate phone number
  validatePhoneNumber(phoneNumber) {
    if (!phoneNumber) return { isValid: false, errors: ['Phone number is required'] }
    
    const isValid = validationSchemas.phoneNumber.pattern.test(phoneNumber)
    return {
      isValid,
      errors: isValid ? [] : [validationSchemas.phoneNumber.message]
    }
  }

  // Validate email
  validateEmail(email) {
    if (!email) return { isValid: false, errors: ['Email is required'] }
    
    const isValid = validationSchemas.email.pattern.test(email)
    return {
      isValid,
      errors: isValid ? [] : [validationSchemas.email.message]
    }
  }

  // Validate image upload
  validateImageUpload(file) {
    const errors = []

    if (!file) {
      errors.push('Image file is required')
      return { isValid: false, errors }
    }

    // Check file size
    if (file.size > validationSchemas.imageUpload.maxSize) {
      errors.push(`File size must be less than ${validationSchemas.imageUpload.maxSize / 1024 / 1024}MB`)
    }

    // Check file type
    if (!validationSchemas.imageUpload.allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${validationSchemas.imageUpload.allowedTypes.join(', ')}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Validate region name
  validateRegion(region) {
    if (!region) return { isValid: false, errors: ['Region is required'] }
    
    const validation = this.validateInput({ region }, { region: validationSchemas.region })
    return validation
  }

  // Validate crop name
  validateCropName(cropName) {
    if (!cropName) return { isValid: false, errors: ['Crop name is required'] }
    
    const validation = this.validateInput({ cropName }, { cropName: validationSchemas.cropName })
    return validation
  }

  // Validate user ID
  validateUserId(userId) {
    if (!userId) return { isValid: false, errors: ['User ID is required'] }
    
    const validation = this.validateInput({ userId }, { userId: validationSchemas.userId })
    return validation
  }

  // Rate limiting
  checkRateLimit(identifier) {
    const now = Date.now()
    const windowStart = now - this.rateLimitWindow

    // Clean old entries
    for (const [key, timestamp] of this.rateLimitStore.entries()) {
      if (timestamp < windowStart) {
        this.rateLimitStore.delete(key)
      }
    }

    // Count requests in current window
    const requestCount = Array.from(this.rateLimitStore.values())
      .filter(timestamp => timestamp >= windowStart)
      .length

    if (requestCount >= this.maxRequestsPerWindow) {
      this.logger.warn('rate_limit_exceeded', { identifier, requestCount })
      return false
    }

    // Add current request
    this.rateLimitStore.set(`${identifier}-${now}`, now)
    return true
  }

  // Sanitize input data
  sanitizeInput(data) {
    if (typeof data === 'string') {
      return this.sanitizeString(data)
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized = {}
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value)
      }
      return sanitized
    }

    return data
  }

  // Sanitize string input
  sanitizeString(str) {
    if (typeof str !== 'string') return str

    return str
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
  }

  // SQL injection prevention
  preventSqlInjection(input) {
    if (typeof input !== 'string') return input

    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
      /(\b(OR|AND)\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/gi,
      /(--|\/\*|\*\/|;)/g
    ]

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        this.logger.warn('sql_injection_attempt', { input: input.substring(0, 100) })
        throw new Error('Invalid input detected')
      }
    }

    return input
  }

  // XSS prevention
  preventXSS(input) {
    if (typeof input !== 'string') return input

    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
    ]

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        this.logger.warn('xss_attempt', { input: input.substring(0, 100) })
        throw new Error('Invalid input detected')
      }
    }

    return input
  }

  // Generate CORS headers
  generateCorsHeaders(origin) {
    const headers = { ...this.securityHeaders }

    // Check if origin is allowed
    if (this.corsConfig.origin.includes('*') || this.corsConfig.origin.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin
    }

    headers['Access-Control-Allow-Methods'] = this.corsConfig.methods.join(', ')
    headers['Access-Control-Allow-Headers'] = this.corsConfig.allowedHeaders.join(', ')
    headers['Access-Control-Allow-Credentials'] = this.corsConfig.credentials.toString()
    headers['Access-Control-Max-Age'] = this.corsConfig.maxAge.toString()

    return headers
  }

  // Security middleware for Next.js API routes
  securityMiddleware(handler) {
    return async (request, context) => {
      const startTime = Date.now()
      const requestId = this.generateRequestId()
      
      try {
        // Add security headers
        const response = await handler(request, context)
        
        // Add security headers to response
        const headers = this.generateCorsHeaders(request.headers.get('origin') || '*')
        
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value)
        }

        // Log security event
        this.logger.info('request_processed', {
          requestId,
          method: request.method,
          url: request.url,
          duration: Date.now() - startTime,
          securityHeaders: Object.keys(headers).length
        })

        return response
      } catch (error) {
        this.logger.error('request_failed', {
          requestId,
          method: request.method,
          url: request.url,
          error: error.message,
          duration: Date.now() - startTime
        })
        throw error
      }
    }
  }

  // Generate request ID
  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Validate API key
  validateApiKey(apiKey) {
    if (!apiKey) return { isValid: false, error: 'API key is required' }
    
    // Check if API key format is valid (basic check)
    const isValidFormat = /^[a-zA-Z0-9\-_]{20,}$/.test(apiKey)
    
    if (!isValidFormat) {
      this.logger.warn('invalid_api_key_format', { apiKey: apiKey.substring(0, 10) + '...' })
      return { isValid: false, error: 'Invalid API key format' }
    }

    return { isValid: true }
  }

  // Check for suspicious activity
  detectSuspiciousActivity(request) {
    const suspiciousPatterns = [
      /\.\.\//, // Directory traversal
      /<script/i, // XSS attempts
      /union\s+select/i, // SQL injection
      /eval\s*\(/i, // Code injection
      /document\.cookie/i, // Cookie theft attempts
      /alert\s*\(/i // Alert injection
    ]

    const userAgent = request.headers.get('user-agent') || ''
    const url = request.url
    const method = request.method

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userAgent) || pattern.test(url)) {
        this.logger.warn('suspicious_activity_detected', {
          pattern: pattern.source,
          userAgent: userAgent.substring(0, 100),
          url: url.substring(0, 100),
          method
        })
        return true
      }
    }

    return false
  }
}

// Create singleton instance
export const securityMiddleware = new SecurityMiddleware()

// Export validation schemas for use in other modules
export { validationSchemas }
