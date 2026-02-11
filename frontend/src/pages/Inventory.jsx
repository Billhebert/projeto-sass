import { useState } from "react";
import {
  useMLAccounts,
  useInventory,
  useInventoryLowStock,
  useInventoryWarehouses,
  useUpdateInventory,
  useOptInFulfillment,
  useOptOutFulfillment,
} from "../hooks/useApi";
import "./Inventory.css";

function Inventory() {
  // Accounts
  const { data: accounts = [], isLoading: accountsLoading } = useMLAccounts();
  const [selectedAccount, setSelectedAccount] = useState("");

  // Set initial account when accounts load
  useState(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts]);

  // Data queries
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const {
    data: products = [],
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useInventory(selectedAccount);
  const { data: lowStockItems = [], refetch: refetchLowStock } =
    useInventoryLowStock(selectedAccount, lowStockThreshold);
  const { data: warehouses = [] } = useInventoryWarehouses(selectedAccount);

  // Mutations
  const updateInventory = useUpdateInventory();
  const optInFulfillment = useOptInFulfillment();
  const optOutFulfillment = useOptOutFulfillment();

  // UI states
  const [activeTab, setActiveTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editQuantity, setEditQuantity] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loading = accountsLoading || productsLoading;

  const loadData = () => {
    refetchProducts();
    refetchLowStock();
  };

  const viewItemDetails = (item) => {
    setSelectedItem(item);
    setEditQuantity(item.available_quantity?.toString() || "0");
    setShowModal(true);
  };

  const handleUpdateStock = async () => {
    if (!selectedItem) return;

    const quantity = parseInt(editQuantity);
    if (isNaN(quantity) || quantity < 0) {
      setError("Quantidade invalida");
      return;
    }

    try {
      await updateInventory.mutateAsync({
        accountId: selectedAccount,
        itemId: selectedItem.item_id,
        data: { available_quantity: quantity },
      });
      setSuccess("Estoque atualizado com sucesso!");
      setShowModal(false);
    } catch (err) {
      setError("Erro ao atualizar estoque");
    }
  };

  const handleToggleFulfillment = async (item) => {
    try {
      if (item.shipping?.logistic_type === "fulfillment") {
        await optOutFulfillment.mutateAsync({
          accountId: selectedAccount,
          itemId: item.item_id,
        });
        setSuccess("Item removido do Fulfillment");
      } else {
        await optInFulfillment.mutateAsync({
          accountId: selectedAccount,
          itemId: item.item_id,
        });
        setSuccess("Item adicionado ao Fulfillment");
      }
    } catch (err) {
      setError("Erro ao alterar Fulfillment");
    }
  };

  const formatCurrency = (value, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value || 0);
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { label: "Sem Estoque", class: "danger" };
    if (quantity <= lowStockThreshold)
      return { label: "Estoque Baixo", class: "warning" };
    return { label: "Em Estoque", class: "success" };
  };

  const getDisplayProducts = () => {
    switch (activeTab) {
      case "low-stock":
        return lowStockItems;
      case "fulfillment":
        return products.filter(
          (p) => p.shipping?.logistic_type === "fulfillment",
        );
      default:
        return products;
    }
  };

  const calculateStats = () => {
    const total = products.length;
    const totalStock = products.reduce(
      (sum, p) => sum + (p.available_quantity || 0),
      0,
    );
    const outOfStock = products.filter(
      (p) => p.available_quantity === 0,
    ).length;
    const lowStock = products.filter(
      (p) =>
        p.available_quantity > 0 && p.available_quantity <= lowStockThreshold,
    ).length;
    const fulfillment = products.filter(
      (p) => p.shipping?.logistic_type === "fulfillment",
    ).length;

    return { total, totalStock, outOfStock, lowStock, fulfillment };
  };

  const stats = calculateStats();

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">inventory</span>
            Gestao de Estoque
          </h1>
          <p>Gerencie o estoque dos seus produtos</p>
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
          <div className="threshold-control">
            <label>Limite baixo:</label>
            <input
              type="number"
              min="1"
              value={lowStockThreshold}
              onChange={(e) =>
                setLowStockThreshold(parseInt(e.target.value) || 5)
              }
              onBlur={loadData}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={loadData}
            disabled={loading}
          >
            <span className="material-icons">refresh</span>
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon blue">
            <span className="material-icons">inventory_2</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Produtos</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <span className="material-icons">all_inbox</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalStock}</span>
            <span className="stat-label">Unidades em Estoque</span>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon orange">
            <span className="material-icons">warning</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.lowStock}</span>
            <span className="stat-label">Estoque Baixo</span>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon red">
            <span className="material-icons">remove_shopping_cart</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.outOfStock}</span>
            <span className="stat-label">Sem Estoque</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <span className="material-icons">warehouse</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.fulfillment}</span>
            <span className="stat-label">No Fulfillment</span>
          </div>
        </div>
      </div>

      {/* Warehouses Info */}
      {warehouses.length > 0 && (
        <div className="warehouses-section">
          <h3>
            <span className="material-icons">warehouse</span>
            Armazens Disponiveis
          </h3>
          <div className="warehouses-list">
            {warehouses.map((wh, idx) => (
              <div key={idx} className="warehouse-card">
                <span className="material-icons">location_on</span>
                <span className="warehouse-name">{wh.name || wh.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="inventory-tabs">
        <button
          className={`tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <span className="material-icons">list</span>
          Todos ({products.length})
        </button>
        <button
          className={`tab ${activeTab === "low-stock" ? "active" : ""}`}
          onClick={() => setActiveTab("low-stock")}
        >
          <span className="material-icons">warning</span>
          Estoque Baixo ({lowStockItems.length})
        </button>
        <button
          className={`tab ${activeTab === "fulfillment" ? "active" : ""}`}
          onClick={() => setActiveTab("fulfillment")}
        >
          <span className="material-icons">warehouse</span>
          Fulfillment ({stats.fulfillment})
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="material-icons">check_circle</span>
          {success}
          <button onClick={() => setSuccess(null)}>&times;</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando estoque...</p>
        </div>
      ) : (
        <div className="products-section">
          {getDisplayProducts().length === 0 ? (
            <div className="empty-state">
              <span className="material-icons">inventory_2</span>
              <h3>Nenhum produto encontrado</h3>
              <p>
                {activeTab === "low-stock"
                  ? "Otimo! Nenhum produto com estoque baixo."
                  : activeTab === "fulfillment"
                    ? "Nenhum produto no Fulfillment."
                    : "Seus produtos aparecerao aqui."}
              </p>
            </div>
          ) : (
            <div className="products-table-container">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Preco</th>
                    <th>Disponivel</th>
                    <th>Vendidos</th>
                    <th>Status</th>
                    <th>Logistica</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {getDisplayProducts().map((product, idx) => {
                    const stockStatus = getStockStatus(
                      product.available_quantity,
                    );
                    return (
                      <tr
                        key={idx}
                        className={
                          stockStatus.class === "danger"
                            ? "row-danger"
                            : stockStatus.class === "warning"
                              ? "row-warning"
                              : ""
                        }
                      >
                        <td className="product-cell">
                          <div className="product-info">
                            <span className="product-title">
                              {product.title?.substring(0, 50)}...
                            </span>
                            <span className="product-id">
                              {product.item_id}
                            </span>
                          </div>
                        </td>
                        <td className="price">
                          {formatCurrency(product.price, product.currency_id)}
                        </td>
                        <td className="quantity">
                          <span className={`qty-badge ${stockStatus.class}`}>
                            {product.available_quantity}
                          </span>
                        </td>
                        <td className="quantity">
                          {product.sold_quantity || 0}
                        </td>
                        <td>
                          <span className={`status-badge ${stockStatus.class}`}>
                            {stockStatus.label}
                          </span>
                        </td>
                        <td>
                          {product.shipping?.logistic_type === "fulfillment" ? (
                            <span className="fulfillment-badge">
                              <span className="material-icons">warehouse</span>
                              Full
                            </span>
                          ) : (
                            <span className="logistic-type">
                              {product.shipping?.logistic_type || "N/A"}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-icon"
                              title="Editar estoque"
                              onClick={() => viewItemDetails(product)}
                            >
                              <span className="material-icons">edit</span>
                            </button>
                            <button
                              className="btn-icon"
                              title={
                                product.shipping?.logistic_type ===
                                "fulfillment"
                                  ? "Remover do Fulfillment"
                                  : "Adicionar ao Fulfillment"
                              }
                              onClick={() => handleToggleFulfillment(product)}
                            >
                              <span className="material-icons">
                                {product.shipping?.logistic_type ===
                                "fulfillment"
                                  ? "warehouse"
                                  : "add_business"}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Stock Modal */}
      {showModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Estoque</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="item-preview">
                <h4>{selectedItem.title}</h4>
                <p className="item-id">{selectedItem.item_id}</p>
              </div>

              <div className="stock-info-grid">
                <div className="stock-info-item">
                  <span className="label">Estoque Atual</span>
                  <span className="value">
                    {selectedItem.available_quantity}
                  </span>
                </div>
                <div className="stock-info-item">
                  <span className="label">Vendidos</span>
                  <span className="value">
                    {selectedItem.sold_quantity || 0}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Nova Quantidade</label>
                <input
                  type="number"
                  min="0"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="form-input"
                />
              </div>

              {selectedItem.variations > 0 && (
                <div className="variations-note">
                  <span className="material-icons">info</span>
                  <span>
                    Este produto tem {selectedItem.variations} variacao(oes).
                    Edite cada variacao separadamente no Mercado Livre.
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdateStock}
                disabled={updateInventory.isPending}
              >
                {updateInventory.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
