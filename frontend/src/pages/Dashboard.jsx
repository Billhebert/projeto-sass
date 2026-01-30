import React, { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './Dashboard.css'

function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageRating: 0
  })
  
  const [salesData, setSalesData] = useState([])
  const [ordersData, setOrdersData] = useState([])
  const [categoryData, setCategoryData] = useState([])

  useEffect(() => {
    // Generate mock dashboard data
    const mockStats = {
      totalProducts: 156,
      totalOrders: 2891,
      totalRevenue: 45230.50,
      averageRating: 4.7
    }
    setStats(mockStats)

    // Sales chart data
    const mockSalesData = [
      { date: 'Jan 1', sales: 4200, revenue: 2400 },
      { date: 'Jan 2', sales: 3000, revenue: 1398 },
      { date: 'Jan 3', sales: 2000, revenue: 9800 },
      { date: 'Jan 4', sales: 2780, revenue: 3908 },
      { date: 'Jan 5', sales: 1890, revenue: 4800 },
      { date: 'Jan 6', sales: 2390, revenue: 3800 },
      { date: 'Jan 7', sales: 3490, revenue: 4300 },
    ]
    setSalesData(mockSalesData)

    // Orders status data
    const mockOrdersData = [
      { status: 'Pending', count: 125 },
      { status: 'Paid', count: 856 },
      { status: 'Shipped', count: 745 },
      { status: 'Delivered', count: 985 },
      { status: 'Cancelled', count: 180 },
    ]
    setOrdersData(mockOrdersData)

    // Category distribution
    const mockCategoryData = [
      { name: 'Electronics', value: 2400 },
      { name: 'Clothing', value: 1398 },
      { name: 'Books', value: 9800 },
      { name: 'Sports', value: 3908 },
      { name: 'Home', value: 4800 },
    ]
    setCategoryData(mockCategoryData)
  }, [])

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe']

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📊 Dashboard</h1>
        <p>Visão geral do seu negócio no Mercado Livre</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Produtos</h3>
            <p className="stat-value">{stats.totalProducts}</p>
            <span className="stat-label">Publicações ativas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🛒</div>
          <div className="stat-content">
            <h3>Pedidos</h3>
            <p className="stat-value">{stats.totalOrders}</p>
            <span className="stat-label">Total no período</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Receita</h3>
            <p className="stat-value">R$ {stats.totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</p>
            <span className="stat-label">Vendas totais</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <h3>Avaliação</h3>
            <p className="stat-value">{stats.averageRating}</p>
            <span className="stat-label">Classificação média</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="charts-row">
        <div className="chart-container large">
          <h2>Vendas por Dia</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#667eea" strokeWidth={2} />
              <Line type="monotone" dataKey="revenue" stroke="#764ba2" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container medium">
          <h2>Status dos Pedidos</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ordersData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {ordersData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="charts-row">
        <div className="chart-container large">
          <h2>Vendas por Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ordersData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#667eea" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container medium">
          <h2>Distribuição por Categoria</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Ações Rápidas</h2>
        <div className="actions-grid">
          <a href="/products-list" className="action-btn">
            <span className="action-icon">📝</span>
            <span>Gerenciar Produtos</span>
          </a>
          <a href="/orders-list" className="action-btn">
            <span className="action-icon">📦</span>
            <span>Ver Pedidos</span>
          </a>
          <a href="/shipping-list" className="action-btn">
            <span className="action-icon">🚚</span>
            <span>Gerenciar Envios</span>
          </a>
          <a href="/questions-list" className="action-btn">
            <span className="action-icon">❓</span>
            <span>Responder Perguntas</span>
          </a>
          <a href="/feedback-list" className="action-btn">
            <span className="action-icon">⭐</span>
            <span>Ver Avaliações</span>
          </a>
          <a href="/categories" className="action-btn">
            <span className="action-icon">📂</span>
            <span>Categorias</span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
