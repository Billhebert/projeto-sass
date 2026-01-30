/**
 * Cache Service
 * Manages API response caching with TTL and invalidation patterns
 */

const CACHE_PREFIX = 'PROJECT_SASS_API_CACHE_'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
const CACHE_VERSION = '1.0'

class CacheService {
  constructor() {
    this.memory = new Map()
    this.subscribers = new Map()
  }

  /**
   * Generate cache key
   */
  generateKey(endpoint, params = {}) {
    const paramStr = JSON.stringify(params)
    return `${CACHE_PREFIX}${endpoint}_${paramStr}_v${CACHE_VERSION}`
  }

  /**
   * Check if cached data is still valid
   */
  isValid(cached, ttl = DEFAULT_TTL) {
    if (!cached) return false
    return Date.now() - cached.timestamp < ttl
  }

  /**
   * Get from cache
   */
  get(endpoint, params = {}, ttl = DEFAULT_TTL) {
    const key = this.generateKey(endpoint, params)
    
    // Check memory cache
    if (this.memory.has(key)) {
      const cached = this.memory.get(key)
      if (this.isValid(cached, ttl)) {
        return cached.data
      } else {
        this.memory.delete(key)
      }
    }
    
    // Check localStorage
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const cached = JSON.parse(stored)
        if (this.isValid(cached, ttl)) {
          this.memory.set(key, cached)
          return cached.data
        } else {
          localStorage.removeItem(key)
        }
      }
    } catch (e) {
      console.error('Cache read error:', e)
    }
    
    return null
  }

  /**
   * Save to cache
   */
  set(endpoint, params = {}, data, ttl = DEFAULT_TTL) {
    const key = this.generateKey(endpoint, params)
    const cached = {
      data,
      timestamp: Date.now(),
      endpoint,
      params,
      ttl
    }
    
    // Save to memory
    this.memory.set(key, cached)
    
    // Save to localStorage
    try {
      localStorage.setItem(key, JSON.stringify(cached))
    } catch (e) {
      console.error('Cache write error:', e)
    }
    
    // Notify subscribers
    this.notifySubscribers(endpoint)
  }

  /**
   * Invalidate cache by endpoint pattern
   */
  invalidate(pattern = null) {
    if (!pattern) {
      // Clear all cache
      this.memory.clear()
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(key)
          }
        })
      } catch (e) {
        console.error('Cache clear error:', e)
      }
      return
    }

    // Clear by pattern
    for (const [key] of this.memory) {
      if (key.includes(pattern)) {
        this.memory.delete(key)
        try {
          localStorage.removeItem(key)
        } catch (e) {
          console.error('Cache invalidation error:', e)
        }
      }
    }
  }

  /**
   * Subscribe to cache changes
   */
  subscribe(endpoint, callback) {
    if (!this.subscribers.has(endpoint)) {
      this.subscribers.set(endpoint, [])
    }
    this.subscribers.get(endpoint).push(callback)
  }

  /**
   * Unsubscribe from cache changes
   */
  unsubscribe(endpoint, callback) {
    if (this.subscribers.has(endpoint)) {
      const callbacks = this.subscribers.get(endpoint)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * Notify subscribers of cache changes
   */
  notifySubscribers(endpoint) {
    if (this.subscribers.has(endpoint)) {
      const callbacks = this.subscribers.get(endpoint)
      callbacks.forEach(callback => {
        try {
          callback()
        } catch (e) {
          console.error('Subscriber error:', e)
        }
      })
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    let size = 0
    let count = 0
    
    for (const [key] of this.memory) {
      count++
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          size += stored.length
        }
      } catch (e) {
        // ignore
      }
    }
    
    return {
      memoryCount: this.memory.size,
      totalCount: count,
      sizeBytes: size,
      sizeMB: (size / 1024 / 1024).toFixed(2)
    }
  }

  /**
   * Clear all cache and reset
   */
  reset() {
    this.invalidate()
    this.subscribers.clear()
  }
}

export const cacheService = new CacheService()
export default cacheService
