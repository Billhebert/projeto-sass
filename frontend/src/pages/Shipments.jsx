import { useState } from "react";
import {
  useMLAccounts,
  useShipments,
  useShipmentDetails,
  useShipmentTracking,
  useSyncShipments,
} from "../hooks/useApi";
import api from "../services/api";
import "./Shipments.css";

function Shipments() {
  const { data: accounts = [] } = useMLAccounts();
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || "");
  const [filter, setFilter] = useState("pending");
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  // Auto-select first account
  useState(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts]);

  const { data: shipments = [], isLoading } = useShipments(
    selectedAccount,
    filter === "pending" ? "pending" : null,
  );

  const syncShipmentsMutation = useSyncShipments();

  const syncShipments = async () => {
    try {
      await syncShipmentsMutation.mutateAsync({ accountId: selectedAccount });
    } catch (err) {
      setError("Erro ao sincronizar envios");
    }
  };

  const viewShipmentDetails = async (shipmentId) => {
    try {
      const [detailsRes, trackingRes] = await Promise.all([
        api.get(`/shipments/${selectedAccount}/${shipmentId}`),
        api.get(`/shipments/${selectedAccount}/${shipmentId}/tracking`),
      ]);
      setSelectedShipment({
        ...detailsRes.data.shipment,
        tracking: trackingRes.data.tracking,
      });
      setShowModal(true);
    } catch (err) {
      setError("Erro ao carregar detalhes do envio");
    }
  };

  const downloadLabel = async (shipmentId) => {
    try {
      const response = await api.get(
        `/shipments/${selectedAccount}/${shipmentId}/label`,
      );
      if (response.data.labelUrl) {
        window.open(response.data.labelUrl, "_blank");
      }
    } catch (err) {
      setError("Erro ao baixar etiqueta");
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: "badge-warning",
      ready_to_ship: "badge-info",
      shipped: "badge-primary",
      delivered: "badge-success",
      not_delivered: "badge-danger",
      cancelled: "badge-danger",
    };
    return statusMap[status] || "badge-secondary";
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "Pendente",
      ready_to_ship: "Pronto para Envio",
      shipped: "Enviado",
      delivered: "Entregue",
      not_delivered: "Nao Entregue",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("pt-BR");
  };

  return (
    <div className="shipments-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">local_shipping</span>
            Envios
          </h1>
          <p>Gerencie os envios dos seus pedidos</p>
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
            onClick={syncShipments}
            disabled={syncShipmentsMutation.isPending || !selectedAccount}
          >
            <span className="material-icons">sync</span>
            {syncShipmentsMutation.isPending
              ? "Sincronizando..."
              : "Sincronizar"}
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            <span className="material-icons">pending_actions</span>
            Pendentes
          </button>
          <button
            className={`filter-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            <span className="material-icons">list</span>
            Todos
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      <div className="shipments-grid">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando envios...</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">inventory_2</span>
            <h3>Nenhum envio encontrado</h3>
            <p>Clique em sincronizar para buscar envios</p>
          </div>
        ) : (
          shipments.map((shipment) => (
            <div
              key={shipment._id || shipment.mlShipmentId}
              className="shipment-card"
            >
              <div className="shipment-header">
                <div className="shipment-id">
                  <span className="material-icons">local_shipping</span>#
                  {shipment.mlShipmentId}
                </div>
                <span
                  className={`badge ${getStatusBadgeClass(shipment.status)}`}
                >
                  {getStatusLabel(shipment.status)}
                </span>
              </div>

              <div className="shipment-body">
                <div className="shipment-info">
                  <div className="info-row">
                    <span className="material-icons">shopping_bag</span>
                    <span>Pedido: #{shipment.orderId}</span>
                  </div>
                  <div className="info-row">
                    <span className="material-icons">inventory_2</span>
                    <span>{shipment.logisticType || "N/A"}</span>
                  </div>
                  <div className="info-row">
                    <span className="material-icons">schedule</span>
                    <span>{formatDate(shipment.dateCreated)}</span>
                  </div>
                </div>

                {shipment.receiverAddress && (
                  <div className="shipment-address">
                    <span className="material-icons">place</span>
                    <span>
                      {shipment.receiverAddress.city?.name},{" "}
                      {shipment.receiverAddress.state?.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="shipment-actions">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => viewShipmentDetails(shipment.mlShipmentId)}
                >
                  <span className="material-icons">visibility</span>
                  Detalhes
                </button>
                {["ready_to_ship", "pending"].includes(shipment.status) && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => downloadLabel(shipment.mlShipmentId)}
                  >
                    <span className="material-icons">print</span>
                    Etiqueta
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && selectedShipment && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content shipment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Envio #{selectedShipment.mlShipmentId}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="shipment-detail-section">
                <h3>Status</h3>
                <span
                  className={`badge ${getStatusBadgeClass(selectedShipment.status)}`}
                >
                  {getStatusLabel(selectedShipment.status)}
                </span>
              </div>

              <div className="shipment-detail-section">
                <h3>Informacoes de Entrega</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Tipo Logistico</label>
                    <span>{selectedShipment.logisticType || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <label>Modo de Envio</label>
                    <span>{selectedShipment.shippingMode || "N/A"}</span>
                  </div>
                  {selectedShipment.trackingNumber && (
                    <div className="detail-item">
                      <label>Codigo de Rastreio</label>
                      <span className="tracking-code">
                        {selectedShipment.trackingNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedShipment.receiverAddress && (
                <div className="shipment-detail-section">
                  <h3>Endereco de Entrega</h3>
                  <div className="address-block">
                    <p>
                      {selectedShipment.receiverAddress.streetName},{" "}
                      {selectedShipment.receiverAddress.streetNumber}
                    </p>
                    {selectedShipment.receiverAddress.comment && (
                      <p>{selectedShipment.receiverAddress.comment}</p>
                    )}
                    <p>
                      {selectedShipment.receiverAddress.city?.name} -{" "}
                      {selectedShipment.receiverAddress.state?.name}
                    </p>
                    <p>CEP: {selectedShipment.receiverAddress.zipCode}</p>
                  </div>
                </div>
              )}

              {selectedShipment.tracking?.history?.length > 0 && (
                <div className="shipment-detail-section">
                  <h3>Historico de Rastreamento</h3>
                  <div className="tracking-timeline">
                    {selectedShipment.tracking.history.map((event, idx) => (
                      <div key={idx} className="tracking-event">
                        <div className="event-dot"></div>
                        <div className="event-content">
                          <span className="event-status">{event.status}</span>
                          <span className="event-date">
                            {formatDate(event.date)}
                          </span>
                          {event.description && (
                            <span className="event-desc">
                              {event.description}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
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

export default Shipments;
