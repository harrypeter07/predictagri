import { Logger } from './logger.js'

class EnhancedLogger extends Logger {
  constructor(context = {}) {
    super(context)
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    }
    this.currentLevel = process.env.LOG_LEVEL || 'info'
    this.enableStructuredLogging = process.env.ENABLE_STRUCTURED_LOGGING === 'true'
    this.enablePerformanceLogging = process.env.ENABLE_PERFORMANCE_LOGGING === 'true'
    this.logBuffer = []
    this.maxBufferSize = 100
    this.flushInterval = 5000 // 5 seconds
    this.startFlushTimer()
  }

  // Enhanced log method with structured logging
  log(level, message, extra = {}) {
    if (!this.shouldLog(level)) return

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...this.context,
      ...extra,
      pid: process.pid,
      memory: this.enablePerformanceLogging ? this.getMemoryUsage() : undefined,
      trace: this.enablePerformanceLogging ? this.getStackTrace() : undefined
    }

    if (this.enableStructuredLogging) {
      console.log(JSON.stringify(logEntry))
    } else {
      const formattedMessage = this.formatLogMessage(logEntry)
      console.log(formattedMessage)
    }

    // Add to buffer for batch processing
    this.addToBuffer(logEntry)
  }

  // Check if we should log at this level
  shouldLog(level) {
    return this.logLevels[level] <= this.logLevels[this.currentLevel]
  }

  // Format log message for human readability
  formatLogMessage(logEntry) {
    const { timestamp, level, message, ...rest } = logEntry
    const context = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : ''
    return `[${timestamp}] ${level}: ${message}${context}`
  }

  // Get memory usage for performance logging
  getMemoryUsage() {
    const usage = process.memoryUsage()
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024)
    }
  }

  // Get stack trace for debugging
  getStackTrace() {
    const stack = new Error().stack
    return stack ? stack.split('\n').slice(3, 8) : []
  }

  // Add log entry to buffer
  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry)
    
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift()
    }
  }

  // Start flush timer for batch processing
  startFlushTimer() {
    setInterval(() => {
      this.flushBuffer()
    }, this.flushInterval)
  }

  // Flush log buffer (for external log aggregation)
  flushBuffer() {
    if (this.logBuffer.length > 0) {
      // Here you could send logs to external services like DataDog, Loggly, etc.
      // For now, we'll just clear the buffer
      this.logBuffer = []
    }
  }

  // Performance logging methods
  async timeAsync(operation, operationName = 'async_operation') {
    const startTime = Date.now()
    const startMemory = this.getMemoryUsage()
    
    try {
      const result = await operation()
      const endTime = Date.now()
      const endMemory = this.getMemoryUsage()
      
      this.info(`${operationName}_completed`, {
        duration: endTime - startTime,
        memoryDelta: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        }
      })
      
      return result
    } catch (error) {
      const endTime = Date.now()
      this.error(`${operationName}_failed`, {
        duration: endTime - startTime,
        error: error.message
      })
      throw error
    }
  }

  timeSync(operation, operationName = 'sync_operation') {
    const startTime = Date.now()
    const startMemory = this.getMemoryUsage()
    
    try {
      const result = operation()
      const endTime = Date.now()
      const endMemory = this.getMemoryUsage()
      
      this.info(`${operationName}_completed`, {
        duration: endTime - startTime,
        memoryDelta: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        }
      })
      
      return result
    } catch (error) {
      const endTime = Date.now()
      this.error(`${operationName}_failed`, {
        duration: endTime - startTime,
        error: error.message
      })
      throw error
    }
  }

  // Request logging middleware
  logRequest(req, res, next) {
    const startTime = Date.now()
    const requestId = this.generateRequestId()
    
    // Log request start
    this.info('request_started', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    })

    // Override res.end to log response
    const originalEnd = res.end
    res.end = function(chunk, encoding) {
      const endTime = Date.now()
      const duration = endTime - startTime
      
      this.info('request_completed', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        contentLength: res.getHeader('content-length')
      })
      
      originalEnd.call(res, chunk, encoding)
    }.bind(this)

    if (next) next()
  }

  // Generate unique request ID
  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Error logging with context
  logError(error, context = {}) {
    this.error('application_error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      },
      context: {
        ...this.context,
        ...context
      }
    })
  }

  // API response logging
  logApiResponse(method, url, statusCode, duration, responseSize = null) {
    const level = statusCode >= 400 ? 'warn' : 'info'
    
    this[level]('api_response', {
      method,
      url,
      statusCode,
      duration,
      responseSize
    })
  }

  // Database operation logging
  logDatabaseOperation(operation, table, duration, rowCount = null, error = null) {
    const level = error ? 'error' : 'info'
    
    this[level]('database_operation', {
      operation,
      table,
      duration,
      rowCount,
      error: error?.message
    })
  }

  // External API call logging
  logExternalApiCall(service, endpoint, duration, statusCode, error = null) {
    const level = error || statusCode >= 400 ? 'warn' : 'info'
    
    this[level]('external_api_call', {
      service,
      endpoint,
      duration,
      statusCode,
      error: error?.message
    })
  }

  // Cache operation logging
  logCacheOperation(operation, key, hit = null, duration = null, error = null) {
    const level = error ? 'error' : 'info'
    
    this[level]('cache_operation', {
      operation,
      key,
      hit,
      duration,
      error: error?.message
    })
  }

  // Security event logging
  logSecurityEvent(event, details = {}) {
    this.warn('security_event', {
      event,
      details: {
        ...this.context,
        ...details
      }
    })
  }

  // Business event logging
  logBusinessEvent(event, data = {}) {
    this.info('business_event', {
      event,
      data: {
        ...this.context,
        ...data
      }
    })
  }

  // Get log statistics
  getLogStats() {
    return {
      bufferSize: this.logBuffer.length,
      maxBufferSize: this.maxBufferSize,
      currentLevel: this.currentLevel,
      enableStructuredLogging: this.enableStructuredLogging,
      enablePerformanceLogging: this.enablePerformanceLogging
    }
  }

  // Set log level
  setLogLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.currentLevel = level
      this.info('log_level_changed', { newLevel: level })
    } else {
      this.warn('invalid_log_level', { attemptedLevel: level, validLevels: Object.keys(this.logLevels) })
    }
  }

  // Enable/disable features
  enableStructuredLogging(enabled = true) {
    this.enableStructuredLogging = enabled
    this.info('structured_logging_toggled', { enabled })
  }

  enablePerformanceLogging(enabled = true) {
    this.enablePerformanceLogging = enabled
    this.info('performance_logging_toggled', { enabled })
  }
}

// Create enhanced logger instance
export const enhancedLogger = new EnhancedLogger()

// Export for use in other modules
export { EnhancedLogger }
