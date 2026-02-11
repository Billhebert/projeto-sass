import { useState } from "react";
import {
  useMLAccounts,
  useInvoices,
  useCreateInvoice,
  useInvoiceDetails,
} from "../hooks/useApi";
import "./Invoices.css";

function Invoices() {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceData, setInvoiceData] = useState({
    accessKey: "",
    xml: "",
  });

  // Fetch accounts with React Query
  const { data: accounts = [], isLoading: accountsLoading } = useMLAccounts();

  // Set first account as default
  if (accounts.length > 0 && !selectedAccount && !accountsLoading) {
    setSelectedAccount(accounts[0].id);
  }

  // Fetch invoices with React Query
  const { data: invoices = [], isLoading: invoicesLoading } =
    useInvoices(selectedAccount);

  // Create invoice mutation
  const createInvoiceMutation = useCreateInvoice();

  const openCreateModal = (orderId) => {
    setSelectedOrder(orderId);
    setInvoiceData({ accessKey: "", xml: "" });
    setShowCreateModal(true);
  };

  const createInvoice = async () => {
    if (!invoiceData.accessKey) {
      alert("Informe a chave de acesso da NF-e");
      return;
    }

    try {
      await createInvoiceMutation.mutateAsync({
        accountId: selectedAccount,
        orderId: selectedOrder,
        data: {
          accessKey: invoiceData.accessKey,
          xml: invoiceData.xml,
        },
      });
      setShowCreateModal(false);
    } catch (err) {
      console.error("Erro ao criar nota fiscal:", err);
      alert(err.response?.data?.error || "Erro ao enviar nota fiscal");
    }
  };

  const viewInvoiceDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      created: "badge-success",
      pending: "badge-warning",
      error: "badge-danger",
      rejected: "badge-danger",
    };
    return statusMap[status] || "badge-secondary";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const formatCurrency = (value, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  return (
    <div className="invoices-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">receipt</span>
            Notas Fiscais
          </h1>
          <p>Gerencie notas fiscais dos seus pedidos</p>
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
        </div>
      </div>

      <div className="info-banner">
        <span className="material-icons">info</span>
        <div>
          <strong>Nota Fiscal Eletronica</strong>
          <p>
            Para vincular uma NF-e a um pedido, voce precisa da chave de acesso
            de 44 digitos.
          </p>
        </div>
      </div>

      <div className="invoices-table-container">
        {invoicesLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando notas fiscais...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">receipt_long</span>
            <h3>Nenhuma nota fiscal encontrada</h3>
            <p>As notas fiscais dos seus pedidos aparecerao aqui</p>
          </div>
        ) : (
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Chave de Acesso</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice._id || invoice.id}>
                  <td className="order-id">#{invoice.orderId}</td>
                  <td className="access-key">
                    <span title={invoice.accessKey}>
                      {invoice.accessKey?.substring(0, 20)}...
                    </span>
                  </td>
                  <td>{formatDate(invoice.dateCreated)}</td>
                  <td>{formatCurrency(invoice.totalAmount || 0)}</td>
                  <td>
                    <span
                      className={`badge ${getStatusBadgeClass(invoice.status)}`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        title="Ver detalhes"
                        onClick={() => viewInvoiceDetails(invoice)}
                      >
                        <span className="material-icons">visibility</span>
                      </button>
                      {invoice.pdfUrl && (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-icon"
                          title="Baixar PDF"
                        >
                          <span className="material-icons">download</span>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="quick-actions">
        <h3>Vincular NF-e a Pedido</h3>
        <div className="quick-action-form">
          <input
            type="text"
            placeholder="Numero do Pedido (ex: 2000003456789012)"
            id="orderIdInput"
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              const orderId = document.getElementById("orderIdInput").value;
              if (orderId) openCreateModal(orderId);
            }}
          >
            <span className="material-icons">add</span>
            Vincular NF-e
          </button>
        </div>
      </div>

      {showModal && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nota Fiscal - Pedido #{selectedInvoice.orderId}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="invoice-detail-section">
                <h3>Informacoes</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Status</label>
                    <span
                      className={`badge ${getStatusBadgeClass(selectedInvoice.status)}`}
                    >
                      {selectedInvoice.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Data</label>
                    <span>{formatDate(selectedInvoice.dateCreated)}</span>
                  </div>
                  <div className="detail-item full">
                    <label>Chave de Acesso</label>
                    <span className="access-key-full">
                      {selectedInvoice.accessKey}
                    </span>
                  </div>
                </div>
              </div>

              {selectedInvoice.fiscalData && (
                <div className="invoice-detail-section">
                  <h3>Dados Fiscais</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Numero</label>
                      <span>{selectedInvoice.fiscalData.number || "N/A"}</span>
                    </div>
                    <div className="detail-item">
                      <label>Serie</label>
                      <span>{selectedInvoice.fiscalData.series || "N/A"}</span>
                    </div>
                    <div className="detail-item">
                      <label>Valor Total</label>
                      <span>
                        {formatCurrency(
                          selectedInvoice.fiscalData.totalAmount || 0,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Vincular Nota Fiscal</h2>
              <button
                className="btn-close"
                onClick={() => setShowCreateModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                Vincule uma Nota Fiscal Eletronica ao pedido{" "}
                <strong>#{selectedOrder}</strong>
              </p>

              <div className="form-group">
                <label>Chave de Acesso (44 digitos) *</label>
                <input
                  type="text"
                  value={invoiceData.accessKey}
                  onChange={(e) =>
                    setInvoiceData({
                      ...invoiceData,
                      accessKey: e.target.value,
                    })
                  }
                  placeholder="00000000000000000000000000000000000000000000"
                  maxLength={44}
                />
                <span className="char-count">
                  {invoiceData.accessKey.length}/44
                </span>
              </div>

              <div className="form-group">
                <label>XML da NF-e (opcional)</label>
                <textarea
                  value={invoiceData.xml}
                  onChange={(e) =>
                    setInvoiceData({ ...invoiceData, xml: e.target.value })
                  }
                  placeholder="Cole o XML da nota fiscal aqui..."
                  rows={6}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={createInvoice}
                disabled={
                  createInvoiceMutation.isPending ||
                  invoiceData.accessKey.length !== 44
                }
              >
                {createInvoiceMutation.isPending
                  ? "Enviando..."
                  : "Vincular NF-e"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Invoices;
