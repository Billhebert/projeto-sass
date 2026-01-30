/**
 * useCache Hook
 * Provides caching mechanism with TTL and automatic invalidation
 */

import { useEffect, useRef, useCallback, useState } from 'react'

// Cache storage in memory + localStorage
const cacheStore = new Map()
const CACHE_PREFIX = 'PROJECT_SASS_CACHE_'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
const CACHE_VERSION = 1

/**
 * Get cache key with version
 */
const getCacheKey = (key) => `${CACHE_PREFIX}${key}_v${CACHE_VERSION}`

/**
 * Check if cache is still valid
 */
const isCacheValid = (timestamp, ttl) => {
  return Date.now() - timestamp < ttl
}

/**
 * Get from cache (memory first, then localStorage)
 */
export const getFromCache = (key, ttl = DEFAULT_TTL) => {
  const cacheKey = getCacheKey(key)
  
  // Check memory cache
  if (cacheStore.has(cacheKey)) {
    const cached = cacheStore.get(cacheKey)
    if (isCacheValid(cached.timestamp, ttl)) {
      return cached.data
    } else {
      cacheStore.delete(cacheKey)
    }
  }
  
  // Check localStorage
  try {
    const stored = localStorage.getItem(cacheKey)
    if (stored) {
      const cached = JSON.parse(stored)
      if (isCacheValid(cached.timestamp, ttl)) {
        // Restore to memory cache
        cacheStore.set(cacheKey, cached)
        return cached.data
      } else {
        localStorage.removeItem(cacheKey)
      }
    }
  } catch (e) {
    console.error('Cache read error:', e)
  }
  
  return null
}

/**
 * Save to cache (memory + localStorage)
 */
export const saveToCache = (key, data, ttl = DEFAULT_TTL) => {
  const cacheKey = getCacheKey(key)
  const cached = {
    data,
    timestamp: Date.now(),
    ttl
  }
  
  // Save to memory
  cacheStore.set(cacheKey, cached)
  
  // Save to localStorage
  try {
    localStorage.setItem(cacheKey, JSON.stringify(cached))
  } catch (e) {
    console.error('Cache write error:', e)
  }
}

/**
 * Invalidate cache
 */
export const invalidateCache = (key = null) => {
  const cacheKey = key ? getCacheKey(key) : null
  
  if (cacheKey) {
    // Invalidate specific key
    cacheStore.delete(cacheKey)
    try {
      localStorage.removeItem(cacheKey)
    } catch (e) {
      console.error('Cache invalidation error:', e)
    }
  } else {
    // Invalidate all cache
    cacheStore.clear()
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (e) {
      console.error('Cache clear error:', e)
    }
  }
}

/**
 * Hook to use caching with API calls
 */
export const useCache = (key, fetcher, ttl = DEFAULT_TTL, dependencies = []) => {
  const isMountedRef = useRef(true)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const fetchWithCache = useCallback(async () => {
    // Check cache first
    const cached = getFromCache(key, ttl)
    if (cached) {
      setData(cached)
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      const result = await fetcher()
      
      if (isMountedRef.current) {
        saveToCache(key, result, ttl)
        setData(result)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err)
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [key, fetcher, ttl])
  
  useEffect(() => {
    fetchWithCache()
    
    return () => {
      isMountedRef.current = false
    }
  }, dependencies)
  
  return { 
    data, 
    loading, 
    error, 
    refetch: fetchWithCache, 
    invalidate: () => invalidateCache(key) 
  }
}

export default useCache
