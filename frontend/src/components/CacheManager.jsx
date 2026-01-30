import React, { useState, useEffect } from 'react'
import { cacheService } from '../services/cache'
import './CacheManager.css'

function CacheManager() {
  const [stats, setStats] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const updateStats = () => {
      setStats(cacheService.getStats())
    }
    updateStats()
    
    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000)
    return () => clearInterval(interval)
  }, [])

  if (!show) {
    return (
      <div className="cache-manager-btn">
        <button 
          className="cache-btn"
          onClick={() => setShow(true)}
          title={`Cache: ${stats?.memoryCount || 0} items`}
        >
          💾
        </button>
      </div>
    )
  }

  return (
    <div className="cache-manager-panel">
      <div className="cache-panel-header">
        <h3>Cache Manager</h3>
        <button className="close-btn" onClick={() => setShow(false)}>×</button>
      </div>
      
      <div className="cache-stats">
        <div className="stat-item">
          <span className="stat-label">Cache Entries:</span>
          <span className="stat-value">{stats?.memoryCount || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Size:</span>
          <span className="stat-value">{stats?.sizeMB || '0'} MB</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">TTL:</span>
          <span className="stat-value">5 min</span>
        </div>
      </div>

      <div className="cache-actions">
        <button 
          className="btn btn-clear"
          onClick={() => {
            cacheService.reset()
            setStats(cacheService.getStats())
          }}
        >
          Clear All Cache
        </button>
      </div>

      <div className="cache-info">
        <p>📊 Cache is enabled for GET requests</p>
        <p>🔄 Cache is automatically invalidated on POST/PUT/DELETE</p>
        <p>⏱️ Cache TTL: 5 minutes</p>
      </div>
    </div>
  )
}

export default CacheManager
