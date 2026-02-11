import { useState, useEffect, useMemo } from "react";
import {
  useMLAccounts,
  useConciliationTransactions,
  useReconcileTransactions,
} from "../hooks/useApi";
import { exportConciliationToCSV } from "../utils/export";
import { exportConciliationToPDF } from "../utils/pdfExportUtils";
import "./Conciliation.css";

function Conciliation() {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setDateRange({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
  }, []);

  // Fetch accounts with React Query
  const { data: accounts = [], isLoading: accountsLoading } = useMLAccounts();

  // Set first account as default
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount && !accountsLoading) {
      setSelectedAccount(accounts[0].id || accounts[0].accountId);
    }
  }, [accounts, selectedAccount, accountsLoading]);

  // Fetch transactions with React Query
  const { data: orders = [], isLoading: transactionsLoading } =
    useConciliationTransactions(selectedAccount, dateRange);

  // Reconcile mutation
  const reconcileMutation = useReconcileTransactions();

  // Transform orders into transactions and calculate stats
  const { transactions, stats } = useMemo(() => {
    // Convert orders to transactions format
    const convertedTransactions = orders.map((order) => {
      const fees = (order.totalAmount || 0) * 0.12; // Estimated 12% fees
      const bankAmount = (order.totalAmount || 0) - fees;
      const isPaid = order.status === "paid" || order.status === "confirmed";
      const isCancelled = order.status === "cancelled";

      return {
        id: order.id,
        orderId: order.mlOrderId || order.id,
        date: order.dateCreated,
        type: isCancelled ? "refund" : "sale",
        amount: order.totalAmount || 0,
        mlAmount: order.totalAmount || 0,
        bankAmount: isPaid ? bankAmount : 0,
        fees: isPaid ? fees : 0,
        status: isPaid ? "reconciled" : isCancelled ? "reconciled" : "pending",
        buyer: order.buyer?.nickname || order.buyer?.firstName || "N/A",
        product: `${order.itemsCount || 0} item(s)`,
      };
    });

    // Calculate stats
    const pending = convertedTransactions.filter((t) => t.status === "pending");
    const reconciled = convertedTransactions.filter(
      (t) => t.status === "reconciled",
    );
    const discrepancy = convertedTransactions.filter(
      (t) => t.status === "discrepancy",
    );

    const calculatedStats = {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, t) => sum + t.mlAmount, 0),
      reconciledCount: reconciled.length,
      reconciledAmount: reconciled.reduce((sum, t) => sum + t.mlAmount, 0),
      discrepancyCount: discrepancy.length,
      discrepancyAmount: discrepancy.reduce(
        (sum, t) => sum + Math.abs(t.mlAmount - t.bankAmount),
        0,
      ),
    };

    return {
      transactions: convertedTransactions,
      stats: calculatedStats,
    };
  }, [orders]);

  const handleReconcile = async (transactionIds) => {
    try {
      await reconcileMutation.mutateAsync({
        accountId: selectedAccount,
        transactionIds,
      });
      setSelectedTransactions([]);
      alert(
        `${transactionIds.length} transacao(oes) conciliada(s) com sucesso!`,
      );
    } catch (error) {
      console.error("Error reconciling:", error);
    }
  };

  const handleExportCSV = () => {
    exportConciliationToCSV(transactions, stats, dateRange);
  };

  const handleExportPDF = () => {
    const pdfStats = {
      total: transactions.length,
      conciliated: stats.reconciledCount,
      pending: stats.pendingCount,
      divergent: stats.discrepancyCount,
      conciliatedValue: stats.reconciledAmount,
      pendingValue: stats.pendingAmount,
      divergentValue: stats.discrepancyAmount,
      totalValue:
        stats.reconciledAmount + stats.pendingAmount + stats.discrepancyAmount,
    };
    exportConciliationToPDF(transactions, pdfStats, dateRange);
  };

  const handleSelectAll = () => {
    const pendingIds = filteredTransactions
      .filter((t) => t.status === "pending")
      .map((t) => t.id);

    if (selectedTransactions.length === pendingIds.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(pendingIds);
    }
  };

  const handleSelectTransaction = (id) => {
    setSelectedTransactions((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      return [...prev, id];
    });
  };

  const handleViewDetail = (transaction) => {
    setSelectedDetail(transaction);
    setShowDetailModal(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesStatus = activeTab === "all" || t.status === activeTab;
    const matchesSearch =
      !searchTerm ||
      t.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.product.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="conciliation-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Conciliacao de Pagamentos</h1>
          <p>
            Compare e concilie transacoes do Mercado Pago com seu extrato
            bancario
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
        </div>
      </div>

      {!selectedAccount ? (
        <div className="empty-state">
          <span className="material-icons">account_balance</span>
          <h3>Selecione uma conta</h3>
          <p>Selecione uma conta do Mercado Livre para conciliar pagamentos</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card warning">
              <div className="stat-icon">
                <span className="material-icons">pending</span>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.pendingCount}</span>
                <span className="stat-amount">
                  {formatCurrency(stats.pendingAmount)}
                </span>
                <span className="stat-label">Pendentes</span>
              </div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">
                <span className="material-icons">check_circle</span>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.reconciledCount}</span>
                <span className="stat-amount">
                  {formatCurrency(stats.reconciledAmount)}
                </span>
                <span className="stat-label">Conciliadas</span>
              </div>
            </div>
            <div className="stat-card danger">
              <div className="stat-icon">
                <span className="material-icons">error</span>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.discrepancyCount}</span>
                <span className="stat-amount">
                  {formatCurrency(stats.discrepancyAmount)}
                </span>
                <span className="stat-label">Divergencias</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-bar">
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
            <div className="search-box">
              <span className="material-icons">search</span>
              <input
                type="text"
                placeholder="Buscar por pedido, comprador ou produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === "pending" ? "active" : ""}`}
              onClick={() => setActiveTab("pending")}
            >
              <span className="material-icons">pending</span>
              Pendentes
              <span className="badge">{stats.pendingCount}</span>
            </button>
            <button
              className={`tab ${activeTab === "reconciled" ? "active" : ""}`}
              onClick={() => setActiveTab("reconciled")}
            >
              <span className="material-icons">check_circle</span>
              Conciliadas
            </button>
            <button
              className={`tab ${activeTab === "discrepancy" ? "active" : ""}`}
              onClick={() => setActiveTab("discrepancy")}
            >
              <span className="material-icons">error</span>
              Divergencias
              {stats.discrepancyCount > 0 && (
                <span className="badge danger">{stats.discrepancyCount}</span>
              )}
            </button>
            <button
              className={`tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              <span className="material-icons">list</span>
              Todas
            </button>
          </div>

          {/* Bulk Actions */}
          {selectedTransactions.length > 0 && (
            <div className="bulk-actions">
              <span>
                {selectedTransactions.length} transacao(oes) selecionada(s)
              </span>
              <button
                className="btn btn-primary"
                onClick={() => handleReconcile(selectedTransactions)}
              >
                <span className="material-icons">check</span>
                Conciliar Selecionadas
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedTransactions([])}
              >
                Limpar Selecao
              </button>
            </div>
          )}

          {/* Transactions Table */}
          <div className="section">
            {transactionsLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Carregando transacoes...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="empty-state">
                <span className="material-icons">receipt_long</span>
                <h3>Nenhuma transacao encontrada</h3>
                <p>Nao ha transacoes para o filtro selecionado</p>
              </div>
            ) : (
              <div className="transactions-table-wrapper">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      {activeTab === "pending" && (
                        <th className="checkbox-col">
                          <input
                            type="checkbox"
                            checked={
                              selectedTransactions.length ===
                              filteredTransactions.filter(
                                (t) => t.status === "pending",
                              ).length
                            }
                            onChange={handleSelectAll}
                          />
                        </th>
                      )}
                      <th>Data</th>
                      <th>Pedido</th>
                      <th>Produto</th>
                      <th>Comprador</th>
                      <th>Tipo</th>
                      <th>Valor ML</th>
                      <th>Taxas</th>
                      <th>Valor Banco</th>
                      <th>Status</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className={transaction.status}>
                        {activeTab === "pending" && (
                          <td className="checkbox-col">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.includes(
                                transaction.id,
                              )}
                              onChange={() =>
                                handleSelectTransaction(transaction.id)
                              }
                              disabled={transaction.status !== "pending"}
                            />
                          </td>
                        )}
                        <td>{formatDate(transaction.date)}</td>
                        <td className="order-id">{transaction.orderId}</td>
                        <td className="product-cell">
                          {transaction.product.substring(0, 30)}...
                        </td>
                        <td>{transaction.buyer}</td>
                        <td>
                          <span className={`type-badge ${transaction.type}`}>
                            {transaction.type === "sale"
                              ? "Venda"
                              : transaction.type === "refund"
                                ? "Reembolso"
                                : transaction.type}
                          </span>
                        </td>
                        <td
                          className={
                            transaction.amount >= 0 ? "positive" : "negative"
                          }
                        >
                          {formatCurrency(transaction.mlAmount)}
                        </td>
                        <td className="fees">
                          {formatCurrency(transaction.fees)}
                        </td>
                        <td
                          className={
                            transaction.bankAmount >= 0
                              ? "positive"
                              : "negative"
                          }
                        >
                          {formatCurrency(transaction.bankAmount)}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${transaction.status}`}
                          >
                            {transaction.status === "pending"
                              ? "Pendente"
                              : transaction.status === "reconciled"
                                ? "Conciliada"
                                : "Divergencia"}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <button
                            className="btn btn-icon"
                            onClick={() => handleViewDetail(transaction)}
                            title="Ver detalhes"
                          >
                            <span className="material-icons">visibility</span>
                          </button>
                          {transaction.status === "pending" && (
                            <button
                              className="btn btn-icon success"
                              onClick={() => handleReconcile([transaction.id])}
                              title="Conciliar"
                            >
                              <span className="material-icons">check</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDetail && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetailModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes da Transacao</h2>
              <button
                className="btn btn-icon"
                onClick={() => setShowDetailModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Informacoes do Pedido</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">ID Transacao</span>
                    <span className="value">{selectedDetail.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Pedido ML</span>
                    <span className="value">{selectedDetail.orderId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Data</span>
                    <span className="value">
                      {formatDate(selectedDetail.date)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Comprador</span>
                    <span className="value">{selectedDetail.buyer}</span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="label">Produto</span>
                    <span className="value">{selectedDetail.product}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Valores</h3>
                <div className="values-comparison">
                  <div className="value-box ml">
                    <span className="source">Mercado Pago</span>
                    <span className="amount">
                      {formatCurrency(selectedDetail.mlAmount)}
                    </span>
                  </div>
                  <div className="comparison-arrow">
                    <span className="material-icons">compare_arrows</span>
                  </div>
                  <div className="value-box bank">
                    <span className="source">Banco</span>
                    <span className="amount">
                      {formatCurrency(selectedDetail.bankAmount)}
                    </span>
                  </div>
                </div>
                <div className="fees-detail">
                  <span className="label">Taxas deduzidas:</span>
                  <span className="value">
                    {formatCurrency(selectedDetail.fees)}
                  </span>
                </div>
              </div>

              {selectedDetail.status === "discrepancy" && (
                <div className="detail-section warning">
                  <h3>Divergencia Encontrada</h3>
                  <p>{selectedDetail.discrepancyReason}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedDetail.status === "pending" && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    handleReconcile([selectedDetail.id]);
                    setShowDetailModal(false);
                  }}
                >
                  <span className="material-icons">check</span>
                  Conciliar Transacao
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => setShowDetailModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Conciliation;
