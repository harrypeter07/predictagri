import { enhancedLogger } from './enhancedLogger.js'

class CacheService {
  constructor() {
    this.logger = enhancedLogger.with({ service: 'CacheService' })
    this.cache = new Map()
    this.maxSize = 1000 // Maximum number of cache entries
    this.maxMemoryUsage = 100 * 1024 * 1024 // 100MB max memory usage
    this.defaultTTL = 300000 // 5 minutes default TTL
    this.cleanupInterval = 60000 // 1 minute cleanup interval
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    }
    
    this.startCleanupTimer()
    this.logger.info('cache_service_initialized', {
      maxSize: this.maxSize,
      maxMemoryUsage: this.maxMemoryUsage / 1024 / 1024 + 'MB',
      defaultTTL: this.defaultTTL / 1000 + 's'
    })
  }

  // Set cache entry with TTL
  set(key, value, ttl = this.defaultTTL) {
    try {
      // Check memory usage before setting
      if (this.shouldEvict()) {
        this.evictOldest()
      }

      const expiry = Date.now() + ttl
      const entry = {
        value,
        expiry,
        size: this.calculateSize(value),
        accessed: Date.now()
      }

      this.cache.set(key, entry)
      this.stats.sets++

      this.logger.info('cache_set', { key, ttl, size: entry.size })
      return true
    } catch (error) {
      this.logger.error('cache_set_failed', { key, error: error.message })
      return false
    }
  }

  // Get cache entry
  get(key) {
    try {
      const entry = this.cache.get(key)
      
      if (!entry) {
        this.stats.misses++
        this.logger.info('cache_miss', { key })
        return null
      }

      // Check if expired
      if (Date.now() > entry.expiry) {
        this.cache.delete(key)
        this.stats.misses++
        this.logger.info('cache_expired', { key })
        return null
      }

      // Update access time
      entry.accessed = Date.now()
      this.stats.hits++

      this.logger.info('cache_hit', { key })
      return entry.value
    } catch (error) {
      this.logger.error('cache_get_failed', { key, error: error.message })
      return null
    }
  }

  // Get cache entry with fallback function
  async getOrSet(key, fallbackFn, ttl = this.defaultTTL) {
    let value = this.get(key)
    
    if (value !== null) {
      return value
    }

    try {
      value = await fallbackFn()
      this.set(key, value, ttl)
      return value
    } catch (error) {
      this.logger.error('cache_fallback_failed', { key, error: error.message })
      throw error
    }
  }

  // Delete cache entry
  delete(key) {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.stats.deletes++
      this.logger.info('cache_delete', { key })
    }
    return deleted
  }

  // Clear all cache
  clear() {
    const size = this.cache.size
    this.cache.clear()
    this.logger.info('cache_cleared', { entriesCleared: size })
    return size
  }

  // Check if key exists and is not expired
  has(key) {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  // Get cache statistics
  getStats() {
    const currentSize = this.cache.size
    const memoryUsage = this.getCurrentMemoryUsage()
    const hitRate = this.stats.hits + this.stats.misses > 0 ? 
      (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) : 0

    return {
      ...this.stats,
      currentSize,
      maxSize: this.maxSize,
      memoryUsage: memoryUsage / 1024 / 1024 + 'MB',
      maxMemoryUsage: this.maxMemoryUsage / 1024 / 1024 + 'MB',
      hitRate: hitRate + '%',
      efficiency: this.calculateEfficiency()
    }
  }

  // Calculate cache efficiency
  calculateEfficiency() {
    const totalRequests = this.stats.hits + this.stats.misses
    if (totalRequests === 0) return 0
    
    const hitRate = this.stats.hits / totalRequests
    const memoryEfficiency = 1 - (this.getCurrentMemoryUsage() / this.maxMemoryUsage)
    
    return (hitRate * 0.7 + memoryEfficiency * 0.3) * 100
  }

  // Get current memory usage
  getCurrentMemoryUsage() {
    let totalSize = 0
    for (const entry of this.cache.values()) {
      totalSize += entry.size
    }
    return totalSize
  }

  // Calculate size of a value
  calculateSize(value) {
    try {
      const serialized = JSON.stringify(value)
      return Buffer.byteLength(serialized, 'utf8')
    } catch (error) {
      // Fallback size estimation
      return 1024 // 1KB default
    }
  }

  // Check if we should evict entries
  shouldEvict() {
    return this.cache.size >= this.maxSize || 
           this.getCurrentMemoryUsage() >= this.maxMemoryUsage
  }

  // Evict oldest entries
  evictOldest(count = 10) {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].accessed - b[1].accessed)
      .slice(0, count)

    for (const [key] of entries) {
      this.cache.delete(key)
      this.stats.evictions++
    }

    this.logger.info('cache_eviction', { 
      evicted: entries.length, 
      remaining: this.cache.size 
    })
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      this.logger.info('cache_cleanup', { cleaned, remaining: this.cache.size })
    }
  }

  // Start cleanup timer
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup()
    }, this.cleanupInterval)
  }

  // Cache middleware for API responses
  cacheMiddleware(ttl = this.defaultTTL) {
    return (handler) => {
      return async (request, context) => {
        const cacheKey = this.generateCacheKey(request)
        
        // Try to get from cache first
        const cachedResponse = this.get(cacheKey)
        if (cachedResponse) {
          this.logger.info('cache_middleware_hit', { cacheKey })
          return new Response(JSON.stringify(cachedResponse), {
            headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
          })
        }

        // Execute handler and cache response
        const response = await handler(request, context)
        const responseData = await response.clone().json()
        
        this.set(cacheKey, responseData, ttl)
        this.logger.info('cache_middleware_miss', { cacheKey })

        // Add cache headers to response
        const newResponse = new Response(JSON.stringify(responseData), {
          headers: { 
            'Content-Type': 'application/json', 
            'X-Cache': 'MISS',
            'Cache-Control': `public, max-age=${ttl / 1000}`
          }
        })

        return newResponse
      }
    }
  }

  // Generate cache key from request
  generateCacheKey(request) {
    const url = new URL(request.url)
    const method = request.method
    const params = url.searchParams.toString()
    
    return `${method}:${url.pathname}:${params}`
  }

  // Preload cache with common data
  async preloadCache() {
    const preloadData = [
      { key: 'regions', ttl: 3600000 }, // 1 hour
      { key: 'crops', ttl: 3600000 }, // 1 hour
      { key: 'weather_stations', ttl: 1800000 } // 30 minutes
    ]

    for (const item of preloadData) {
      try {
        // You can implement specific preload logic here
        this.logger.info('cache_preload', { key: item.key })
      } catch (error) {
        this.logger.error('cache_preload_failed', { key: item.key, error: error.message })
      }
    }
  }

  // Cache warming for frequently accessed data
  async warmCache() {
    const warmupKeys = [
      'weather:nagpur',
      'satellite:ndvi:latest',
      'predictions:recent'
    ]

    for (const key of warmupKeys) {
      try {
        // Implement specific warmup logic
        this.logger.info('cache_warmup', { key })
      } catch (error) {
        this.logger.error('cache_warmup_failed', { key, error: error.message })
      }
    }
  }

  // Memory optimization
  optimizeMemory() {
    const currentUsage = this.getCurrentMemoryUsage()
    const usagePercent = (currentUsage / this.maxMemoryUsage) * 100

    if (usagePercent > 80) {
      this.logger.warn('cache_memory_high', { 
        usagePercent: usagePercent.toFixed(2) + '%',
        currentUsage: currentUsage / 1024 / 1024 + 'MB'
      })
      
      // Evict more aggressively
      this.evictOldest(Math.ceil(this.cache.size * 0.2)) // Evict 20% of entries
    }
  }

  // Get cache keys matching pattern
  getKeys(pattern) {
    const regex = new RegExp(pattern)
    return Array.from(this.cache.keys()).filter(key => regex.test(key))
  }

  // Delete cache entries matching pattern
  deletePattern(pattern) {
    const keys = this.getKeys(pattern)
    let deleted = 0
    
    for (const key of keys) {
      if (this.delete(key)) {
        deleted++
      }
    }

    this.logger.info('cache_delete_pattern', { pattern, deleted })
    return deleted
  }

  // Export cache data (for debugging)
  exportCache() {
    const data = {}
    
    for (const [key, entry] of this.cache.entries()) {
      data[key] = {
        value: entry.value,
        expiry: entry.expiry,
        size: entry.size,
        accessed: entry.accessed
      }
    }

    return data
  }

  // Import cache data
  importCache(data) {
    let imported = 0
    
    for (const [key, entry] of Object.entries(data)) {
      if (Date.now() < entry.expiry) {
        this.cache.set(key, entry)
        imported++
      }
    }

    this.logger.info('cache_import', { imported })
    return imported
  }
}

// Create singleton instance
export const cacheService = new CacheService()

// Export for use in other modules
export { CacheService }
