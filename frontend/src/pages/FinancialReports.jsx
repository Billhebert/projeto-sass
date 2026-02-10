import { useState, useEffect } from "react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "../services/api";
import { exportFinancialReportToCSV } from "../utils/export";
import { exportFinancialReportToPDF } from "../utils/pdfExportUtils";
import "./FinancialReports.css";

function FinancialReports() {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [reportType, setReportType] = useState("releases");
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalFees: 0,
    netProfit: 0,
    pendingBalance: 0,
    refunds: 0,
    chargebacks: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [feeBreakdown, setFeeBreakdown] = useState([]);

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ef4444",
    "#06b6d4",
  ];

  useEffect(() => {
    // Set default date range to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setDateRange({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/ml-accounts");
      if (response.data.success) {
        const accountsList = response.data.data?.accounts || [];
        setAccounts(accountsList);
        if (accountsList.length > 0) {
          setSelectedAccount(accountsList[0].id || accountsList[0].accountId);
        }
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  useEffect(() => {
    if (selectedAccount && dateRange.start && dateRange.end) {
      fetchFinancialData();
    }
  }, [selectedAccount, dateRange]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      // Fetch ALL orders with auto-pagination (no limits!)
      let allOrders = [];
      let offset = 0;
      const limit = 200;
      let hasMore = true;

      while (hasMore) {
        const response = await api.get(
          `/orders/${selectedAccount}?limit=${limit}&offset=${offset}&date_created.from=${dateRange.start}T00:00:00.000Z&date_created.to=${dateRange.end}T23:59:59.999Z`,
        );

        if (!response.data.success) {
          throw new Error("Failed to fetch orders");
        }

        const orders = response.data.data?.orders || [];
        allOrders = allOrders.concat(orders);

        if (orders.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      // Fetch analytics
      const analyticsResponse = await api.get(
        `/orders/${selectedAccount}/analytics?date_created.from=${dateRange.start}T00:00:00.000Z&date_created.to=${dateRange.end}T23:59:59.999Z`,
      );

      const paidOrders = allOrders.filter(
        (o) => o.status === "paid" || o.status === "confirmed",
      );

      // Get real fees from analytics
      const analyticsData = analyticsResponse.data.data || {};
      const realFees = analyticsData.fees || {};
      const totalMarketplaceFees = realFees.marketplaceFees || 0;
      const totalShippingCost = realFees.shippingCost || 0;
      const totalItemFees = realFees.totalFees || 0;

      // Calculate real statistics
      const totalReceived = paidOrders.reduce(
        (sum, o) => sum + (o.totalAmount || 0),
        0,
      );

      // Use real fees if available, otherwise estimate
      const totalFees =
        totalMarketplaceFees > 0 || totalItemFees > 0
          ? totalMarketplaceFees + totalItemFees
          : totalReceived * 0.12;

      const netProfit = totalReceived - totalFees - totalShippingCost;
      const cancelledOrders = allOrders.filter((o) => o.status === "cancelled");
      const refunds = cancelledOrders.reduce(
        (sum, o) => sum + (o.totalAmount || 0),
        0,
      );

      const calculatedStats = {
        totalReceived: totalReceived,
        totalFees: totalFees,
        netProfit: netProfit,
        pendingBalance: 0, // Not available from orders
        refunds: refunds,
        chargebacks: 0, // Not available from orders
      };

      // Group orders by date for chart
      const ordersByDate = {};
      paidOrders.forEach((order) => {
        const dateKey = new Date(order.dateCreated).toLocaleDateString(
          "pt-BR",
          { day: "2-digit", month: "2-digit" },
        );
        if (!ordersByDate[dateKey]) {
          ordersByDate[dateKey] = { received: 0, count: 0 };
        }
        ordersByDate[dateKey].received += order.totalAmount || 0;
        ordersByDate[dateKey].count += 1;
      });

      const calculatedChartData = Object.keys(ordersByDate)
        .sort((a, b) => {
          const [dayA, monthA] = a.split("/");
          const [dayB, monthB] = b.split("/");
          return (
            parseInt(monthA) * 100 +
            parseInt(dayA) -
            (parseInt(monthB) * 100 + parseInt(dayB))
          );
        })
        .map((dateKey) => ({
          date: dateKey,
          received: Math.round(ordersByDate[dateKey].received),
          fees: Math.round(
            (ordersByDate[dateKey].received * totalFees) / totalReceived || 0,
          ),
          net: Math.round(
            ordersByDate[dateKey].received -
              (ordersByDate[dateKey].received * totalFees) / totalReceived || 0,
          ),
        }));

      // Fee breakdown with real data
      const feePercentage =
        totalReceived > 0 ? (totalFees / totalReceived) * 100 : 0;
      const shippingPercentage =
        totalReceived > 0 ? (totalShippingCost / totalReceived) * 100 : 0;

      const calculatedFeeBreakdown = [
        {
          name: "Taxa ML/MP",
          value: Math.round(totalFees),
          percentage: Math.round(feePercentage * 10) / 10,
        },
        {
          name: "Frete",
          value: Math.round(totalShippingCost),
          percentage: Math.round(shippingPercentage * 10) / 10,
        },
        {
          name: "Outros",
          value: 0,
          percentage: 0,
        },
      ];

      setStats(calculatedStats);
      setChartData(
        calculatedChartData.length > 0
          ? calculatedChartData
          : [{ date: "Sem dados", received: 0, fees: 0, net: 0 }],
      );
      setFeeBreakdown(calculatedFeeBreakdown);
      setReports([]); // No reports available from orders API
    } catch (error) {
      console.error("Error fetching financial data:", error);
      // Set empty data on error
      setStats({
        totalReceived: 0,
        totalFees: 0,
        netProfit: 0,
        pendingBalance: 0,
        refunds: 0,
        chargebacks: 0,
      });
      setChartData([{ date: "Erro", received: 0, fees: 0, net: 0 }]);
      setFeeBreakdown([]);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    exportFinancialReportToCSV(stats, chartData, feeBreakdown, dateRange);
  };

  const handleExportPDF = () => {
    exportFinancialReportToPDF(stats, chartData, feeBreakdown, dateRange);
  };

  const handleGenerateReport = async () => {
    try {
      alert(`Gerando relatorio de ${reportType} para o periodo selecionado...`);
      // In real implementation, call MP API to generate report
    } catch (error) {
      console.error("Error generating report:", error);
    }
  };

  const handleDownloadReport = (report) => {
    if (report.status === "ready") {
      // In real implementation, download from MP
      alert(`Baixando relatorio ${report.id}...`);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="financial-reports-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Relatorios Financeiros</h1>
          <p>
            Relatorios detalhados do Mercado Pago: liberacoes, liquidacoes,
            taxas e conciliacoes
          </p>
        </div>
        <div className="header-actions">
          <select
            className="account-select"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="">Selecione uma conta</option>
            {accounts.map((account) => (
              <option
                key={account.id || account.accountId}
                value={account.id || account.accountId}
              >
                {account.nickname || account.id || account.accountId}
              </option>
            ))}
          </select>
          <button
            className="btn btn-secondary"
            onClick={handleExportCSV}
            disabled={!selectedAccount}
          >
            <span className="material-icons">download</span>
            Exportar CSV
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleExportPDF}
            disabled={!selectedAccount}
          >
            <span className="material-icons">picture_as_pdf</span>
            Exportar PDF
          </button>
          <div className="date-range">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
            />
            <span>ate</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {!selectedAccount ? (
        <div className="empty-state">
          <span className="material-icons">account_balance</span>
          <h3>Selecione uma conta</h3>
          <p>
            Selecione uma conta do Mercado Livre para ver os relatorios
            financeiros
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon green">
                <span className="material-icons">account_balance_wallet</span>
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {formatCurrency(stats.totalReceived)}
                </span>
                <span className="stat-label">Total Recebido</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">
                <span className="material-icons">remove_circle</span>
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {formatCurrency(stats.totalFees)}
                </span>
                <span className="stat-label">Total em Taxas</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue">
                <span className="material-icons">trending_up</span>
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {formatCurrency(stats.netProfit)}
                </span>
                <span className="stat-label">Lucro Liquido</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange">
                <span className="material-icons">schedule</span>
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {formatCurrency(stats.pendingBalance)}
                </span>
                <span className="stat-label">Saldo Pendente</span>
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="secondary-stats">
            <div className="secondary-stat">
              <span className="material-icons warning">undo</span>
              <div>
                <span className="value">{formatCurrency(stats.refunds)}</span>
                <span className="label">Reembolsos</span>
              </div>
            </div>
            <div className="secondary-stat">
              <span className="material-icons danger">gpp_bad</span>
              <div>
                <span className="value">
                  {formatCurrency(stats.chargebacks)}
                </span>
                <span className="label">Chargebacks</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <span className="material-icons">bar_chart</span>
              Visao Geral
            </button>
            <button
              className={`tab ${activeTab === "reports" ? "active" : ""}`}
              onClick={() => setActiveTab("reports")}
            >
              <span className="material-icons">description</span>
              Relatorios
            </button>
            <button
              className={`tab ${activeTab === "fees" ? "active" : ""}`}
              onClick={() => setActiveTab("fees")}
            >
              <span className="material-icons">receipt_long</span>
              Detalhamento Taxas
            </button>
            <button
              className={`tab ${activeTab === "transactions" ? "active" : ""}`}
              onClick={() => setActiveTab("transactions")}
            >
              <span className="material-icons">swap_horiz</span>
              Transacoes
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando dados financeiros...</p>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div className="charts-grid">
                  <div className="chart-card full-width">
                    <h3>Evolucao Financeira</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border-color)"
                        />
                        <XAxis dataKey="date" stroke="var(--text-secondary)" />
                        <YAxis stroke="var(--text-secondary)" />
                        <Tooltip
                          contentStyle={{
                            background: "var(--bg-primary)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                          }}
                          formatter={(value) => formatCurrency(value)}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="received"
                          name="Recebido"
                          stroke="#10b981"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="fees"
                          name="Taxas"
                          stroke="#ef4444"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="net"
                          name="Liquido"
                          stroke="#3b82f6"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-card">
                    <h3>Composicao de Taxas</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={feeBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {feeBreakdown.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-legend">
                      {feeBreakdown.map((item, index) => (
                        <div key={item.name} className="legend-item">
                          <span
                            className="color-dot"
                            style={{ background: COLORS[index] }}
                          ></span>
                          <span className="name">{item.name}</span>
                          <span className="value">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="chart-card">
                    <h3>Receitas por Dia</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border-color)"
                        />
                        <XAxis dataKey="date" stroke="var(--text-secondary)" />
                        <YAxis stroke="var(--text-secondary)" />
                        <Tooltip
                          contentStyle={{
                            background: "var(--bg-primary)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                          }}
                          formatter={(value) => formatCurrency(value)}
                        />
                        <Bar
                          dataKey="net"
                          name="Liquido"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {activeTab === "reports" && (
                <div className="section">
                  <div className="section-header">
                    <h2>Gerar Novo Relatorio</h2>
                  </div>

                  <div className="report-generator">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Tipo de Relatorio</label>
                        <select
                          value={reportType}
                          onChange={(e) => setReportType(e.target.value)}
                        >
                          <option value="releases">
                            Liberacoes (Release Report)
                          </option>
                          <option value="settlements">
                            Liquidacoes (Settlement Report)
                          </option>
                          <option value="account_balance">
                            Extrato de Conta
                          </option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Periodo</label>
                        <div className="date-inputs">
                          <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) =>
                              setDateRange((prev) => ({
                                ...prev,
                                start: e.target.value,
                              }))
                            }
                          />
                          <span>ate</span>
                          <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) =>
                              setDateRange((prev) => ({
                                ...prev,
                                end: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleGenerateReport}
                    >
                      <span className="material-icons">description</span>
                      Gerar Relatorio
                    </button>
                  </div>

                  <div className="section-header" style={{ marginTop: "32px" }}>
                    <h2>Relatorios Gerados</h2>
                  </div>

                  <div className="reports-list">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className={`report-card ${report.status}`}
                      >
                        <div className="report-info">
                          <div className="report-header">
                            <span className="report-id">{report.id}</span>
                            <span className={`status-badge ${report.status}`}>
                              {report.status === "ready"
                                ? "Pronto"
                                : "Processando"}
                            </span>
                          </div>
                          <div className="report-details">
                            <span className="report-type">
                              {report.type === "release"
                                ? "Liberacoes"
                                : "Liquidacoes"}
                            </span>
                            <span className="report-period">
                              {report.period}
                            </span>
                          </div>
                          {report.totalAmount && (
                            <div className="report-amount">
                              Total: {formatCurrency(report.totalAmount)}
                            </div>
                          )}
                          <div className="report-date">
                            Gerado em: {formatDate(report.generatedAt)}
                          </div>
                        </div>
                        <div className="report-actions">
                          <button
                            className="btn btn-primary"
                            onClick={() => handleDownloadReport(report)}
                            disabled={report.status !== "ready"}
                          >
                            <span className="material-icons">download</span>
                            Baixar CSV
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "fees" && (
                <div className="section">
                  <div className="section-header">
                    <h2>Detalhamento de Taxas</h2>
                  </div>

                  <div className="fees-breakdown">
                    <table className="fees-table">
                      <thead>
                        <tr>
                          <th>Categoria</th>
                          <th>Descricao</th>
                          <th>Quantidade</th>
                          <th>Valor Total</th>
                          <th>% do Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <span className="fee-icon ml">ML</span>
                            Taxa Mercado Livre
                          </td>
                          <td>Comissao sobre vendas</td>
                          <td>245</td>
                          <td>{formatCurrency(8540)}</td>
                          <td>53.8%</td>
                        </tr>
                        <tr>
                          <td>
                            <span className="fee-icon mp">MP</span>
                            Taxa Mercado Pago
                          </td>
                          <td>Processamento de pagamentos</td>
                          <td>245</td>
                          <td>{formatCurrency(3200)}</td>
                          <td>20.2%</td>
                        </tr>
                        <tr>
                          <td>
                            <span className="fee-icon shipping">
                              <span className="material-icons">
                                local_shipping
                              </span>
                            </span>
                            Custos de Frete
                          </td>
                          <td>Subsidio de frete gratis</td>
                          <td>180</td>
                          <td>{formatCurrency(2890)}</td>
                          <td>18.2%</td>
                        </tr>
                        <tr>
                          <td>
                            <span className="fee-icon tax">
                              <span className="material-icons">receipt</span>
                            </span>
                            Impostos
                          </td>
                          <td>ISS e outros</td>
                          <td>-</td>
                          <td>{formatCurrency(1240)}</td>
                          <td>7.8%</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="3">
                            <strong>Total de Taxas</strong>
                          </td>
                          <td>
                            <strong>{formatCurrency(stats.totalFees)}</strong>
                          </td>
                          <td>
                            <strong>100%</strong>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="fee-tips">
                    <h3>Dicas para Reduzir Taxas</h3>
                    <ul>
                      <li>
                        <span className="material-icons">lightbulb</span>
                        Melhore sua reputacao para ter taxas reduzidas
                      </li>
                      <li>
                        <span className="material-icons">lightbulb</span>
                        Use Mercado Envios Full para subsidio de frete
                      </li>
                      <li>
                        <span className="material-icons">lightbulb</span>
                        Venda em categorias com taxas menores
                      </li>
                      <li>
                        <span className="material-icons">lightbulb</span>
                        Aumente o ticket medio para diluir custos fixos
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === "transactions" && (
                <div className="section">
                  <div className="section-header">
                    <h2>Ultimas Transacoes</h2>
                  </div>

                  <div className="transactions-list">
                    <div className="transaction-item credit">
                      <div className="transaction-icon">
                        <span className="material-icons">arrow_downward</span>
                      </div>
                      <div className="transaction-info">
                        <span className="transaction-title">
                          Venda #MLB-5001234567
                        </span>
                        <span className="transaction-date">
                          15/01/2024 14:32
                        </span>
                      </div>
                      <div className="transaction-amount">
                        <span className="amount">
                          + {formatCurrency(299.9)}
                        </span>
                        <span className="fee">
                          Taxa: -{formatCurrency(35.98)}
                        </span>
                      </div>
                    </div>

                    <div className="transaction-item credit">
                      <div className="transaction-icon">
                        <span className="material-icons">arrow_downward</span>
                      </div>
                      <div className="transaction-info">
                        <span className="transaction-title">
                          Venda #MLB-5001234568
                        </span>
                        <span className="transaction-date">
                          15/01/2024 12:18
                        </span>
                      </div>
                      <div className="transaction-amount">
                        <span className="amount">
                          + {formatCurrency(189.0)}
                        </span>
                        <span className="fee">
                          Taxa: -{formatCurrency(22.68)}
                        </span>
                      </div>
                    </div>

                    <div className="transaction-item debit">
                      <div className="transaction-icon">
                        <span className="material-icons">arrow_upward</span>
                      </div>
                      <div className="transaction-info">
                        <span className="transaction-title">
                          Reembolso #MLB-5001234555
                        </span>
                        <span className="transaction-date">
                          14/01/2024 18:45
                        </span>
                      </div>
                      <div className="transaction-amount">
                        <span className="amount refund">
                          - {formatCurrency(149.9)}
                        </span>
                      </div>
                    </div>

                    <div className="transaction-item withdrawal">
                      <div className="transaction-icon">
                        <span className="material-icons">account_balance</span>
                      </div>
                      <div className="transaction-info">
                        <span className="transaction-title">
                          Saque para conta bancaria
                        </span>
                        <span className="transaction-date">
                          14/01/2024 10:00
                        </span>
                      </div>
                      <div className="transaction-amount">
                        <span className="amount withdrawal">
                          - {formatCurrency(5000.0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="load-more">
                    <button className="btn btn-secondary">
                      Carregar Mais Transacoes
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default FinancialReports;
