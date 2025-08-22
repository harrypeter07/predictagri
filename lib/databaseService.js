import { createClient } from '@supabase/supabase-js'
import { Logger } from './logger.js'

class DatabaseService {
  constructor() {
    this.logger = new Logger({ service: 'DatabaseService' })
    this.client = null
    this.retryAttempts = 3
    this.retryDelay = 1000 // 1 second
    this.maxRetryDelay = 10000 // 10 seconds
    this.connectionPool = new Map()
    this.healthCheckInterval = 300000 // 5 minutes
    this.lastHealthCheck = 0
    
    this.initialize()
  }

  initialize() {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables')
      }

      // Create main client with connection pooling
      this.client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false, // Disable session persistence for serverless
          autoRefreshToken: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-Client-Info': 'predictagri-database-service'
          }
        }
      })

      // Create service role client for admin operations
      if (supabaseServiceKey) {
        this.serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        })
      }

      this.logger.info('database_initialized', { 
        hasServiceKey: !!supabaseServiceKey,
        url: supabaseUrl 
      })

      // Start health check
      this.startHealthCheck()

    } catch (error) {
      this.logger.error('database_initialization_failed', { error: error.message })
      throw error
    }
  }

  // Retry wrapper for database operations
  async withRetry(operation, operationName = 'database_operation') {
    let lastError
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await operation()
        this.logger.info(`${operationName}_success`, { attempt })
        return result
      } catch (error) {
        lastError = error
        this.logger.warn(`${operationName}_attempt_failed`, { 
          attempt, 
          error: error.message,
          retryable: this.isRetryableError(error)
        })

        if (attempt === this.retryAttempts || !this.isRetryableError(error)) {
          break
        }

        // Exponential backoff
        const delay = Math.min(this.retryDelay * Math.pow(2, attempt - 1), this.maxRetryDelay)
        await this.sleep(delay)
      }
    }

    this.logger.error(`${operationName}_failed`, { 
      attempts: this.retryAttempts, 
      error: lastError.message 
    })
    throw lastError
  }

  // Check if error is retryable
  isRetryableError(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'network error',
      'timeout',
      'connection',
      'temporary'
    ]

    const errorMessage = error.message?.toLowerCase() || ''
    return retryableErrors.some(retryable => errorMessage.includes(retryable))
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Health check for database connection
  async healthCheck() {
    try {
      const startTime = Date.now()
      
      const { data, error } = await this.client
        .from('regions')
        .select('count')
        .limit(1)
      
      const responseTime = Date.now() - startTime
      
      if (error) {
        this.logger.error('database_health_check_failed', { error: error.message })
        return { healthy: false, error: error.message, responseTime }
      }

      this.logger.info('database_health_check_success', { responseTime })
      return { healthy: true, responseTime }
    } catch (error) {
      this.logger.error('database_health_check_exception', { error: error.message })
      return { healthy: false, error: error.message }
    }
  }

  // Start periodic health checks
  startHealthCheck() {
    setInterval(async () => {
      const health = await this.healthCheck()
      this.lastHealthCheck = Date.now()
      
      if (!health.healthy) {
        this.logger.warn('database_health_degraded', { health })
      }
    }, this.healthCheckInterval)
  }

  // Get client with health check
  async getClient() {
    // Check if we need a health check
    if (Date.now() - this.lastHealthCheck > this.healthCheckInterval) {
      await this.healthCheck()
    }
    
    return this.client
  }

  // Get service client for admin operations
  getServiceClient() {
    if (!this.serviceClient) {
      throw new Error('Service role client not available')
    }
    return this.serviceClient
  }

  // Enhanced query methods with retry logic
  async query(table, options = {}) {
    return this.withRetry(async () => {
      const { select = '*', where = {}, orderBy = null, limit = null, offset = null } = options
      
      let query = this.client.from(table).select(select)
      
      // Apply where conditions
      Object.entries(where).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else {
          query = query.eq(key, value)
        }
      })
      
      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending !== false })
      }
      
      // Apply pagination
      if (limit) query = query.limit(limit)
      if (offset) query = query.range(offset, offset + (limit || 1000) - 1)
      
      const { data, error } = await query
      
      if (error) throw error
      return data
    }, `query_${table}`)
  }

  async insert(table, data) {
    return this.withRetry(async () => {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select()
      
      if (error) throw error
      return result
    }, `insert_${table}`)
  }

  async update(table, where, data) {
    return this.withRetry(async () => {
      let query = this.client.from(table).update(data)
      
      // Apply where conditions
      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
      
      const { data: result, error } = await query.select()
      
      if (error) throw error
      return result
    }, `update_${table}`)
  }

  async delete(table, where) {
    return this.withRetry(async () => {
      let query = this.client.from(table).delete()
      
      // Apply where conditions
      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
      
      const { data: result, error } = await query.select()
      
      if (error) throw error
      return result
    }, `delete_${table}`)
  }

  // Transaction support
  async transaction(operations) {
    return this.withRetry(async () => {
      const results = []
      
      for (const operation of operations) {
        const result = await operation(this.client)
        results.push(result)
      }
      
      return results
    }, 'transaction')
  }

  // Batch operations
  async batchInsert(table, dataArray, batchSize = 100) {
    const results = []
    
    for (let i = 0; i < dataArray.length; i += batchSize) {
      const batch = dataArray.slice(i, i + batchSize)
      const result = await this.insert(table, batch)
      results.push(...result)
    }
    
    return results
  }

  // Connection pool management
  getConnectionPool() {
    return {
      size: this.connectionPool.size,
      connections: Array.from(this.connectionPool.keys()),
      lastHealthCheck: this.lastHealthCheck
    }
  }

  // Cleanup connections
  async cleanup() {
    this.connectionPool.clear()
    this.logger.info('database_connections_cleaned')
  }
}

// Create singleton instance
export const databaseService = new DatabaseService()

// Export the client for backward compatibility
export const supabase = databaseService.client

// Export enhanced client
export const enhancedSupabase = databaseService
