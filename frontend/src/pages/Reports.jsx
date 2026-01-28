import { useState, useEffect } from 'react'
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
import './Pages.css'

function Reports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState('30d') // 30d, 90d, 1y
  const [salesData, setSalesData] = useState([])
  const [productData, setProductData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    conversionRate: 0,
  })

  const COLORS = ['#0066cc', '#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8']

  useEffect(() => {
    fetchReportsData()
  }, [dateRange])

  const fetchReportsData = async () => {
    try {
      setLoading(true)
      setError('')

      // Mock data for demonstration
      // In production, this would come from your backend API
      const response = await Promise.all([
        api.get('/ml-accounts'), // Get accounts to show we're connected
      ])

      // Generate mock data based on date range
      const salesChart = generateSalesData(dateRange)
      const products = generateProductData()
      const categories = generateCategoryData()

      setSalesData(salesChart)
      setProductData(products)
      setCategoryData(categories)
      setSummary({
        totalSales: Math.floor(Math.random() * 50000) + 10000,
        totalOrders: Math.floor(Math.random() * 500) + 100,
        avgOrderValue: Math.floor(Math.random() * 500) + 50,
        conversionRate: (Math.random() * 8 + 2).toFixed(2),
      })
    } catch (err) {
      setError('Erro ao carregar relatórios')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const generateSalesData = (range) => {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 365
    const data = []
    const now = new Date()

    for (let i = days; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const formatDate =
        range === '30d'
          ? date.toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit' })
          : date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })

      data.push({
        date: formatDate,
        sales: Math.floor(Math.random() * 3000) + 500,
        orders: Math.floor(Math.random() * 50) + 10,
        revenue: Math.floor(Math.random() * 15000) + 2000,
      })
    }
    return data
  }

  const generateProductData = () => {
    return [
      { name: 'Produto A', sales: 450, revenue: 12500 },
      { name: 'Produto B', sales: 380, revenue: 10200 },
      { name: 'Produto C', sales: 320, revenue: 8900 },
      { name: 'Produto D', sales: 280, revenue: 7500 },
      { name: 'Produto E', sales: 220, revenue: 6100 },
    ]
  }

  const generateCategoryData = () => {
    return [
      { name: 'Eletrônicos', value: 35 },
      { name: 'Moda', value: 25 },
      { name: 'Casa', value: 20 },
      { name: 'Esportes', value: 12 },
      { name: 'Outros', value: 8 },
    ]
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Relatórios e Análises</h1>
          <p>Visualize o desempenho de suas vendas</p>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando relatórios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Relatórios e Análises</h1>
        <p>Visualize o desempenho de suas vendas</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Período</h2>
          <div className="date-range-filters">
            <button
              className={`btn btn-sm ${dateRange === '30d' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDateRange('30d')}
            >
              30 dias
            </button>
            <button
              className={`btn btn-sm ${dateRange === '90d' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDateRange('90d')}
            >
              90 dias
            </button>
            <button
              className={`btn btn-sm ${dateRange === '1y' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDateRange('1y')}
            >
              1 ano
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Vendas Totais</h3>
          <p className="summary-value">{formatCurrency(summary.totalSales)}</p>
          <small>Últimos {dateRange === '30d' ? '30' : dateRange === '90d' ? '90' : '365'} dias</small>
        </div>
        <div className="summary-card">
          <h3>Pedidos</h3>
          <p className="summary-value">{summary.totalOrders}</p>
          <small>Total de pedidos</small>
        </div>
        <div className="summary-card">
          <h3>Ticket Médio</h3>
          <p className="summary-value">{formatCurrency(summary.avgOrderValue)}</p>
          <small>Valor médio por pedido</small>
        </div>
        <div className="summary-card">
          <h3>Taxa de Conversão</h3>
          <p className="summary-value">{summary.conversionRate}%</p>
          <small>Visitantes convertidos</small>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="reports-grid">
        {/* Sales Trend */}
        <div className="chart-container" style={{ gridColumn: '1 / -1' }}>
          <h3 className="chart-title">Tendência de Vendas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#0066cc"
                strokeWidth={2}
                dot={false}
                name="Receita (R$)"
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#ff6b6b"
                strokeWidth={2}
                dot={false}
                name="Pedidos"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="chart-container">
          <h3 className="chart-title">Top 5 Produtos</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={productData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" stroke="#999" />
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

        {/* Category Distribution */}
        <div className="chart-container">
          <h3 className="chart-title">Distribuição por Categoria</h3>
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

        {/* Product Revenue */}
        <div className="chart-container">
          <h3 className="chart-title">Receita por Produto</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={productData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis type="number" stroke="#999" />
              <YAxis dataKey="name" type="category" stroke="#999" width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="revenue" fill="#4ecdc4" name="Receita (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Últimas Vendas</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Pedido ID</th>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {salesData.slice(-10).map((item, idx) => (
                <tr key={idx}>
                  <td>{item.date}</td>
                  <td>#PED-{1000 + idx}</td>
                  <td>Produto {String.fromCharCode(65 + (idx % 5))}</td>
                  <td>{Math.floor(Math.random() * 5) + 1}</td>
                  <td>{formatCurrency(item.revenue / 10)}</td>
                  <td>
                    <span className={`status-badge status-active`}>Entregue</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reports
