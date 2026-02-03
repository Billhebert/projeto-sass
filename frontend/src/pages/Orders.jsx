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
  const [hasTriedSync, setHasTriedSync] = useState(false)
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
      setHasTriedSync(false) // Reset sync flag when account changes
      loadOrdersAndMaybeSync()
      loadStats()
    }
  }, [selectedAccount])
  
  // Reload when filters change (but don't auto-sync)
  useEffect(() => {
    if (selectedAccount && hasTriedSync) {
      loadOrders(true)
    }
  }, [filters])

  // Load orders and auto-sync if empty
  const loadOrdersAndMaybeSync = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // First try to load from local DB
      const ordersList = await loadOrders(false)
      
      // If no orders found and haven't tried sync yet, auto-sync
      if (ordersList.length === 0 && !hasTriedSync) {
        console.log('No orders found, attempting auto-sync...')
        setHasTriedSync(true)
        setSyncing(true)
        
        try {
          const syncResponse = await api.post(`/orders/${selectedAccount}/sync`, {
            status: 'paid',
            days: 90
          })
          console.log('Auto-sync response:', syncResponse.data)
          
          // Reload after sync
          await loadOrders(false)
          await loadStats()
        } catch (syncErr) {
          console.error('Auto-sync failed:', syncErr)
          // Show ML token errors to user
          if (syncErr.response?.data?.code?.startsWith('ML_')) {
            setError(`Erro de token ML: ${syncErr.response.data.message}. Por favor, reconecte sua conta.`)
          }
          // Don't show error for other auto-sync failures, user can manually sync
        } finally {
          setSyncing(false)
        }
      } else {
        setHasTriedSync(true)
      }
    } catch (err) {
      console.error('Error in loadOrdersAndMaybeSync:', err)
      // Show ML token errors to user
      if (err.response?.data?.code?.startsWith('ML_')) {
        setError(`Erro de token ML: ${err.response.data.message}. Por favor, reconecte sua conta.`)
      }
      setHasTriedSync(true)
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const response = await api.get('/ml-accounts')
      console.log('ML Accounts API response:', response.data)
      
      // Handle different API response formats (same as Dashboard)
      let accountsList = []
      if (Array.isArray(response.data)) {
        accountsList = response.data
      } else if (Array.isArray(response.data?.data?.accounts)) {
        accountsList = response.data.data.accounts
      } else if (Array.isArray(response.data?.accounts)) {
        accountsList = response.data.accounts
      } else if (Array.isArray(response.data?.data)) {
        accountsList = response.data.data
      }
      
      console.log('Parsed accounts list:', accountsList)
      setAccounts(accountsList)
      
      if (accountsList.length > 0) {
        const firstAccountId = accountsList[0]._id || accountsList[0].id
        console.log('Auto-selecting first account:', firstAccountId)
        setSelectedAccount(firstAccountId)
      }
    } catch (err) {
      console.error('Error loading accounts:', err)
      setError('Erro ao carregar contas')
    }
  }

  const loadOrders = async (setLoadingState = true) => {
    if (setLoadingState) setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get(`/orders/${selectedAccount}?${params}`)
      console.log('Orders API response:', response.data)
      
      // Handle different response formats (same as Dashboard)
      let ordersData = { orders: [], paging: { total: 0 } }
      const resData = response.data
      
      if (resData?.success && resData?.data) {
        ordersData = resData.data
      } else if (resData?.orders) {
        ordersData = resData
      } else if (resData?.results) {
        ordersData = { orders: resData.results, paging: resData.paging || { total: resData.results.length } }
      } else if (Array.isArray(resData)) {
        ordersData = { orders: resData, paging: { total: resData.length } }
      }
      
      console.log('Parsed ordersData:', ordersData)
      console.log('Orders array:', ordersData.orders)
      
      const ordersList = ordersData.orders || []
      setOrders(ordersList)
      
      return ordersList
    } catch (err) {
      console.error('Error loading orders:', err)
      setError('Erro ao carregar pedidos')
      setOrders([])
      return []
    } finally {
      if (setLoadingState) setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await api.get(`/orders/${selectedAccount}/stats`)
      console.log('Orders stats response:', response.data)
      
      // Handle different response formats
      let statsData = null
      const resData = response.data
      
      if (resData?.success && resData?.data) {
        // Format: { success: true, data: { orders: { total, paid, pending }, revenue: { total } } }
        const data = resData.data
        statsData = {
          total: data.orders?.total || 0,
          paid: data.orders?.paid || 0,
          pending: data.orders?.pending || 0,
          cancelled: data.orders?.cancelled || 0,
          totalRevenue: data.revenue?.total || 0
        }
      } else if (resData?.orders) {
        // Format: { orders: { total, paid }, revenue: { total } }
        statsData = {
          total: resData.orders?.total || 0,
          paid: resData.orders?.paid || 0,
          pending: resData.orders?.pending || 0,
          cancelled: resData.orders?.cancelled || 0,
          totalRevenue: resData.revenue?.total || 0
        }
      } else if (resData?.total !== undefined) {
        // Format: { total, paid, pending, totalRevenue }
        statsData = resData
      }
      
      console.log('Parsed stats:', statsData)
      setStats(statsData)
    } catch (err) {
      console.error('Erro ao carregar estatisticas:', err)
    }
  }

  const syncOrders = async () => {
    setSyncing(true)
    setError(null)
    try {
      console.log('Syncing orders for account:', selectedAccount)
      const syncResponse = await api.post(`/orders/${selectedAccount}/sync`, {
        status: 'paid',
        days: 90 // Get last 90 days of orders
      })
      console.log('Sync response:', syncResponse.data)
      
      // Reload orders after sync
      const ordersList = await loadOrders(false)
      await loadStats()
      
      return ordersList
    } catch (err) {
      console.error('Error syncing orders:', err)
      setError('Erro ao sincronizar pedidos')
      return []
    } finally {
      setSyncing(false)
    }
  }

  const viewOrderDetails = async (orderId) => {
    try {
      const response = await api.get(`/orders/${selectedAccount}/${orderId}`)
      console.log('Order details response:', response.data)
      
      // Handle different response formats
      let orderData = null
      const resData = response.data
      
      if (resData?.success && resData?.data) {
        orderData = resData.data.order || resData.data
      } else if (resData?.order) {
        orderData = resData.order
      } else {
        orderData = resData
      }
      
      setSelectedOrder(orderData)
      setShowModal(true)
    } catch (err) {
      console.error('Error loading order details:', err)
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
              <option key={acc._id || acc.id} value={acc._id || acc.id}>
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
              {orders.map(order => {
                // Handle both camelCase and snake_case field names from API
                const orderId = order.id || order.mlOrderId || order.ml_order_id
                const dateCreated = order.dateCreated || order.date_created
                const totalAmount = order.totalAmount || order.total_amount || 0
                const currencyId = order.currencyId || order.currency_id || 'BRL'
                const orderItems = order.orderItems || order.order_items || []
                
                return (
                  <tr key={order._id || orderId}>
                    <td className="order-id">#{orderId}</td>
                    <td>{formatDate(dateCreated)}</td>
                    <td>
                      <div className="buyer-info">
                        <span>{order.buyer?.nickname || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="items-preview">
                        {orderItems.slice(0, 2).map((item, idx) => (
                          <span key={idx} className="item-title">
                            {(item.title || item.item?.title)?.substring(0, 30)}...
                          </span>
                        ))}
                        {orderItems.length > 2 && (
                          <span className="more-items">+{orderItems.length - 2} mais</span>
                        )}
                      </div>
                    </td>
                    <td className="order-total">
                      {formatCurrency(totalAmount, currencyId)}
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
                          onClick={() => viewOrderDetails(orderId)}
                        >
                          <span className="material-icons">visibility</span>
                        </button>
                        <a
                          href={`https://www.mercadolivre.com.br/vendas/${orderId}/detalhe`}
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
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && selectedOrder && (() => {
        // Handle both camelCase and snake_case field names
        const orderId = selectedOrder.id || selectedOrder.mlOrderId || selectedOrder.ml_order_id
        const dateCreated = selectedOrder.dateCreated || selectedOrder.date_created
        const totalAmount = selectedOrder.totalAmount || selectedOrder.total_amount || 0
        const currencyId = selectedOrder.currencyId || selectedOrder.currency_id || 'BRL'
        const orderItems = selectedOrder.orderItems || selectedOrder.order_items || []
        
        return (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Pedido #{orderId}</h2>
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
                      <span>{formatDate(dateCreated)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Total</label>
                      <span className="total-value">
                        {formatCurrency(totalAmount, currencyId)}
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
                    {orderItems.map((item, idx) => {
                      const itemTitle = item.title || item.item?.title
                      const itemThumbnail = item.thumbnail || item.item?.thumbnail
                      const itemQty = item.quantity
                      const itemPrice = item.unitPrice || item.unit_price || item.full_unit_price || 0
                      
                      return (
                        <div key={idx} className="order-item-card">
                          {itemThumbnail && (
                            <img src={itemThumbnail} alt={itemTitle} />
                          )}
                          <div className="item-details">
                            <span className="item-title">{itemTitle}</span>
                            <span className="item-qty">Qtd: {itemQty}</span>
                            <span className="item-price">
                              {formatCurrency(itemPrice * itemQty, currencyId)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
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
        )
      })()}
    </div>
  )
}

export default Orders
