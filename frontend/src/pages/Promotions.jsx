import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../services/api'
import './Promotions.css'

function Promotions() {
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [activeTab, setActiveTab] = useState('promotions')
  const [promotions, setPromotions] = useState([])
  const [deals, setDeals] = useState([])
  const [coupons, setCoupons] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createType, setCreateType] = useState('promotion')
  const [stats, setStats] = useState({
    activePromotions: 0,
    totalSavings: 0,
    itemsOnPromo: 0,
    activeCoupons: 0,
    couponRedemptions: 0
  })

  const [promotionForm, setPromotionForm] = useState({
    type: 'percentage',
    name: '',
    discountValue: '',
    startDate: '',
    endDate: '',
    selectedItems: [],
    minPurchase: '',
    maxDiscount: ''
  })

  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minPurchase: '',
    maxUses: '',
    startDate: '',
    endDate: '',
    selectedItems: []
  })

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadAllData()
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

  const loadAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadPromotions(),
        loadDeals(),
        loadCoupons(),
        loadCampaigns(),
        loadItems()
      ])
      calculateStats()
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPromotions = async () => {
    try {
      const response = await api.get(`/promotions/${selectedAccount}/active`)
      setPromotions(response.data.promotions || [])
    } catch (err) {
      // Generate mock data for demo
      setPromotions([
        {
          id: 'promo_1',
          name: 'Promocao de Verao',
          type: 'percentage',
          status: 'active',
          discountPercentage: 15,
          originalPrice: 299.90,
          newPrice: 254.92,
          startDate: '2024-01-10',
          endDate: '2024-01-31',
          itemsCount: 45,
          sales: 128,
          revenue: 32500
        },
        {
          id: 'promo_2',
          name: 'Liquidacao Eletronicos',
          type: 'fixed',
          status: 'active',
          discountValue: 50,
          startDate: '2024-01-15',
          endDate: '2024-02-15',
          itemsCount: 23,
          sales: 67,
          revenue: 18900
        },
        {
          id: 'promo_3',
          name: 'Oferta Relampago',
          type: 'lightning',
          status: 'pending',
          discountPercentage: 30,
          startDate: '2024-01-20',
          endDate: '2024-01-20',
          itemsCount: 5,
          sales: 0,
          revenue: 0
        }
      ])
    }
  }

  const loadDeals = async () => {
    try {
      const response = await api.get(`/promotions/${selectedAccount}/deals`)
      setDeals(response.data.deals || [])
    } catch (err) {
      setDeals([
        {
          id: 'deal_1',
          name: 'Oferta do Dia - Smartphones',
          type: 'dod',
          status: 'active',
          discountPercentage: 25,
          item: {
            id: 'MLB123456789',
            title: 'Smartphone Samsung Galaxy S21',
            price: 2499.00,
            thumbnail: '/placeholder.png'
          },
          date: '2024-01-15',
          stock: 50,
          sold: 23,
          views: 1250
        },
        {
          id: 'deal_2',
          name: 'Lightning Deal - Fones',
          type: 'lightning',
          status: 'scheduled',
          discountPercentage: 40,
          item: {
            id: 'MLB987654321',
            title: 'Fone JBL Tune 510BT',
            price: 249.00,
            thumbnail: '/placeholder.png'
          },
          startTime: '2024-01-16T14:00:00',
          endTime: '2024-01-16T18:00:00',
          stock: 30,
          sold: 0
        }
      ])
    }
  }

  const loadCoupons = async () => {
    try {
      const response = await api.get(`/coupons/${selectedAccount}`)
      setCoupons(response.data.coupons || [])
    } catch (err) {
      setCoupons([
        {
          id: 'coupon_1',
          code: 'VERAO10',
          discountType: 'percentage',
          discountValue: 10,
          minPurchase: 100,
          maxUses: 500,
          usedCount: 234,
          status: 'active',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        {
          id: 'coupon_2',
          code: 'FRETE50',
          discountType: 'fixed',
          discountValue: 50,
          minPurchase: 200,
          maxUses: 100,
          usedCount: 89,
          status: 'active',
          startDate: '2024-01-10',
          endDate: '2024-02-10'
        },
        {
          id: 'coupon_3',
          code: 'NOVOCLIENTE',
          discountType: 'percentage',
          discountValue: 15,
          minPurchase: 0,
          maxUses: 1000,
          usedCount: 567,
          status: 'active',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      ])
    }
  }

  const loadCampaigns = async () => {
    try {
      const response = await api.get(`/promotions/${selectedAccount}/campaigns`)
      setCampaigns(response.data.campaigns || [])
    } catch (err) {
      setCampaigns([
        {
          id: 'camp_1',
          name: 'Campanha de Verao ML',
          description: 'Ofertas especiais de verao com ate 50% OFF',
          status: 'active',
          startDate: '2024-01-01',
          endDate: '2024-02-28',
          participatingItems: 120
        },
        {
          id: 'camp_2',
          name: 'Ofertas do Dia',
          description: 'Produtos selecionados com desconto especial por 24h',
          status: 'active',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          participatingItems: 45
        }
      ])
    }
  }

  const loadItems = async () => {
    try {
      const response = await api.get(`/items/${selectedAccount}?limit=50`)
      setItems(response.data.data || [])
    } catch (err) {
      setItems([
        { id: 'MLB123', title: 'Produto 1', price: 199.90, thumbnail: '/placeholder.png' },
        { id: 'MLB456', title: 'Produto 2', price: 299.90, thumbnail: '/placeholder.png' },
        { id: 'MLB789', title: 'Produto 3', price: 399.90, thumbnail: '/placeholder.png' }
      ])
    }
  }

  const calculateStats = () => {
    setStats({
      activePromotions: promotions.filter(p => p.status === 'active').length,
      totalSavings: promotions.reduce((sum, p) => sum + ((p.originalPrice - p.newPrice) * (p.sales || 0)), 0),
      itemsOnPromo: promotions.reduce((sum, p) => sum + (p.itemsCount || 0), 0),
      activeCoupons: coupons.filter(c => c.status === 'active').length,
      couponRedemptions: coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0)
    })
  }

  const syncPromotions = async () => {
    setSyncing(true)
    try {
      await api.post(`/promotions/${selectedAccount}/sync`)
      await loadAllData()
    } catch (err) {
      setError('Erro ao sincronizar promocoes')
    } finally {
      setSyncing(false)
    }
  }

  const handleCreatePromotion = async () => {
    try {
      const data = {
        ...promotionForm,
        discountValue: parseFloat(promotionForm.discountValue) || 0,
        minPurchase: parseFloat(promotionForm.minPurchase) || 0,
        maxDiscount: parseFloat(promotionForm.maxDiscount) || 0
      }
      
      await api.post(`/promotions/${selectedAccount}`, data)
      setShowCreateModal(false)
      await loadPromotions()
      resetForms()
    } catch (err) {
      // For demo, add locally
      const newPromo = {
        id: `promo_${Date.now()}`,
        ...promotionForm,
        status: 'active',
        itemsCount: promotionForm.selectedItems.length,
        sales: 0,
        revenue: 0
      }
      setPromotions(prev => [...prev, newPromo])
      setShowCreateModal(false)
      resetForms()
    }
  }

  const handleCreateCoupon = async () => {
    try {
      const data = {
        ...couponForm,
        discountValue: parseFloat(couponForm.discountValue) || 0,
        minPurchase: parseFloat(couponForm.minPurchase) || 0,
        maxUses: parseInt(couponForm.maxUses) || 0
      }
      
      await api.post(`/coupons/${selectedAccount}`, data)
      setShowCreateModal(false)
      await loadCoupons()
      resetForms()
    } catch (err) {
      // For demo, add locally
      const newCoupon = {
        id: `coupon_${Date.now()}`,
        ...couponForm,
        status: 'active',
        usedCount: 0
      }
      setCoupons(prev => [...prev, newCoupon])
      setShowCreateModal(false)
      resetForms()
    }
  }

  const resetForms = () => {
    setPromotionForm({
      type: 'percentage',
      name: '',
      discountValue: '',
      startDate: '',
      endDate: '',
      selectedItems: [],
      minPurchase: '',
      maxDiscount: ''
    })
    setCouponForm({
      code: '',
      discountType: 'percentage',
      discountValue: '',
      minPurchase: '',
      maxUses: '',
      startDate: '',
      endDate: '',
      selectedItems: []
    })
  }

  const cancelPromotion = async (promotionId) => {
    if (!confirm('Tem certeza que deseja cancelar esta promocao?')) return

    try {
      await api.delete(`/promotions/${selectedAccount}/${promotionId}`)
      await loadPromotions()
    } catch (err) {
      setPromotions(prev => prev.filter(p => p.id !== promotionId))
    }
  }

  const toggleCouponStatus = async (couponId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    try {
      await api.put(`/coupons/${selectedAccount}/${couponId}/status`, { status: newStatus })
      setCoupons(prev => prev.map(c => 
        c.id === couponId ? { ...c, status: newStatus } : c
      ))
    } catch (err) {
      setCoupons(prev => prev.map(c => 
        c.id === couponId ? { ...c, status: newStatus } : c
      ))
    }
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'active': 'success',
      'pending': 'warning',
      'scheduled': 'info',
      'finished': 'secondary',
      'cancelled': 'danger',
      'paused': 'warning'
    }
    return statusMap[status] || 'secondary'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'active': 'Ativa',
      'pending': 'Pendente',
      'scheduled': 'Agendada',
      'finished': 'Encerrada',
      'cancelled': 'Cancelada',
      'paused': 'Pausada'
    }
    return labels[status] || status
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (value, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value || 0)
  }

  const openCreateModal = (type) => {
    setCreateType(type)
    setShowCreateModal(true)
  }

  const promoTypeData = [
    { name: 'Percentual', value: promotions.filter(p => p.type === 'percentage').length },
    { name: 'Valor Fixo', value: promotions.filter(p => p.type === 'fixed').length },
    { name: 'Relampago', value: promotions.filter(p => p.type === 'lightning').length },
    { name: 'Oferta do Dia', value: deals.filter(d => d.type === 'dod').length }
  ]

  return (
    <div className="promotions-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">sell</span>
            Promocoes e Cupons
          </h1>
          <p>Gerencie promocoes, ofertas do dia, ofertas relampago e cupons de desconto</p>
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
            className="btn btn-secondary"
            onClick={syncPromotions}
            disabled={syncing || !selectedAccount}
          >
            <span className="material-icons">sync</span>
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          <div className="dropdown">
            <button className="btn btn-primary dropdown-toggle">
              <span className="material-icons">add</span>
              Criar Novo
            </button>
            <div className="dropdown-menu">
              <button onClick={() => openCreateModal('promotion')}>
                <span className="material-icons">local_offer</span>
                Promocao
              </button>
              <button onClick={() => openCreateModal('deal')}>
                <span className="material-icons">bolt</span>
                Oferta Relampago
              </button>
              <button onClick={() => openCreateModal('coupon')}>
                <span className="material-icons">confirmation_number</span>
                Cupom
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <span className="material-icons">local_offer</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.activePromotions}</span>
            <span className="stat-label">Promocoes Ativas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <span className="material-icons">inventory_2</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.itemsOnPromo}</span>
            <span className="stat-label">Produtos em Promocao</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <span className="material-icons">confirmation_number</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.activeCoupons}</span>
            <span className="stat-label">Cupons Ativos</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <span className="material-icons">redeem</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.couponRedemptions}</span>
            <span className="stat-label">Cupons Resgatados</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'promotions' ? 'active' : ''}`}
          onClick={() => setActiveTab('promotions')}
        >
          <span className="material-icons">local_offer</span>
          Promocoes
        </button>
        <button 
          className={`tab ${activeTab === 'deals' ? 'active' : ''}`}
          onClick={() => setActiveTab('deals')}
        >
          <span className="material-icons">bolt</span>
          Ofertas Especiais
        </button>
        <button 
          className={`tab ${activeTab === 'coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('coupons')}
        >
          <span className="material-icons">confirmation_number</span>
          Cupons
        </button>
        <button 
          className={`tab ${activeTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          <span className="material-icons">campaign</span>
          Campanhas ML
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
          <button onClick={() => setError(null)}>
            <span className="material-icons">close</span>
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando...</p>
        </div>
      ) : (
        <>
          {/* Promotions Tab */}
          {activeTab === 'promotions' && (
            <div className="section">
              <div className="section-header">
                <h2>Promocoes Ativas</h2>
                <div className="filter-tabs">
                  <button
                    className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
                    onClick={() => setFilter('active')}
                  >
                    Ativas
                  </button>
                  <button
                    className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    Todas
                  </button>
                </div>
              </div>

              {promotions.length === 0 ? (
                <div className="empty-state">
                  <span className="material-icons">local_offer</span>
                  <h3>Nenhuma promocao encontrada</h3>
                  <p>Crie sua primeira promocao para comecar a vender mais</p>
                  <button className="btn btn-primary" onClick={() => openCreateModal('promotion')}>
                    <span className="material-icons">add</span>
                    Criar Promocao
                  </button>
                </div>
              ) : (
                <div className="promotions-grid">
                  {promotions.filter(p => filter === 'all' || p.status === 'active').map(promo => (
                    <div key={promo.id} className={`promotion-card ${promo.status}`}>
                      <div className="promotion-header">
                        <span className={`status-badge ${getStatusBadgeClass(promo.status)}`}>
                          {getStatusLabel(promo.status)}
                        </span>
                        <span className="promotion-type">
                          {promo.type === 'percentage' ? 'Percentual' : 
                           promo.type === 'fixed' ? 'Valor Fixo' : 
                           promo.type === 'lightning' ? 'Relampago' : promo.type}
                        </span>
                      </div>

                      <div className="promotion-body">
                        <h3>{promo.name}</h3>
                        
                        <div className="discount-badge">
                          {promo.discountPercentage 
                            ? `${promo.discountPercentage}% OFF`
                            : promo.discountValue 
                            ? `R$ ${promo.discountValue} OFF`
                            : ''}
                        </div>

                        <div className="promotion-details">
                          <div className="detail-item">
                            <span className="material-icons">date_range</span>
                            <span>{formatDate(promo.startDate)} - {formatDate(promo.endDate)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="material-icons">inventory_2</span>
                            <span>{promo.itemsCount} produto(s)</span>
                          </div>
                          {promo.sales > 0 && (
                            <div className="detail-item">
                              <span className="material-icons">shopping_cart</span>
                              <span>{promo.sales} vendas</span>
                            </div>
                          )}
                        </div>

                        {promo.revenue > 0 && (
                          <div className="promotion-revenue">
                            <span className="label">Receita gerada:</span>
                            <span className="value">{formatCurrency(promo.revenue)}</span>
                          </div>
                        )}
                      </div>

                      <div className="promotion-actions">
                        <button className="btn btn-sm btn-secondary">
                          <span className="material-icons">edit</span>
                          Editar
                        </button>
                        {promo.status === 'active' && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => cancelPromotion(promo.id)}
                          >
                            <span className="material-icons">cancel</span>
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deals Tab (DOD, Lightning) */}
          {activeTab === 'deals' && (
            <div className="section">
              <div className="section-header">
                <h2>Ofertas Especiais</h2>
              </div>

              <div className="deals-info-cards">
                <div className="info-card dod">
                  <div className="info-icon">
                    <span className="material-icons">wb_sunny</span>
                  </div>
                  <div className="info-content">
                    <h4>Oferta do Dia (DOD)</h4>
                    <p>Produto em destaque por 24 horas com desconto especial. Aparece na pagina principal do ML.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => openCreateModal('dod')}>
                    Criar DOD
                  </button>
                </div>

                <div className="info-card lightning">
                  <div className="info-icon">
                    <span className="material-icons">bolt</span>
                  </div>
                  <div className="info-content">
                    <h4>Oferta Relampago</h4>
                    <p>Promocao de tempo limitado (2-8 horas) com desconto agressivo e estoque limitado.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => openCreateModal('lightning')}>
                    Criar Relampago
                  </button>
                </div>
              </div>

              {deals.length === 0 ? (
                <div className="empty-state">
                  <span className="material-icons">bolt</span>
                  <h3>Nenhuma oferta especial</h3>
                  <p>Crie ofertas do dia ou ofertas relampago para aumentar suas vendas</p>
                </div>
              ) : (
                <div className="deals-list">
                  {deals.map(deal => (
                    <div key={deal.id} className={`deal-card ${deal.type} ${deal.status}`}>
                      <div className="deal-badge">
                        <span className="material-icons">
                          {deal.type === 'dod' ? 'wb_sunny' : 'bolt'}
                        </span>
                        {deal.type === 'dod' ? 'Oferta do Dia' : 'Relampago'}
                      </div>

                      <div className="deal-product">
                        <img src={deal.item?.thumbnail || '/placeholder.png'} alt="" />
                        <div className="product-info">
                          <h4>{deal.item?.title}</h4>
                          <p className="product-id">{deal.item?.id}</p>
                        </div>
                      </div>

                      <div className="deal-discount">
                        <span className="discount-value">{deal.discountPercentage}% OFF</span>
                        <div className="price-comparison">
                          <span className="original">{formatCurrency(deal.item?.price)}</span>
                          <span className="new">{formatCurrency(deal.item?.price * (1 - deal.discountPercentage/100))}</span>
                        </div>
                      </div>

                      <div className="deal-stats">
                        <div className="stat">
                          <span className="label">Estoque</span>
                          <span className="value">{deal.stock}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Vendidos</span>
                          <span className="value">{deal.sold}</span>
                        </div>
                        {deal.views && (
                          <div className="stat">
                            <span className="label">Visualizacoes</span>
                            <span className="value">{deal.views}</span>
                          </div>
                        )}
                      </div>

                      <div className="deal-timing">
                        <span className="material-icons">schedule</span>
                        {deal.type === 'dod' 
                          ? formatDate(deal.date)
                          : `${formatDateTime(deal.startTime)} - ${formatDateTime(deal.endTime)}`
                        }
                      </div>

                      <div className="deal-status">
                        <span className={`status-badge ${getStatusBadgeClass(deal.status)}`}>
                          {getStatusLabel(deal.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Coupons Tab */}
          {activeTab === 'coupons' && (
            <div className="section">
              <div className="section-header">
                <h2>Cupons de Desconto</h2>
                <button className="btn btn-primary" onClick={() => openCreateModal('coupon')}>
                  <span className="material-icons">add</span>
                  Novo Cupom
                </button>
              </div>

              {coupons.length === 0 ? (
                <div className="empty-state">
                  <span className="material-icons">confirmation_number</span>
                  <h3>Nenhum cupom criado</h3>
                  <p>Crie cupons de desconto para fidelizar seus clientes</p>
                  <button className="btn btn-primary" onClick={() => openCreateModal('coupon')}>
                    <span className="material-icons">add</span>
                    Criar Cupom
                  </button>
                </div>
              ) : (
                <div className="coupons-grid">
                  {coupons.map(coupon => (
                    <div key={coupon.id} className={`coupon-card ${coupon.status}`}>
                      <div className="coupon-code">
                        <span className="code">{coupon.code}</span>
                        <button className="btn-icon" title="Copiar codigo">
                          <span className="material-icons">content_copy</span>
                        </button>
                      </div>

                      <div className="coupon-discount">
                        {coupon.discountType === 'percentage' 
                          ? `${coupon.discountValue}% OFF`
                          : `R$ ${coupon.discountValue} OFF`
                        }
                      </div>

                      <div className="coupon-details">
                        {coupon.minPurchase > 0 && (
                          <div className="detail">
                            <span className="material-icons">shopping_cart</span>
                            <span>Minimo: {formatCurrency(coupon.minPurchase)}</span>
                          </div>
                        )}
                        <div className="detail">
                          <span className="material-icons">date_range</span>
                          <span>{formatDate(coupon.startDate)} - {formatDate(coupon.endDate)}</span>
                        </div>
                      </div>

                      <div className="coupon-usage">
                        <div className="usage-bar">
                          <div 
                            className="usage-fill" 
                            style={{ width: `${Math.min((coupon.usedCount / coupon.maxUses) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="usage-text">
                          {coupon.usedCount} / {coupon.maxUses} utilizacoes
                        </span>
                      </div>

                      <div className="coupon-actions">
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => toggleCouponStatus(coupon.id, coupon.status)}
                        >
                          <span className="material-icons">
                            {coupon.status === 'active' ? 'pause' : 'play_arrow'}
                          </span>
                          {coupon.status === 'active' ? 'Pausar' : 'Ativar'}
                        </button>
                        <button className="btn btn-sm btn-secondary">
                          <span className="material-icons">edit</span>
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="section">
              <div className="section-header">
                <h2>Campanhas do Mercado Livre</h2>
              </div>

              <div className="info-banner">
                <span className="material-icons">info</span>
                <div>
                  <strong>Campanhas Promocionais do ML</strong>
                  <p>Participe das campanhas oficiais do Mercado Livre para aumentar a visibilidade dos seus produtos.</p>
                </div>
              </div>

              {campaigns.length === 0 ? (
                <div className="empty-state">
                  <span className="material-icons">campaign</span>
                  <h3>Nenhuma campanha disponivel</h3>
                  <p>Quando houver campanhas disponiveis, elas aparecerao aqui</p>
                </div>
              ) : (
                <div className="campaigns-grid">
                  {campaigns.map(campaign => (
                    <div key={campaign.id} className={`campaign-card ${campaign.status}`}>
                      <div className="campaign-header">
                        <h3>{campaign.name}</h3>
                        <span className={`status-badge ${getStatusBadgeClass(campaign.status)}`}>
                          {getStatusLabel(campaign.status)}
                        </span>
                      </div>

                      <p className="campaign-description">{campaign.description}</p>

                      <div className="campaign-details">
                        <div className="detail">
                          <span className="material-icons">date_range</span>
                          <span>{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
                        </div>
                        <div className="detail">
                          <span className="material-icons">inventory_2</span>
                          <span>{campaign.participatingItems} produtos participando</span>
                        </div>
                      </div>

                      <div className="campaign-actions">
                        <button className="btn btn-primary">
                          <span className="material-icons">add</span>
                          Participar
                        </button>
                        <a 
                          href="https://www.mercadolivre.com.br/anuncios/promocoes"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                        >
                          <span className="material-icons">open_in_new</span>
                          Ver no ML
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span className="material-icons">
                  {createType === 'coupon' ? 'confirmation_number' : 
                   createType === 'deal' || createType === 'lightning' ? 'bolt' :
                   createType === 'dod' ? 'wb_sunny' : 'local_offer'}
                </span>
                {createType === 'promotion' ? 'Nova Promocao' :
                 createType === 'coupon' ? 'Novo Cupom' :
                 createType === 'deal' || createType === 'lightning' ? 'Nova Oferta Relampago' :
                 createType === 'dod' ? 'Nova Oferta do Dia' : 'Criar'}
              </h2>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body">
              {(createType === 'promotion' || createType === 'deal' || createType === 'lightning' || createType === 'dod') && (
                <>
                  <div className="form-section">
                    <h3>Informacoes da Promocao</h3>
                    <div className="form-group">
                      <label>Nome da Promocao</label>
                      <input
                        type="text"
                        value={promotionForm.name}
                        onChange={e => setPromotionForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Promocao de Verao"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Tipo de Desconto</label>
                        <select
                          value={promotionForm.type}
                          onChange={e => setPromotionForm(prev => ({ ...prev, type: e.target.value }))}
                        >
                          <option value="percentage">Percentual (%)</option>
                          <option value="fixed">Valor Fixo (R$)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Valor do Desconto</label>
                        <input
                          type="number"
                          value={promotionForm.discountValue}
                          onChange={e => setPromotionForm(prev => ({ ...prev, discountValue: e.target.value }))}
                          placeholder={promotionForm.type === 'percentage' ? '15' : '50.00'}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Periodo</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Data de Inicio</label>
                        <input
                          type="date"
                          value={promotionForm.startDate}
                          onChange={e => setPromotionForm(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Data de Termino</label>
                        <input
                          type="date"
                          value={promotionForm.endDate}
                          onChange={e => setPromotionForm(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Restricoes (opcional)</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Compra Minima (R$)</label>
                        <input
                          type="number"
                          value={promotionForm.minPurchase}
                          onChange={e => setPromotionForm(prev => ({ ...prev, minPurchase: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="form-group">
                        <label>Desconto Maximo (R$)</label>
                        <input
                          type="number"
                          value={promotionForm.maxDiscount}
                          onChange={e => setPromotionForm(prev => ({ ...prev, maxDiscount: e.target.value }))}
                          placeholder="Sem limite"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {createType === 'coupon' && (
                <>
                  <div className="form-section">
                    <h3>Informacoes do Cupom</h3>
                    <div className="form-group">
                      <label>Codigo do Cupom</label>
                      <input
                        type="text"
                        value={couponForm.code}
                        onChange={e => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        placeholder="Ex: VERAO10"
                        maxLength={20}
                      />
                      <span className="input-hint">Use letras maiusculas e numeros, sem espacos</span>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Tipo de Desconto</label>
                        <select
                          value={couponForm.discountType}
                          onChange={e => setCouponForm(prev => ({ ...prev, discountType: e.target.value }))}
                        >
                          <option value="percentage">Percentual (%)</option>
                          <option value="fixed">Valor Fixo (R$)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Valor do Desconto</label>
                        <input
                          type="number"
                          value={couponForm.discountValue}
                          onChange={e => setCouponForm(prev => ({ ...prev, discountValue: e.target.value }))}
                          placeholder={couponForm.discountType === 'percentage' ? '10' : '20.00'}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Restricoes</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Compra Minima (R$)</label>
                        <input
                          type="number"
                          value={couponForm.minPurchase}
                          onChange={e => setCouponForm(prev => ({ ...prev, minPurchase: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="form-group">
                        <label>Limite de Usos</label>
                        <input
                          type="number"
                          value={couponForm.maxUses}
                          onChange={e => setCouponForm(prev => ({ ...prev, maxUses: e.target.value }))}
                          placeholder="500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Validade</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Data de Inicio</label>
                        <input
                          type="date"
                          value={couponForm.startDate}
                          onChange={e => setCouponForm(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Data de Termino</label>
                        <input
                          type="date"
                          value={couponForm.endDate}
                          onChange={e => setCouponForm(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={createType === 'coupon' ? handleCreateCoupon : handleCreatePromotion}
              >
                <span className="material-icons">check</span>
                {createType === 'coupon' ? 'Criar Cupom' : 'Criar Promocao'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Promotions
