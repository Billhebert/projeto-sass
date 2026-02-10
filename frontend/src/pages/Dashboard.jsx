import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMLAccounts, useDashboardMetrics } from "../hooks/useApi";
import DashboardHeader from "../components/DashboardHeader";
import DashboardStats from "../components/DashboardStats";
import DashboardAlerts from "../components/DashboardAlerts";
import DashboardCharts from "../components/DashboardCharts";
import DashboardRecentOrders from "../components/DashboardRecentOrders";
import DashboardQuickActions from "../components/DashboardQuickActions";
import LoadingState from "../components/LoadingState";
import "./Dashboard.css";

/**
 * Dashboard Page - Main overview of user's business on Mercado Livre
 */
function Dashboard() {
  const navigate = useNavigate();
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // Fetch accounts using React Query
  const {
    data: accounts = [],
    isLoading: accountsLoading,
    error: accountsError,
  } = useMLAccounts();

  // Fetch dashboard metrics for selected account
  const {
    data: metrics,
    isLoading: metricsLoading,
    items,
    orders,
    questions,
    claims,
    refetch: refetchMetrics,
  } = useDashboardMetrics(selectedAccountId);

  // Auto-select first account when accounts load
  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const firstAccountId = accounts[0]._id || accounts[0].id;
      setSelectedAccountId(firstAccountId);
    }
  }, [accounts, selectedAccountId]);

  // Format currency helper
  const formatCurrency = useCallback((value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  }, []);

  // Calculate stats for stats cards
  const stats = {
    activeProducts: {
      label: "Anúncios Ativos",
      value: metrics?.activeProducts || 0,
      icon: "inventory_2",
      color: "products",
      subtext:
        metrics?.pausedProducts > 0
          ? `${metrics.pausedProducts} pausados`
          : null,
      onClick: () => navigate("/items"),
    },
    totalOrders: {
      label: "Pedidos",
      value: metrics?.totalOrders || 0,
      icon: "shopping_cart",
      color: "orders",
      subtext:
        metrics?.pendingOrders > 0
          ? `${metrics.pendingOrders} pendentes`
          : null,
      highlight: metrics?.pendingOrders > 0,
      onClick: () => navigate("/orders"),
    },
    totalRevenue: {
      label: "Receita Total",
      value: formatCurrency(metrics?.totalRevenue || 0),
      icon: "payments",
      color: "revenue",
      onClick: null,
    },
    pendingQuestions: {
      label: "Perguntas",
      value: metrics?.pendingQuestions || 0,
      icon: "help_outline",
      color: "questions",
      subtext:
        metrics?.pendingQuestions > 0
          ? "Aguardando resposta"
          : "Todas respondidas",
      warning: metrics?.pendingQuestions > 0,
      onClick: () => navigate("/questions"),
    },
  };

  // Calculate alerts
  const alerts = {
    pendingQuestions: questions?.slice(0, 5) || [],
    openClaims: claims?.slice(0, 5) || [],
    moderations: [],
    lowStock:
      items?.filter((i) => (i?.available_quantity || 0) < 5).slice(0, 5) || [],
    ordersToShip:
      orders
        ?.filter(
          (o) => o?.status === "paid" && o?.shipping?.status !== "shipped",
        )
        .slice(0, 5) || [],
  };

  // Generate sales chart data from orders
  const salesData = React.useMemo(() => {
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

    orders?.forEach((order) => {
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

    return last7Days.map((d) => salesByDay[d]);
  }, [orders]);

  // Get selected account
  const selectedAccount = accounts.find(
    (a) => (a._id || a.id) === selectedAccountId,
  );

  // Handle loading state
  const isLoading = accountsLoading || (selectedAccountId && metricsLoading);

  return (
    <div className="dashboard-container">
      {/* Header with Account Selector */}
      <DashboardHeader
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        onRefresh={() => refetchMetrics()}
        loading={metricsLoading}
      />

      {/* No accounts message */}
      {accounts.length === 0 && !accountsLoading && (
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
      {isLoading && <LoadingState message="Carregando dados do dashboard..." />}

      {/* Error state */}
      {accountsError && !isLoading && (
        <div className="error-card">
          <span className="material-icons">error_outline</span>
          <h2>Erro ao carregar dados</h2>
          <p>{accountsError.message || "Erro desconhecido"}</p>
          <button className="retry-btn" onClick={() => refetchMetrics()}>
            <span className="material-icons">refresh</span>
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && accounts.length > 0 && (
        <>
          {/* Quick Stats */}
          <DashboardStats stats={Object.values(stats)} />

          {/* Alerts Panel */}
          <DashboardAlerts alerts={alerts} />

          {/* Main Content Grid */}
          <div className="dashboard-grid">
            {/* Sales Chart */}
            <DashboardCharts
              salesData={salesData}
              formatCurrency={formatCurrency}
            />

            {/* Recent Orders */}
            <DashboardRecentOrders
              orders={orders || []}
              formatCurrency={formatCurrency}
            />
          </div>

          {/* Quick Actions */}
          <DashboardQuickActions />

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
