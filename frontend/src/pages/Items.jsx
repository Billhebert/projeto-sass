import { useState } from "react";
import { Link } from "react-router-dom";
import { useMLAccounts, useItems, useUpdateItemStatus } from "../hooks/useApi";
import "./Items.css";

function Items() {
  const { data: accounts = [], isLoading: accountsLoading } = useMLAccounts();
  const [selectedAccount, setSelectedAccount] = useState(
    accounts[0]?._id || accounts[0]?.id || "",
  );
  const [filters, setFilters] = useState({
    status: "",
    search: "",
  });
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 1000,
  });

  // Auto-select first account when accounts load
  useState(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]._id || accounts[0].id);
    }
  }, [accounts]);

  const {
    data: itemsData,
    isLoading,
    error,
  } = useItems(selectedAccount, {
    ...filters,
    ...pagination,
  });

  const updateItemStatusMutation = useUpdateItemStatus();

  const items = itemsData?.items || [];
  const total = itemsData?.paging?.total || itemsData?.total || 0;

  const updateItemStatus = async (itemId, status) => {
    await updateItemStatusMutation.mutateAsync({
      accountId: selectedAccount,
      itemId,
      status,
    });
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

  const totalPages = Math.ceil(total / pagination.limit);
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
            disabled={accountsLoading}
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
          <span>{total} anuncio(s) encontrado(s)</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error.message || "Erro ao carregar anuncios"}
        </div>
      )}

      <div className="items-grid">
        {isLoading ? (
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
                      disabled={updateItemStatusMutation.isPending}
                    >
                      <span className="material-icons">pause</span>
                      Pausar
                    </button>
                  )}

                  {item.status === "paused" && (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => updateItemStatus(itemId, "active")}
                      disabled={updateItemStatusMutation.isPending}
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

      {total > pagination.limit && (
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
