import { useState } from "react";
import {
  useMLAccounts,
  useBillingBalance,
  useBillingSettlements,
  useBillingDailySummary,
  useBillingFees,
  useExportBillingReport,
} from "../hooks/useApi";
import "./Billing.css";

function Billing() {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Filters
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  // Fetch accounts with React Query
  const { data: accounts = [], isLoading: accountsLoading } = useMLAccounts();

  // Set first account as default
  if (accounts.length > 0 && !selectedAccount && !accountsLoading) {
    setSelectedAccount(accounts[0].id);
  }

  // Fetch billing data with React Query
  const { data: balance, isLoading: balanceLoading } =
    useBillingBalance(selectedAccount);
  const { data: settlements = [], isLoading: settlementsLoading } =
    useBillingSettlements(selectedAccount, {
      from: dateRange.from,
      to: dateRange.to,
    });
  const { data: dailySummary, isLoading: dailyLoading } =
    useBillingDailySummary(selectedAccount, 30);
  const { data: fees, isLoading: feesLoading } = useBillingFees(
    selectedAccount,
    { from: dateRange.from, to: dateRange.to },
  );

  // Export report mutation
  const exportReportMutation = useExportBillingReport();

  const loading =
    balanceLoading || settlementsLoading || dailyLoading || feesLoading;

  const formatCurrency = (value, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const exportReport = async (type) => {
    try {
      const result = await exportReportMutation.mutateAsync({
        accountId: selectedAccount,
        type,
        filters: {
          from: dateRange.from,
          to: dateRange.to,
          format: "json",
        },
      });

      const data = result.data.report;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${type}-${dateRange.from}-${dateRange.to}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar relatorio:", err);
    }
  };

  return (
    <div className="billing-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">account_balance</span>
            Conciliacao Financeira
          </h1>
          <p>Acompanhe receitas, taxas e saldo da sua conta</p>
        </div>
        <div className="header-actions">
          <select
            className="account-select"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.nickname || acc.mlUserId}
              </option>
            ))}
          </select>
          <div className="date-range">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange({ ...dateRange, from: e.target.value })
              }
            />
            <span>ate</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange({ ...dateRange, to: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      {balance && (
        <div className="balance-cards">
          <div className="balance-card primary">
            <div className="balance-icon">
              <span className="material-icons">account_balance_wallet</span>
            </div>
            <div className="balance-info">
              <span className="balance-label">Saldo Disponivel</span>
              <span className="balance-value">
                {formatCurrency(
                  balance.mercadopago_balance?.available_balance || 0,
                )}
              </span>
            </div>
          </div>
          <div className="balance-card success">
            <div className="balance-icon">
              <span className="material-icons">trending_up</span>
            </div>
            <div className="balance-info">
              <span className="balance-label">Receita Recente</span>
              <span className="balance-value">
                {formatCurrency(balance.recent_revenue?.total || 0)}
              </span>
              <span className="balance-detail">
                {balance.recent_revenue?.orders_count || 0} pedidos
              </span>
            </div>
          </div>
          {fees && (
            <>
              <div className="balance-card warning">
                <div className="balance-icon">
                  <span className="material-icons">remove_circle</span>
                </div>
                <div className="balance-info">
                  <span className="balance-label">Total Taxas</span>
                  <span className="balance-value">
                    {formatCurrency(fees.summary?.total_fees || 0)}
                  </span>
                  <span className="balance-detail">
                    {fees.summary?.fee_percentage || 0}% media
                  </span>
                </div>
              </div>
              <div className="balance-card info">
                <div className="balance-icon">
                  <span className="material-icons">savings</span>
                </div>
                <div className="balance-info">
                  <span className="balance-label">Receita Liquida</span>
                  <span className="balance-value">
                    {formatCurrency(fees.summary?.net_amount || 0)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="billing-tabs">
        <button
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <span className="material-icons">dashboard</span>
          Visao Geral
        </button>
        <button
          className={`tab ${activeTab === "settlements" ? "active" : ""}`}
          onClick={() => setActiveTab("settlements")}
        >
          <span className="material-icons">receipt</span>
          Liquidacoes
        </button>
        <button
          className={`tab ${activeTab === "fees" ? "active" : ""}`}
          onClick={() => setActiveTab("fees")}
        >
          <span className="material-icons">price_change</span>
          Taxas
        </button>
        <button
          className={`tab ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          <span className="material-icons">download</span>
          Relatorios
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando dados financeiros...</p>
        </div>
      ) : (
        <div className="billing-content">
          {/* Overview Tab */}
          {activeTab === "overview" && dailySummary && (
            <div className="overview-section">
              <div className="section-header">
                <h3>Evolucao Diaria (ultimos 30 dias)</h3>
              </div>

              <div className="daily-chart">
                <div className="chart-container">
                  {dailySummary.daily?.map((day, idx) => (
                    <div key={idx} className="chart-bar-container">
                      <div
                        className="chart-bar"
                        style={{
                          height: `${Math.min((day.net / (dailySummary.totals?.net || 1)) * 1000, 100)}%`,
                        }}
                        title={`${formatDate(day.date)}: ${formatCurrency(day.net)}`}
                      >
                        <span className="bar-value">
                          {formatCurrency(day.net)}
                        </span>
                      </div>
                      <span className="bar-date">{day.date.split("-")[2]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="totals-summary">
                <div className="total-item">
                  <span className="total-label">Total Bruto</span>
                  <span className="total-value success">
                    {formatCurrency(dailySummary.totals?.gross || 0)}
                  </span>
                </div>
                <div className="total-item">
                  <span className="total-label">Total Taxas</span>
                  <span className="total-value warning">
                    {formatCurrency(dailySummary.totals?.fees || 0)}
                  </span>
                </div>
                <div className="total-item">
                  <span className="total-label">Total Liquido</span>
                  <span className="total-value primary">
                    {formatCurrency(dailySummary.totals?.net || 0)}
                  </span>
                </div>
                <div className="total-item">
                  <span className="total-label">Total Pedidos</span>
                  <span className="total-value">
                    {dailySummary.totals?.orders || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Settlements Tab */}
          {activeTab === "settlements" && (
            <div className="settlements-section">
              <div className="section-header">
                <h3>Liquidacoes</h3>
                <span className="count">{settlements.length} registros</span>
              </div>

              {settlements.length === 0 ? (
                <div className="empty-state">
                  <span className="material-icons">inbox</span>
                  <h3>Nenhuma liquidacao encontrada</h3>
                  <p>Ajuste o periodo para ver mais resultados</p>
                </div>
              ) : (
                <div className="settlements-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Data</th>
                        <th>Comprador</th>
                        <th>Valor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlements.map((settlement, idx) => (
                        <tr key={idx}>
                          <td className="order-id">#{settlement.order_id}</td>
                          <td>{formatDate(settlement.date_created)}</td>
                          <td>{settlement.buyer?.nickname || "N/A"}</td>
                          <td className="amount">
                            {formatCurrency(settlement.total_amount)}
                          </td>
                          <td>
                            <span
                              className={`badge badge-${settlement.status === "paid" ? "success" : "secondary"}`}
                            >
                              {settlement.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Fees Tab */}
          {activeTab === "fees" && fees && (
            <div className="fees-section">
              <div className="section-header">
                <h3>Detalhamento de Taxas</h3>
              </div>

              <div className="fees-breakdown">
                <div className="fee-item">
                  <div className="fee-icon marketplace">
                    <span className="material-icons">store</span>
                  </div>
                  <div className="fee-info">
                    <span className="fee-label">Taxa do Marketplace</span>
                    <span className="fee-value">
                      {formatCurrency(fees.breakdown?.marketplace_fee || 0)}
                    </span>
                  </div>
                </div>
                <div className="fee-item">
                  <div className="fee-icon shipping">
                    <span className="material-icons">local_shipping</span>
                  </div>
                  <div className="fee-info">
                    <span className="fee-label">Taxa de Envio</span>
                    <span className="fee-value">
                      {formatCurrency(fees.breakdown?.shipping_fee || 0)}
                    </span>
                  </div>
                </div>
                <div className="fee-item">
                  <div className="fee-icon financing">
                    <span className="material-icons">credit_card</span>
                  </div>
                  <div className="fee-info">
                    <span className="fee-label">Taxa de Financiamento</span>
                    <span className="fee-value">
                      {formatCurrency(fees.breakdown?.financing_fee || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="fees-summary-box">
                <div className="summary-row">
                  <span>Receita Bruta</span>
                  <span className="value">
                    {formatCurrency(fees.summary?.gross_amount || 0)}
                  </span>
                </div>
                <div className="summary-row negative">
                  <span>Total de Taxas</span>
                  <span className="value">
                    - {formatCurrency(fees.summary?.total_fees || 0)}
                  </span>
                </div>
                <div className="summary-row total">
                  <span>Receita Liquida</span>
                  <span className="value">
                    {formatCurrency(fees.summary?.net_amount || 0)}
                  </span>
                </div>
                <div className="summary-note">
                  Taxa media: {fees.summary?.fee_percentage || 0}% sobre{" "}
                  {fees.orders_analyzed || 0} pedidos
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <div className="reports-section">
              <div className="section-header">
                <h3>Exportar Relatorios</h3>
              </div>

              <div className="reports-grid">
                <div
                  className="report-card"
                  onClick={() => exportReport("sales")}
                >
                  <div className="report-icon">
                    <span className="material-icons">shopping_cart</span>
                  </div>
                  <div className="report-info">
                    <h4>Relatorio de Vendas</h4>
                    <p>Exportar todas as vendas do periodo</p>
                  </div>
                  <span className="material-icons arrow">download</span>
                </div>

                <div
                  className="report-card"
                  onClick={() => exportReport("fees")}
                >
                  <div className="report-icon">
                    <span className="material-icons">price_change</span>
                  </div>
                  <div className="report-info">
                    <h4>Relatorio de Taxas</h4>
                    <p>Detalhamento de taxas por pedido</p>
                  </div>
                  <span className="material-icons arrow">download</span>
                </div>

                <div
                  className="report-card"
                  onClick={() => exportReport("settlements")}
                >
                  <div className="report-icon">
                    <span className="material-icons">receipt_long</span>
                  </div>
                  <div className="report-info">
                    <h4>Relatorio de Liquidacoes</h4>
                    <p>Pagamentos liberados no periodo</p>
                  </div>
                  <span className="material-icons arrow">download</span>
                </div>

                <div
                  className="report-card"
                  onClick={() => exportReport("summary")}
                >
                  <div className="report-icon">
                    <span className="material-icons">summarize</span>
                  </div>
                  <div className="report-info">
                    <h4>Resumo Financeiro</h4>
                    <p>Visao consolidada do periodo</p>
                  </div>
                  <span className="material-icons arrow">download</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Billing;
