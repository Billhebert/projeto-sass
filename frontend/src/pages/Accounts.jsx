import { useState, useEffect } from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import TokenStatus from '../components/TokenStatus'
import './Pages.css'

function Accounts() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showMLLoginModal, setShowMLLoginModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [mlLoginLoading, setMLLoginLoading] = useState(false)
  const [formData, setFormData] = useState({
    accessToken: '',
    accountName: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/ml-accounts')
      // Handle the API response structure: { success, data: { accounts: [], total } }
      const accountsList = response.data.data?.accounts || response.data.data || response.data || []
      setAccounts(Array.isArray(accountsList) ? accountsList : [])
      setError('')
    } catch (err) {
      setError('Erro ao carregar contas')
      setAccounts([])
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (account = null) => {
    if (account) {
      setEditingId(account._id)
      setFormData({
        accessToken: '',
        accountName: account.accountName || account.nickname,
      })
    } else {
      setEditingId(null)
      setFormData({
        accessToken: '',
        accountName: '',
      })
    }
    setShowModal(true)
    setError('')
    setSuccess('')
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData({
      accessToken: '',
      accountName: '',
    })
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.accessToken) {
      setError('Token de acesso é obrigatório')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      if (editingId) {
        // Update existing account (nome apenas)
        await api.put(`/ml-accounts/${editingId}`, {
          accountName: formData.accountName,
        })
        setSuccess('Conta atualizada com sucesso!')
      } else {
        // Create new account com access token
        await api.post('/ml-accounts', {
          accessToken: formData.accessToken,
          accountName: formData.accountName || '',
        })
        setSuccess('Conta criada com sucesso!')
      }

      await fetchAccounts()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar conta')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (accountId) => {
    if (!window.confirm('Tem certeza que deseja deletar esta conta? Esta ação é irreversível.')) {
      return
    }

    try {
      setDeletingId(accountId)
      setError('')
      await api.delete(`/ml-accounts/${accountId}`)
      setSuccess('Conta deletada com sucesso!')
      await fetchAccounts()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao deletar conta')
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleMLLogin = async () => {
    try {
      setMLLoginLoading(true)
      setError('')
      
      const response = await api.get('/auth/ml-login-url')
      const { authUrl } = response.data.data
      
      // Redirect to Mercado Livre
      window.location.href = authUrl
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao conectar com Mercado Livre')
      console.error(err)
      setMLLoginLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Contas Mercado Livre</h1>
        <p>Gerencie suas contas conectadas</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Contas Ativas</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-primary"
              onClick={handleMLLogin}
              disabled={mlLoginLoading}
            >
              {mlLoginLoading ? 'Conectando...' : '🏪 Mercado Livre'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => openModal()}
            >
              + Adicionar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Carregando contas...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma conta conectada</p>
            <div className="empty-state-buttons" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary"
                onClick={handleMLLogin}
                disabled={mlLoginLoading}
              >
                {mlLoginLoading ? 'Conectando...' : '🏪 Conectar com Mercado Livre'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => openModal()}
              >
                ➕ Adicionar Manualmente
              </button>
            </div>
          </div>
        ) : (
          <div className="accounts-list">
            {accounts.map((account) => (
              <div key={account._id} className="account-item">
                <div className="account-header">
                  <div className="account-info">
                    <h3>{account.nickname}</h3>
                    <p className="text-muted">{account.email}</p>
                  </div>
                  <span className={`status-badge status-${account.status}`}>
                    {account.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                
                <div className="account-stats">
                  <div className="stat">
                    <span className="stat-label">Produtos:</span>
                    <span className="stat-value">{account.cachedData?.products || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Pedidos:</span>
                    <span className="stat-value">{account.cachedData?.orders || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Problemas:</span>
                    <span className="stat-value">{account.cachedData?.issues || 0}</span>
                  </div>
                </div>

                {/* Token Status */}
                <TokenStatus 
                  accountId={account.id}
                  canAutoRefresh={account.canAutoRefresh}
                  tokenExpiresAt={account.tokenExpiresAt}
                  onRefreshSuccess={() => fetchAccounts()}
                />

                <div className="account-actions">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/accounts/${account._id}/products`)}
                  >
                    📦 Produtos
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => openModal(account)}
                  >
                    Editar
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(account._id)}
                    disabled={deletingId === account._id}
                  >
                    {deletingId === account._id ? 'Deletando...' : 'Deletar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Conta' : 'Conectar Conta Mercado Livre'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="accountName">Nome da Conta (opcional)</label>
                <input
                  type="text"
                  id="accountName"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleFormChange}
                  placeholder="Ex: Loja Principal"
                />
              </div>

              {!editingId && (
                <>
                  <div className="form-group">
                    <label htmlFor="accessToken">Token de Acesso Mercado Livre *</label>
                    <input
                      type="password"
                      id="accessToken"
                      name="accessToken"
                      value={formData.accessToken}
                      onChange={handleFormChange}
                      placeholder="Cole seu token de acesso aqui"
                      required={!editingId}
                    />
                    <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                      📌 Como obter o token?
                      <br/>
                      1. Vá para Mercado Livre Developer (developers.mercadolibre.com.br)
                      <br/>
                      2. Acesse Applications → Suas aplicações
                      <br/>
                      3. Procure por "Access Token" ou faça login com sua conta ML
                      <br/>
                      4. Cole o token aqui (ele expira em 6 horas)
                    </small>
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Accounts
