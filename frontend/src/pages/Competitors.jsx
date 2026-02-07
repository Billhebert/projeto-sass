import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import "./Competitors.css";

function Competitors() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [competitors, setCompetitors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadProducts();
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    try {
      const response = await api.get("/ml-accounts");
      const accountsList =
        response.data.data?.accounts || response.data.accounts || [];
      setAccounts(accountsList);
      if (accountsList.length > 0) {
        setSelectedAccount(accountsList[0].id);
      }
    } catch (err) {
      setError("Erro ao carregar contas");
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/products/${selectedAccount}?limit=50&sort=-salesCount`,
      );
      setProducts(response.data.data?.products || []);
    } catch (err) {
      setError("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const analyzeCompetitors = async (product) => {
    setSelectedProduct(product);
    setAnalyzing(true);

    try {
      // Try API first
      const response = await api.get(
        `/products/${selectedAccount}/${product.mlProductId}/competitors`,
      );
      const competitorsData =
        response.data.data?.competitors || response.data.competitors || [];
      setCompetitors(competitorsData);
    } catch (err) {
      console.error("Error fetching competitors:", err);
      // Set empty array on error instead of mock data
      setCompetitors([]);
    } finally {
      setAnalyzing(false);
    }
  };

  const getReputationBadge = (level) => {
    const badges = {
      "5_green": {
        label: "Platinum",
        color: "#10b981",
        icon: "workspace_premium",
      },
      "4_light_green": {
        label: "Gold",
        color: "#84cc16",
        icon: "military_tech",
      },
      "3_yellow": { label: "Lider", color: "#eab308", icon: "verified" },
      "2_orange": { label: "Bom", color: "#f97316", icon: "thumb_up" },
      "1_red": { label: "Regular", color: "#ef4444", icon: "warning" },
    };
    return badges[level] || { label: "N/A", color: "#6b7280", icon: "help" };
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPositionClass = (myPrice, competitorPrice) => {
    if (competitorPrice < myPrice * 0.95) return "cheaper";
    if (competitorPrice > myPrice * 1.05) return "expensive";
    return "similar";
  };

  const filteredProducts = products.filter((p) =>
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const priceChartData = competitors.slice(0, 8).map((c) => ({
    name: c.seller.length > 15 ? c.seller.substring(0, 15) + "..." : c.seller,
    price: c.price,
    isMe: false,
  }));

  if (selectedProduct) {
    priceChartData.push({
      name: "Meu Preco",
      price: selectedProduct.price,
      isMe: true,
    });
    priceChartData.sort((a, b) => a.price - b.price);
  }

  const avgPrice =
    competitors.length > 0
      ? competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length
      : 0;

  const minPrice =
    competitors.length > 0 ? Math.min(...competitors.map((c) => c.price)) : 0;

  const maxPrice =
    competitors.length > 0 ? Math.max(...competitors.map((c) => c.price)) : 0;

  const myPosition = selectedProduct
    ? competitors.filter((c) => c.price < selectedProduct.price).length + 1
    : 0;

  return (
    <div className="competitors-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">compare_arrows</span>
            Analise de Concorrencia
          </h1>
          <p>Compare seus precos com a concorrencia</p>
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
      </header>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      <div className="main-content">
        {/* Products Sidebar */}
        <aside className="products-sidebar">
          <div className="sidebar-header">
            <h3>Seus Produtos</h3>
            <span className="product-count">{filteredProducts.length}</span>
          </div>

          <div className="search-box">
            <span className="material-icons">search</span>
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="products-list">
            {loading ? (
              <div className="loading-mini">
                <div className="spinner"></div>
                <span>Carregando...</span>
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div
                  key={product._id || product.mlProductId}
                  className={`product-item ${selectedProduct?.mlProductId === product.mlProductId ? "active" : ""}`}
                  onClick={() => analyzeCompetitors(product)}
                >
                  {product.thumbnailUrl && (
                    <img
                      src={product.thumbnailUrl}
                      alt=""
                      className="product-thumb"
                    />
                  )}
                  <div className="product-info">
                    <span className="product-title">{product.title}</span>
                    <span className="product-price">
                      {formatCurrency(product.price || 0)}
                    </span>
                  </div>
                  <span className="material-icons analyze-icon">
                    arrow_forward
                  </span>
                </div>
              ))
            ) : (
              <div className="no-products">
                <span className="material-icons">inventory_2</span>
                <p>Nenhum produto encontrado</p>
              </div>
            )}
          </div>
        </aside>

        {/* Analysis Area */}
        <main className="analysis-area">
          {!selectedProduct ? (
            <div className="empty-analysis">
              <div className="empty-icon">
                <span className="material-icons">analytics</span>
              </div>
              <h2>Selecione um produto</h2>
              <p>
                Escolha um produto na lista ao lado para analisar a concorrencia
              </p>
            </div>
          ) : analyzing ? (
            <div className="loading-state">
              <div className="spinner-large"></div>
              <p>Analisando concorrencia...</p>
            </div>
          ) : (
            <>
              {/* Product Header */}
              <div className="product-header">
                {selectedProduct.thumbnailUrl && (
                  <img
                    src={selectedProduct.thumbnailUrl}
                    alt=""
                    className="product-image"
                  />
                )}
                <div className="product-details">
                  <h2>{selectedProduct.title}</h2>
                  <p className="product-id">MLB{selectedProduct.mlProductId}</p>
                  <div className="product-my-price">
                    <span className="label">Seu Preco:</span>
                    <span className="price">
                      {formatCurrency(selectedProduct.price || 0)}
                    </span>
                  </div>
                </div>
                <div className="product-actions">
                  <Link
                    to={`/items/${selectedProduct.mlProductId}/edit`}
                    className="btn btn-primary"
                  >
                    <span className="material-icons">edit</span>
                    Editar Preco
                  </Link>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon blue">
                    <span className="material-icons">groups</span>
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{competitors.length}</span>
                    <span className="stat-label">Concorrentes</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green">
                    <span className="material-icons">leaderboard</span>
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{myPosition}o</span>
                    <span className="stat-label">Sua Posicao</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon yellow">
                    <span className="material-icons">trending_down</span>
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">
                      {formatCurrency(minPrice)}
                    </span>
                    <span className="stat-label">Menor Preco</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon purple">
                    <span className="material-icons">calculate</span>
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">
                      {formatCurrency(avgPrice)}
                    </span>
                    <span className="stat-label">Preco Medio</span>
                  </div>
                </div>
              </div>

              {/* Price Chart */}
              <div className="chart-section">
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>
                      <span className="material-icons">bar_chart</span>
                      Comparativo de Precos
                    </h3>
                  </div>
                  <div className="chart-body">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={priceChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          type="number"
                          tickFormatter={(v) => `R$${v.toFixed(0)}`}
                          stroke="#9ca3af"
                          fontSize={11}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          stroke="#9ca3af"
                          fontSize={11}
                        />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                          {priceChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.isMe ? "#3b82f6" : "#e2e8f0"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Competitors Table */}
              <div className="competitors-section">
                <h3>
                  <span className="material-icons">list</span>
                  Lista de Concorrentes
                </h3>

                <div className="competitors-table-container">
                  <table className="competitors-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Vendedor</th>
                        <th>Reputacao</th>
                        <th>Preco</th>
                        <th>Frete</th>
                        <th>Vendas</th>
                        <th>Tipo</th>
                        <th>Acao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitors.map((comp, idx) => {
                        const repBadge = getReputationBadge(comp.reputation);
                        const posClass = getPositionClass(
                          selectedProduct.price,
                          comp.price,
                        );

                        return (
                          <tr key={comp.id || idx} className={posClass}>
                            <td className="rank-cell">
                              <span className="rank">{idx + 1}</span>
                            </td>
                            <td className="seller-cell">
                              <span className="seller-name">{comp.seller}</span>
                            </td>
                            <td className="reputation-cell">
                              <div
                                className="rep-badge"
                                style={{ color: repBadge.color }}
                              >
                                <span className="material-icons">
                                  {repBadge.icon}
                                </span>
                                <span>{repBadge.label}</span>
                              </div>
                            </td>
                            <td className="price-cell">
                              <span className={`price ${posClass}`}>
                                {formatCurrency(comp.price)}
                              </span>
                              {posClass === "cheaper" && (
                                <span className="diff negative">
                                  -
                                  {Math.abs(
                                    ((comp.price - selectedProduct.price) /
                                      selectedProduct.price) *
                                      100,
                                  ).toFixed(1)}
                                  %
                                </span>
                              )}
                              {posClass === "expensive" && (
                                <span className="diff positive">
                                  +
                                  {Math.abs(
                                    ((comp.price - selectedProduct.price) /
                                      selectedProduct.price) *
                                      100,
                                  ).toFixed(1)}
                                  %
                                </span>
                              )}
                            </td>
                            <td className="shipping-cell">
                              {comp.shipping === "free" ? (
                                <span className="free-shipping">
                                  <span className="material-icons">
                                    local_shipping
                                  </span>
                                  Gratis
                                </span>
                              ) : (
                                <span className="paid-shipping">
                                  R$ {comp.shipping}
                                </span>
                              )}
                            </td>
                            <td className="sales-cell">
                              {comp.totalSales?.toLocaleString("pt-BR")}
                            </td>
                            <td className="type-cell">
                              <span
                                className={`listing-badge ${comp.listingType}`}
                              >
                                {comp.listingType === "gold_special"
                                  ? "Premium"
                                  : "Classico"}
                              </span>
                            </td>
                            <td className="action-cell">
                              <a
                                href={comp.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-secondary"
                              >
                                <span className="material-icons">
                                  open_in_new
                                </span>
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recommendation */}
              <div className="recommendation-card">
                <div className="rec-icon">
                  <span className="material-icons">lightbulb</span>
                </div>
                <div className="rec-content">
                  <h4>Recomendacao</h4>
                  {selectedProduct.price > avgPrice ? (
                    <p>
                      Seu preco esta{" "}
                      <strong>
                        {((selectedProduct.price / avgPrice - 1) * 100).toFixed(
                          1,
                        )}
                        % acima
                      </strong>{" "}
                      da media. Considere reduzir para{" "}
                      {formatCurrency(avgPrice * 0.98)} para ser mais
                      competitivo.
                    </p>
                  ) : selectedProduct.price < avgPrice * 0.9 ? (
                    <p>
                      Seu preco esta{" "}
                      <strong>
                        {((1 - selectedProduct.price / avgPrice) * 100).toFixed(
                          1,
                        )}
                        % abaixo
                      </strong>{" "}
                      da media. Voce pode aumentar para{" "}
                      {formatCurrency(avgPrice * 0.95)} sem perder
                      competitividade.
                    </p>
                  ) : (
                    <p>
                      Seu preco esta <strong>bem posicionado</strong> em relacao
                      a concorrencia. Continue monitorando para manter sua
                      vantagem.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Competitors;
