import React, { useState, useEffect } from 'react'
import api from '../services/api'
import './TokenStatus.css'

/**
 * TokenStatus Component
 * Shows token expiration status and provides manual refresh option
 */
function TokenStatus({ accountId, canAutoRefresh = false, tokenExpiresAt = null, onRefreshSuccess = null }) {
  const [tokenInfo, setTokenInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch token info on mount and periodically
  useEffect(() => {
    fetchTokenInfo()
    
    // Refresh token info every 5 minutes
    const interval = setInterval(fetchTokenInfo, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [accountId])

  const fetchTokenInfo = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/ml-accounts/${accountId}/token-info`)
      
      if (response.data.success) {
        setTokenInfo(response.data.data.tokenInfo)
        setError('')
      }
    } catch (err) {
      console.error('Failed to fetch token info:', err)
      setError('Failed to load token status')
    } finally {
      setLoading(false)
    }
  }

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true)
      setError('')
      setSuccess('')
      
      const response = await api.put(`/ml-accounts/${accountId}/refresh-token`)
      
      if (response.data.success) {
        setSuccess('Token refreshed successfully!')
        setTokenInfo(prev => ({
          ...prev,
          tokenExpiry: response.data.data.tokenExpiresAt,
          timeToExpiry: response.data.data.expiresIn,
          healthPercent: 100,
        }))
        
        if (onRefreshSuccess) {
          onRefreshSuccess()
        }
        
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to refresh token'
      setError(errorMsg)
      console.error('Token refresh error:', err)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return <div className="token-status token-status-loading">Loading token status...</div>
  }

  if (!tokenInfo) {
    return null
  }

  const hoursLeft = Math.floor(tokenInfo.timeToExpiry / 3600)
  const minutesLeft = Math.floor((tokenInfo.timeToExpiry % 3600) / 60)
  const isExpired = tokenInfo.isExpired
  const isExpiringSoon = tokenInfo.healthPercent < 30 && !isExpired
  const isWarning = tokenInfo.healthPercent < 10 && !isExpired

  let statusClass = 'token-status-ok'
  let statusIcon = '✓'
  let statusText = 'Token válido'

  if (isExpired) {
    statusClass = 'token-status-expired'
    statusIcon = '✗'
    statusText = 'Token expirado'
  } else if (isWarning) {
    statusClass = 'token-status-warning'
    statusIcon = '⚠'
    statusText = `Expirando em ${hoursLeft}h ${minutesLeft}m`
  } else if (isExpiringSoon) {
    statusClass = 'token-status-warning'
    statusIcon = '⏰'
    statusText = `Expirando em ${hoursLeft}h ${minutesLeft}m`
  }

  return (
    <div className={`token-status ${statusClass}`}>
      <div className="token-status-header">
        <span className="token-status-icon">{statusIcon}</span>
        <div className="token-status-info">
          <p className="token-status-text">{statusText}</p>
          {!isExpired && tokenInfo.healthPercent !== null && (
            <div className="token-health-bar">
              <div 
                className="token-health-fill" 
                style={{
                  width: `${Math.max(0, tokenInfo.healthPercent)}%`,
                  backgroundColor: tokenInfo.healthPercent > 30 ? '#4CAF50' : '#FF9800'
                }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {canAutoRefresh && (
        <div className="token-status-auto-refresh">
          <span className="badge badge-success">🔄 Auto-refresh ativo</span>
          <p className="text-small text-muted">Token será renovado automaticamente</p>
        </div>
      )}

      {!canAutoRefresh && (
        <div className="token-status-manual">
          <p className="text-small text-muted">Sem renovação automática</p>
          <button
            className="btn btn-sm btn-primary token-refresh-btn"
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Renovando...' : '🔄 Renovar Agora'}
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}
    </div>
  )
}

export default TokenStatus
