import React, { useState, useEffect } from "react";
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
import { exportAnalyticsToCSV } from "../utils/exportUtils";
import { exportAnalyticsToPDF } from "../utils/pdfExportUtils";
import "./Analytics.css";

function Analytics() {
  const [timeRange, setTimeRange] = useState("7days");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartsData, setChartsData] = useState({
    salesTrend: [],
    topProducts: [],
    revenueByCategory: [],
    dailyMetrics: [],
    allProducts: [], // All products for table
    allCategories: [], // All categories
  });

  useEffect(() => {
    fetchAnalyticsData(timeRange);
  }, [timeRange]);

  const fetchAnalyticsData = async (range) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Get user's ML accounts
      const accountsResponse = await fetch("/api/ml-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!accountsResponse.ok) {
        throw new Error("Failed to fetch ML accounts");
      }

      const accountsData = await accountsResponse.json();
      const accounts = accountsData.data?.accounts || [];

      if (accounts.length === 0) {
        setChartsData({
          salesTrend: [],
          topProducts: [],
          revenueByCategory: [],
          dailyMetrics: [
            { metric: "Total de Vendas", value: "R$ 0.00", change: "0%" },
            { metric: "Pedidos", value: 0, change: "0%" },
            { metric: "Ticket Médio", value: "R$ 0.00", change: "0%" },
            { metric: "Produtos Vendidos", value: 0, change: "0%" },
          ],
        });
        setLoading(false);
        return;
      }

      // Calculate date range
      let days = 7;
      if (range === "30days") days = 30;
      if (range === "90days") days = 90;

      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      // Fetch ALL orders from all accounts with auto-pagination (no limits!)
      const ordersPromises = accounts.map(async (account) => {
        let allOrders = [];
        let offset = 0;
        const limit = 200; // Fetch in batches of 200
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            `/api/orders/${account.id}?limit=${limit}&offset=${offset}&date_created.from=${dateFrom.toISOString()}&date_created.to=${dateTo.toISOString()}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const result = await response.json();

          if (result.success && result.data?.orders) {
            allOrders = allOrders.concat(result.data.orders);

            // Check if there are more orders to fetch
            if (result.data.orders.length < limit) {
              hasMore = false; // No more orders
            } else {
              offset += limit; // Continue fetching
            }
          } else {
            hasMore = false;
          }
        }

        return { success: true, data: { orders: allOrders } };
      });

      const analyticsPromises = accounts.map((account) =>
        fetch(
          `/api/orders/${account.id}/analytics?date_created.from=${dateFrom.toISOString()}&date_created.to=${dateTo.toISOString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ).then((res) => res.json()),
      );

      const [ordersResults, analyticsResults] = await Promise.all([
        Promise.all(ordersPromises),
        Promise.all(analyticsPromises),
      ]);

      // Combine all orders
      let allOrders = [];
      ordersResults.forEach((result) => {
        if (result.success && result.data?.orders) {
          allOrders = allOrders.concat(result.data.orders);
        }
      });

      // Combine analytics data
      let allProducts = [];
      let allCategories = [];
      let totalRealFees = 0;

      analyticsResults.forEach((result) => {
        if (result.success && result.data) {
          allProducts = allProducts.concat(result.data.products || []);
          allCategories = allCategories.concat(result.data.categories || []);
          totalRealFees += result.data.totalFees || 0;
        }
      });

      // Merge products with same itemId
      const productsMap = {};
      allProducts.forEach((product) => {
        if (!productsMap[product.itemId]) {
          productsMap[product.itemId] = { ...product };
        } else {
          productsMap[product.itemId].revenue += product.revenue;
          productsMap[product.itemId].quantity += product.quantity;
          productsMap[product.itemId].totalSales += product.totalSales;
          productsMap[product.itemId].fees += product.fees;
        }
      });
      const mergedProducts = Object.values(productsMap).sort(
        (a, b) => b.revenue - a.revenue,
      );

      // Merge categories
      const categoriesMap = {};
      allCategories.forEach((category) => {
        if (!categoriesMap[category.categoryId]) {
          categoriesMap[category.categoryId] = { ...category };
        } else {
          categoriesMap[category.categoryId].revenue += category.revenue;
          categoriesMap[category.categoryId].quantity += category.quantity;
        }
      });
      const mergedCategories = Object.values(categoriesMap).sort(
        (a, b) => b.revenue - a.revenue,
      );

      // Process orders data
      const processedData = processOrdersData(
        allOrders,
        days,
        mergedProducts,
        mergedCategories,
        totalRealFees,
      );
      setChartsData(processedData);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processOrdersData = (
    orders,
    days,
    products = [],
    categories = [],
    realFees = 0,
  ) => {
    // Filter only paid orders
    const paidOrders = orders.filter(
      (o) => o.status === "paid" || o.status === "confirmed",
    );

    // Sales trend by day
    const salesByDay = {};
    const ordersByDay = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      const dateKey = date.toISOString().split("T")[0];
      salesByDay[dateKey] = 0;
      ordersByDay[dateKey] = 0;
    }

    paidOrders.forEach((order) => {
      const orderDate = new Date(order.dateCreated).toISOString().split("T")[0];
      if (salesByDay.hasOwnProperty(orderDate)) {
        salesByDay[orderDate] += order.totalAmount || 0;
        ordersByDay[orderDate] += 1;
      }
    });

    const salesTrend = Object.keys(salesByDay).map((dateKey) => {
      const date = new Date(dateKey);
      return {
        date: date.toLocaleDateString("pt-BR", {
          month: "short",
          day: "2-digit",
        }),
        sales: Math.round(salesByDay[dateKey]),
        orders: ordersByDay[dateKey],
      };
    });

    // Calculate total metrics
    const totalRevenue = paidOrders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0,
    );
    const totalOrders = paidOrders.length;
    const totalItems = paidOrders.reduce(
      (sum, o) => sum + (o.itemsCount || 0),
      0,
    );
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const dailyMetrics = [
      {
        metric: "Total de Vendas",
        value: `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: "+0%",
      },
      {
        metric: "Pedidos",
        value: totalOrders,
        change: "+0%",
      },
      {
        metric: "Ticket Médio",
        value: `R$ ${avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: "+0%",
      },
      {
        metric: "Produtos Vendidos",
        value: totalItems,
        change: "+0%",
      },
    ];

    // All products from real data (no limits!)
    const allProducts =
      products.length > 0
        ? products.map((p) => ({
            name: p.title?.substring(0, 30) || "Produto",
            sales: Math.round(p.revenue),
            margin:
              p.revenue > 0 ? Math.round((1 - p.fees / p.revenue) * 100) : 0,
          }))
        : [{ name: "Nenhum produto", sales: 0, margin: 0 }];

    // Top 10 for chart visualization
    const topProducts = allProducts.slice(0, 10);

    // All categories from real data (no limits!)
    const allCategories =
      categories.length > 0
        ? categories.map((c) => ({
            name: c.name?.substring(0, 20) || "Categoria",
            revenue: Math.round(c.revenue),
            growth: 0, // Growth calculation would need historical data
          }))
        : [{ name: "Total", revenue: Math.round(totalRevenue), growth: 0 }];

    // Top 10 for chart visualization
    const revenueByCategory = allCategories.slice(0, 10);

    return {
      salesTrend,
      topProducts,
      revenueByCategory,
      dailyMetrics,
      allProducts, // All products for table
      allCategories, // All categories
    };
  };

  const handleExportCSV = () => {
    exportAnalyticsToCSV(chartsData, timeRange);
  };

  const handleExportPDF = () => {
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
        conversionRate: 0, // Would need additional data
      },
      products: chartsData.topProducts.map((p) => ({
        name: p.name,
        quantity: p.sales || 0,
        revenue: p.sales || 0,
        margin: p.margin || 0,
      })),
      categories: chartsData.revenueByCategory.map((c) => ({
        name: c.name,
        quantity: 0, // Would need additional data
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
          <p>Erro ao carregar dados: {error}</p>
          <button onClick={() => fetchAnalyticsData(timeRange)}>
            Tentar Novamente
          </button>
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
        {chartsData.dailyMetrics.map((metric, idx) => (
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
            <AreaChart data={chartsData.salesTrend}>
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
          Detalhamento de Vendas (Todos os {chartsData.allProducts?.length || 0}{" "}
          Produtos)
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
            {(chartsData.allProducts || chartsData.topProducts).map(
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
