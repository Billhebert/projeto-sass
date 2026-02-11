import { useState } from "react";
import {
  useMLAccounts,
  useClaims,
  useClaimDetails,
  useSyncClaims,
  useSendClaimMessage,
} from "../hooks/useApi";
import "./Claims.css";

function Claims() {
  const { data: accounts = [] } = useMLAccounts();
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || "");
  const [filter, setFilter] = useState("open");
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  // Auto-select first account
  useState(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts]);

  const {
    data: claimsData,
    isLoading,
    error,
  } = useClaims(selectedAccount, filter);

  const { data: selectedClaimDetails } = useClaimDetails(
    selectedAccount,
    selectedClaimId,
  );

  const syncClaimsMutation = useSyncClaims();
  const sendMessageMutation = useSendClaimMessage();

  const claims = claimsData?.claims || [];

  const syncClaims = async () => {
    await syncClaimsMutation.mutateAsync({ accountId: selectedAccount });
  };

  const viewClaimDetails = async (claimId) => {
    setSelectedClaimId(claimId);
    setShowModal(true);
  };

  const sendClaimMessage = async () => {
    if (!newMessage.trim() || !selectedClaimId) return;

    await sendMessageMutation.mutateAsync({
      accountId: selectedAccount,
      claimId: selectedClaimId,
      text: newMessage,
    });
    setNewMessage("");
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      opened: "badge-warning",
      closed: "badge-secondary",
      claim_closed: "badge-secondary",
      dispute: "badge-danger",
      mediation: "badge-info",
    };
    return statusMap[status] || "badge-secondary";
  };

  const getStatusLabel = (status) => {
    const labels = {
      opened: "Aberta",
      closed: "Fechada",
      claim_closed: "Encerrada",
      dispute: "Disputa",
      mediation: "Mediacao",
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("pt-BR");
  };

  return (
    <div className="claims-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">report_problem</span>
            Reclamacoes
          </h1>
          <p>Gerencie reclamacoes e mediacoes</p>
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
          <button
            className="btn btn-primary"
            onClick={syncClaims}
            disabled={syncClaimsMutation.isPending || !selectedAccount}
          >
            <span className="material-icons">sync</span>
            {syncClaimsMutation.isPending ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === "open" ? "active" : ""}`}
            onClick={() => setFilter("open")}
          >
            <span className="material-icons">priority_high</span>
            Abertas
          </button>
          <button
            className={`filter-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            <span className="material-icons">list</span>
            Todas
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error.message || "Erro ao carregar reclamacoes"}
        </div>
      )}

      <div className="claims-list">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando reclamacoes...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">verified</span>
            <h3>Nenhuma reclamacao encontrada</h3>
            <p>
              {filter === "open"
                ? "Voce nao tem reclamacoes abertas!"
                : "Suas reclamacoes aparecerao aqui"}
            </p>
          </div>
        ) : (
          claims.map((claim) => (
            <div key={claim._id || claim.mlClaimId} className="claim-card">
              <div className="claim-header">
                <div className="claim-id">
                  <span className="material-icons">report</span>#
                  {claim.mlClaimId}
                </div>
                <span className={`badge ${getStatusBadgeClass(claim.status)}`}>
                  {getStatusLabel(claim.status)}
                </span>
              </div>

              <div className="claim-body">
                <div className="claim-reason">
                  <h4>{claim.reason || "Reclamacao"}</h4>
                  {claim.resourceId && (
                    <span className="claim-resource">
                      Pedido: #{claim.resourceId}
                    </span>
                  )}
                </div>

                <div className="claim-info">
                  <div className="info-item">
                    <span className="material-icons">person</span>
                    <span>{claim.buyer?.nickname || "Comprador"}</span>
                  </div>
                  <div className="info-item">
                    <span className="material-icons">schedule</span>
                    <span>{formatDate(claim.dateCreated)}</span>
                  </div>
                  {claim.type && (
                    <div className="info-item">
                      <span className="material-icons">category</span>
                      <span>{claim.type}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="claim-actions">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => viewClaimDetails(claim.mlClaimId)}
                >
                  <span className="material-icons">visibility</span>
                  Ver Detalhes
                </button>
                <a
                  href={`https://www.mercadolivre.com.br/vendas/reclamacoes/${claim.mlClaimId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-secondary"
                >
                  <span className="material-icons">open_in_new</span>
                  Ver no ML
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && selectedClaimDetails && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content claim-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Reclamacao #{selectedClaimDetails.mlClaimId}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="claim-detail-section">
                <h3>Informacoes</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Status</label>
                    <span
                      className={`badge ${getStatusBadgeClass(selectedClaimDetails.status)}`}
                    >
                      {getStatusLabel(selectedClaimDetails.status)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Motivo</label>
                    <span>{selectedClaimDetails.reason || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <label>Data</label>
                    <span>{formatDate(selectedClaimDetails.dateCreated)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Comprador</label>
                    <span>{selectedClaimDetails.buyer?.nickname || "N/A"}</span>
                  </div>
                </div>
              </div>

              {selectedClaimDetails.messages &&
                selectedClaimDetails.messages.length > 0 && (
                  <div className="claim-detail-section">
                    <h3>Historico de Mensagens</h3>
                    <div className="claim-messages">
                      {selectedClaimDetails.messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`claim-message ${msg.senderRole === "seller" ? "sent" : "received"}`}
                        >
                          <div className="message-header">
                            <span className="sender">
                              {msg.senderRole === "seller"
                                ? "Voce"
                                : "Comprador"}
                            </span>
                            <span className="date">
                              {formatDate(msg.dateCreated)}
                            </span>
                          </div>
                          <p>{msg.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {selectedClaimDetails.status !== "closed" &&
                selectedClaimDetails.status !== "claim_closed" && (
                  <div className="claim-detail-section">
                    <h3>Responder</h3>
                    <div className="message-form">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua resposta..."
                        rows={3}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={sendClaimMessage}
                        disabled={
                          sendMessageMutation.isPending || !newMessage.trim()
                        }
                      >
                        {sendMessageMutation.isPending
                          ? "Enviando..."
                          : "Enviar"}
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Claims;
