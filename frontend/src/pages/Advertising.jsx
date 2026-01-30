import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import './Advertising.css'

function Advertising() {
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState([])
  const [activeTab, setActiveTab] = useState('campaigns')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [items, setItems] = useState([])
  const [stats, setStats] = useState({
    totalSpend: 0,
    totalClicks: 0,
    totalImpressions: 0,
    totalConversions: 0,
    avgCpc: 0,
    avgCtr: 0,
    roi: 0
  })
  const [performanceData, setPerformanceData] = useState([])
  const [period, setPeriod] = useState('30')
  const [error, setError] = useState(null)

  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'product_ads',
    dailyBudget: '',
    totalBudget: '',
    bidStrategy: 'automatic',
    bidAmount: '',
    status: 'active',
    selectedProducts: [],
    keywords: '',
    startDate: '',
    endDate: ''
  })

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadAdvertisingData()
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
      setLoading(false)
    }
  }

  const loadAdvertisingData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/advertising/${selectedAccount}?days=${period}`)
      setCampaigns(response.data.campaigns || [])
      setStats(response.data.stats || {})
      setPerformanceData(response.data.performance || [])
      await fetchItems()
    } catch (err) {
      // Generate mock data for demo
      const mockData = generateMockData()
      setCampaigns(mockData.campaigns)
      setStats(mockData.stats)
      setPerformanceData(mockData.performance)
      setItems(mockData.items)
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await api.get(`/items/${selectedAccount}?limit=50`)
      if (response.data.success) {
        setItems(Array.isArray(response.data.data) ? response.data.data : [])
      } else {
        setItems([])
      }
    } catch (err) {
      console.error('Error fetching items:', err)
      setItems([])
    }
  }

  const handleCreateCampaign = async () => {
    try {
      const campaignData = {
        ...createForm,
        dailyBudget: parseFloat(createForm.dailyBudget) || 0,
        totalBudget: parseFloat(createForm.totalBudget) || 0,
        bidAmount: parseFloat(createForm.bidAmount) || 0
      }
      
      // API call to create campaign
      const response = await api.post(`/advertising/${selectedAccount}/campaigns`, campaignData)
      
      if (response.data.success) {
        setCampaigns(prev => [...prev, response.data.data])
        setShowCreateModal(false)
        resetCreateForm()
      }
    } catch (err) {
      // For demo, create locally
      const newCampaign = {
        id: `camp_${Date.now()}`,
        name: createForm.name,
        type: createForm.type,
        status: createForm.status,
        budget: parseFloat(createForm.totalBudget) || parseFloat(createForm.dailyBudget) * 30,
        dailyBudget: parseFloat(createForm.dailyBudget) || 0,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        ctr: 0,
        cpc: 0,
        roas: 0,
        bidStrategy: createForm.bidStrategy,
        products: createForm.selectedProducts.length,
        createdAt: new Date().toISOString()
      }
      setCampaigns(prev => [...prev, newCampaign])
      setShowCreateModal(false)
      resetCreateForm()
    }
  }

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      type: 'product_ads',
      dailyBudget: '',
      totalBudget: '',
      bidStrategy: 'automatic',
      bidAmount: '',
      status: 'active',
      selectedProducts: [],
      keywords: '',
      startDate: '',
      endDate: ''
    })
  }

  const handleViewCampaignDetails = (campaign) => {
    setSelectedCampaign(campaign)
    setShowDetailModal(true)
  }

  const generateMockData = () => {
    const campaigns = [
      { 
        id: 'camp_1', 
        name: 'Campanha Principal', 
        status: 'active',
        budget: 500,
        spent: 342.50,
        impressions: 125000,
        clicks: 3750,
        conversions: 89,
        revenue: 12500,
        ctr: 3.0,
        cpc: 0.91,
        roas: 3.65
      },
      { 
        id: 'camp_2', 
        name: 'Promocao Verao', 
        status: 'active',
        budget: 300,
        spent: 215.30,
        impressions: 85000,
        clicks: 2125,
        conversions: 52,
        revenue: 7800,
        ctr: 2.5,
        cpc: 1.01,
        roas: 3.62
      },
      { 
        id: 'camp_3', 
        name: 'Lancamentos', 
        status: 'paused',
        budget: 200,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        ctr: 0,
        cpc: 0,
        roas: 0
      },
      { 
        id: 'camp_4', 
        name: 'Eletronicos', 
        status: 'active',
        budget: 400,
        spent: 285.00,
        impressions: 95000,
        clicks: 2850,
        conversions: 68,
        revenue: 9500,
        ctr: 3.0,
        cpc: 1.00,
        roas: 3.33
      }
    ]

    const stats = {
      totalSpend: campaigns.reduce((sum, c) => sum + c.spent, 0),
      totalClicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
      totalImpressions: campaigns.reduce((sum, c) => sum + c.impressions, 0),
      totalConversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
      totalRevenue: campaigns.reduce((sum, c) => sum + c.revenue, 0),
      avgCpc: campaigns.filter(c => c.clicks > 0).reduce((sum, c) => sum + c.cpc, 0) / campaigns.filter(c => c.clicks > 0).length || 0,
      avgCtr: campaigns.filter(c => c.impressions > 0).reduce((sum, c) => sum + c.ctr, 0) / campaigns.filter(c => c.impressions > 0).length || 0,
      roi: 0
    }
    stats.roi = stats.totalSpend > 0 ? ((stats.totalRevenue - stats.totalSpend) / stats.totalSpend * 100) : 0

    const days = parseInt(period)
    const performance = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      performance.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        spend: Math.floor(Math.random() * 50) + 10,
        clicks: Math.floor(Math.random() * 300) + 50,
        conversions: Math.floor(Math.random() * 10) + 1
      })
    }

    // Mock items with advertising data
    const items = [
      {
        id: 'MLB123456789',
        title: 'Smartphone Samsung Galaxy S21 128GB',
        thumbnail: '/placeholder.png',
        price: 2499.00,
        adStatus: 'active',
        impressions: 45000,
        clicks: 1350,
        conversions: 32,
        spend: 125.50,
        ctr: 3.0,
        roas: 6.4
      },
      {
        id: 'MLB987654321',
        title: 'Fone de Ouvido Bluetooth JBL Tune 510BT',
        thumbnail: '/placeholder.png',
        price: 249.00,
        adStatus: 'active',
        impressions: 32000,
        clicks: 960,
        conversions: 24,
        spend: 85.20,
        ctr: 3.0,
        roas: 7.0
      },
      {
        id: 'MLB456789123',
        title: 'Notebook Dell Inspiron 15 Core i5',
        thumbnail: '/placeholder.png',
        price: 3299.00,
        adStatus: 'paused',
        impressions: 18000,
        clicks: 450,
        conversions: 8,
        spend: 65.00,
        ctr: 2.5,
        roas: 4.1
      }
    ]

    return { campaigns, stats, performance, items }
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
    return value.toLocaleString('pt-BR')
  }

  const getStatusColor = (status) => {
    const colors = {
      active: '#10b981',
      paused: '#f59e0b',
      ended: '#ef4444'
    }
    return colors[status] || '#64748b'
  }

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Ativa',
      paused: 'Pausada',
      ended: 'Encerrada'
    }
    return labels[status] || status
  }

  const toggleCampaignStatus = async (campaignId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    try {
      await api.put(`/advertising/${selectedAccount}/${campaignId}/status`, { status: newStatus })
      setCampaigns(campaigns.map(c => 
        c.id === campaignId ? { ...c, status: newStatus } : c
      ))
    } catch (err) {
      // Update locally for demo
      setCampaigns(campaigns.map(c => 
        c.id === campaignId ? { ...c, status: newStatus } : c
      ))
    }
  }

  return (
    <div className="advertising-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">campaign</span>
            Product Ads
          </h1>
          <p>Gerencie seus anuncios patrocinados</p>
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
            <option value="15">Ultimos 15 dias</option>
            <option value="30">Ultimos 30 dias</option>
            <option value="60">Ultimos 60 dias</option>
          </select>
          <button className="btn btn-primary">
            <span className="material-icons">add</span>
            Nova Campanha
          </button>
        </div>
      </header>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Carregando campanhas...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <section className="kpi-section">
            <div className="kpi-grid">
              <div className="kpi-card spend">
                <div className="kpi-icon">
                  <span className="material-icons">payments</span>
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">Investimento</span>
                  <span className="kpi-value">{formatCurrency(stats.totalSpend)}</span>
                </div>
              </div>

              <div className="kpi-card impressions">
                <div className="kpi-icon">
                  <span className="material-icons">visibility</span>
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">Impressoes</span>
                  <span className="kpi-value">{formatNumber(stats.totalImpressions)}</span>
                </div>
              </div>

              <div className="kpi-card clicks">
                <div className="kpi-icon">
                  <span className="material-icons">touch_app</span>
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">Cliques</span>
                  <span className="kpi-value">{formatNumber(stats.totalClicks)}</span>
                  <span className="kpi-sub">CTR: {stats.avgCtr?.toFixed(2) || 0}%</span>
                </div>
              </div>

              <div className="kpi-card conversions">
                <div className="kpi-icon">
                  <span className="material-icons">shopping_cart</span>
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">Conversoes</span>
                  <span className="kpi-value">{formatNumber(stats.totalConversions)}</span>
                  <span className="kpi-sub">CPC: {formatCurrency(stats.avgCpc || 0)}</span>
                </div>
              </div>

              <div className="kpi-card revenue">
                <div className="kpi-icon">
                  <span className="material-icons">trending_up</span>
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">Receita Gerada</span>
                  <span className="kpi-value">{formatCurrency(stats.totalRevenue || 0)}</span>
                </div>
              </div>

              <div className="kpi-card roi">
                <div className="kpi-icon">
                  <span className="material-icons">insights</span>
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">ROI</span>
                  <span className="kpi-value" style={{ color: stats.roi > 0 ? '#10b981' : '#ef4444' }}>
                    {stats.roi > 0 ? '+' : ''}{stats.roi?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Performance Chart */}
          <section className="chart-section">
            <div className="chart-card">
              <div className="chart-header">
                <h3>
                  <span className="material-icons">show_chart</span>
                  Performance
                </h3>
              </div>
              <div className="chart-body">
                {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                      <YAxis stroke="#9ca3af" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="spend" 
                        stroke="#ef4444" 
                        fill="url(#colorSpend)"
                        name="Investimento (R$)"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#3b82f6" 
                        fill="url(#colorClicks)"
                        name="Cliques"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data">
                    <span className="material-icons">insert_chart</span>
                    <p>Sem dados de performance</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Campaigns List */}
          <section className="campaigns-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="material-icons">list</span>
                Campanhas ({campaigns.length})
              </h2>
            </div>

            <div className="campaigns-grid">
              {campaigns.map(campaign => (
                <div key={campaign.id} className={`campaign-card ${campaign.status}`}>
                  <div className="campaign-header">
                    <div className="campaign-status" style={{ background: getStatusColor(campaign.status) }}>
                      {getStatusLabel(campaign.status)}
                    </div>
                    <button 
                      className="btn-icon"
                      onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                      title={campaign.status === 'active' ? 'Pausar' : 'Ativar'}
                    >
                      <span className="material-icons">
                        {campaign.status === 'active' ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                  </div>

                  <h3 className="campaign-name">{campaign.name}</h3>

                  <div className="campaign-budget">
                    <div className="budget-bar">
                      <div 
                        className="budget-fill" 
                        style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="budget-info">
                      <span>{formatCurrency(campaign.spent)}</span>
                      <span>de {formatCurrency(campaign.budget)}</span>
                    </div>
                  </div>

                  <div className="campaign-metrics">
                    <div className="metric">
                      <span className="metric-value">{formatNumber(campaign.impressions)}</span>
                      <span className="metric-label">Impressoes</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{formatNumber(campaign.clicks)}</span>
                      <span className="metric-label">Cliques</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{campaign.ctr?.toFixed(1) || 0}%</span>
                      <span className="metric-label">CTR</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{campaign.conversions}</span>
                      <span className="metric-label">Vendas</span>
                    </div>
                  </div>

                  <div className="campaign-roas">
                    <span className="roas-label">ROAS</span>
                    <span className="roas-value" style={{ color: campaign.roas > 1 ? '#10b981' : '#ef4444' }}>
                      {campaign.roas?.toFixed(2) || 0}x
                    </span>
                  </div>

                  <div className="campaign-actions">
                    <button className="btn btn-sm btn-secondary">
                      <span className="material-icons">edit</span>
                      Editar
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleViewCampaignDetails(campaign)}>
                      <span className="material-icons">bar_chart</span>
                      Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {campaigns.length === 0 && (
              <div className="empty-state">
                <span className="material-icons">campaign</span>
                <h3>Nenhuma campanha encontrada</h3>
                <p>Crie sua primeira campanha para comecar a anunciar</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                  <span className="material-icons">add</span>
                  Criar Campanha
                </button>
              </div>
            )}
          </section>

          {/* Tips Section */}
          <section className="tips-section">
            <h2 className="section-title">
              <span className="material-icons">tips_and_updates</span>
              Dicas para Melhorar seus Anuncios
            </h2>

            <div className="tips-grid">
              <div className="tip-card">
                <div className="tip-icon">
                  <span className="material-icons">filter_list</span>
                </div>
                <h4>Segmente seu Publico</h4>
                <p>Use palavras-chave relevantes para atingir compradores interessados.</p>
              </div>

              <div className="tip-card">
                <div className="tip-icon">
                  <span className="material-icons">attach_money</span>
                </div>
                <h4>Ajuste seu Lance</h4>
                <p>Comece com lances mais altos e ajuste conforme os resultados.</p>
              </div>

              <div className="tip-card">
                <div className="tip-icon">
                  <span className="material-icons">schedule</span>
                </div>
                <h4>Monitore Diariamente</h4>
                <p>Acompanhe as metricas e pause campanhas que nao performam.</p>
              </div>

              <div className="tip-card">
                <div className="tip-icon">
                  <span className="material-icons">photo</span>
                </div>
                <h4>Otimize seus Anuncios</h4>
                <p>Use boas fotos e titulos claros para aumentar o CTR.</p>
              </div>
            </div>
          </section>

          {/* Product Ads Section */}
          <section className="products-ads-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="material-icons">inventory_2</span>
                Anuncios por Produto ({items.length})
              </h2>
            </div>

            <div className="products-ads-table">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Status</th>
                    <th>Impressoes</th>
                    <th>Cliques</th>
                    <th>CTR</th>
                    <th>Conversoes</th>
                    <th>Investimento</th>
                    <th>ROAS</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(items) ? items : []).map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="product-cell">
                          <img src={item.thumbnail || '/placeholder.png'} alt="" className="product-thumb" />
                          <div className="product-info">
                            <span className="product-title">{item.title?.substring(0, 50)}...</span>
                            <span className="product-id">{item.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${item.adStatus}`}>
                          {item.adStatus === 'active' ? 'Ativo' : 'Pausado'}
                        </span>
                      </td>
                      <td>{formatNumber(item.impressions || 0)}</td>
                      <td>{formatNumber(item.clicks || 0)}</td>
                      <td>{item.ctr?.toFixed(1) || 0}%</td>
                      <td>{item.conversions || 0}</td>
                      <td>{formatCurrency(item.spend || 0)}</td>
                      <td>
                        <span style={{ color: (item.roas || 0) > 1 ? '#10b981' : '#ef4444' }}>
                          {item.roas?.toFixed(1) || 0}x
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon" title="Editar">
                            <span className="material-icons">edit</span>
                          </button>
                          <button className="btn-icon" title={item.adStatus === 'active' ? 'Pausar' : 'Ativar'}>
                            <span className="material-icons">
                              {item.adStatus === 'active' ? 'pause' : 'play_arrow'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span className="material-icons">add_circle</span>
                Nova Campanha
              </h2>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-section">
                <h3>Informacoes Basicas</h3>
                <div className="form-group">
                  <label>Nome da Campanha</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Promocao de Verao"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de Campanha</label>
                    <select
                      value={createForm.type}
                      onChange={e => setCreateForm(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="product_ads">Product Ads</option>
                      <option value="brand_ads">Brand Ads</option>
                      <option value="display_ads">Display Ads</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status Inicial</label>
                    <select
                      value={createForm.status}
                      onChange={e => setCreateForm(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="active">Ativa</option>
                      <option value="paused">Pausada</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Orcamento</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Orcamento Diario (R$)</label>
                    <input
                      type="number"
                      value={createForm.dailyBudget}
                      onChange={e => setCreateForm(prev => ({ ...prev, dailyBudget: e.target.value }))}
                      placeholder="50.00"
                    />
                  </div>

                  <div className="form-group">
                    <label>Orcamento Total (R$)</label>
                    <input
                      type="number"
                      value={createForm.totalBudget}
                      onChange={e => setCreateForm(prev => ({ ...prev, totalBudget: e.target.value }))}
                      placeholder="1500.00"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Estrategia de Lance</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de Lance</label>
                    <select
                      value={createForm.bidStrategy}
                      onChange={e => setCreateForm(prev => ({ ...prev, bidStrategy: e.target.value }))}
                    >
                      <option value="automatic">Automatico (Recomendado)</option>
                      <option value="manual">Manual</option>
                      <option value="target_roas">ROAS Alvo</option>
                    </select>
                  </div>

                  {createForm.bidStrategy === 'manual' && (
                    <div className="form-group">
                      <label>Valor do Lance (R$)</label>
                      <input
                        type="number"
                        value={createForm.bidAmount}
                        onChange={e => setCreateForm(prev => ({ ...prev, bidAmount: e.target.value }))}
                        placeholder="0.50"
                        step="0.01"
                      />
                    </div>
                  )}
                </div>

                <div className="bid-info">
                  <span className="material-icons">info</span>
                  <p>
                    {createForm.bidStrategy === 'automatic' 
                      ? 'O ML otimizara automaticamente seus lances para maximizar conversoes.'
                      : createForm.bidStrategy === 'manual'
                      ? 'Voce define o valor maximo por clique. Recomendado para usuarios experientes.'
                      : 'O sistema ajustara lances para atingir o ROAS desejado.'}
                  </p>
                </div>
              </div>

              <div className="form-section">
                <h3>Duracao</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Data de Inicio</label>
                    <input
                      type="date"
                      value={createForm.startDate}
                      onChange={e => setCreateForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Data de Termino (opcional)</label>
                    <input
                      type="date"
                      value={createForm.endDate}
                      onChange={e => setCreateForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Palavras-chave (opcional)</h3>
                <div className="form-group">
                  <label>Adicionar palavras-chave</label>
                  <textarea
                    value={createForm.keywords}
                    onChange={e => setCreateForm(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="smartphone, celular, samsung&#10;Separe por virgula ou quebra de linha"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateCampaign}
                disabled={!createForm.name || (!createForm.dailyBudget && !createForm.totalBudget)}
              >
                <span className="material-icons">rocket_launch</span>
                Criar Campanha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Detail Modal */}
      {showDetailModal && selectedCampaign && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span className="material-icons">analytics</span>
                {selectedCampaign.name}
              </h2>
              <button className="btn-icon" onClick={() => setShowDetailModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="campaign-detail-stats">
                <div className="detail-stat">
                  <span className="label">Status</span>
                  <span className={`status-badge ${selectedCampaign.status}`}>
                    {getStatusLabel(selectedCampaign.status)}
                  </span>
                </div>
                <div className="detail-stat">
                  <span className="label">Orcamento</span>
                  <span className="value">{formatCurrency(selectedCampaign.budget)}</span>
                </div>
                <div className="detail-stat">
                  <span className="label">Gasto</span>
                  <span className="value">{formatCurrency(selectedCampaign.spent)}</span>
                </div>
                <div className="detail-stat">
                  <span className="label">Impressoes</span>
                  <span className="value">{formatNumber(selectedCampaign.impressions)}</span>
                </div>
                <div className="detail-stat">
                  <span className="label">Cliques</span>
                  <span className="value">{formatNumber(selectedCampaign.clicks)}</span>
                </div>
                <div className="detail-stat">
                  <span className="label">CTR</span>
                  <span className="value">{selectedCampaign.ctr?.toFixed(2)}%</span>
                </div>
                <div className="detail-stat">
                  <span className="label">CPC Medio</span>
                  <span className="value">{formatCurrency(selectedCampaign.cpc)}</span>
                </div>
                <div className="detail-stat">
                  <span className="label">Conversoes</span>
                  <span className="value">{selectedCampaign.conversions}</span>
                </div>
                <div className="detail-stat">
                  <span className="label">Receita</span>
                  <span className="value">{formatCurrency(selectedCampaign.revenue)}</span>
                </div>
                <div className="detail-stat highlight">
                  <span className="label">ROAS</span>
                  <span className="value" style={{ color: selectedCampaign.roas > 1 ? '#10b981' : '#ef4444' }}>
                    {selectedCampaign.roas?.toFixed(2)}x
                  </span>
                </div>
              </div>

              <div className="campaign-performance-chart">
                <h3>Performance dos Ultimos 7 dias</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={performanceData.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="clicks" stroke="#3b82f6" name="Cliques" />
                    <Line type="monotone" dataKey="conversions" stroke="#10b981" name="Conversoes" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => toggleCampaignStatus(selectedCampaign.id, selectedCampaign.status)}
              >
                <span className="material-icons">
                  {selectedCampaign.status === 'active' ? 'pause' : 'play_arrow'}
                </span>
                {selectedCampaign.status === 'active' ? 'Pausar' : 'Ativar'} Campanha
              </button>
              <button className="btn btn-primary">
                <span className="material-icons">edit</span>
                Editar Campanha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Advertising
