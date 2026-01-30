import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import api from '../services/api'
import { toast } from '../store/toastStore'
import { exportToCSV, exportToPDF, prepareProductsForExport, prepareStatsForExport } from '../utils/export'
import './Pages.css'

function Reports() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasAccounts, setHasAccounts] = useState(false)
  const [hasRealData, setHasRealData] = useState(false)
  const [dateRange, setDateRange] = useState('30d')
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  
  // Real data from products
  const [productStats, setProductStats] = useState(null)
  const [products, setProducts] = useState([])

  const COLORS = ['#0066cc', '#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8']

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccountId) {
      fetchProductStats()
      fetchProducts()
    }
  }, [selectedAccountId])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await api.get('/ml-accounts')
      const accountsList = response.data.data?.accounts || response.data.data || []
      const accountsArray = Array.isArray(accountsList) ? accountsList : []

      setAccounts(accountsArray)
      setHasAccounts(accountsArray.length > 0)

      if (accountsArray.length > 0) {
        setSelectedAccountId(accountsArray[0].id)
      }
    } catch (err) {
      setError('Erro ao carregar contas')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductStats = async () => {
    if (!selectedAccountId) return

    try {
      const response = await api.get(`/products/${selectedAccountId}/stats`)
      if (response.data.success) {
        setProductStats(response.data.data)
        setHasRealData(true)
      }
    } catch (err) {
      console.error('Error fetching product stats:', err)
      setProductStats(null)
      setHasRealData(false)
    }
  }

  const fetchProducts = async () => {
    if (!selectedAccountId) return

    try {
      const response = await api.get(`/products/${selectedAccountId}?limit=50`)
      if (response.data.success) {
        setProducts(response.data.data.products || [])
      }
    } catch (err) {
      console.error('Error fetching products:', err)
      setProducts([])
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0)
  }

  // Generate category distribution from real products
  const getCategoryData = () => {
    if (products.length === 0) return []

    const categories = {}
    products.forEach(product => {
      const category = product.category?.categoryName || 'Outros'
      categories[category] = (categories[category] || 0) + 1
    })

    const total = products.length
    return Object.entries(categories)
      .map(([name, count]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        value: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }

  // Get top products by sales
  const getTopProducts = () => {
    return [...products]
      .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
      .slice(0, 5)
      .map(p => ({
        name: p.title?.substring(0, 20) + (p.title?.length > 20 ? '...' : ''),
        sales: p.salesCount || 0,
        revenue: (p.salesCount || 0) * (p.price || 0),
      }))
  }

  // Export handlers
  const handleExportCSV = () => {
    if (products.length === 0) {
      toast.warning('Nenhum produto para exportar')
      return
    }
    const data = prepareProductsForExport(products)
    const accountName = accounts.find(a => a.id === selectedAccountId)?.nickname || 'conta'
    exportToCSV(data, `produtos_${accountName}_${new Date().toISOString().split('T')[0]}`)
    toast.success('Arquivo CSV exportado com sucesso!')
  }

  const handleExportPDF = () => {
    if (products.length === 0) {
      toast.warning('Nenhum produto para exportar')
      return
    }

    const columns = [
      { key: 'title', label: 'Produto' },
      { key: 'price', label: 'Preço', format: 'currency' },
      { key: 'quantity', label: 'Estoque', format: 'number' },
      { key: 'salesCount', label: 'Vendas', format: 'number' },
      { key: 'status', label: 'Status' },
    ]

    const accountName = accounts.find(a => a.id === selectedAccountId)?.nickname || 'Conta'
    exportToPDF(`Relatório de Produtos - ${accountName}`, products, columns)
    toast.info('PDF aberto em nova aba. Use Ctrl+P para salvar.')
  }

  const handleExportStats = () => {
    if (!productStats) {
      toast.warning('Nenhuma estatística para exportar')
      return
    }
    const accountName = accounts.find(a => a.id === selectedAccountId)?.nickname || 'conta'
    const stats = prepareStatsForExport(productStats, accountName)
    exportToCSV([stats], `estatisticas_${accountName}_${new Date().toISOString().split('T')[0]}`)
    toast.success('Estatísticas exportadas com sucesso!')
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Relatorios e Analises</h1>
          <p>Visualize o desempenho de suas vendas</p>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando relatorios...</p>
        </div>
      </div>
    )
  }

  // No accounts connected
  if (!hasAccounts) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Relatorios e Analises</h1>
          <p>Visualize o desempenho de suas vendas</p>
        </div>
        <div className="card">
          <div className="empty-state" style={{ padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📊</div>
            <h2>Nenhuma conta conectada</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              Conecte uma conta do Mercado Livre para visualizar relatorios e analises.
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/accounts')}
            >
              Conectar Conta
            </button>
          </div>
        </div>
      </div>
    )
  }

  const categoryData = getCategoryData()
  const topProducts = getTopProducts()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Relatorios e Analises</h1>
          <p>Visualize o desempenho de suas vendas</p>
        </div>
        {products.length > 0 && (
          <div className="export-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleExportStats}
              title="Exportar estatísticas"
            >
              📊 Exportar Stats
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleExportCSV}
              title="Exportar para CSV"
            >
              📄 CSV
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleExportPDF}
              title="Exportar para PDF"
            >
              📑 PDF
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Account Selector */}
      {accounts.length > 1 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body" style={{ padding: '1rem' }}>
            <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>Conta:</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.nickname} ({account.email})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Info Banner */}
      {!hasRealData && (
        <div className="alert" style={{ 
          backgroundColor: '#fff3cd', 
          borderColor: '#ffc107', 
          color: '#856404',
          marginBottom: '1rem',
          padding: '1rem',
          borderRadius: '4px',
          border: '1px solid #ffc107'
        }}>
          <strong>Aviso:</strong> Sincronize seus produtos para ver dados reais.
          Os graficos abaixo mostram dados baseados nos produtos sincronizados.
          <button 
            className="btn btn-sm btn-primary" 
            style={{ marginLeft: '1rem' }}
            onClick={() => navigate(`/accounts/${selectedAccountId}/products`)}
          >
            Ir para Produtos
          </button>
        </div>
      )}

      {/* Summary Stats from Real Data */}
      {productStats && (
        <div className="summary-cards">
          <div className="summary-card">
            <h3>Total de Produtos</h3>
            <p className="summary-value">{productStats.products?.total || 0}</p>
            <small>Produtos cadastrados</small>
          </div>
          <div className="summary-card">
            <h3>Produtos Ativos</h3>
            <p className="summary-value">{productStats.products?.active || 0}</p>
            <small>Disponiveis para venda</small>
          </div>
          <div className="summary-card">
            <h3>Total de Vendas</h3>
            <p className="summary-value">{productStats.sales || 0}</p>
            <small>Unidades vendidas</small>
          </div>
          <div className="summary-card">
            <h3>Valor em Estoque</h3>
            <p className="summary-value">{formatCurrency(productStats.estimatedValue)}</p>
            <small>Valor estimado</small>
          </div>
        </div>
      )}

      {/* Additional Stats */}
      {productStats && (
        <div className="summary-cards" style={{ marginTop: '1rem' }}>
          <div className="summary-card">
            <h3>Visualizacoes</h3>
            <p className="summary-value">{productStats.views || 0}</p>
            <small>Total de views</small>
          </div>
          <div className="summary-card">
            <h3>Perguntas</h3>
            <p className="summary-value">{productStats.questions || 0}</p>
            <small>Perguntas recebidas</small>
          </div>
          <div className="summary-card">
            <h3>Estoque Baixo</h3>
            <p className="summary-value" style={{ color: productStats.products?.lowStock > 0 ? '#ff6b6b' : 'inherit' }}>
              {productStats.products?.lowStock || 0}
            </p>
            <small>Produtos com pouco estoque</small>
          </div>
          <div className="summary-card">
            <h3>Sem Estoque</h3>
            <p className="summary-value" style={{ color: productStats.products?.outOfStock > 0 ? '#dc3545' : 'inherit' }}>
              {productStats.products?.outOfStock || 0}
            </p>
            <small>Produtos esgotados</small>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      {products.length > 0 && (
        <div className="reports-grid" style={{ marginTop: '2rem' }}>
          {/* Top Products by Sales */}
          {topProducts.length > 0 && (
            <div className="chart-container">
              <h3 className="chart-title">Top 5 Produtos (por vendas)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" stroke="#999" fontSize={10} />
                  <YAxis stroke="#999" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Bar dataKey="sales" fill="#0066cc" name="Vendas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category Distribution */}
          {categoryData.length > 0 && (
            <div className="chart-container">
              <h3 className="chart-title">Distribuicao por Categoria</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: '0.5rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Products Table */}
      {products.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="card-header">
            <h2 className="card-title">Produtos com Mais Vendas</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Preco</th>
                  <th>Estoque</th>
                  <th>Vendas</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...products]
                  .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
                  .slice(0, 10)
                  .map((product, idx) => (
                    <tr key={product.id || idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {product.thumbnailUrl && (
                            <img 
                              src={product.thumbnailUrl} 
                              alt="" 
                              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                            />
                          )}
                          <span>{product.title?.substring(0, 40)}{product.title?.length > 40 ? '...' : ''}</span>
                        </div>
                      </td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{product.quantity || 0}</td>
                      <td>{product.salesCount || 0}</td>
                      <td>
                        <span className={`status-badge status-${product.status || 'active'}`}>
                          {product.status === 'active' ? 'Ativo' : 
                           product.status === 'paused' ? 'Pausado' : 
                           product.status || 'Ativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state for no products */}
      {products.length === 0 && hasAccounts && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="empty-state" style={{ padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <h3>Nenhum produto sincronizado</h3>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              Sincronize seus produtos do Mercado Livre para ver os relatorios.
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/accounts/${selectedAccountId}/products`)}
            >
              Sincronizar Produtos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports
