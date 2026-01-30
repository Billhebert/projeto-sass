import React, { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './Analytics.css'

function Analytics() {
  const [timeRange, setTimeRange] = useState('7days')
  const [chartsData, setChartsData] = useState({
    salesTrend: [],
    topProducts: [],
    revenueByCategory: [],
    dailyMetrics: []
  })

  useEffect(() => {
    // Generate analytics data based on time range
    generateAnalyticsData(timeRange)
  }, [timeRange])

  const generateAnalyticsData = (range) => {
    let days = 7
    if (range === '30days') days = 30
    if (range === '90days') days = 90

    // Sales trend data
    const salesData = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - i))
      salesData.push({
        date: date.toLocaleDateString('pt-BR', { month: 'short', day: '2-digit' }),
        sales: Math.floor(Math.random() * 500) + 100,
        orders: Math.floor(Math.random() * 50) + 10,
      })
    }

    // Top products
    const products = [
      { name: 'Produto A', sales: 4200, margin: 38 },
      { name: 'Produto B', sales: 3200, margin: 42 },
      { name: 'Produto C', sales: 2800, margin: 35 },
      { name: 'Produto D', sales: 2200, margin: 45 },
      { name: 'Produto E', sales: 1800, margin: 40 },
    ]

    // Revenue by category
    const categories = [
      { name: 'Eletrônicos', revenue: 12500, growth: 8 },
      { name: 'Roupas', revenue: 9800, growth: -2 },
      { name: 'Livros', revenue: 7600, growth: 15 },
      { name: 'Esportes', revenue: 5400, growth: 5 },
      { name: 'Casa', revenue: 4300, growth: 12 },
    ]

    // Daily metrics
    const metrics = [
      { metric: 'Visitantes', value: 2543, change: '+12%' },
      { metric: 'Conversão', value: '3.2%', change: '+0.5%' },
      { metric: 'Ticket Médio', value: 'R$ 245.50', change: '+18%' },
      { metric: 'Taxa de Retorno', value: '28%', change: '+5%' },
    ]

    setChartsData({
      salesTrend: salesData,
      topProducts: products,
      revenueByCategory: categories,
      dailyMetrics: metrics
    })
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>📈 Análises & Relatórios</h1>
        <div className="time-range-selector">
          <button 
            className={`range-btn ${timeRange === '7days' ? 'active' : ''}`}
            onClick={() => setTimeRange('7days')}
          >
            7 Dias
          </button>
          <button 
            className={`range-btn ${timeRange === '30days' ? 'active' : ''}`}
            onClick={() => setTimeRange('30days')}
          >
            30 Dias
          </button>
          <button 
            className={`range-btn ${timeRange === '90days' ? 'active' : ''}`}
            onClick={() => setTimeRange('90days')}
          >
            90 Dias
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {chartsData.dailyMetrics.map((metric, idx) => (
          <div key={idx} className="kpi-card">
            <h3>{metric.metric}</h3>
            <p className="kpi-value">{metric.value}</p>
            <span className={`kpi-change ${metric.change.includes('-') ? 'negative' : 'positive'}`}>
              {metric.change}
            </span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-wrapper">
        {/* Sales Trend */}
        <div className="chart-card full-width">
          <h2>Tendência de Vendas</h2>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartsData.salesTrend}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="sales" stroke="#667eea" fillOpacity={1} fill="url(#colorSales)" />
              <Area type="monotone" dataKey="orders" stroke="#764ba2" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="chart-card half-width">
          <h2>Top Produtos</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartsData.topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Category */}
        <div className="chart-card half-width">
          <h2>Receita por Categoria</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartsData.revenueByCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#667eea" strokeWidth={2} />
              <Line type="monotone" dataKey="growth" stroke="#764ba2" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="table-card">
        <h2>Detalhamento de Vendas</h2>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Vendas</th>
              <th>Margem</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {chartsData.topProducts.map((product, idx) => (
              <tr key={idx}>
                <td>{product.name}</td>
                <td className="number">{product.sales}</td>
                <td className="number">{product.margin}%</td>
                <td>
                  <span className={`status ${product.margin > 40 ? 'good' : 'warning'}`}>
                    {product.margin > 40 ? '✓ Saudável' : '⚠ Baixa Margem'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Analytics
