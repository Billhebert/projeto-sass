import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import './Metrics.css'

function Metrics() {
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [reputation, setReputation] = useState(null)
  const [salesData, setSalesData] = useState([])
  const [visitsData, setVisitsData] = useState([])
  const [period, setPeriod] = useState('30')

  const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa']

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadAllMetrics()
    }
  }, [selectedAccount, period])

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

  const loadAllMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const [metricsRes, reputationRes, salesRes, visitsRes] = await Promise.all([
        api.get(`/metrics/${selectedAccount}`),
        api.get(`/metrics/${selectedAccount}/reputation`),
        api.get(`/metrics/${selectedAccount}/sales?days=${period}`),
        api.get(`/metrics/${selectedAccount}/visits?days=${period}`)
      ])

      setMetrics(metricsRes.data)
      setReputation(reputationRes.data.reputation)
      setSalesData(salesRes.data.sales || [])
      setVisitsData(visitsRes.data.visits || [])
    } catch (err) {
      setError('Erro ao carregar metricas')
    } finally {
      setLoading(false)
    }
  }

  const getReputationColor = (level) => {
    const colors = {
      '5_green': '#22c55e',
      '4_light_green': '#84cc16',
      '3_yellow': '#eab308',
      '2_orange': '#f97316',
      '1_red': '#ef4444'
    }
    return colors[level] || '#6b7280'
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(1)}%`
  }

  return (
    <div className="metrics-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">analytics</span>
            Metricas
          </h1>
          <p>Analise de performance da sua conta</p>
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
          <select
            className="period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">Ultimos 7 dias</option>
            <option value="30">Ultimos 30 dias</option>
            <option value="90">Ultimos 90 dias</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando metricas...</p>
        </div>
      ) : (
        <>
          {reputation && (
            <div className="reputation-section">
              <h2>Reputacao</h2>
              <div className="reputation-card">
                <div className="reputation-level" style={{ backgroundColor: getReputationColor(reputation.level_id) }}>
                  <span className="material-icons">verified</span>
                  <span>{reputation.level_id?.replace('_', ' ') || 'N/A'}</span>
                </div>
                <div className="reputation-stats">
                  <div className="rep-stat">
                    <span className="label">Vendas Completadas</span>
                    <span className="value">{reputation.transactions?.completed || 0}</span>
                  </div>
                  <div className="rep-stat">
                    <span className="label">Vendas Canceladas</span>
                    <span className="value">{reputation.transactions?.canceled || 0}</span>
                  </div>
                  <div className="rep-stat">
                    <span className="label">Avaliacoes Positivas</span>
                    <span className="value">{reputation.transactions?.ratings?.positive || 0}</span>
                  </div>
                  <div className="rep-stat">
                    <span className="label">Avaliacoes Negativas</span>
                    <span className="value">{reputation.transactions?.ratings?.negative || 0}</span>
                  </div>
                </div>
                {reputation.metrics && (
                  <div className="reputation-metrics">
                    <div className="metric-bar">
                      <span className="label">Vendas</span>
                      <div className="bar">
                        <div 
                          className="fill green" 
                          style={{ width: `${(reputation.metrics.sales?.completed || 0) * 100}%` }}
                        ></div>
                      </div>
                      <span className="value">{formatPercent(reputation.metrics.sales?.completed || 0)}</span>
                    </div>
                    <div className="metric-bar">
                      <span className="label">Reclamacoes</span>
                      <div className="bar">
                        <div 
                          className="fill red" 
                          style={{ width: `${(reputation.metrics.claims?.rate || 0) * 100}%` }}
                        ></div>
                      </div>
                      <span className="value">{formatPercent(reputation.metrics.claims?.rate || 0)}</span>
                    </div>
                    <div className="metric-bar">
                      <span className="label">Atrasos</span>
                      <div className="bar">
                        <div 
                          className="fill yellow" 
                          style={{ width: `${(reputation.metrics.delayed_handling_time?.rate || 0) * 100}%` }}
                        ></div>
                      </div>
                      <span className="value">{formatPercent(reputation.metrics.delayed_handling_time?.rate || 0)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {metrics && (
            <div className="metrics-overview">
              <div className="metric-card">
                <div className="metric-icon blue">
                  <span className="material-icons">shopping_cart</span>
                </div>
                <div className="metric-info">
                  <span className="metric-value">{metrics.totalOrders || 0}</span>
                  <span className="metric-label">Pedidos</span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon green">
                  <span className="material-icons">attach_money</span>
                </div>
                <div className="metric-info">
                  <span className="metric-value">{formatCurrency(metrics.totalRevenue || 0)}</span>
                  <span className="metric-label">Receita</span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon purple">
                  <span className="material-icons">visibility</span>
                </div>
                <div className="metric-info">
                  <span className="metric-value">{metrics.totalVisits || 0}</span>
                  <span className="metric-label">Visitas</span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon yellow">
                  <span className="material-icons">trending_up</span>
                </div>
                <div className="metric-info">
                  <span className="metric-value">{formatPercent(metrics.conversionRate || 0)}</span>
                  <span className="metric-label">Conversao</span>
                </div>
              </div>
            </div>
          )}

          <div className="charts-grid">
            <div className="chart-card">
              <h3>
                <span className="material-icons">show_chart</span>
                Vendas ao Longo do Tempo
              </h3>
              {salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#60a5fa" 
                      fill="#60a5fa" 
                      fillOpacity={0.3}
                      name="Valor"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#34d399" 
                      fill="#34d399" 
                      fillOpacity={0.3}
                      name="Quantidade"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">
                  <span className="material-icons">insert_chart</span>
                  <p>Sem dados de vendas</p>
                </div>
              )}
            </div>

            <div className="chart-card">
              <h3>
                <span className="material-icons">visibility</span>
                Visitas
              </h3>
              {visitsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={visitsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="visits" 
                      stroke="#a78bfa" 
                      strokeWidth={2}
                      dot={{ fill: '#a78bfa' }}
                      name="Visitas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">
                  <span className="material-icons">insert_chart</span>
                  <p>Sem dados de visitas</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Metrics
