import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import api from "../services/api";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // Consolidated stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    pausedProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    averageRating: 0,
    totalQuestions: 0,
    pendingQuestions: 0,
    totalClaims: 0,
    openClaims: 0,
    moderations: 0,
  });

  // Alerts for quick action
  const [alerts, setAlerts] = useState({
    pendingQuestions: [],
    openClaims: [],
    moderations: [],
    lowStock: [],
    ordersToShip: [],
  });

  // Sales chart data
  const [salesData, setSalesData] = useState([]);

  // Recent orders
  const [recentOrders, setRecentOrders] = useState([]);

  // Load ML accounts
  const loadAccounts = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get("/ml-accounts");
      console.log("ML Accounts API response:", response.data);

      // Handle different API response formats
      let accountsList = [];
      if (Array.isArray(response.data)) {
        accountsList = response.data;
      } else if (Array.isArray(response.data?.data?.accounts)) {
        accountsList = response.data.data.accounts;
      } else if (Array.isArray(response.data?.accounts)) {
        accountsList = response.data.accounts;
      } else if (Array.isArray(response.data?.data)) {
        accountsList = response.data.data;
      }

      console.log("Parsed accounts list:", accountsList);
      setAccounts(accountsList);

      // Auto-select first account if none selected
      if (accountsList.length > 0 && !selectedAccountId) {
        const firstAccountId = accountsList[0]._id || accountsList[0].id;
        console.log("Auto-selecting first account:", firstAccountId);
        setSelectedAccountId(firstAccountId);
      }

      return accountsList;
    } catch (error) {
      console.error("Error loading accounts:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Erro ao carregar contas";
      setError(errorMsg);
      setAccounts([]);
      return [];
    }
  }, [selectedAccountId]);

  // Load dashboard data for selected account
  const loadDashboardData = useCallback(async (accountId) => {
    if (!accountId) {
      console.log("No accountId provided");
      setLoading(false);
      return;
    }

    // Validate accountId format
    if (typeof accountId !== "string" && typeof accountId !== "number") {
      console.error("Invalid accountId format:", accountId);
      setError("ID de conta inválido");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log("Loading dashboard data for account:", accountId);

    try {
      // Fetch data in parallel - using all=true to get ALL data without limits
      const [itemsRes, ordersRes, questionsRes, claimsRes] =
        await Promise.allSettled([
          api.get(`/items/${accountId}`, { params: { all: true } }),
          api.get(`/orders/${accountId}`, { params: { all: true } }),
          api.get(`/questions/${accountId}`, {
            params: { status: "UNANSWERED", all: true },
          }),
          api.get(`/claims/${accountId}`, {
            params: { status: "open", all: true },
          }),
        ]);

      console.log("Items response:", itemsRes);
      console.log("Orders response:", ordersRes);

      // Process items data - handle different response formats
      let itemsData = { items: [], paging: { total: 0 } };
      if (itemsRes.status === "fulfilled") {
        const resData = itemsRes.value?.data;
        console.log("Items resData:", resData);
        if (resData?.success && resData?.data) {
          itemsData = resData.data;
        } else if (resData?.items) {
          itemsData = resData;
        } else if (Array.isArray(resData)) {
          itemsData = { items: resData, paging: { total: resData.length } };
        }
        console.log("Parsed itemsData:", itemsData);
        console.log("Items array:", itemsData.items);
      }

      // Process orders data - handle different response formats
      let ordersData = { orders: [], paging: { total: 0 } };
      if (ordersRes.status === "fulfilled") {
        const resData = ordersRes.value?.data;
        console.log("Orders resData:", resData);
        if (resData?.success && resData?.data) {
          ordersData = resData.data;
        } else if (resData?.orders) {
          ordersData = resData;
        } else if (resData?.results) {
          ordersData = {
            orders: resData.results,
            paging: resData.paging || { total: resData.results.length },
          };
        }
      }

      // Process questions data
      let questionsData = { questions: [], total: 0 };
      if (questionsRes.status === "fulfilled") {
        const resData = questionsRes.value?.data;
        if (resData?.success && resData?.data) {
          questionsData = resData.data;
        } else if (resData?.questions) {
          questionsData = resData;
        }
      }

      // Process claims data
      let claimsData = { claims: [], total: 0 };
      if (claimsRes.status === "fulfilled") {
        const resData = claimsRes.value?.data;
        if (resData?.success && resData?.data) {
          claimsData = resData.data;
        } else if (resData?.claims) {
          claimsData = resData;
        }
      }

      // Calculate stats
      const items = itemsData.items || [];
      const orders = ordersData.orders || [];
      const questions = questionsData.questions || [];
      const claims = claimsData.claims || [];

      console.log("Calculating stats from:", {
        itemsCount: items.length,
        ordersCount: orders.length,
        questionsCount: questions.length,
        claimsCount: claims.length,
      });

      const activeItems = items.filter((i) => i?.status === "active").length;
      const pausedItems = items.filter((i) => i?.status === "paused").length;
      const pendingOrders = orders.filter(
        (o) => o?.status === "pending" || o?.status === "paid",
      ).length;

      console.log("Active items:", activeItems, "Paused items:", pausedItems);

      // Calculate revenue from orders
      const totalRevenue = orders.reduce(
        (sum, o) => sum + (o?.total_amount || 0),
        0,
      );

      // Today's orders
      const today = new Date().toDateString();
      const todayOrders = orders.filter((o) => {
        const orderDate = new Date(o?.date_created);
        return orderDate.toDateString() === today;
      });
      const todayRevenue = todayOrders.reduce(
        (sum, o) => sum + (o?.total_amount || 0),
        0,
      );

      const newStats = {
        totalProducts: itemsData.paging?.total || items.length,
        activeProducts: activeItems,
        pausedProducts: pausedItems,
        totalOrders:
          ordersData.paging?.total || ordersData.total || orders.length,
        pendingOrders: pendingOrders,
        totalRevenue: totalRevenue,
        todayRevenue: todayRevenue,
        averageRating: 4.5, // Will be fetched from reputation API
        totalQuestions: questionsData.total || questions.length,
        pendingQuestions: questions.length,
        totalClaims: claimsData.total || claims.length,
        openClaims: claims.length,
        moderations: 0,
      };

      console.log("Setting stats:", newStats);
      setStats(newStats);

      // Set alerts
      setAlerts({
        pendingQuestions: questions.slice(0, 5),
        openClaims: claims.slice(0, 5),
        moderations: [],
        lowStock: items
          .filter((i) => (i?.available_quantity || 0) < 5)
          .slice(0, 5),
        ordersToShip: orders
          .filter(
            (o) => o?.status === "paid" && o?.shipping?.status !== "shipped",
          )
          .slice(0, 5),
      });

      // Set recent orders
      setRecentOrders(orders.slice(0, 10));

      // Generate sales chart data from orders
      const salesByDay = {};
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        });
        last7Days.push(dateStr);
        salesByDay[dateStr] = { date: dateStr, vendas: 0, receita: 0 };
      }

      orders.forEach((order) => {
        const orderDate = new Date(order?.date_created);
        const dateStr = orderDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        });
        if (salesByDay[dateStr]) {
          salesByDay[dateStr].vendas += 1;
          salesByDay[dateStr].receita += order?.total_amount || 0;
        }
      });

      setSalesData(last7Days.map((d) => salesByDay[d]));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Erro ao carregar dados do dashboard";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const accountsList = await loadAccounts();
      // If no accounts, stop loading
      if (!accountsList || accountsList.length === 0) {
        setLoading(false);
      }
    };
    init();
  }, [loadAccounts]);

  // Load data when account changes
  useEffect(() => {
    if (selectedAccountId) {
      loadDashboardData(selectedAccountId);
    } else {
      setLoading(false);
    }
  }, [selectedAccountId, loadDashboardData]);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  // Get selected account - ensure accounts is an array
  const selectedAccount = Array.isArray(accounts)
    ? accounts.find((a) => (a._id || a.id) === selectedAccountId)
    : null;

  return (
    <div className="dashboard-container">
      {/* Header with Account Selector */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Dashboard</h1>
          <p>Visao geral do seu negocio no Mercado Livre</p>
        </div>
        <div className="header-right">
          {Array.isArray(accounts) && accounts.length > 0 && (
            <select
              className="account-selector"
              value={selectedAccountId || ""}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              {accounts.map((account) => (
                <option
                  key={account._id || account.id}
                  value={account._id || account.id}
                >
                  {account.nickname ||
                    account.name ||
                    `Conta ${account.mlUserId}`}
                </option>
              ))}
            </select>
          )}
          <button
            className="refresh-btn"
            onClick={() => loadDashboardData(selectedAccountId)}
            disabled={loading}
          >
            <span className="material-icons">
              {loading ? "sync" : "refresh"}
            </span>
          </button>
        </div>
      </div>

      {/* No accounts message */}
      {(!Array.isArray(accounts) || accounts.length === 0) && !loading && (
        <div className="no-accounts-card">
          <span className="material-icons">account_circle</span>
          <h2>Nenhuma conta conectada</h2>
          <p>Conecte sua conta do Mercado Livre para ver seus dados</p>
          <Link to="/ml-auth" className="connect-btn">
            <span className="material-icons">add</span>
            Conectar Conta ML
          </Link>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Carregando dados...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="error-card">
          <span className="material-icons">error_outline</span>
          <h2>Erro ao carregar dados</h2>
          <p>{error}</p>
          <button
            className="retry-btn"
            onClick={() => {
              setError(null);
              if (selectedAccountId) {
                loadDashboardData(selectedAccountId);
              } else {
                loadAccounts();
              }
            }}
          >
            <span className="material-icons">refresh</span>
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && Array.isArray(accounts) && accounts.length > 0 && (
        <>
          {/* Quick Stats */}
          <div className="stats-grid">
            <div
              className="stat-card clickable"
              onClick={() => navigate("/items")}
            >
              <div className="stat-icon products">
                <span className="material-icons">inventory_2</span>
              </div>
              <div className="stat-content">
                <span className="stat-label">Anuncios Ativos</span>
                <p className="stat-value">{stats.activeProducts}</p>
                <span className="stat-sub">
                  {stats.pausedProducts > 0 &&
                    `${stats.pausedProducts} pausados`}
                </span>
              </div>
            </div>

            <div
              className="stat-card clickable"
              onClick={() => navigate("/orders")}
            >
              <div className="stat-icon orders">
                <span className="material-icons">shopping_cart</span>
              </div>
              <div className="stat-content">
                <span className="stat-label">Pedidos</span>
                <p className="stat-value">{stats.totalOrders}</p>
                <span className="stat-sub highlight">
                  {stats.pendingOrders > 0 &&
                    `${stats.pendingOrders} pendentes`}
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon revenue">
                <span className="material-icons">payments</span>
              </div>
              <div className="stat-content">
                <span className="stat-label">Receita Total</span>
                <p className="stat-value">
                  {formatCurrency(stats.totalRevenue)}
                </p>
                <span className="stat-sub success">
                  Hoje: {formatCurrency(stats.todayRevenue)}
                </span>
              </div>
            </div>

            <div
              className="stat-card clickable"
              onClick={() => navigate("/questions")}
            >
              <div className="stat-icon questions">
                <span className="material-icons">help_outline</span>
              </div>
              <div className="stat-content">
                <span className="stat-label">Perguntas</span>
                <p className="stat-value">{stats.pendingQuestions}</p>
                <span className="stat-sub warning">
                  {stats.pendingQuestions > 0
                    ? "Aguardando resposta"
                    : "Todas respondidas"}
                </span>
              </div>
            </div>
          </div>

          {/* Alerts Panel */}
          {(alerts.pendingQuestions.length > 0 ||
            alerts.openClaims.length > 0 ||
            alerts.ordersToShip.length > 0 ||
            alerts.lowStock.length > 0) && (
            <div className="alerts-panel">
              <h2>
                <span className="material-icons">notifications_active</span>
                Acoes Pendentes
              </h2>
              <div className="alerts-grid">
                {alerts.pendingQuestions.length > 0 && (
                  <div
                    className="alert-card warning"
                    onClick={() => navigate("/questions")}
                  >
                    <div className="alert-icon">
                      <span className="material-icons">help_outline</span>
                    </div>
                    <div className="alert-content">
                      <span className="alert-count">
                        {alerts.pendingQuestions.length}
                      </span>
                      <span className="alert-label">
                        Perguntas sem resposta
                      </span>
                    </div>
                    <span className="material-icons alert-arrow">
                      chevron_right
                    </span>
                  </div>
                )}

                {alerts.ordersToShip.length > 0 && (
                  <div
                    className="alert-card info"
                    onClick={() => navigate("/shipments")}
                  >
                    <div className="alert-icon">
                      <span className="material-icons">local_shipping</span>
                    </div>
                    <div className="alert-content">
                      <span className="alert-count">
                        {alerts.ordersToShip.length}
                      </span>
                      <span className="alert-label">Pedidos para enviar</span>
                    </div>
                    <span className="material-icons alert-arrow">
                      chevron_right
                    </span>
                  </div>
                )}

                {alerts.openClaims.length > 0 && (
                  <div
                    className="alert-card danger"
                    onClick={() => navigate("/claims")}
                  >
                    <div className="alert-icon">
                      <span className="material-icons">report_problem</span>
                    </div>
                    <div className="alert-content">
                      <span className="alert-count">
                        {alerts.openClaims.length}
                      </span>
                      <span className="alert-label">Reclamacoes abertas</span>
                    </div>
                    <span className="material-icons alert-arrow">
                      chevron_right
                    </span>
                  </div>
                )}

                {alerts.lowStock.length > 0 && (
                  <div
                    className="alert-card warning"
                    onClick={() => navigate("/inventory")}
                  >
                    <div className="alert-icon">
                      <span className="material-icons">inventory</span>
                    </div>
                    <div className="alert-content">
                      <span className="alert-count">
                        {alerts.lowStock.length}
                      </span>
                      <span className="alert-label">
                        Produtos com estoque baixo
                      </span>
                    </div>
                    <span className="material-icons alert-arrow">
                      chevron_right
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="dashboard-grid">
            {/* Sales Chart */}
            <div className="chart-card">
              <div className="card-header">
                <h3>Vendas - Ultimos 7 dias</h3>
                <Link to="/sales-dashboard" className="view-all">
                  Ver detalhes{" "}
                  <span className="material-icons">arrow_forward</span>
                </Link>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fill: "#666", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#666", fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "receita" ? formatCurrency(value) : value,
                      name === "receita" ? "Receita" : "Vendas",
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="vendas"
                    name="Vendas"
                    fill="#667eea"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Orders */}
            <div className="orders-card">
              <div className="card-header">
                <h3>Pedidos Recentes</h3>
                <Link to="/orders" className="view-all">
                  Ver todos{" "}
                  <span className="material-icons">arrow_forward</span>
                </Link>
              </div>
              <div className="orders-list">
                {recentOrders.length === 0 ? (
                  <div className="empty-state">
                    <span className="material-icons">inbox</span>
                    <p>Nenhum pedido recente</p>
                  </div>
                ) : (
                  recentOrders.slice(0, 5).map((order, index) => (
                    <div key={order.id || index} className="order-item">
                      <div className="order-info">
                        <span className="order-id">#{order.id}</span>
                        <span className="order-date">
                          {new Date(order.date_created).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                      </div>
                      <div className="order-details">
                        <span className={`order-status ${order.status}`}>
                          {order.status === "paid"
                            ? "Pago"
                            : order.status === "pending"
                              ? "Pendente"
                              : order.status === "cancelled"
                                ? "Cancelado"
                                : order.status}
                        </span>
                        <span className="order-amount">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <h2>Acoes Rapidas</h2>
            <div className="actions-grid">
              <Link to="/items/create" className="action-btn primary">
                <span className="material-icons">add_box</span>
                <span>Criar Anuncio</span>
              </Link>
              <Link to="/orders" className="action-btn">
                <span className="material-icons">receipt_long</span>
                <span>Ver Pedidos</span>
              </Link>
              <Link to="/shipments" className="action-btn">
                <span className="material-icons">local_shipping</span>
                <span>Gerenciar Envios</span>
              </Link>
              <Link to="/questions" className="action-btn">
                <span className="material-icons">chat</span>
                <span>Responder Perguntas</span>
              </Link>
              <Link to="/promotions" className="action-btn">
                <span className="material-icons">sell</span>
                <span>Criar Promocao</span>
              </Link>
              <Link to="/catalog" className="action-btn">
                <span className="material-icons">library_books</span>
                <span>Catalogo</span>
              </Link>
              <Link to="/advertising" className="action-btn">
                <span className="material-icons">campaign</span>
                <span>Product Ads</span>
              </Link>
              <Link to="/analytics" className="action-btn">
                <span className="material-icons">analytics</span>
                <span>Analises</span>
              </Link>
            </div>
          </div>

          {/* Account Info Card */}
          {selectedAccount && (
            <div className="account-info-card">
              <div className="account-header">
                <div className="account-avatar">
                  {selectedAccount.thumbnail ? (
                    <img
                      src={selectedAccount.thumbnail}
                      alt={selectedAccount.nickname}
                    />
                  ) : (
                    <span className="material-icons">account_circle</span>
                  )}
                </div>
                <div className="account-details">
                  <h3>{selectedAccount.nickname || "Conta ML"}</h3>
                  <span className="account-id">
                    ID: {selectedAccount.mlUserId}
                  </span>
                </div>
                <Link to="/accounts" className="manage-btn">
                  <span className="material-icons">settings</span>
                  Gerenciar Contas
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;
