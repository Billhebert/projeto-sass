import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './Catalog.css'

function Catalog() {
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [items, setItems] = useState([])
  const [catalogProducts, setCatalogProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('eligibility')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    catalogListed: 0,
    buyBoxWinner: 0,
    eligible: 0
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadItems()
      loadStats()
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

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/catalog/${selectedAccount}/items`)
      setItems(response.data.items || [])
    } catch (err) {
      setError('Erro ao carregar itens')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await api.get(`/catalog/${selectedAccount}/stats`)
      setStats(response.data.stats || stats)
    } catch (err) {
      console.error('Erro ao carregar estatisticas:', err)
    }
  }

  const checkEligibility = async (itemId) => {
    try {
      const response = await api.get(`/catalog/${selectedAccount}/items/${itemId}/eligibility`)
      return response.data
    } catch (err) {
      setError('Erro ao verificar elegibilidade')
      return null
    }
  }

  const searchCatalogProducts = async () => {
    if (!searchTerm.trim()) return
    
    setLoading(true)
    try {
      const response = await api.get(`/catalog/${selectedAccount}/products/search`, {
        params: { q: searchTerm }
      })
      setCatalogProducts(response.data.products || [])
      setActiveTab('search')
    } catch (err) {
      setError('Erro ao buscar produtos no catalogo')
    } finally {
      setLoading(false)
    }
  }

  const publishToCatalog = async (itemId, catalogProductId) => {
    try {
      await api.post(`/catalog/${selectedAccount}/items/${itemId}/catalog`, {
        catalog_product_id: catalogProductId
      })
      await loadItems()
      setShowProductModal(false)
      setSelectedItem(null)
    } catch (err) {
      setError('Erro ao publicar no catalogo')
    }
  }

  const getEligibilityBadge = (status) => {
    const badges = {
      'eligible': { class: 'badge-success', text: 'Elegivel' },
      'not_eligible': { class: 'badge-danger', text: 'Nao Elegivel' },
      'pending': { class: 'badge-warning', text: 'Pendente' },
      'catalog_listed': { class: 'badge-primary', text: 'No Catalogo' }
    }
    return badges[status] || { class: 'badge-secondary', text: status }
  }

  const getBuyBoxBadge = (isWinner) => {
    return isWinner 
      ? { class: 'badge-success', icon: 'emoji_events', text: 'Ganhador' }
      : { class: 'badge-warning', icon: 'trending_down', text: 'Competindo' }
  }

  const formatCurrency = (value, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value || 0)
  }

  const filteredItems = items.filter(item => {
    if (activeTab === 'eligibility') return !item.catalogListed
    if (activeTab === 'catalog') return item.catalogListed
    if (activeTab === 'buybox') return item.catalogListed && item.inCompetition
    return true
  })

  return (
    <div className="catalog-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">menu_book</span>
            Catalogo & Buy Box
          </h1>
          <p>Gerencie seus produtos no catalogo e competicao Buy Box</p>
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
            onClick={loadItems}
            disabled={loading || !selectedAccount}
          >
            <span className="material-icons">refresh</span>
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <span className="material-icons">inventory_2</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total de Itens</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <span className="material-icons">menu_book</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.catalogListed}</span>
            <span className="stat-label">No Catalogo</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gold">
            <span className="material-icons">emoji_events</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.buyBoxWinner}</span>
            <span className="stat-label">Ganhando Buy Box</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <span className="material-icons">check_circle</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.eligible}</span>
            <span className="stat-label">Elegiveis</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <span className="material-icons">search</span>
          <input
            type="text"
            placeholder="Buscar produtos no catalogo por nome, GTIN, EAN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchCatalogProducts()}
          />
          <button 
            className="btn btn-primary"
            onClick={searchCatalogProducts}
            disabled={!searchTerm.trim()}
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        <button
          className={`tab ${activeTab === 'eligibility' ? 'active' : ''}`}
          onClick={() => setActiveTab('eligibility')}
        >
          <span className="material-icons">fact_check</span>
          Elegibilidade
        </button>
        <button
          className={`tab ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <span className="material-icons">menu_book</span>
          No Catalogo
        </button>
        <button
          className={`tab ${activeTab === 'buybox' ? 'active' : ''}`}
          onClick={() => setActiveTab('buybox')}
        >
          <span className="material-icons">emoji_events</span>
          Buy Box
        </button>
        {catalogProducts.length > 0 && (
          <button
            className={`tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <span className="material-icons">search</span>
            Resultados ({catalogProducts.length})
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {/* Content */}
      <div className="catalog-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando...</p>
          </div>
        ) : activeTab === 'search' && catalogProducts.length > 0 ? (
          <div className="catalog-products-grid">
            {catalogProducts.map(product => (
              <div key={product.id} className="catalog-product-card">
                <div className="product-image">
                  {product.thumbnail ? (
                    <img src={product.thumbnail} alt={product.name} />
                  ) : (
                    <span className="material-icons">image</span>
                  )}
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-id">ID: {product.id}</p>
                  {product.gtin && <p className="product-gtin">GTIN: {product.gtin}</p>}
                  <div className="product-attributes">
                    {product.attributes?.slice(0, 3).map((attr, idx) => (
                      <span key={idx} className="attribute-tag">
                        {attr.name}: {attr.value}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="product-actions">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      setSelectedItem({ catalogProductId: product.id })
                      setShowProductModal(true)
                    }}
                  >
                    <span className="material-icons">add</span>
                    Vincular Item
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">
              {activeTab === 'buybox' ? 'emoji_events' : 'menu_book'}
            </span>
            <h3>Nenhum item encontrado</h3>
            <p>
              {activeTab === 'eligibility' && 'Seus itens elegiveis para catalogo aparecerao aqui'}
              {activeTab === 'catalog' && 'Seus itens no catalogo aparecerao aqui'}
              {activeTab === 'buybox' && 'Seus itens competindo no Buy Box aparecerao aqui'}
            </p>
          </div>
        ) : (
          <div className="items-table">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Status</th>
                  {activeTab === 'buybox' && <th>Buy Box</th>}
                  <th>Preco</th>
                  {activeTab === 'buybox' && <th>Competidores</th>}
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const eligibility = getEligibilityBadge(item.catalogStatus)
                  const buyBox = item.buyBoxWinner !== undefined ? getBuyBoxBadge(item.buyBoxWinner) : null
                  
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="item-cell">
                          <div className="item-image">
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt={item.title} />
                            ) : (
                              <span className="material-icons">image</span>
                            )}
                          </div>
                          <div className="item-details">
                            <span className="item-title">{item.title}</span>
                            <span className="item-id">{item.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${eligibility.class}`}>
                          {eligibility.text}
                        </span>
                      </td>
                      {activeTab === 'buybox' && buyBox && (
                        <td>
                          <span className={`badge ${buyBox.class}`}>
                            <span className="material-icons">{buyBox.icon}</span>
                            {buyBox.text}
                          </span>
                        </td>
                      )}
                      <td>
                        <span className="price">{formatCurrency(item.price)}</span>
                        {item.competitorPrice && item.competitorPrice < item.price && (
                          <span className="competitor-price">
                            Menor: {formatCurrency(item.competitorPrice)}
                          </span>
                        )}
                      </td>
                      {activeTab === 'buybox' && (
                        <td>
                          <span className="competitors-count">
                            {item.competitorsCount || 0} vendedores
                          </span>
                        </td>
                      )}
                      <td>
                        <div className="actions">
                          {!item.catalogListed && item.catalogStatus === 'eligible' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => {
                                setSelectedItem(item)
                                setShowProductModal(true)
                              }}
                            >
                              <span className="material-icons">add</span>
                              Publicar
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => checkEligibility(item.id)}
                          >
                            <span className="material-icons">fact_check</span>
                            Verificar
                          </button>
                          <a
                            href={item.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline"
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
          </div>
        )}
      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Selecionar Produto do Catalogo</h2>
              <button className="close-btn" onClick={() => setShowProductModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Buscar produto por nome, GTIN, EAN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchCatalogProducts()}
                />
                <button className="btn btn-primary" onClick={searchCatalogProducts}>
                  Buscar
                </button>
              </div>
              
              {catalogProducts.length > 0 && (
                <div className="products-list">
                  {catalogProducts.map(product => (
                    <div 
                      key={product.id} 
                      className="product-option"
                      onClick={() => publishToCatalog(selectedItem.id, product.id)}
                    >
                      <div className="product-thumb">
                        {product.thumbnail ? (
                          <img src={product.thumbnail} alt={product.name} />
                        ) : (
                          <span className="material-icons">image</span>
                        )}
                      </div>
                      <div className="product-details">
                        <span className="product-name">{product.name}</span>
                        <span className="product-id">{product.id}</span>
                      </div>
                      <span className="material-icons select-icon">chevron_right</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Catalog
