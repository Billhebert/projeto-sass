import { useState, useMemo } from "react";
import {
  useMLAccounts,
  useProfitAnalysis,
  useProfitStats,
} from "../hooks/useApi";
import "./ProfitCalculator.css";

function ProfitCalculator() {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("margin_desc");
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [calculatorData, setCalculatorData] = useState({
    salePrice: 0,
    productCost: 0,
    shippingCost: 0,
    mlFeePercent: 16,
    mlFeeFixed: 6,
    taxPercent: 0,
    otherCosts: 0,
  });
  const [calculatorResult, setCalculatorResult] = useState(null);

  // React Query hooks
  const { data: accounts = [], isLoading: accountsLoading } = useMLAccounts();
  const { data: items = [], isLoading: itemsLoading } =
    useProfitAnalysis(selectedAccount);
  const { data: apiStats, isLoading: statsLoading } =
    useProfitStats(selectedAccount);

  // Auto-select first account
  useMemo(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  // Calculate stats from items or use API stats
  const stats = useMemo(() => {
    if (apiStats) {
      return apiStats;
    }

    // Calculate locally if API not available
    if (items.length > 0) {
      const profitable = items.filter((i) => Number(i.margin || 0) > 0).length;
      const avgMargin =
        items.reduce((acc, i) => acc + Number(i.margin || 0), 0) / items.length;
      return {
        totalItems: items.length,
        avgMargin: Number(avgMargin.toFixed(1)),
        profitableItems: profitable,
        unprofitableItems: items.length - profitable,
        totalRevenue: items.reduce((acc, i) => acc + Number(i.price || 0), 0),
        totalProfit: items.reduce((acc, i) => acc + Number(i.profit || 0), 0),
      };
    }

    return {
      totalItems: 0,
      avgMargin: 0,
      profitableItems: 0,
      unprofitableItems: 0,
      totalRevenue: 0,
      totalProfit: 0,
    };
  }, [items, apiStats]);

  const loading = accountsLoading || itemsLoading || statsLoading;
  const error = null; // React Query handles errors internally

  const calculateProfit = () => {
    const {
      salePrice,
      productCost,
      shippingCost,
      mlFeePercent,
      mlFeeFixed,
      taxPercent,
      otherCosts,
    } = calculatorData;

    const mlFee = (salePrice * mlFeePercent) / 100 + mlFeeFixed;
    const tax = (salePrice * taxPercent) / 100;
    const totalCosts = productCost + shippingCost + mlFee + tax + otherCosts;
    const profit = salePrice - totalCosts;
    const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
    const markup =
      productCost > 0 ? ((salePrice - productCost) / productCost) * 100 : 0;

    setCalculatorResult({
      salePrice,
      productCost,
      shippingCost,
      mlFee,
      tax,
      otherCosts,
      totalCosts,
      profit,
      margin,
      markup,
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const getMarginBadge = (margin) => {
    const m = Number(margin) || 0;
    if (m >= 30) return { class: "badge-success", text: "Excelente" };
    if (m >= 15) return { class: "badge-warning", text: "Moderada" };
    if (m >= 0) return { class: "badge-danger", text: "Baixa" };
    return { class: "badge-danger", text: "Prejuizo" };
  };

  // Memoized sorted and filtered items
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case "margin_desc":
          return (b.margin || 0) - (a.margin || 0);
        case "margin_asc":
          return (a.margin || 0) - (b.margin || 0);
        case "profit_desc":
          return (b.profit || 0) - (a.profit || 0);
        case "profit_asc":
          return (a.profit || 0) - (b.profit || 0);
        case "price_desc":
          return (b.price || 0) - (a.price || 0);
        case "price_asc":
          return (a.price || 0) - (b.price || 0);
        default:
          return 0;
      }
    });
  }, [items, sortBy]);

  const filteredItems = useMemo(() => {
    return sortedItems.filter(
      (item) =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [sortedItems, searchTerm]);

  return (
    <div className="profit-calculator-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">calculate</span>
            Calculadora de Lucro
          </h1>
          <p>Analise a lucratividade de cada produto e otimize suas margens</p>
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
            onClick={() => setShowCalculatorModal(true)}
          >
            <span className="material-icons">add</span>
            Calcular Novo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <span className="material-icons">inventory_2</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalItems}</span>
            <span className="stat-label">Total de Itens</span>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon green">
            <span className="material-icons">trending_up</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.avgMargin}%</span>
            <span className="stat-label">Margem Media</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <span className="material-icons">thumb_up</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.profitableItems}</span>
            <span className="stat-label">Lucrativos</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger">
            <span className="material-icons">thumb_down</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.unprofitableItems}</span>
            <span className="stat-label">Nao Lucrativos</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <span className="material-icons">payments</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {formatCurrency(stats.totalRevenue)}
            </span>
            <span className="stat-label">Faturamento Total</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gold">
            <span className="material-icons">savings</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {formatCurrency(stats.totalProfit)}
            </span>
            <span className="stat-label">Lucro Total</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="material-icons">search</span>
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sort-box">
          <label>Ordenar por:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="margin_desc">Maior Margem</option>
            <option value="margin_asc">Menor Margem</option>
            <option value="profit_desc">Maior Lucro</option>
            <option value="profit_asc">Menor Lucro</option>
            <option value="price_desc">Maior Preco</option>
            <option value="price_asc">Menor Preco</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {/* Items Table */}
      <div className="profit-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando analise de lucro...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">calculate</span>
            <h3>Nenhum produto encontrado</h3>
            <p>
              Configure os custos dos seus produtos para ver a analise de
              lucratividade
            </p>
          </div>
        ) : (
          <div className="items-table">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Preco Venda</th>
                  <th>Custo</th>
                  <th>Taxa ML</th>
                  <th>Frete</th>
                  <th>Lucro</th>
                  <th>Margem</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const marginBadge = getMarginBadge(item.margin);
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
                            <span className="product-title">{item.title}</span>
                            <span className="product-id">{item.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="price">
                          {formatCurrency(item.price)}
                        </span>
                      </td>
                      <td>
                        <span className="cost">
                          {formatCurrency(item.cost)}
                        </span>
                      </td>
                      <td>
                        <span className="fee">
                          {formatCurrency(item.mlFee)}
                        </span>
                      </td>
                      <td>
                        <span className="shipping">
                          {formatCurrency(item.shippingCost)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`profit ${item.profit < 0 ? "negative" : "positive"}`}
                        >
                          {formatCurrency(item.profit)}
                        </span>
                      </td>
                      <td>
                        <div className="margin-cell">
                          <div className="margin-bar">
                            <div
                              className={`margin-fill ${Number(item.margin || 0) < 0 ? "negative" : Number(item.margin || 0) < 15 ? "low" : Number(item.margin || 0) < 30 ? "medium" : "high"}`}
                              style={{
                                width: `${Math.min(Math.abs(Number(item.margin || 0)), 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="margin-value">
                            {Number(item.margin || 0).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${marginBadge.class}`}>
                          {marginBadge.text}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setCalculatorData({
                                ...calculatorData,
                                salePrice: item.price,
                                productCost: item.cost,
                              });
                              setShowCalculatorModal(true);
                            }}
                          >
                            <span className="material-icons">edit</span>
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

      {/* Calculator Modal */}
      {showCalculatorModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCalculatorModal(false)}
        >
          <div
            className="modal calculator-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                <span className="material-icons">calculate</span>
                Calculadora de Lucro
              </h2>
              <button
                className="close-btn"
                onClick={() => setShowCalculatorModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="calculator-grid">
                <div className="input-section">
                  <h3>Valores de Entrada</h3>

                  <div className="input-group">
                    <label>Preco de Venda (R$)</label>
                    <input
                      type="number"
                      value={calculatorData.salePrice}
                      onChange={(e) =>
                        setCalculatorData({
                          ...calculatorData,
                          salePrice: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="input-group">
                    <label>Custo do Produto (R$)</label>
                    <input
                      type="number"
                      value={calculatorData.productCost}
                      onChange={(e) =>
                        setCalculatorData({
                          ...calculatorData,
                          productCost: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="input-group">
                    <label>Custo de Frete (R$)</label>
                    <input
                      type="number"
                      value={calculatorData.shippingCost}
                      onChange={(e) =>
                        setCalculatorData({
                          ...calculatorData,
                          shippingCost: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="input-row">
                    <div className="input-group">
                      <label>Taxa ML (%)</label>
                      <input
                        type="number"
                        value={calculatorData.mlFeePercent}
                        onChange={(e) =>
                          setCalculatorData({
                            ...calculatorData,
                            mlFeePercent: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label>Taxa Fixa (R$)</label>
                      <input
                        type="number"
                        value={calculatorData.mlFeeFixed}
                        onChange={(e) =>
                          setCalculatorData({
                            ...calculatorData,
                            mlFeeFixed: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Impostos (%)</label>
                    <input
                      type="number"
                      value={calculatorData.taxPercent}
                      onChange={(e) =>
                        setCalculatorData({
                          ...calculatorData,
                          taxPercent: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="input-group">
                    <label>Outros Custos (R$)</label>
                    <input
                      type="number"
                      value={calculatorData.otherCosts}
                      onChange={(e) =>
                        setCalculatorData({
                          ...calculatorData,
                          otherCosts: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <button
                    className="btn btn-primary btn-block"
                    onClick={calculateProfit}
                  >
                    <span className="material-icons">calculate</span>
                    Calcular
                  </button>
                </div>

                <div className="result-section">
                  <h3>Resultado</h3>

                  {calculatorResult ? (
                    <div className="result-content">
                      <div className="result-summary">
                        <div
                          className={`profit-display ${calculatorResult.profit >= 0 ? "positive" : "negative"}`}
                        >
                          <span className="label">Lucro por Unidade</span>
                          <span className="value">
                            {formatCurrency(calculatorResult.profit)}
                          </span>
                        </div>
                        <div
                          className={`margin-display ${calculatorResult.margin >= 0 ? "positive" : "negative"}`}
                        >
                          <span className="label">Margem de Lucro</span>
                          <span className="value">
                            {calculatorResult.margin.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      <div className="breakdown">
                        <h4>Detalhamento</h4>
                        <div className="breakdown-item">
                          <span>Preco de Venda</span>
                          <span className="positive">
                            {formatCurrency(calculatorResult.salePrice)}
                          </span>
                        </div>
                        <div className="breakdown-item">
                          <span>(-) Custo do Produto</span>
                          <span className="negative">
                            {formatCurrency(calculatorResult.productCost)}
                          </span>
                        </div>
                        <div className="breakdown-item">
                          <span>(-) Taxa Mercado Livre</span>
                          <span className="negative">
                            {formatCurrency(calculatorResult.mlFee)}
                          </span>
                        </div>
                        <div className="breakdown-item">
                          <span>(-) Frete</span>
                          <span className="negative">
                            {formatCurrency(calculatorResult.shippingCost)}
                          </span>
                        </div>
                        <div className="breakdown-item">
                          <span>(-) Impostos</span>
                          <span className="negative">
                            {formatCurrency(calculatorResult.tax)}
                          </span>
                        </div>
                        <div className="breakdown-item">
                          <span>(-) Outros Custos</span>
                          <span className="negative">
                            {formatCurrency(calculatorResult.otherCosts)}
                          </span>
                        </div>
                        <div className="breakdown-total">
                          <span>= Lucro Liquido</span>
                          <span
                            className={
                              calculatorResult.profit >= 0
                                ? "positive"
                                : "negative"
                            }
                          >
                            {formatCurrency(calculatorResult.profit)}
                          </span>
                        </div>
                      </div>

                      <div className="metrics">
                        <div className="metric">
                          <span className="metric-label">Markup</span>
                          <span className="metric-value">
                            {calculatorResult.markup.toFixed(2)}%
                          </span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Custo Total</span>
                          <span className="metric-value">
                            {formatCurrency(calculatorResult.totalCosts)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="no-result">
                      <span className="material-icons">info</span>
                      <p>Preencha os valores e clique em calcular</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfitCalculator;
