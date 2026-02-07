import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { toast } from "../store/toastStore";
import {
  exportToCSV,
  exportToPDF,
  prepareProductsForExport,
} from "../utils/export";
import "./Products.css";

export default function Products() {
  const navigate = useNavigate();
  const { accountId } = useParams();

  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [account, setAccount] = useState(null);
  const [filterStatus, setFilterStatus] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("-createdAt");

  // Ref to track if initial fetch was done
  const initialFetchDone = useRef(false);

  // Fetch products - memoized to prevent unnecessary re-renders
  const fetchProducts = useCallback(async () => {
    if (!accountId) return;

    setLoading(true);

    try {
      const query = new URLSearchParams({
        all: "true", // Fetch ALL products without limit
        sort: sortBy,
      });

      if (filterStatus) {
        query.append("status", filterStatus);
      }

      const response = await api.get(
        `/products/${accountId}?${query.toString()}`,
      );

      if (response.data.success) {
        setProducts(response.data.data.products);
        setAccount(response.data.data.account);
        setTotal(response.data.data.total || 0);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch products");
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, [accountId, filterStatus, sortBy]);

  // Fetch stats separately
  const fetchStats = useCallback(async () => {
    if (!accountId) return;

    try {
      const response = await api.get(`/products/${accountId}/stats`);

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, [accountId]);

  // Effect for fetching products when dependencies change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Effect for fetching stats only when accountId changes
  useEffect(() => {
    fetchStats();
  }, [accountId]);

  // Effect for fetching products when dependencies change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSyncProducts = async () => {
    if (!accountId) return;

    setSyncing(true);

    try {
      const response = await api.post(`/products/${accountId}/sync`, {
        all: true, // Fetch ALL products without limit
      });

      if (response.data.success) {
        setProducts(response.data.data.products);
        setTotal(
          response.data.data.productsCount ||
            response.data.data.products.length,
        );
        fetchStats();
        toast.success(
          `${response.data.data.productsCount || response.data.data.products.length} produtos sincronizados com sucesso!`,
        );
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Falha ao sincronizar produtos",
      );
      console.error("Error syncing products:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleRemoveProduct = async (productId) => {
    if (!accountId) return;

    if (!window.confirm("Are you sure you want to remove this product?")) {
      return;
    }

    try {
      await api.delete(`/products/${accountId}/${productId}`);
      setProducts(products.filter((p) => p.id !== productId));
      toast.success("Product removed successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove product");
    }
  };

  const filteredProducts = products.filter((product) =>
    product.title?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const hasProducts = filteredProducts.length > 0;
  // Pagination removed - now fetching all products

  // Export handlers
  const handleExportCSV = () => {
    if (products.length === 0) {
      toast.warning("No products to export");
      return;
    }
    const data = prepareProductsForExport(products);
    const accountName = account?.nickname || "account";
    exportToCSV(
      data,
      `products_${accountName}_${new Date().toISOString().split("T")[0]}`,
    );
    toast.success("CSV file exported successfully!");
  };

  const handleExportPDF = () => {
    if (products.length === 0) {
      toast.warning("No products to export");
      return;
    }

    const columns = [
      { key: "title", label: "Product" },
      { key: "price", label: "Price", format: "currency" },
      { key: "quantity", label: "Stock", format: "number" },
      { key: "salesCount", label: "Sales", format: "number" },
      { key: "status", label: "Status" },
    ];

    const accountName = account?.nickname || "Account";
    exportToPDF(`Products Report - ${accountName}`, products, columns);
    toast.info("PDF opened in new tab. Use Ctrl+P to save.");
  };

  return (
    <div className="products-container">
      <div className="products-header">
        <div className="header-left">
          <h1>Produtos</h1>
          {account && <p className="account-name">{account.nickname}</p>}
        </div>
        <div
          className="header-actions"
          style={{ display: "flex", gap: "0.5rem" }}
        >
          {products.length > 0 && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleExportCSV}
                title="Export to CSV"
              >
                📄 CSV
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleExportPDF}
                title="Export to PDF"
              >
                📑 PDF
              </button>
            </>
          )}
          <button
            className={`btn btn-primary ${syncing ? "loading" : ""}`}
            onClick={handleSyncProducts}
            disabled={syncing}
          >
            {syncing ? "Sincronizando..." : "Sincronizar Produtos"}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <div className="stat-label">Total de Produtos</div>
              <div className="stat-value">{stats.products.total}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-label">Ativos</div>
              <div className="stat-value">{stats.products.active}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏸️</div>
            <div className="stat-content">
              <div className="stat-label">Pausados</div>
              <div className="stat-value">{stats.products.paused}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-label">Estoque Baixo</div>
              <div className="stat-value">{stats.products.lowStock}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">Total Vendas</div>
              <div className="stat-value">{stats.sales}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-label">Valor Estimado</div>
              <div className="stat-value">
                R$ {(stats.estimatedValue || 0).toLocaleString("pt-BR")}
              </div>
            </div>
          </div>
        </div>
      )}

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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos</option>
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
            <option value="-price.amount">Preço: Maior para Menor</option>
            <option value="price.amount">Preço: Menor para Maior</option>
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
        <>
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Vendas</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="product-row">
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
                        <span className="product-id">
                          #{product.mlProductId}
                        </span>
                      </div>
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
                        {product.quantity} unidades
                      </span>
                    </td>
                    <td className="product-sales">
                      {product.salesCount} vendas
                    </td>
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
                            `/accounts/${accountId}/products/${product.id}`,
                          )
                        }
                        title="Ver detalhes"
                      >
                        Ver
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleRemoveProduct(product.id)}
                        title="Remover produto"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination removed - showing all products */}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>Nenhum Produto Encontrado</h2>
          <p>
            {searchTerm
              ? "Nenhum produto corresponde a sua busca"
              : "Sincronize sua conta do Mercado Livre para ver os produtos aqui"}
          </p>
          {!searchTerm && (
            <button
              className="btn btn-primary"
              onClick={handleSyncProducts}
              disabled={syncing}
            >
              {syncing ? "Sincronizando..." : "Sincronizar Produtos Agora"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
