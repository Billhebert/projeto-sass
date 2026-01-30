import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './Orders.css'

function Orders() {
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  })
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadOrders()
      loadStats()
    }
  }, [selectedAccount, filters])

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

  const loadOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get(`/orders/${selectedAccount}?${params}`)
      setOrders(response.data.orders || [])
    } catch (err) {
      setError('Erro ao carregar pedidos')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await api.get(`/orders/${selectedAccount}/stats`)
      setStats(response.data)
    } catch (err) {
      console.error('Erro ao carregar estatisticas:', err)
    }
  }

  const syncOrders = async () => {
    setSyncing(true)
    try {
      await api.post(`/orders/${selectedAccount}/sync`)
      await loadOrders()
      await loadStats()
    } catch (err) {
      setError('Erro ao sincronizar pedidos')
    } finally {
      setSyncing(false)
    }
  }

  const viewOrderDetails = async (orderId) => {
    try {
      const response = await api.get(`/orders/${selectedAccount}/${orderId}`)
      setSelectedOrder(response.data.order)
      setShowModal(true)
    } catch (err) {
      setError('Erro ao carregar detalhes do pedido')
    }
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'paid': 'badge-success',
      'confirmed': 'badge-success',
      'payment_required': 'badge-warning',
      'pending': 'badge-warning',
      'cancelled': 'badge-danger',
      'invalid': 'badge-danger'
    }
    return statusMap[status] || 'badge-secondary'
  }

  const formatCurrency = (value, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  return (
    <div className="orders-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">shopping_cart</span>
            Pedidos
          </h1>
          <p>Gerencie seus pedidos do Mercado Livre</p>
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
            onClick={syncOrders}
            disabled={syncing || !selectedAccount}
          >
            <span className="material-icons">sync</span>
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <span className="material-icons">receipt_long</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total || 0}</span>
              <span className="stat-label">Total de Pedidos</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <span className="material-icons">check_circle</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.paid || 0}</span>
              <span className="stat-label">Pagos</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">
              <span className="material-icons">schedule</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.pending || 0}</span>
              <span className="stat-label">Pendentes</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <span className="material-icons">attach_money</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{formatCurrency(stats.totalRevenue || 0)}</span>
              <span className="stat-label">Receita Total</span>
            </div>
          </div>
        </div>
      )}

      <div className="filters-bar">
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Data Inicio</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <label>Data Fim</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
        </div>
        <div className="filter-group search">
          <label>Buscar</label>
          <input
            type="text"
            placeholder="ID do pedido ou produto..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      <div className="orders-table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando pedidos...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">inbox</span>
            <h3>Nenhum pedido encontrado</h3>
            <p>Clique em sincronizar para buscar pedidos do Mercado Livre</p>
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Data</th>
                <th>Comprador</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id || order.mlOrderId}>
                  <td className="order-id">#{order.mlOrderId}</td>
                  <td>{formatDate(order.dateCreated)}</td>
                  <td>
                    <div className="buyer-info">
                      <span>{order.buyer?.nickname || 'N/A'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="items-preview">
                      {order.orderItems?.slice(0, 2).map((item, idx) => (
                        <span key={idx} className="item-title">
                          {item.title?.substring(0, 30)}...
                        </span>
                      ))}
                      {order.orderItems?.length > 2 && (
                        <span className="more-items">+{order.orderItems.length - 2} mais</span>
                      )}
                    </div>
                  </td>
                  <td className="order-total">
                    {formatCurrency(order.totalAmount, order.currencyId)}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        title="Ver detalhes"
                        onClick={() => viewOrderDetails(order.mlOrderId)}
                      >
                        <span className="material-icons">visibility</span>
                      </button>
                      <a
                        href={`https://www.mercadolivre.com.br/vendas/${order.mlOrderId}/detalhe`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-icon"
                        title="Ver no ML"
                      >
                        <span className="material-icons">open_in_new</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Pedido #{selectedOrder.mlOrderId}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="order-detail-section">
                <h3>Informacoes Gerais</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Status</label>
                    <span className={`badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Data</label>
                    <span>{formatDate(selectedOrder.dateCreated)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Total</label>
                    <span className="total-value">
                      {formatCurrency(selectedOrder.totalAmount, selectedOrder.currencyId)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="order-detail-section">
                <h3>Comprador</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Nickname</label>
                    <span>{selectedOrder.buyer?.nickname}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <span>{selectedOrder.buyer?.email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="order-detail-section">
                <h3>Itens do Pedido</h3>
                <div className="order-items-list">
                  {selectedOrder.orderItems?.map((item, idx) => (
                    <div key={idx} className="order-item-card">
                      {item.thumbnail && (
                        <img src={item.thumbnail} alt={item.title} />
                      )}
                      <div className="item-details">
                        <span className="item-title">{item.title}</span>
                        <span className="item-qty">Qtd: {item.quantity}</span>
                        <span className="item-price">
                          {formatCurrency(item.unitPrice * item.quantity, selectedOrder.currencyId)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.shipping && (
                <div className="order-detail-section">
                  <h3>Envio</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>ID Envio</label>
                      <span>{selectedOrder.shipping.id}</span>
                    </div>
                    <div className="detail-item">
                      <label>Status</label>
                      <span>{selectedOrder.shipping.status}</span>
                    </div>
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

export default Orders
