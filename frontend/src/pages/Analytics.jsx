import React, { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAnalyticsData } from "../hooks/useAnalyticsData";
import { exportAnalyticsToCSV } from "../utils/export";
import { exportAnalyticsToPDF } from "../utils/pdfExportUtils";
import "./Analytics.css";

function Analytics() {
  const [timeRange, setTimeRange] = useState("7days");

  // Use React Query hook for data fetching
  const {
    data: chartsData,
    isLoading: loading,
    error,
    refetch,
  } = useAnalyticsData(timeRange);

  const handleExportCSV = () => {
    if (chartsData) {
      exportAnalyticsToCSV(chartsData, timeRange);
    }
  };

  const handleExportPDF = () => {
    if (!chartsData) return;

    // Prepare data for PDF export
    const pdfData = {
      kpis: {
        totalOrders: chartsData.salesTrend.reduce(
          (sum, day) => sum + (day.orders || 0),
          0,
        ),
        totalRevenue: chartsData.salesTrend.reduce(
          (sum, day) => sum + (day.revenue || 0),
          0,
        ),
        avgOrderValue:
          chartsData.salesTrend.length > 0
            ? chartsData.salesTrend.reduce(
                (sum, day) => sum + (day.avgOrder || 0),
                0,
              ) / chartsData.salesTrend.length
            : 0,
        conversionRate: 0,
      },
      products: chartsData.topProducts.map((p) => ({
        name: p.name,
        quantity: p.sales || 0,
        revenue: p.sales || 0,
        margin: p.margin || 0,
      })),
      categories: chartsData.revenueByCategory.map((c) => ({
        name: c.name,
        quantity: 0,
        revenue: c.revenue || 0,
      })),
    };
    exportAnalyticsToPDF(pdfData, timeRange);
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-header">
          <h1>📈 Análises & Relatórios</h1>
        </div>
        <div style={{ textAlign: "center", padding: "50px" }}>
          <p>Carregando dados de análise...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="analytics-header">
          <h1>📈 Análises & Relatórios</h1>
        </div>
        <div style={{ textAlign: "center", padding: "50px", color: "#dc3545" }}>
          <p>Erro ao carregar dados: {error.message || error}</p>
          <button onClick={() => refetch()}>Tentar Novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>📈 Análises & Relatórios</h1>
        <div className="time-range-selector">
          <button
            className={`range-btn ${timeRange === "7days" ? "active" : ""}`}
            onClick={() => setTimeRange("7days")}
          >
            7 Dias
          </button>
          <button
            className={`range-btn ${timeRange === "30days" ? "active" : ""}`}
            onClick={() => setTimeRange("30days")}
          >
            30 Dias
          </button>
          <button
            className={`range-btn ${timeRange === "90days" ? "active" : ""}`}
            onClick={() => setTimeRange("90days")}
          >
            90 Dias
          </button>
          <button className="range-btn" onClick={handleExportCSV}>
            📥 Exportar CSV
          </button>
          <button className="range-btn" onClick={handleExportPDF}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {chartsData?.dailyMetrics?.map((metric, idx) => (
          <div key={idx} className="kpi-card">
            <h3>{metric.metric}</h3>
            <p className="kpi-value">{metric.value}</p>
            <span
              className={`kpi-change ${metric.change.includes("-") ? "negative" : "positive"}`}
            >
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
            <AreaChart data={chartsData?.salesTrend || []}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#667eea"
                fillOpacity={1}
                fill="url(#colorSales)"
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="#764ba2"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="chart-card half-width">
          <h2>Top Produtos</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartsData?.topProducts || []}>
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
            <LineChart data={chartsData?.revenueByCategory || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#667eea"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="growth"
                stroke="#764ba2"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table - Shows ALL products! */}
      <div className="table-card">
        <h2>
          Detalhamento de Vendas (Todos os{" "}
          {chartsData?.allProducts?.length || 0} Produtos)
        </h2>
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
            {(chartsData?.allProducts || chartsData?.topProducts || []).map(
              (product, idx) => (
                <tr key={idx}>
                  <td>{product.name}</td>
                  <td className="number">{product.sales}</td>
                  <td className="number">{product.margin}%</td>
                  <td>
                    <span
                      className={`status ${product.margin > 40 ? "good" : "warning"}`}
                    >
                      {product.margin > 40 ? "✓ Saudável" : "⚠ Baixa Margem"}
                    </span>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Analytics;
