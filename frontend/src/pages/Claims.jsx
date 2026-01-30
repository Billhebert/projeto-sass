import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './Claims.css'

function Claims() {
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('open')
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadClaims()
    }
  }, [selectedAccount, filter])

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

  const loadClaims = async () => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = filter === 'open'
        ? `/claims/${selectedAccount}/open`
        : `/claims/${selectedAccount}`
      const response = await api.get(endpoint)
      setClaims(response.data.claims || [])
    } catch (err) {
      setError('Erro ao carregar reclamacoes')
      setClaims([])
    } finally {
      setLoading(false)
    }
  }

  const syncClaims = async () => {
    setSyncing(true)
    try {
      await api.post(`/claims/${selectedAccount}/sync`)
      await loadClaims()
    } catch (err) {
      setError('Erro ao sincronizar reclamacoes')
    } finally {
      setSyncing(false)
    }
  }

  const viewClaimDetails = async (claimId) => {
    try {
      const response = await api.get(`/claims/${selectedAccount}/${claimId}`)
      setSelectedClaim(response.data.claim)
      setShowModal(true)
    } catch (err) {
      setError('Erro ao carregar detalhes')
    }
  }

  const sendClaimMessage = async () => {
    if (!newMessage.trim() || !selectedClaim) return

    setSending(true)
    try {
      await api.post(`/claims/${selectedAccount}/${selectedClaim.mlClaimId}/message`, {
        text: newMessage
      })
      setNewMessage('')
      await viewClaimDetails(selectedClaim.mlClaimId)
    } catch (err) {
      setError('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'opened': 'badge-warning',
      'closed': 'badge-secondary',
      'claim_closed': 'badge-secondary',
      'dispute': 'badge-danger',
      'mediation': 'badge-info'
    }
    return statusMap[status] || 'badge-secondary'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'opened': 'Aberta',
      'closed': 'Fechada',
      'claim_closed': 'Encerrada',
      'dispute': 'Disputa',
      'mediation': 'Mediacao'
    }
    return labels[status] || status
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('pt-BR')
  }

  return (
    <div className="claims-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">report_problem</span>
            Reclamacoes
          </h1>
          <p>Gerencie reclamacoes e mediacoes</p>
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
            onClick={syncClaims}
            disabled={syncing || !selectedAccount}
          >
            <span className="material-icons">sync</span>
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'open' ? 'active' : ''}`}
            onClick={() => setFilter('open')}
          >
            <span className="material-icons">priority_high</span>
            Abertas
          </button>
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <span className="material-icons">list</span>
            Todas
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      <div className="claims-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando reclamacoes...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">verified</span>
            <h3>Nenhuma reclamacao encontrada</h3>
            <p>
              {filter === 'open'
                ? 'Voce nao tem reclamacoes abertas!'
                : 'Suas reclamacoes aparecerao aqui'
              }
            </p>
          </div>
        ) : (
          claims.map(claim => (
            <div key={claim._id || claim.mlClaimId} className="claim-card">
              <div className="claim-header">
                <div className="claim-id">
                  <span className="material-icons">report</span>
                  #{claim.mlClaimId}
                </div>
                <span className={`badge ${getStatusBadgeClass(claim.status)}`}>
                  {getStatusLabel(claim.status)}
                </span>
              </div>

              <div className="claim-body">
                <div className="claim-reason">
                  <h4>{claim.reason || 'Reclamacao'}</h4>
                  {claim.resourceId && (
                    <span className="claim-resource">Pedido: #{claim.resourceId}</span>
                  )}
                </div>

                <div className="claim-info">
                  <div className="info-item">
                    <span className="material-icons">person</span>
                    <span>{claim.buyer?.nickname || 'Comprador'}</span>
                  </div>
                  <div className="info-item">
                    <span className="material-icons">schedule</span>
                    <span>{formatDate(claim.dateCreated)}</span>
                  </div>
                  {claim.type && (
                    <div className="info-item">
                      <span className="material-icons">category</span>
                      <span>{claim.type}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="claim-actions">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => viewClaimDetails(claim.mlClaimId)}
                >
                  <span className="material-icons">visibility</span>
                  Ver Detalhes
                </button>
                <a
                  href={`https://www.mercadolivre.com.br/vendas/reclamacoes/${claim.mlClaimId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-secondary"
                >
                  <span className="material-icons">open_in_new</span>
                  Ver no ML
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && selectedClaim && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content claim-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reclamacao #{selectedClaim.mlClaimId}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="claim-detail-section">
                <h3>Informacoes</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Status</label>
                    <span className={`badge ${getStatusBadgeClass(selectedClaim.status)}`}>
                      {getStatusLabel(selectedClaim.status)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Motivo</label>
                    <span>{selectedClaim.reason || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Data</label>
                    <span>{formatDate(selectedClaim.dateCreated)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Comprador</label>
                    <span>{selectedClaim.buyer?.nickname || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {selectedClaim.messages && selectedClaim.messages.length > 0 && (
                <div className="claim-detail-section">
                  <h3>Historico de Mensagens</h3>
                  <div className="claim-messages">
                    {selectedClaim.messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`claim-message ${msg.senderRole === 'seller' ? 'sent' : 'received'}`}
                      >
                        <div className="message-header">
                          <span className="sender">{msg.senderRole === 'seller' ? 'Voce' : 'Comprador'}</span>
                          <span className="date">{formatDate(msg.dateCreated)}</span>
                        </div>
                        <p>{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedClaim.status !== 'closed' && selectedClaim.status !== 'claim_closed' && (
                <div className="claim-detail-section">
                  <h3>Responder</h3>
                  <div className="message-form">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Digite sua resposta..."
                      rows={3}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={sendClaimMessage}
                      disabled={sending || !newMessage.trim()}
                    >
                      {sending ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Claims
