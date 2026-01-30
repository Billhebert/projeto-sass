import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './Items.css'

function Items() {
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  })
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    total: 0
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadItems()
    }
  }, [selectedAccount, filters, pagination.offset])

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

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.append('offset', pagination.offset)
      params.append('limit', pagination.limit)
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get(`/items/${selectedAccount}?${params}`)
      setItems(response.data.items || [])
      setPagination(prev => ({
        ...prev,
        total: response.data.total || 0
      }))
    } catch (err) {
      setError('Erro ao carregar anuncios')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const updateItemStatus = async (itemId, status) => {
    try {
      await api.put(`/items/${selectedAccount}/${itemId}/status`, { status })
      await loadItems()
    } catch (err) {
      setError('Erro ao atualizar status')
    }
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'active': 'badge-success',
      'paused': 'badge-warning',
      'closed': 'badge-danger',
      'under_review': 'badge-info'
    }
    return statusMap[status] || 'badge-secondary'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'active': 'Ativo',
      'paused': 'Pausado',
      'closed': 'Encerrado',
      'under_review': 'Em Revisao'
    }
    return labels[status] || status
  }

  const formatCurrency = (value, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value)
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1

  return (
    <div className="items-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">inventory_2</span>
            Meus Anuncios
          </h1>
          <p>Gerencie seus anuncios do Mercado Livre</p>
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
          <Link to="/items/create" className="btn btn-primary">
            <span className="material-icons">add</span>
            Novo Anuncio
          </Link>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="active">Ativos</option>
            <option value="paused">Pausados</option>
            <option value="closed">Encerrados</option>
          </select>
        </div>
        <div className="filter-group search">
          <label>Buscar</label>
          <input
            type="text"
            placeholder="Titulo ou ID do anuncio..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="filter-stats">
          <span>{pagination.total} anuncio(s) encontrado(s)</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      <div className="items-grid">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando anuncios...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">inventory_2</span>
            <h3>Nenhum anuncio encontrado</h3>
            <p>Crie seu primeiro anuncio para comecar a vender</p>
            <Link to="/items/create" className="btn btn-primary">
              <span className="material-icons">add</span>
              Criar Anuncio
            </Link>
          </div>
        ) : (
          items.map(item => (
            <div key={item._id || item.mlItemId} className="item-card">
              <div className="item-image">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title} />
                ) : (
                  <div className="no-image">
                    <span className="material-icons">image</span>
                  </div>
                )}
                <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                  {getStatusLabel(item.status)}
                </span>
              </div>

              <div className="item-content">
                <h3 className="item-title">{item.title}</h3>
                <p className="item-id">MLB{item.mlItemId}</p>

                <div className="item-stats">
                  <div className="stat">
                    <span className="material-icons">attach_money</span>
                    <span>{formatCurrency(item.price, item.currencyId)}</span>
                  </div>
                  <div className="stat">
                    <span className="material-icons">inventory</span>
                    <span>{item.availableQuantity || 0} un.</span>
                  </div>
                  <div className="stat">
                    <span className="material-icons">shopping_cart</span>
                    <span>{item.soldQuantity || 0} vendidos</span>
                  </div>
                </div>

                {item.listingType && (
                  <div className="item-listing-type">
                    <span className="material-icons">stars</span>
                    <span>{item.listingType}</span>
                  </div>
                )}
              </div>

              <div className="item-actions">
                <Link
                  to={`/items/${item.mlItemId}/edit`}
                  className="btn btn-sm btn-secondary"
                >
                  <span className="material-icons">edit</span>
                  Editar
                </Link>

                {item.status === 'active' && (
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={() => updateItemStatus(item.mlItemId, 'paused')}
                  >
                    <span className="material-icons">pause</span>
                    Pausar
                  </button>
                )}

                {item.status === 'paused' && (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => updateItemStatus(item.mlItemId, 'active')}
                  >
                    <span className="material-icons">play_arrow</span>
                    Ativar
                  </button>
                )}

                <a
                  href={item.permalink || `https://produto.mercadolivre.com.br/MLB-${item.mlItemId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-secondary"
                >
                  <span className="material-icons">open_in_new</span>
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {pagination.total > pagination.limit && (
        <div className="pagination">
          <button
            className="btn btn-sm btn-secondary"
            disabled={pagination.offset === 0}
            onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
          >
            <span className="material-icons">chevron_left</span>
            Anterior
          </button>
          <span className="pagination-info">
            Pagina {currentPage} de {totalPages}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
          >
            Proxima
            <span className="material-icons">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default Items
