import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { moderationsService } from '../services/modules'
import './Moderations.css'

function Moderations() {
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // Data states
  const [moderations, setModerations] = useState(null)
  const [reputation, setReputation] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [itemHealth, setItemHealth] = useState(null)
  const [itemActions, setItemActions] = useState(null)
  
  // UI states
  const [showModal, setShowModal] = useState(false)
  const [fixing, setFixing] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadData()
    }
  }, [selectedAccount])

  const loadAccounts = async () => {
    try {
      const response = await api.get('/ml-accounts')
      const accountsList = response.data.data?.accounts || response.data.accounts || []
      setAccounts(accountsList)
      if (accountsList.length > 0) {
        setSelectedAccount(accountsList[0].id)
      }
    } catch (err) {
      setError('Erro ao carregar contas')
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [moderationsRes, reputationRes] = await Promise.all([
        moderationsService.getAll(selectedAccount),
        moderationsService.getSellerReputation(selectedAccount),
      ])
      
      setModerations(moderationsRes.data.data)
      setReputation(reputationRes.data.data)
    } catch (err) {
      setError('Erro ao carregar moderacoes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const viewItemDetails = async (item) => {
    setSelectedItem(item)
    setShowModal(true)
    
    try {
      const [healthRes, actionsRes] = await Promise.all([
        moderationsService.getHealth(selectedAccount, item.item.id),
        moderationsService.getActions(selectedAccount, item.item.id),
      ])
      
      setItemHealth(healthRes.data.data)
      setItemActions(actionsRes.data.data)
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err)
    }
  }

  const handleFix = async (fixes) => {
    if (!selectedItem) return
    
    setFixing(true)
    try {
      await moderationsService.fixIssues(selectedAccount, selectedItem.item.id, fixes)
      setSuccess('Correcoes aplicadas com sucesso!')
      setShowModal(false)
      await loadData()
    } catch (err) {
      setError('Erro ao aplicar correcoes')
    } finally {
      setFixing(false)
    }
  }

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'success'
    if (score >= 50) return 'warning'
    return 'danger'
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': { label: 'Ativo', class: 'success' },
      'paused': { label: 'Pausado', class: 'warning' },
      'inactive': { label: 'Inativo', class: 'danger' },
      'under_review': { label: 'Em Revisao', class: 'warning' },
      'closed': { label: 'Fechado', class: 'secondary' },
    }
    return statusMap[status] || { label: status, class: 'secondary' }
  }

  const getReputationLevel = (levelId) => {
    const levels = {
      '1_red': { label: 'Vermelho', color: '#ef4444' },
      '2_orange': { label: 'Laranja', color: '#f97316' },
      '3_yellow': { label: 'Amarelo', color: '#eab308' },
      '4_light_green': { label: 'Verde Claro', color: '#84cc16' },
      '5_green': { label: 'Verde', color: '#22c55e' },
    }
    return levels[levelId] || { label: levelId, color: '#6b7280' }
  }

  return (
    <div className="moderations-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">health_and_safety</span>
            Saude dos Anuncios
          </h1>
          <p>Monitore a qualidade e moderacoes dos seus anuncios</p>
        </div>
        <div className="header-actions">
          <select
            className="account-select"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.nickname || acc.mlUserId}
              </option>
            ))}
          </select>
          <button 
            className="btn btn-primary"
            onClick={loadData}
            disabled={loading}
          >
            <span className="material-icons">refresh</span>
            Atualizar
          </button>
        </div>
      </div>

      {/* Reputation Card */}
      {reputation && (
        <div className="reputation-card">
          <div className="reputation-header">
            <h3>
              <span className="material-icons">workspace_premium</span>
              Reputacao do Vendedor
            </h3>
            {reputation.reputation?.power_seller_status && (
              <span className="power-seller-badge">
                <span className="material-icons">verified</span>
                {reputation.reputation.power_seller_status}
              </span>
            )}
          </div>
          <div className="reputation-content">
            <div className="reputation-level">
              <div 
                className="level-indicator"
                style={{ backgroundColor: getReputationLevel(reputation.reputation?.level_id).color }}
              >
                <span className="material-icons">star</span>
              </div>
              <div className="level-info">
                <span className="level-name">{getReputationLevel(reputation.reputation?.level_id).label}</span>
                <span className="seller-nickname">{reputation.nickname}</span>
              </div>
            </div>
            {reputation.reputation?.transactions && (
              <div className="reputation-stats">
                <div className="rep-stat">
                  <span className="rep-value">{reputation.reputation.transactions.completed || 0}</span>
                  <span className="rep-label">Vendas</span>
                </div>
                <div className="rep-stat">
                  <span className="rep-value">{reputation.reputation.transactions.canceled || 0}</span>
                  <span className="rep-label">Canceladas</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {moderations && moderations.summary && (
        <div className="summary-cards">
          <div className="summary-card warning">
            <div className="summary-icon">
              <span className="material-icons">pending_actions</span>
            </div>
            <div className="summary-info">
              <span className="summary-value">{moderations.summary.under_review}</span>
              <span className="summary-label">Em Revisao</span>
            </div>
          </div>
          <div className="summary-card danger">
            <div className="summary-icon">
              <span className="material-icons">block</span>
            </div>
            <div className="summary-info">
              <span className="summary-value">{moderations.summary.inactive}</span>
              <span className="summary-label">Inativos</span>
            </div>
          </div>
          <div className="summary-card info">
            <div className="summary-icon">
              <span className="material-icons">pause_circle</span>
            </div>
            <div className="summary-info">
              <span className="summary-value">{moderations.summary.paused}</span>
              <span className="summary-label">Pausados</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">
              <span className="material-icons">inventory_2</span>
            </div>
            <div className="summary-info">
              <span className="summary-value">{moderations.summary.total}</span>
              <span className="summary-label">Total c/ Problemas</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="material-icons">check_circle</span>
          {success}
          <button onClick={() => setSuccess(null)}>&times;</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando moderacoes...</p>
        </div>
      ) : (
        <div className="items-section">
          <div className="section-header">
            <h3>Itens com Problemas</h3>
            <span className="count">{moderations?.items?.length || 0} itens</span>
          </div>

          {(!moderations?.items || moderations.items.length === 0) ? (
            <div className="empty-state success">
              <span className="material-icons">check_circle</span>
              <h3>Todos os anuncios estao saudaveis!</h3>
              <p>Nenhum item com problemas de moderacao no momento</p>
            </div>
          ) : (
            <div className="items-grid">
              {moderations.items.map((item, idx) => (
                <div key={idx} className="item-card">
                  <div className="item-header">
                    <div className="item-image">
                      {item.item?.thumbnail ? (
                        <img src={item.item.thumbnail} alt={item.item.title} />
                      ) : (
                        <span className="material-icons">image</span>
                      )}
                    </div>
                    <div className="item-info">
                      <h4 className="item-title">{item.item?.title?.substring(0, 60)}...</h4>
                      <span className="item-id">{item.item?.id}</span>
                    </div>
                  </div>

                  <div className="item-health">
                    <div className="health-bar-container">
                      <div className="health-label">
                        <span>Saude</span>
                        <span className={`health-value ${getHealthScoreColor(item.health?.health_score || 100)}`}>
                          {item.health?.health_score || 100}%
                        </span>
                      </div>
                      <div className="health-bar">
                        <div 
                          className={`health-fill ${getHealthScoreColor(item.health?.health_score || 100)}`}
                          style={{ width: `${item.health?.health_score || 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="item-status">
                    <span className={`status-badge ${getStatusBadge(item.item?.status).class}`}>
                      {getStatusBadge(item.item?.status).label}
                    </span>
                    {item.health?.warnings?.length > 0 && (
                      <span className="warning-count">
                        <span className="material-icons">warning</span>
                        {item.health.warnings.length}
                      </span>
                    )}
                    {item.health?.errors?.length > 0 && (
                      <span className="error-count">
                        <span className="material-icons">error</span>
                        {item.health.errors.length}
                      </span>
                    )}
                  </div>

                  <div className="item-actions">
                    <button 
                      className="btn btn-outline"
                      onClick={() => viewItemDetails(item)}
                    >
                      <span className="material-icons">visibility</span>
                      Ver Detalhes
                    </button>
                    <a 
                      href={item.item?.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-icon"
                    >
                      <span className="material-icons">open_in_new</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Item Details Modal */}
      {showModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes do Item</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="item-detail-header">
                <div className="item-image-large">
                  {selectedItem.item?.thumbnail ? (
                    <img src={selectedItem.item.thumbnail} alt={selectedItem.item.title} />
                  ) : (
                    <span className="material-icons">image</span>
                  )}
                </div>
                <div className="item-detail-info">
                  <h3>{selectedItem.item?.title}</h3>
                  <p className="item-id">{selectedItem.item?.id}</p>
                  <span className={`status-badge ${getStatusBadge(selectedItem.item?.status).class}`}>
                    {getStatusBadge(selectedItem.item?.status).label}
                  </span>
                </div>
              </div>

              {itemHealth && (
                <div className="health-details">
                  <h4>
                    <span className="material-icons">health_and_safety</span>
                    Pontuacao de Saude: 
                    <span className={`score ${getHealthScoreColor(itemHealth.health_score)}`}>
                      {itemHealth.health_score}%
                    </span>
                  </h4>

                  {itemHealth.issues && itemHealth.issues.length > 0 && (
                    <div className="issues-list">
                      <h5>Problemas Encontrados</h5>
                      {itemHealth.issues.map((issue, idx) => (
                        <div key={idx} className={`issue-item ${issue.type}`}>
                          <span className="material-icons">
                            {issue.type === 'error' ? 'error' : issue.type === 'warning' ? 'warning' : 'info'}
                          </span>
                          <div className="issue-content">
                            <span className="issue-message">{issue.message}</span>
                            {issue.recommendation && (
                              <span className="issue-recommendation">{issue.recommendation}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {itemActions && itemActions.actions && itemActions.actions.length > 0 && (
                <div className="actions-section">
                  <h4>
                    <span className="material-icons">build</span>
                    Acoes Recomendadas
                  </h4>
                  <div className="actions-list">
                    {itemActions.actions.map((action, idx) => (
                      <div key={idx} className={`action-item priority-${action.priority}`}>
                        <span className={`priority-badge ${action.priority}`}>
                          {action.priority}
                        </span>
                        <span className="action-message">{action.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <a 
                href={selectedItem.item?.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <span className="material-icons">open_in_new</span>
                Abrir no ML
              </a>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  // Try to activate if item is paused/inactive
                  handleFix([{ type: 'activate' }])
                }}
                disabled={fixing || selectedItem.item?.status === 'active'}
              >
                <span className="material-icons">play_arrow</span>
                {fixing ? 'Processando...' : 'Tentar Ativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Moderations
