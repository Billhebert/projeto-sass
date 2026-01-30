import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  
  // Data states
  const [stats, setStats] = useState({
    accounts: 0,
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    activeProducts: 0,
    pausedProducts: 0,
    lowStock: 0,
    pendingQuestions: 0,
    pendingShipments: 0,
    openClaims: 0,
    conversionRate: 0,
    totalVisits: 0,
    avgTicket: 0,
    margin: 0
  })
  
  const [salesChart, setSalesChart] = useState([])
  const [revenueByAccount, setRevenueByAccount] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [pendingActions, setPendingActions] = useState([])
  const [reputation, setReputation] = useState(null)
  const [alerts, setAlerts] = useState([])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

  useEffect(() => {
    fetchDashboardData()
  }, [selectedPeriod])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch accounts
      const accountsResponse = await api.get('/ml-accounts')
      const accountsList = accountsResponse.data.data?.accounts || accountsResponse.data.data || []
      const accountsArray = Array.isArray(accountsList) ? accountsList : []
      setAccounts(accountsArray)

      if (accountsArray.length === 0) {
        setLoading(false)
        return
      }

      // Aggregate data from all accounts
      let totalRevenue = 0
      let totalOrders = 0
      let totalProducts = 0
      let activeProducts = 0
      let pausedProducts = 0
      let lowStock = 0
      let pendingQuestions = 0
      let pendingShipments = 0
      let openClaims = 0
      let totalVisits = 0
      let allProducts = []
      let allOrders = []
      let allAlerts = []
      let accountRevenues = []
      let salesByDate = {}
      let firstReputation = null

      for (const account of accountsArray) {
        try {
          // Fetch product stats
          const statsResponse = await api.get(`/products/${account.id}/stats`)
          if (statsResponse.data.success) {
            const accountStats = statsResponse.data.data
            totalProducts += accountStats.products?.total || 0
            activeProducts += accountStats.products?.active || 0
            pausedProducts += accountStats.products?.paused || 0
            lowStock += accountStats.products?.lowStock || 0
          }

          // Fetch orders
          const ordersResponse = await api.get(`/orders/${account.id}?limit=50`)
          if (ordersResponse.data.orders) {
            const orders = ordersResponse.data.orders.map(o => ({
              ...o,
              accountName: account.nickname,
              accountId: account.id
            }))
            allOrders = allOrders.concat(orders)
            
            // Calculate revenue
            const accountRev = orders
              .filter(o => o.status === 'paid' || o.status === 'confirmed')
              .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
            
            totalRevenue += accountRev
            totalOrders += orders.length
            
            accountRevenues.push({
              name: account.nickname || `Conta ${account.id}`,
              value: accountRev
            })

            // Sales by date
            orders.forEach(order => {
              if (order.dateCreated) {
                const date = new Date(order.dateCreated).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                if (!salesByDate[date]) {
                  salesByDate[date] = { date, revenue: 0, orders: 0 }
                }
                if (order.status === 'paid' || order.status === 'confirmed') {
                  salesByDate[date].revenue += order.totalAmount || 0
                  salesByDate[date].orders += 1
                }
              }
            })
          }

          // Fetch products for top sellers
          const productsResponse = await api.get(`/products/${account.id}?limit=20&sort=-salesCount`)
          if (productsResponse.data.success) {
            const products = productsResponse.data.data.products.map(p => ({
              ...p,
              accountName: account.nickname,
              accountId: account.id
            }))
            allProducts = allProducts.concat(products)
          }

          // Fetch questions count
          try {
            const questionsResponse = await api.get(`/questions/${account.id}?status=unanswered&limit=1`)
            pendingQuestions += questionsResponse.data.total || 0
          } catch (e) {}

          // Fetch shipments
          try {
            const shipmentsResponse = await api.get(`/shipments/${account.id}?status=ready_to_ship&limit=1`)
            pendingShipments += shipmentsResponse.data.total || 0
          } catch (e) {}

          // Fetch claims
          try {
            const claimsResponse = await api.get(`/claims/${account.id}?status=opened&limit=1`)
            openClaims += claimsResponse.data.total || 0
          } catch (e) {}

          // Fetch reputation (first account)
          if (!firstReputation) {
            try {
              const reputationResponse = await api.get(`/metrics/${account.id}/reputation`)
              firstReputation = reputationResponse.data.reputation
            } catch (e) {}
          }

          // Fetch visits
          try {
            const visitsResponse = await api.get(`/metrics/${account.id}/visits?days=${selectedPeriod}`)
            const visits = visitsResponse.data.visits || []
            totalVisits += visits.reduce((sum, v) => sum + (v.visits || 0), 0)
          } catch (e) {}

        } catch (err) {
          console.error(`Error fetching data for account ${account.id}:`, err)
        }
      }

      // Generate alerts
      if (lowStock > 0) {
        allAlerts.push({
          type: 'warning',
          icon: 'inventory',
          title: 'Estoque Baixo',
          message: `${lowStock} produto(s) com estoque baixo`,
          action: '/products',
          actionLabel: 'Ver produtos'
        })
      }
      if (pendingQuestions > 0) {
        allAlerts.push({
          type: 'info',
          icon: 'help_outline',
          title: 'Perguntas Pendentes',
          message: `${pendingQuestions} pergunta(s) aguardando resposta`,
          action: '/questions',
          actionLabel: 'Responder'
        })
      }
      if (pendingShipments > 0) {
        allAlerts.push({
          type: 'warning',
          icon: 'local_shipping',
          title: 'Envios Pendentes',
          message: `${pendingShipments} envio(s) prontos para despachar`,
          action: '/shipments',
          actionLabel: 'Ver envios'
        })
      }
      if (openClaims > 0) {
        allAlerts.push({
          type: 'danger',
          icon: 'report_problem',
          title: 'Reclamacoes Abertas',
          message: `${openClaims} reclamacao(oes) precisam de atencao`,
          action: '/claims',
          actionLabel: 'Ver reclamacoes'
        })
      }

      // Sort and prepare data
      const sortedProducts = [...allProducts].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
      const sortedOrders = [...allOrders].sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
      const salesChartData = Object.values(salesByDate).sort((a, b) => {
        const [dayA, monthA] = a.date.split('/')
        const [dayB, monthB] = b.date.split('/')
        return new Date(2024, monthA - 1, dayA) - new Date(2024, monthB - 1, dayB)
      }).slice(-parseInt(selectedPeriod))

      // Calculate metrics
      const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const conversionRate = totalVisits > 0 ? (totalOrders / totalVisits) * 100 : 0

      // Set all states
      setStats({
        accounts: accountsArray.length,
        totalRevenue,
        totalOrders,
        totalProducts,
        activeProducts,
        pausedProducts,
        lowStock,
        pendingQuestions,
        pendingShipments,
        openClaims,
        conversionRate,
        totalVisits,
        avgTicket,
        margin: 0
      })
      setSalesChart(salesChartData)
      setRevenueByAccount(accountRevenues.filter(a => a.value > 0))
      setTopProducts(sortedProducts.slice(0, 5))
      setRecentOrders(sortedOrders.slice(0, 5))
      setReputation(firstReputation)
      setAlerts(allAlerts)

      // Pending actions
      const actions = []
      if (pendingQuestions > 0) actions.push({ icon: 'help_outline', label: 'Perguntas', count: pendingQuestions, path: '/questions', color: '#3b82f6' })
      if (pendingShipments > 0) actions.push({ icon: 'local_shipping', label: 'Envios', count: pendingShipments, path: '/shipments', color: '#f59e0b' })
      if (openClaims > 0) actions.push({ icon: 'report_problem', label: 'Reclamacoes', count: openClaims, path: '/claims', color: '#ef4444' })
      if (lowStock > 0) actions.push({ icon: 'inventory', label: 'Estoque Baixo', count: lowStock, path: '/products', color: '#f59e0b' })
      setPendingActions(actions)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncAll = async () => {
    setSyncing(true)
    try {
      for (const account of accounts) {
        await api.post(`/products/${account.id}/sync`)
        await api.post(`/orders/${account.id}/sync`)
      }
      await fetchDashboardData()
    } catch (err) {
      console.error('Error syncing:', err)
    } finally {
      setSyncing(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatNumber = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  const getReputationLevel = (levelId) => {
    const levels = {
      '5_green': { label: 'MercadoLider Platinum', color: '#10b981', icon: 'workspace_premium' },
      '4_light_green': { label: 'MercadoLider Gold', color: '#84cc16', icon: 'military_tech' },
      '3_yellow': { label: 'MercadoLider', color: '#eab308', icon: 'verified' },
      '2_orange': { label: 'Bom', color: '#f97316', icon: 'thumb_up' },
      '1_red': { label: 'Regular', color: '#ef4444', icon: 'warning' }
    }
    return levels[levelId] || { label: 'N/A', color: '#6b7280', icon: 'help' }
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'paid': 'badge-success',
      'confirmed': 'badge-success',
      'pending': 'badge-warning',
      'cancelled': 'badge-danger'
    }
    return statusMap[status] || 'badge-secondary'
  }

  // No accounts state
  if (!loading && accounts.length === 0) {
    return (
      <div className="dashboard">
        <div className="empty-dashboard">
          <div className="empty-icon">
            <span className="material-icons">store</span>
          </div>
          <h2>Bem-vindo ao ML SASS!</h2>
          <p>Conecte sua primeira conta do Mercado Livre para comecar</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/accounts')}>
            <span className="material-icons">add</span>
            Conectar Conta
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard premium">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Dashboard</h1>
          <p>Visao geral do seu negocio no Mercado Livre</p>
        </div>
        <div className="header-right">
          <select 
            className="period-select"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="7">Ultimos 7 dias</option>
            <option value="15">Ultimos 15 dias</option>
            <option value="30">Ultimos 30 dias</option>
            <option value="60">Ultimos 60 dias</option>
            <option value="90">Ultimos 90 dias</option>
          </select>
          <button 
            className={`btn btn-primary ${syncing ? 'loading' : ''}`}
            onClick={handleSyncAll}
            disabled={syncing}
          >
            <span className="material-icons">sync</span>
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </header>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((alert, idx) => (
            <div key={idx} className={`alert-card alert-${alert.type}`}>
              <span className="material-icons alert-icon">{alert.icon}</span>
              <div className="alert-content">
                <strong>{alert.title}</strong>
                <span>{alert.message}</span>
              </div>
              <Link to={alert.action} className="alert-action">
                {alert.actionLabel}
                <span className="material-icons">arrow_forward</span>
              </Link>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Carregando dados...</p>
        </div>
      ) : (
        <>
          {/* Main KPIs */}
          <section className="kpi-section">
            <div className="kpi-grid">
              <div className="kpi-card primary" onClick={() => navigate('/sales-dashboard')}>
                <div className="kpi-icon">
                  <span className="material-icons">payments</span>
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">Receita Total</span>
                  <span className="kpi-value">{formatCurrency(stats.totalRevenue)}</span>
                  <span className="kpi-period">ultimos {selectedPeriod} dias</span>
                </div>
                <span className="material-icons kpi-arrow">chevron_right</span>
              </div>

              <div className="kpi-card success" onClick={() => navigate('/orders')}>
                <div className="kpi-icon">
                  <span className="material-icons">shopping_cart</span>
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">Pedidos</span>
                  <span className="kpi-value">{formatNumber(stats.totalOrders)}</span>
                  <span className="kpi-period">ticket medio: {formatCurrency(stats.avgTicket)}</span>
                </div>
                <span className="material-icons kpi-arrow">chevron_right</span>
              </div>

              <div className="kpi-card info" onClick={() => navigate('/products')}>
                <div className="kpi-icon">
                  <span className="material-icons">inventory_2</span>
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">Produtos</span>
                  <span className="kpi-value">{formatNumber(stats.totalProducts)}</span>
                  <span className="kpi-period">{stats.activeProducts} ativos</span>
                </div>
                <span className="material-icons kpi-arrow">chevron_right</span>
              </div>

              <div className="kpi-card purple" onClick={() => navigate('/metrics')}>
                <div className="kpi-icon">
                  <span className="material-icons">visibility</span>
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">Visitas</span>
                  <span className="kpi-value">{formatNumber(stats.totalVisits)}</span>
                  <span className="kpi-period">conversao: {stats.conversionRate.toFixed(1)}%</span>
                </div>
                <span className="material-icons kpi-arrow">chevron_right</span>
              </div>
            </div>
          </section>

          {/* Pending Actions */}
          {pendingActions.length > 0 && (
            <section className="pending-section">
              <h2 className="section-title">
                <span className="material-icons">pending_actions</span>
                Acoes Pendentes
              </h2>
              <div className="pending-grid">
                {pendingActions.map((action, idx) => (
                  <Link key={idx} to={action.path} className="pending-card" style={{ '--accent-color': action.color }}>
                    <div className="pending-icon">
                      <span className="material-icons">{action.icon}</span>
                    </div>
                    <div className="pending-info">
                      <span className="pending-count">{action.count}</span>
                      <span className="pending-label">{action.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Charts Row */}
          <section className="charts-section">
            <div className="charts-grid">
              {/* Sales Chart */}
              <div className="chart-card large">
                <div className="chart-header">
                  <h3>
                    <span className="material-icons">show_chart</span>
                    Vendas
                  </h3>
                  <Link to="/sales-dashboard" className="chart-link">
                    Ver detalhes
                    <span className="material-icons">arrow_forward</span>
                  </Link>
                </div>
                <div className="chart-body">
                  {salesChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={salesChart}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                        <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value, name) => [formatCurrency(value), name === 'revenue' ? 'Receita' : 'Pedidos']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          fill="url(#colorRevenue)"
                          name="Receita"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="no-data">
                      <span className="material-icons">insert_chart</span>
                      <p>Sem dados de vendas no periodo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Revenue by Account */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3>
                    <span className="material-icons">pie_chart</span>
                    Receita por Conta
                  </h3>
                </div>
                <div className="chart-body">
                  {revenueByAccount.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={revenueByAccount}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {revenueByAccount.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value) => <span style={{ color: '#374151', fontSize: '12px' }}>{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="no-data">
                      <span className="material-icons">pie_chart</span>
                      <p>Sem dados de receita</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Row */}
          <section className="bottom-section">
            <div className="bottom-grid">
              {/* Reputation Card */}
              {reputation && (
                <div className="info-card reputation-card">
                  <div className="card-header">
                    <h3>
                      <span className="material-icons">verified</span>
                      Reputacao
                    </h3>
                    <Link to="/metrics" className="card-link">
                      Ver metricas
                      <span className="material-icons">arrow_forward</span>
                    </Link>
                  </div>
                  <div className="card-body">
                    <div className="reputation-level" style={{ '--level-color': getReputationLevel(reputation.level_id).color }}>
                      <span className="material-icons">{getReputationLevel(reputation.level_id).icon}</span>
                      <span className="level-label">{getReputationLevel(reputation.level_id).label}</span>
                    </div>
                    <div className="reputation-stats">
                      <div className="rep-stat">
                        <span className="rep-value">{reputation.transactions?.completed || 0}</span>
                        <span className="rep-label">Vendas</span>
                      </div>
                      <div className="rep-stat">
                        <span className="rep-value">{reputation.transactions?.ratings?.positive || 0}</span>
                        <span className="rep-label">Positivas</span>
                      </div>
                      <div className="rep-stat">
                        <span className="rep-value">{reputation.transactions?.ratings?.negative || 0}</span>
                        <span className="rep-label">Negativas</span>
                      </div>
                    </div>
                    {reputation.metrics && (
                      <div className="reputation-bars">
                        <div className="rep-bar">
                          <span className="bar-label">Reclamacoes</span>
                          <div className="bar-track">
                            <div 
                              className="bar-fill red" 
                              style={{ width: `${Math.min((reputation.metrics.claims?.rate || 0) * 100 * 10, 100)}%` }}
                            ></div>
                          </div>
                          <span className="bar-value">{((reputation.metrics.claims?.rate || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="rep-bar">
                          <span className="bar-label">Atrasos</span>
                          <div className="bar-track">
                            <div 
                              className="bar-fill yellow" 
                              style={{ width: `${Math.min((reputation.metrics.delayed_handling_time?.rate || 0) * 100 * 10, 100)}%` }}
                            ></div>
                          </div>
                          <span className="bar-value">{((reputation.metrics.delayed_handling_time?.rate || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="rep-bar">
                          <span className="bar-label">Cancelamentos</span>
                          <div className="bar-track">
                            <div 
                              className="bar-fill orange" 
                              style={{ width: `${Math.min((reputation.metrics.cancellations?.rate || 0) * 100 * 10, 100)}%` }}
                            ></div>
                          </div>
                          <span className="bar-value">{((reputation.metrics.cancellations?.rate || 0) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Top Products */}
              <div className="info-card">
                <div className="card-header">
                  <h3>
                    <span className="material-icons">trending_up</span>
                    Mais Vendidos
                  </h3>
                  <Link to="/products" className="card-link">
                    Ver todos
                    <span className="material-icons">arrow_forward</span>
                  </Link>
                </div>
                <div className="card-body">
                  {topProducts.length > 0 ? (
                    <ul className="product-list">
                      {topProducts.map((product, idx) => (
                        <li key={product.id || idx} className="product-item">
                          <span className="product-rank">{idx + 1}</span>
                          {product.thumbnailUrl && (
                            <img src={product.thumbnailUrl} alt="" className="product-thumb" />
                          )}
                          <div className="product-info">
                            <span className="product-title">{product.title}</span>
                            <span className="product-account">{product.accountName}</span>
                          </div>
                          <div className="product-stats">
                            <span className="product-sales">{product.salesCount || 0} vendas</span>
                            <span className="product-price">{formatCurrency(product.price || 0)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="no-data small">
                      <span className="material-icons">inventory_2</span>
                      <p>Nenhum produto encontrado</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders */}
              <div className="info-card">
                <div className="card-header">
                  <h3>
                    <span className="material-icons">receipt_long</span>
                    Pedidos Recentes
                  </h3>
                  <Link to="/orders" className="card-link">
                    Ver todos
                    <span className="material-icons">arrow_forward</span>
                  </Link>
                </div>
                <div className="card-body">
                  {recentOrders.length > 0 ? (
                    <ul className="order-list">
                      {recentOrders.map((order, idx) => (
                        <li key={order._id || idx} className="order-item">
                          <div className="order-main">
                            <span className="order-id">#{order.mlOrderId}</span>
                            <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="order-details">
                            <span className="order-buyer">{order.buyer?.nickname || 'Comprador'}</span>
                            <span className="order-date">
                              {new Date(order.dateCreated).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <span className="order-total">{formatCurrency(order.totalAmount || 0)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="no-data small">
                      <span className="material-icons">receipt_long</span>
                      <p>Nenhum pedido encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="quick-actions-section">
            <h2 className="section-title">
              <span className="material-icons">bolt</span>
              Acoes Rapidas
            </h2>
            <div className="quick-actions-grid">
              <Link to="/items/create" className="quick-action">
                <span className="material-icons">add_box</span>
                <span>Criar Anuncio</span>
              </Link>
              <Link to="/sales-dashboard" className="quick-action">
                <span className="material-icons">analytics</span>
                <span>Dashboard Vendas</span>
              </Link>
              <Link to="/products" className="quick-action">
                <span className="material-icons">inventory_2</span>
                <span>Gerenciar Produtos</span>
              </Link>
              <Link to="/questions" className="quick-action">
                <span className="material-icons">help_outline</span>
                <span>Responder Perguntas</span>
              </Link>
              <Link to="/shipments" className="quick-action">
                <span className="material-icons">local_shipping</span>
                <span>Gerenciar Envios</span>
              </Link>
              <Link to="/accounts" className="quick-action">
                <span className="material-icons">store</span>
                <span>Contas ML</span>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default Dashboard
