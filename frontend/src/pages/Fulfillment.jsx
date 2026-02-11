import { useState } from "react";
import {
  useMLAccounts,
  useFulfillmentInventory,
  useFulfillmentShipments,
  useFulfillmentStats,
} from "../hooks/useApi";
import "./Fulfillment.css";

function Fulfillment() {
  // Accounts
  const { data: accounts = [], isLoading: accountsLoading } = useMLAccounts();
  const [selectedAccount, setSelectedAccount] = useState("");

  // Set initial account when accounts load
  useState(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts]);

  // UI states
  const [activeTab, setActiveTab] = useState("inventory");
  const [filters, setFilters] = useState({
    status: "all",
    warehouse: "all",
  });
  const [error, setError] = useState(null);

  // Data queries based on active tab
  const {
    data: inventory = [],
    isLoading: inventoryLoading,
    refetch: refetchInventory,
  } = useFulfillmentInventory(selectedAccount);

  const {
    data: shipments = [],
    isLoading: shipmentsLoading,
    refetch: refetchShipments,
  } = useFulfillmentShipments(selectedAccount);

  const {
    data: stats = {
      totalItems: 0,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      pendingShipments: 0,
      inTransit: 0,
    },
    refetch: refetchStats,
  } = useFulfillmentStats(selectedAccount);

  const loading =
    accountsLoading ||
    (activeTab === "inventory" ? inventoryLoading : shipmentsLoading);

  const loadData = () => {
    if (activeTab === "inventory") {
      refetchInventory();
    } else {
      refetchShipments();
    }
    refetchStats();
  };

  const getStockStatusBadge = (quantity, minStock = 5) => {
    if (quantity === 0)
      return { class: "badge-danger", text: "Sem Estoque", icon: "error" };
    if (quantity <= minStock)
      return { class: "badge-warning", text: "Estoque Baixo", icon: "warning" };
    return { class: "badge-success", text: "Em Estoque", icon: "check_circle" };
  };

  const getShipmentStatusBadge = (status) => {
    const statuses = {
      pending: { class: "badge-warning", text: "Pendente", icon: "schedule" },
      ready_to_ship: {
        class: "badge-info",
        text: "Pronto para Envio",
        icon: "inventory_2",
      },
      shipped: {
        class: "badge-primary",
        text: "Enviado",
        icon: "local_shipping",
      },
      delivered: {
        class: "badge-success",
        text: "Entregue",
        icon: "check_circle",
      },
      cancelled: { class: "badge-danger", text: "Cancelado", icon: "cancel" },
    };
    return (
      statuses[status] || {
        class: "badge-secondary",
        text: status,
        icon: "help",
      }
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredInventory = inventory.filter((item) => {
    if (filters.status === "all") return true;
    if (filters.status === "in_stock") return item.available_quantity > 5;
    if (filters.status === "low_stock")
      return item.available_quantity > 0 && item.available_quantity <= 5;
    if (filters.status === "out_of_stock") return item.available_quantity === 0;
    return true;
  });

  return (
    <div className="fulfillment-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">warehouse</span>
            Fulfillment (Full)
          </h1>
          <p>Gerencie seu estoque e envios do Mercado Envios Full</p>
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
            onClick={loadData}
            disabled={loading || !selectedAccount}
          >
            <span className="material-icons">refresh</span>
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <span className="material-icons">inventory</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalItems}</span>
            <span className="stat-label">Itens no Full</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <span className="material-icons">check_circle</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.inStock}</span>
            <span className="stat-label">Em Estoque</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <span className="material-icons">warning</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.lowStock}</span>
            <span className="stat-label">Estoque Baixo</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger">
            <span className="material-icons">error</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.outOfStock}</span>
            <span className="stat-label">Sem Estoque</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <span className="material-icons">schedule</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.pendingShipments}</span>
            <span className="stat-label">Envios Pendentes</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">
            <span className="material-icons">local_shipping</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.inTransit}</span>
            <span className="stat-label">Em Transito</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        <button
          className={`tab ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          <span className="material-icons">inventory</span>
          Estoque Full
        </button>
        <button
          className={`tab ${activeTab === "shipments" ? "active" : ""}`}
          onClick={() => setActiveTab("shipments")}
        >
          <span className="material-icons">local_shipping</span>
          Envios Full
        </button>
        <button
          className={`tab ${activeTab === "inbound" ? "active" : ""}`}
          onClick={() => setActiveTab("inbound")}
        >
          <span className="material-icons">move_to_inbox</span>
          Reposicao
        </button>
      </div>

      {/* Filters */}
      {activeTab === "inventory" && (
        <div className="filters-bar">
          <div className="filter-group">
            <label>Status do Estoque:</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="all">Todos</option>
              <option value="in_stock">Em Estoque</option>
              <option value="low_stock">Estoque Baixo</option>
              <option value="out_of_stock">Sem Estoque</option>
            </select>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {/* Content */}
      <div className="fulfillment-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando...</p>
          </div>
        ) : activeTab === "inventory" ? (
          filteredInventory.length === 0 ? (
            <div className="empty-state">
              <span className="material-icons">inventory</span>
              <h3>Nenhum item no Fulfillment</h3>
              <p>
                Seus produtos enviados para o centro de distribuicao aparecerao
                aqui
              </p>
            </div>
          ) : (
            <div className="inventory-table">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>SKU</th>
                    <th>Disponivel</th>
                    <th>Reservado</th>
                    <th>Em Transito</th>
                    <th>Status</th>
                    <th>Deposito</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const stockStatus = getStockStatusBadge(
                      item.available_quantity,
                    );
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="product-cell">
                            <div className="product-image">
                              {item.thumbnail ? (
                                <img src={item.thumbnail} alt={item.title} />
                              ) : (
                                <span className="material-icons">image</span>
                              )}
                            </div>
                            <div className="product-details">
                              <span className="product-title">
                                {item.title}
                              </span>
                              <span className="product-id">{item.item_id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="sku">{item.seller_sku || "-"}</span>
                        </td>
                        <td>
                          <span
                            className={`quantity ${item.available_quantity === 0 ? "zero" : ""}`}
                          >
                            {item.available_quantity}
                          </span>
                        </td>
                        <td>
                          <span className="quantity reserved">
                            {item.reserved_quantity || 0}
                          </span>
                        </td>
                        <td>
                          <span className="quantity transit">
                            {item.in_transit_quantity || 0}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${stockStatus.class}`}>
                            <span className="material-icons">
                              {stockStatus.icon}
                            </span>
                            {stockStatus.text}
                          </span>
                        </td>
                        <td>
                          <span className="warehouse">
                            <span className="material-icons">location_on</span>
                            {item.warehouse_id || "Principal"}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="btn btn-sm btn-secondary"
                              title="Repor estoque"
                            >
                              <span className="material-icons">
                                add_shopping_cart
                              </span>
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              title="Ver detalhes"
                            >
                              <span className="material-icons">visibility</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === "shipments" ? (
          shipments.length === 0 ? (
            <div className="empty-state">
              <span className="material-icons">local_shipping</span>
              <h3>Nenhum envio encontrado</h3>
              <p>Seus envios Fulfillment aparecerao aqui</p>
            </div>
          ) : (
            <div className="shipments-table">
              <table>
                <thead>
                  <tr>
                    <th>ID Envio</th>
                    <th>Pedido</th>
                    <th>Destino</th>
                    <th>Status</th>
                    <th>Criado em</th>
                    <th>Previsao</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((shipment) => {
                    const statusBadge = getShipmentStatusBadge(shipment.status);
                    return (
                      <tr key={shipment.id}>
                        <td>
                          <span className="shipment-id">#{shipment.id}</span>
                        </td>
                        <td>
                          <span className="order-id">#{shipment.order_id}</span>
                        </td>
                        <td>
                          <div className="destination">
                            <span className="city">
                              {shipment.receiver_city || "N/A"}
                            </span>
                            <span className="state">
                              {shipment.receiver_state || ""}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${statusBadge.class}`}>
                            <span className="material-icons">
                              {statusBadge.icon}
                            </span>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td>{formatDate(shipment.date_created)}</td>
                        <td>{formatDate(shipment.estimated_delivery_date)}</td>
                        <td>
                          <div className="actions">
                            <button
                              className="btn btn-sm btn-secondary"
                              title="Rastrear"
                            >
                              <span className="material-icons">
                                location_searching
                              </span>
                            </button>
                            <a
                              href={`https://www.mercadolivre.com.br/envios/${shipment.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline"
                            >
                              <span className="material-icons">
                                open_in_new
                              </span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="inbound-section">
            <div className="empty-state">
              <span className="material-icons">move_to_inbox</span>
              <h3>Central de Reposicao</h3>
              <p>
                Crie pedidos de reposicao para enviar mais produtos ao centro de
                distribuicao
              </p>
              <button className="btn btn-primary">
                <span className="material-icons">add</span>
                Criar Pedido de Reposicao
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Fulfillment;
