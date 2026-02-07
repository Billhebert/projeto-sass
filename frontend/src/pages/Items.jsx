import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";
import "./Items.css";

function Items() {
  const { token } = useAuthStore();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
  });
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 1000, // Increased limit to fetch more items
    total: 0,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadItems();
    }
  }, [selectedAccount, filters, pagination.offset]);

  const loadAccounts = async () => {
    try {
      const response = await api.get("/ml-accounts");
      console.log("ML Accounts API response:", response.data);

      // Handle different API response formats (same as Dashboard)
      let accountsList = [];
      if (Array.isArray(response.data)) {
        accountsList = response.data;
      } else if (Array.isArray(response.data?.data?.accounts)) {
        accountsList = response.data.data.accounts;
      } else if (Array.isArray(response.data?.accounts)) {
        accountsList = response.data.accounts;
      } else if (Array.isArray(response.data?.data)) {
        accountsList = response.data.data;
      }

      console.log("Parsed accounts list:", accountsList);
      setAccounts(accountsList);

      if (accountsList.length > 0) {
        const firstAccountId = accountsList[0]._id || accountsList[0].id;
        console.log("Auto-selecting first account:", firstAccountId);
        setSelectedAccount(firstAccountId);
      }
    } catch (err) {
      console.error("Error loading accounts:", err);
      setError("Erro ao carregar contas");
    }
  };

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("offset", pagination.offset);
      params.append("limit", pagination.limit);
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);

      const response = await api.get(`/items/${selectedAccount}?${params}`);
      console.log("Items API response:", response.data);

      // Handle different response formats (same as Dashboard)
      let itemsData = { items: [], paging: { total: 0 } };
      const resData = response.data;

      if (resData?.success && resData?.data) {
        itemsData = resData.data;
      } else if (resData?.items) {
        itemsData = resData;
      } else if (Array.isArray(resData)) {
        itemsData = { items: resData, paging: { total: resData.length } };
      }

      console.log("Parsed itemsData:", itemsData);
      console.log("Items array:", itemsData.items);

      setItems(itemsData.items || []);
      setPagination((prev) => ({
        ...prev,
        total:
          itemsData.paging?.total ||
          itemsData.total ||
          itemsData.items?.length ||
          0,
      }));
    } catch (err) {
      console.error("Error loading items:", err);
      // Show ML token errors with more detail
      if (err.response?.data?.code?.startsWith("ML_")) {
        setError(
          `Erro de token ML: ${err.response.data.message}. Por favor, reconecte sua conta.`,
        );
      } else {
        setError("Erro ao carregar anuncios");
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateItemStatus = async (itemId, status) => {
    try {
      await api.put(`/items/${selectedAccount}/${itemId}/status`, { status });
      await loadItems();
    } catch (err) {
      setError("Erro ao atualizar status");
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      active: "badge-success",
      paused: "badge-warning",
      closed: "badge-danger",
      under_review: "badge-info",
    };
    return statusMap[status] || "badge-secondary";
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: "Ativo",
      paused: "Pausado",
      closed: "Encerrado",
      under_review: "Em Revisao",
    };
    return labels[status] || status;
  };

  const formatCurrency = (value, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  return (
    <div className="items-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">inventory_2</span>
            Meus Anuncios
          </h1>
          <p>Gerencie seus anuncios do Mercado Livre</p>
        </div>
        <div className="header-actions">
          <select
            className="account-select"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            {accounts.map((acc) => (
              <option key={acc._id || acc.id} value={acc._id || acc.id}>
                {acc.nickname || acc.mlUserId}
              </option>
            ))}
          </select>
          <Link to="/items/create" className="btn btn-primary">
            <span className="material-icons">add</span>
            Novo Anuncio
          </Link>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="active">Ativos</option>
            <option value="paused">Pausados</option>
            <option value="closed">Encerrados</option>
          </select>
        </div>
        <div className="filter-group search">
          <label>Buscar</label>
          <input
            type="text"
            placeholder="Titulo ou ID do anuncio..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="filter-stats">
          <span>{pagination.total} anuncio(s) encontrado(s)</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      <div className="items-grid">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando anuncios...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">inventory_2</span>
            <h3>Nenhum anuncio encontrado</h3>
            <p>Crie seu primeiro anuncio para comecar a vender</p>
            <Link to="/items/create" className="btn btn-primary">
              <span className="material-icons">add</span>
              Criar Anuncio
            </Link>
          </div>
        ) : (
          items.map((item) => {
            // Handle both camelCase and snake_case field names from API
            const itemId = item.id || item.mlItemId || item.ml_item_id;
            const thumbnail = item.thumbnail || item.secure_thumbnail;
            const availableQty =
              item.availableQuantity || item.available_quantity || 0;
            const soldQty = item.soldQuantity || item.sold_quantity || 0;
            const currencyId = item.currencyId || item.currency_id || "BRL";
            const listingType = item.listingType || item.listing_type_id;

            return (
              <div key={item._id || itemId} className="item-card">
                <div className="item-image">
                  {thumbnail ? (
                    <img src={thumbnail} alt={item.title} />
                  ) : (
                    <div className="no-image">
                      <span className="material-icons">image</span>
                    </div>
                  )}
                  <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </div>

                <div className="item-content">
                  <h3 className="item-title">{item.title}</h3>
                  <p className="item-id">{itemId}</p>

                  <div className="item-stats">
                    <div className="stat">
                      <span className="material-icons">attach_money</span>
                      <span>{formatCurrency(item.price, currencyId)}</span>
                    </div>
                    <div className="stat">
                      <span className="material-icons">inventory</span>
                      <span>{availableQty} un.</span>
                    </div>
                    <div className="stat">
                      <span className="material-icons">shopping_cart</span>
                      <span>{soldQty} vendidos</span>
                    </div>
                  </div>

                  {listingType && (
                    <div className="item-listing-type">
                      <span className="material-icons">stars</span>
                      <span>{listingType}</span>
                    </div>
                  )}
                </div>

                <div className="item-actions">
                  <Link
                    to={`/items/${itemId}/edit`}
                    className="btn btn-sm btn-secondary"
                  >
                    <span className="material-icons">edit</span>
                    Editar
                  </Link>

                  {item.status === "active" && (
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => updateItemStatus(itemId, "paused")}
                    >
                      <span className="material-icons">pause</span>
                      Pausar
                    </button>
                  )}

                  {item.status === "paused" && (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => updateItemStatus(itemId, "active")}
                    >
                      <span className="material-icons">play_arrow</span>
                      Ativar
                    </button>
                  )}

                  <a
                    href={
                      item.permalink ||
                      `https://produto.mercadolivre.com.br/${itemId}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-secondary"
                  >
                    <span className="material-icons">open_in_new</span>
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {pagination.total > pagination.limit && (
        <div className="pagination">
          <button
            className="btn btn-sm btn-secondary"
            disabled={pagination.offset === 0}
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                offset: Math.max(0, prev.offset - prev.limit),
              }))
            }
          >
            <span className="material-icons">chevron_left</span>
            Anterior
          </button>
          <span className="pagination-info">
            Pagina {currentPage} de {totalPages}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            disabled={currentPage >= totalPages}
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                offset: prev.offset + prev.limit,
              }))
            }
          >
            Proxima
            <span className="material-icons">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Items;
