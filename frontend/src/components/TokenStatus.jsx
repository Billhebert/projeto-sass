import React, { useState, useEffect } from 'react'
import api from '../services/api'
import './TokenStatus.css'

/**
 * TokenStatus Component
 * Shows token expiration status and provides manual refresh option
 * 
 * Auto-refresh is now enabled for any account with a refreshToken,
 * since credentials can come from .env as fallback.
 */
function TokenStatus({ 
  accountId, 
  canAutoRefresh = false, 
  hasRefreshToken = false,
  tokenExpiresAt = null, 
  onRefreshSuccess = null,
  onConfigureOAuth = null 
}) {
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
        setSuccess('Token renovado com sucesso!')
        setTokenInfo(prev => ({
          ...prev,
          tokenExpiry: response.data.data.tokenExpiresAt,
          timeToExpiry: response.data.data.expiresIn,
          healthPercent: 100,
          isExpired: false,
          needsRefresh: false,
        }))
        
        if (onRefreshSuccess) {
          onRefreshSuccess()
        }
        
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      const errorData = err.response?.data
      let errorMsg = errorData?.message || 'Falha ao renovar token'
      
      // Add solution hint for specific error codes
      if (errorData?.code === 'INVALID_REFRESH_TOKEN') {
        errorMsg = 'Refresh token expirado. Reconecte sua conta via OAuth.'
      } else if (errorData?.code === 'TOKEN_REFRESH_FAILED') {
        errorMsg = `${errorMsg}. Reconecte sua conta.`
      }
      
      setError(errorMsg)
      console.error('Token refresh error:', err)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading && !tokenInfo) {
    return <div className="token-status token-status-loading">Carregando status do token...</div>
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
  let statusIcon = 'ok'
  let statusText = 'Token valido'

  if (isExpired) {
    statusClass = 'token-status-expired'
    statusIcon = 'error'
    statusText = 'Token expirado'
  } else if (isWarning) {
    statusClass = 'token-status-warning'
    statusIcon = 'warning'
    statusText = `Expirando em ${hoursLeft}h ${minutesLeft}m`
  } else if (isExpiringSoon) {
    statusClass = 'token-status-warning'
    statusIcon = 'clock'
    statusText = `Expirando em ${hoursLeft}h ${minutesLeft}m`
  } else if (hoursLeft > 0 || minutesLeft > 0) {
    statusText = `Valido por ${hoursLeft}h ${minutesLeft}m`
  }

  return (
    <div className={`token-status ${statusClass}`}>
      <div className="token-status-header">
        <span className={`token-status-icon token-status-icon-${statusIcon}`}>
          {statusIcon === 'ok' && 'OK'}
          {statusIcon === 'error' && '!'}
          {statusIcon === 'warning' && '!'}
          {statusIcon === 'clock' && 'T'}
        </span>
        <div className="token-status-info">
          <p className="token-status-text">{statusText}</p>
          {!isExpired && tokenInfo.healthPercent !== null && (
            <div className="token-health-bar">
              <div 
                className="token-health-fill" 
                style={{
                  width: `${Math.max(0, tokenInfo.healthPercent)}%`,
                  backgroundColor: tokenInfo.healthPercent > 30 ? '#4CAF50' : tokenInfo.healthPercent > 10 ? '#FF9800' : '#f44336'
                }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {/* Auto-refresh ativo */}
      {canAutoRefresh && (
        <div className="token-status-auto-refresh">
          <span className="token-badge token-badge-success">Auto-refresh ativo</span>
          <p className="token-status-hint">Token sera renovado automaticamente</p>
        </div>
      )}

      {/* Sem refresh token - token manual */}
      {!canAutoRefresh && !hasRefreshToken && (
        <div className="token-status-no-refresh">
          <span className="token-badge token-badge-danger">Token Manual</span>
          <p className="token-status-hint">
            Token foi fornecido manualmente sem Refresh Token. Quando expirar (em 6 horas),
            voce precisara inserir um novo token ou adicionar um Refresh Token.
          </p>
          {onConfigureOAuth && (
            <button
              className="btn btn-sm btn-warning token-configure-btn"
              onClick={onConfigureOAuth}
            >
              Adicionar Refresh Token
            </button>
          )}
        </div>
      )}

      {/* Botao de renovar para quem tem auto-refresh mas quer forcar */}
      {canAutoRefresh && (isExpiringSoon || isWarning) && (
        <div className="token-status-force-refresh">
          <button
            className="btn btn-sm btn-secondary token-refresh-btn"
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Renovando...' : 'Renovar Agora'}
          </button>
        </div>
      )}

      {error && (
        <div className="token-alert token-alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="token-alert token-alert-success">
          {success}
        </div>
      )}
    </div>
  )
}

export default TokenStatus
