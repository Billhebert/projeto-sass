import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  mpPaymentsAPI,
  mpSubscriptionsAPI,
  mpAccountAPI,
  formatMPCurrency,
  getMPStatusColor,
  getMPStatusLabel,
} from "../services/mercadopago";
import { useToastStore } from "../store/toastStore";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "./MPDashboard.css";

function MPDashboard() {
  const [loading, setLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState(null);
  const [balance, setBalance] = useState(null);
  const [paymentStats, setPaymentStats] = useState(null);
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const { showToast } = useToastStore();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [accountRes, balanceRes, paymentsRes, subsStatsRes, recentRes] =
        await Promise.allSettled([
          mpAccountAPI.getMe(),
          mpAccountAPI.getBalance(),
          mpPaymentsAPI.getStats({}),
          mpSubscriptionsAPI.getStats(),
          mpPaymentsAPI.search({
            limit: 100, // Increased limit to fetch more recent payments
            sort: "date_created",
            criteria: "desc",
          }),
        ]);

      if (accountRes.status === "fulfilled") {
        setAccountInfo(accountRes.value.data);
      }

      if (balanceRes.status === "fulfilled") {
        setBalance(balanceRes.value.data);
      }

      if (paymentsRes.status === "fulfilled") {
        setPaymentStats(paymentsRes.value.data);
      }

      if (subsStatsRes.status === "fulfilled") {
        setSubscriptionStats(subsStatsRes.value.data);
      }

      if (recentRes.status === "fulfilled") {
        setRecentPayments(recentRes.value.data?.results || []);
      }

      // Check if all requests failed with 501 (MP disabled)
      const all501 = [
        accountRes,
        balanceRes,
        paymentsRes,
        subsStatsRes,
        recentRes,
      ].every(
        (res) =>
          res.status === "rejected" && res.reason?.response?.status === 501,
      );

      if (all501) {
        showToast(
          "Integração Mercado Pago não disponível. Use Mercado Livre.",
          "info",
        );
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
      if (error.response?.status === 501) {
        showToast(
          "Integração Mercado Pago não disponível. Use Mercado Livre.",
          "info",
        );
      } else {
        showToast("Erro ao carregar dados do dashboard", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const getPaymentChartData = () => {
    if (!paymentStats?.payment) return [];

    const data = [];
    Object.entries(paymentStats.payment.byStatus || {}).forEach(
      ([status, info]) => {
        data.push({
          name: getMPStatusLabel(status),
          value: info.count,
          amount: info.amount,
          color: getMPStatusColor(status),
        });
      },
    );
    return data;
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  if (loading) {
    return (
      <div className="mp-dashboard">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando dados do Mercado Pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mp-dashboard">
      <header className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">account_balance_wallet</span>
            Mercado Pago
          </h1>
          <p>Dashboard de pagamentos e transacoes</p>
        </div>
        <div className="header-actions">
          <Link to="/mp/checkout" className="btn btn-primary">
            <span className="material-icons">add_shopping_cart</span>
            Novo Checkout
          </Link>
        </div>
      </header>

      {/* Account Info */}
      {accountInfo && (
        <div className="account-info-card">
          <div className="account-avatar">
            <span className="material-icons">account_circle</span>
          </div>
          <div className="account-details">
            <h3>{accountInfo.nickname || accountInfo.first_name}</h3>
            <p>{accountInfo.email}</p>
            <span className="account-id">ID: {accountInfo.id}</span>
          </div>
          {balance && (
            <div className="account-balance">
              <span className="balance-label">Saldo Disponivel</span>
              <span className="balance-amount">
                {formatMPCurrency(balance.balance?.available_balance || 0)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon payments">
            <span className="material-icons">payments</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {paymentStats?.payment?.total || 0}
            </span>
            <span className="stat-label">Total de Pagamentos</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue">
            <span className="material-icons">trending_up</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {formatMPCurrency(paymentStats?.payment?.totalAmount || 0)}
            </span>
            <span className="stat-label">Volume Total</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon subscriptions">
            <span className="material-icons">autorenew</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">{subscriptionStats?.active || 0}</span>
            <span className="stat-label">Assinaturas Ativas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon mrr">
            <span className="material-icons">calendar_month</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {formatMPCurrency(subscriptionStats?.totalRevenue || 0)}
            </span>
            <span className="stat-label">Receita Assinaturas</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Payment Status Distribution */}
        <div className="chart-card">
          <h3>Distribuicao por Status</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={getPaymentChartData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {getPaymentChartData().map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Stats */}
        <div className="chart-card">
          <h3>Assinaturas</h3>
          <div className="subscription-stats">
            <div className="sub-stat">
              <span className="sub-stat-value active">
                {subscriptionStats?.active || 0}
              </span>
              <span className="sub-stat-label">Ativas</span>
            </div>
            <div className="sub-stat">
              <span className="sub-stat-value paused">
                {subscriptionStats?.paused || 0}
              </span>
              <span className="sub-stat-label">Pausadas</span>
            </div>
            <div className="sub-stat">
              <span className="sub-stat-value cancelled">
                {subscriptionStats?.cancelled || 0}
              </span>
              <span className="sub-stat-label">Canceladas</span>
            </div>
            <div className="sub-stat">
              <span className="sub-stat-value total">
                {subscriptionStats?.total || 0}
              </span>
              <span className="sub-stat-label">Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Acoes Rapidas</h3>
        <div className="actions-grid">
          <Link to="/mp/payments" className="action-card">
            <span className="material-icons">receipt_long</span>
            <span>Ver Pagamentos</span>
          </Link>
          <Link to="/mp/checkout" className="action-card">
            <span className="material-icons">shopping_cart_checkout</span>
            <span>Criar Checkout</span>
          </Link>
          <Link to="/mp/subscriptions" className="action-card">
            <span className="material-icons">subscriptions</span>
            <span>Assinaturas</span>
          </Link>
          <Link to="/mp/customers" className="action-card">
            <span className="material-icons">people</span>
            <span>Clientes</span>
          </Link>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="recent-section">
        <div className="section-header">
          <h3>Pagamentos Recentes</h3>
          <Link to="/mp/payments" className="view-all">
            Ver todos
            <span className="material-icons">arrow_forward</span>
          </Link>
        </div>
        <div className="payments-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Metodo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length > 0 ? (
                recentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="payment-id">#{payment.id}</td>
                    <td>
                      {new Date(payment.date_created).toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td className="payment-amount">
                      {formatMPCurrency(
                        payment.transaction_amount,
                        payment.currency_id,
                      )}
                    </td>
                    <td>{payment.payment_method_id}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getMPStatusColor(payment.status),
                        }}
                      >
                        {getMPStatusLabel(payment.status)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-state">
                    Nenhum pagamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MPDashboard;
