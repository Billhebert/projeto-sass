import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../store/toastStore";
import {
  exportToCSV,
  exportToPDF,
  prepareProductsForExport,
} from "../utils/export";
import {
  useMLAccounts,
  useAllProducts,
  useSyncProducts,
} from "../hooks/useApi";
import "./Products.css";

export default function AllProducts() {
  const navigate = useNavigate();

  const [selectedAccount, setSelectedAccount] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("-createdAt");
  const [syncingAccountId, setSyncingAccountId] = useState(null);

  // Fetch accounts and products using React Query
  const { data: accounts = [], isLoading: accountsLoading } = useMLAccounts();
  const {
    data: allProductsData = { products: [], stats: {} },
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useAllProducts({ sort: sortBy, status: filterStatus });

  const { mutateAsync: syncProducts } = useSyncProducts();

  const { products = [], stats = {} } = allProductsData;
  const loading = accountsLoading || productsLoading;
  const syncing = syncingAccountId !== null;

  // Sync products for a specific account
  const handleSyncAccount = async (accountId) => {
    setSyncingAccountId(accountId);

    try {
      const response = await syncProducts({ accountId });
      if (response.success) {
        toast.success(
          `${response.data.productsCount || 0} produtos sincronizados!`,
        );
        // Refetch all products
        await refetchProducts();
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Falha ao sincronizar produtos",
      );
    } finally {
      setSyncingAccountId(null);
    }
  };

  // Sync all accounts
  const handleSyncAll = async () => {
    setSyncingAccountId("all");
    let totalSynced = 0;

    for (const account of accounts) {
      try {
        setSyncingAccountId(account.id);
        const response = await syncProducts({ accountId: account.id });
        if (response.success) {
          totalSynced += response.data.productsCount || 0;
        }
      } catch (err) {
        console.error(`Error syncing account ${account.id}:`, err);
      }
    }

    toast.success(
      `${totalSynced} produtos sincronizados de ${accounts.length} conta(s)!`,
    );
    await refetchProducts();
    setSyncingAccountId(null);
  };

  // Filter products by search and selected account
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.title
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesAccount =
        !selectedAccount || product.accountId === selectedAccount;
      return matchesSearch && matchesAccount;
    });
  }, [products, searchTerm, selectedAccount]);

  const hasProducts = filteredProducts.length > 0;

  // Export handlers
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      toast.warning("Nenhum produto para exportar");
      return;
    }
    const data = prepareProductsForExport(filteredProducts);
    exportToCSV(
      data,
      `todos_produtos_${new Date().toISOString().split("T")[0]}`,
    );
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  const handleExportPDF = () => {
    if (filteredProducts.length === 0) {
      toast.warning("Nenhum produto para exportar");
      return;
    }

    const columns = [
      { key: "title", label: "Produto" },
      { key: "accountName", label: "Conta" },
      { key: "price", label: "Preco", format: "currency" },
      { key: "quantity", label: "Estoque", format: "number" },
      { key: "salesCount", label: "Vendas", format: "number" },
      { key: "status", label: "Status" },
    ];

    exportToPDF(
      "Relatorio de Produtos - Todas as Contas",
      filteredProducts,
      columns,
    );
    toast.info("PDF aberto em nova aba. Use Ctrl+P para salvar.");
  };

  return (
    <div className="products-container">
      <div className="products-header">
        <div className="header-left">
          <h1>Meus Produtos</h1>
          <p className="account-name">
            {accounts.length} conta(s) conectada(s)
          </p>
        </div>
        <div
          className="header-actions"
          style={{ display: "flex", gap: "0.5rem" }}
        >
          {filteredProducts.length > 0 && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleExportCSV}
                title="Exportar para CSV"
              >
                CSV
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleExportPDF}
                title="Exportar para PDF"
              >
                PDF
              </button>
            </>
          )}
          <button
            className={`btn btn-primary ${syncing ? "loading" : ""}`}
            onClick={handleSyncAll}
            disabled={syncing || accounts.length === 0}
          >
            {syncing ? "Sincronizando..." : "Sincronizar Tudo"}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-label">Total de Produtos</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Ativos</div>
            <div className="stat-value">{stats.active}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏸️</div>
          <div className="stat-content">
            <div className="stat-label">Pausados</div>
            <div className="stat-value">{stats.paused}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-label">Estoque Baixo</div>
            <div className="stat-value">{stats.lowStock}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Total Vendas</div>
            <div className="stat-value">{stats.totalSales}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Valor Estimado</div>
            <div className="stat-value">
              R$ {(stats.totalValue || 0).toLocaleString("pt-BR")}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="products-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas as Contas</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.nickname}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="paused">Pausados</option>
            <option value="closed">Encerrados</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="-createdAt">Mais Recentes</option>
            <option value="createdAt">Mais Antigos</option>
            <option value="-price.amount">Preco: Maior para Menor</option>
            <option value="price.amount">Preco: Menor para Maior</option>
            <option value="-salesCount">Mais Vendidos</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Carregando produtos...</p>
        </div>
      ) : hasProducts ? (
        <div className="products-table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Conta</th>
                <th>Preco</th>
                <th>Estoque</th>
                <th>Vendas</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={`${product.accountId}-${product.id}`}
                  className="product-row"
                >
                  <td className="product-info">
                    {product.thumbnailUrl && (
                      <img
                        src={product.thumbnailUrl}
                        alt={product.title}
                        className="product-thumbnail"
                      />
                    )}
                    <div className="product-details">
                      <a
                        href={product.permalinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="product-title"
                      >
                        {product.title}
                      </a>
                      <span className="product-id">#{product.mlProductId}</span>
                    </div>
                  </td>
                  <td className="product-account">
                    <span
                      className="account-badge"
                      onClick={() =>
                        navigate(`/accounts/${product.accountId}/products`)
                      }
                      style={{ cursor: "pointer", color: "#0066cc" }}
                    >
                      {product.accountName}
                    </span>
                  </td>
                  <td className="product-price">
                    R$ {(product.price || 0).toLocaleString("pt-BR")}
                  </td>
                  <td className="product-stock">
                    <span
                      className={`stock-badge ${
                        product.quantity > 10
                          ? "high"
                          : product.quantity > 0
                            ? "medium"
                            : "low"
                      }`}
                    >
                      {product.quantity} un.
                    </span>
                  </td>
                  <td className="product-sales">{product.salesCount}</td>
                  <td className="product-status">
                    <span className={`status-badge ${product.status}`}>
                      {product.status === "active"
                        ? "Ativo"
                        : product.status === "paused"
                          ? "Pausado"
                          : product.status === "closed"
                            ? "Encerrado"
                            : product.status}
                    </span>
                  </td>
                  <td className="product-actions">
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() =>
                        navigate(
                          `/accounts/${product.accountId}/products/${product.id}`,
                        )
                      }
                      title="Ver detalhes"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>Nenhum Produto Encontrado</h2>
          <p>
            {accounts.length === 0
              ? "Conecte uma conta do Mercado Livre para comecar"
              : searchTerm
                ? "Nenhum produto corresponde a sua busca"
                : "Sincronize suas contas para ver os produtos aqui"}
          </p>
          {accounts.length === 0 ? (
            <button
              className="btn btn-primary"
              onClick={() => navigate("/accounts")}
            >
              Conectar Conta
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSyncAll}
              disabled={syncing}
            >
              {syncing ? "Sincronizando..." : "Sincronizar Produtos"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
