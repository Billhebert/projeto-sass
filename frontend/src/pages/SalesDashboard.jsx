import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  useSalesDashboardAccounts,
  useSalesDashboardData,
  useSalesDashboardSkus,
  useSaveSalesDashboardSku,
  useSyncOrders,
} from "../hooks/useApi";
import "./SalesDashboard.css";

const COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

function SalesDashboard() {
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [filters, setFilters] = useState({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
    orderNumber: "",
    title: "",
    sku: "",
    status: "Todos",
    modality: "Todos",
    shippingType: "Todos",
    advertising: "Todos",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showSkuModal, setShowSkuModal] = useState(false);
  const [selectedSku, setSelectedSku] = useState(null);
  const [skuForm, setSkuForm] = useState({
    cost: 0,
    taxPercent: 0,
    gtin: "",
    fixedStockEnabled: false,
    fixedStockQuantity: 1,
    stockSyncDisabled: false,
  });
  const [considerBuyerShipping, setConsiderBuyerShipping] = useState(false);
  const [hasTriedSync, setHasTriedSync] = useState(false);

  // Fetch data using React Query hooks
  const { data: accounts = [], isLoading: accountsLoading } =
    useSalesDashboardAccounts();
  const {
    data: dashboardData,
    isLoading: dataLoading,
    error,
    refetch,
  } = useSalesDashboardData(selectedAccount, filters.dateFrom, filters.dateTo);
  const { data: skus = {} } = useSalesDashboardSkus();
  const saveSku = useSaveSalesDashboardSku();
  const syncOrders = useSyncOrders();

  const loading = accountsLoading || dataLoading;

  // Auto-sync if no sales found
  useEffect(() => {
    if (
      !dataLoading &&
      dashboardData &&
      (!dashboardData.sales || dashboardData.sales.length === 0) &&
      !hasTriedSync
    ) {
      setHasTriedSync(true);

      const accountsToSync =
        selectedAccount === "all"
          ? accounts
          : accounts.filter((a) => a.id === selectedAccount);

      if (accountsToSync.length > 0) {
        Promise.all(
          accountsToSync.map((account) =>
            syncOrders.mutateAsync({
              accountId: account.id,
              options: { status: "paid", days: 90 },
            }),
          ),
        )
          .then(() => {
            refetch();
          })
          .catch((err) => {
            console.error("Auto-sync failed:", err);
          });
      }
    }
  }, [
    dataLoading,
    dashboardData,
    hasTriedSync,
    selectedAccount,
    accounts,
    syncOrders,
    refetch,
  ]);

  // Metrics from API
  const metrics = dashboardData?.metrics || {
    totalRevenue: 0,
    cancelledRevenue: 0,
    totalCostAndTax: 0,
    totalCost: 0,
    totalTax: 0,
    totalSaleFee: 0,
    totalShipping: 0,
    totalShippingBuyer: 0,
    totalShippingSeller: 0,
    totalMargin: 0,
    marginPercent: 0,
    totalQuantity: 0,
    cancelledQuantity: 0,
    avgTicket: 0,
    avgMargin: 0,
    avgMarginPercent: 0,
    approvedCount: 0,
    cancelledCount: 0,
    partialReturns: 0,
    partialReturnsQty: 0,
  };

  const byModality = dashboardData?.byModality || {};

  // Apply local filters to sales
  const filteredSales = useMemo(() => {
    if (!dashboardData?.sales) return [];

    return dashboardData.sales.filter((sale) => {
      if (filters.orderNumber && !sale.orderId?.includes(filters.orderNumber))
        return false;
      if (
        filters.title &&
        !sale.title?.toLowerCase().includes(filters.title.toLowerCase())
      )
        return false;
      if (
        filters.sku &&
        !sale.sku?.toLowerCase().includes(filters.sku.toLowerCase())
      )
        return false;
      if (filters.status !== "Todos") {
        if (filters.status === "paid" && sale.status !== "paid") return false;
        if (filters.status === "cancelled" && sale.status !== "cancelled")
          return false;
      }
      if (filters.modality !== "Todos" && sale.modality !== filters.modality)
        return false;
      return true;
    });
  }, [dashboardData?.sales, filters]);

  // Pagination
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  // Chart data
  const dailyChartData = dashboardData?.charts?.daily || [];
  const topProductsData = dashboardData?.charts?.topProducts || [];

  const modalityChartData = useMemo(() => {
    return Object.entries(byModality)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [byModality]);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  // SKU Modal handlers
  const openSkuModal = (sku) => {
    const skuData = skus[sku] || {
      cost: 0,
      taxPercent: 0,
      gtin: "",
      fixedStock: { enabled: false, quantity: 1 },
      stockSync: { disabled: false },
    };
    setSelectedSku(sku);
    setSkuForm({
      cost: skuData.cost || 0,
      taxPercent: skuData.taxPercent || 0,
      gtin: skuData.gtin || "",
      fixedStockEnabled: skuData.fixedStock?.enabled || false,
      fixedStockQuantity: skuData.fixedStock?.quantity || 1,
      stockSyncDisabled: skuData.stockSync?.disabled || false,
    });
    setShowSkuModal(true);
  };

  const handleSaveSku = async (closeAfter = false) => {
    await saveSku.mutateAsync({
      sku: selectedSku,
      cost: parseFloat(skuForm.cost) || 0,
      taxPercent: parseFloat(skuForm.taxPercent) || 0,
      gtin: skuForm.gtin || null,
      fixedStock: {
        enabled: skuForm.fixedStockEnabled,
        quantity: parseInt(skuForm.fixedStockQuantity) || 1,
      },
      stockSync: {
        disabled: skuForm.stockSyncDisabled,
      },
    });

    if (closeAfter) {
      setShowSkuModal(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = [
      "Pedido",
      "Data",
      "Anúncio",
      "Conta",
      "SKU",
      "Qtd",
      "Valor Unit.",
      "Faturamento ML",
      "Custo",
      "Imposto",
      "Tarifa ML",
      "Frete Comprador",
      "Frete Vendedor",
      "Margem Contrib.",
    ];
    const rows = filteredSales.map((s) => [
      s.orderId,
      formatDate(s.orderDate),
      `"${(s.title || "").replace(/"/g, '""')}"`,
      s.accountNickname,
      s.sku || "-",
      s.quantity,
      s.unitPrice?.toFixed(2),
      s.mlRevenue?.toFixed(2),
      s.cost?.toFixed(2),
      s.tax?.toFixed(2),
      s.saleFee?.toFixed(2),
      s.shippingCostBuyer?.toFixed(2),
      s.shippingCostSeller?.toFixed(2),
      s.margin?.toFixed(2),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((r) => r.join(";")),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vendas_${filters.dateFrom}_${filters.dateTo}.csv`;
    link.click();
  };

  const clearFilters = () => {
    setFilters({
      ...filters,
      orderNumber: "",
      title: "",
      sku: "",
      status: "Todos",
      modality: "Todos",
      shippingType: "Todos",
      advertising: "Todos",
    });
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    refetch();
    setFiltersOpen(false);
  };

  // Loading state
  if (loading && !dashboardData) {
    return (
      <div className="sales-dashboard">
        <div className="loading-container">
          <div className="spinner-lg"></div>
          <p>Carregando dashboard de vendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-dashboard">
      {/* Mobile Filter Toggle */}
      <button
        className="mobile-filter-toggle"
        onClick={() => setFiltersOpen(!filtersOpen)}
      >
        <span className="material-icons">
          {filtersOpen ? "close" : "filter_list"}
        </span>
      </button>

      {/* Mobile Overlay */}
      <div
        className={`filters-overlay ${filtersOpen ? "active" : ""}`}
        onClick={() => setFiltersOpen(false)}
      />

      <div className="dashboard-layout">
        {/* Filters Sidebar */}
        <aside className={`filters-sidebar ${filtersOpen ? "open" : ""}`}>
          <h3>Filtrar Busca</h3>

          <div className="filter-row">
            <div className="filter-group">
              <label>Data Início</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
              />
            </div>
            <div className="filter-group">
              <label>Data Fim</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
              />
            </div>
          </div>

          <div className="filter-group">
            <label>N° Pedido / Carrinho</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={filters.orderNumber}
              onChange={(e) =>
                setFilters({ ...filters, orderNumber: e.target.value })
              }
            />
          </div>

          <div className="filter-group">
            <label>Título ou MLB</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={filters.title}
              onChange={(e) =>
                setFilters({ ...filters, title: e.target.value })
              }
            />
          </div>

          <div className="filter-group">
            <label>SKU</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={filters.sku}
              onChange={(e) => setFilters({ ...filters, sku: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>Status Venda</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option>Todos</option>
              <option value="paid">Pago</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Modalidade</label>
            <select
              value={filters.modality}
              onChange={(e) =>
                setFilters({ ...filters, modality: e.target.value })
              }
            >
              <option>Todos</option>
              <option value="Full">Full</option>
              <option value="Flex">Flex</option>
              <option value="Places / Coleta">Places / Coleta</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Tipo do Frete</label>
            <select
              value={filters.shippingType}
              onChange={(e) =>
                setFilters({ ...filters, shippingType: e.target.value })
              }
            >
              <option>Todos</option>
              <option value="free">Frete Grátis</option>
              <option value="paid">Frete Pago</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Publicidade</label>
            <select
              value={filters.advertising}
              onChange={(e) =>
                setFilters({ ...filters, advertising: e.target.value })
              }
            >
              <option>Todos</option>
              <option value="product_ads">Product Ads</option>
              <option value="organic">Orgânico</option>
            </select>
          </div>

          <div className="filters-actions">
            <button className="btn-filter-primary" onClick={applyFilters}>
              Aplicar
            </button>
            <button className="btn-filter-secondary" onClick={clearFilters}>
              Limpar
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-content">
          {/* Error Alert */}
          {error && (
            <div className="alert alert-warning">
              <span className="material-icons">info</span>
              <div className="alert-content">
                <strong>Atenção:</strong>{" "}
                {error.message || "Erro ao carregar dados"}
                <small>
                  Sincronize seus pedidos na página de Pedidos para ver os dados
                  aqui.
                </small>
              </div>
              <button className="alert-close" onClick={() => {}}>
                <span className="material-icons">close</span>
              </button>
            </div>
          )}

          {/* Metrics Row 1 - 5 cards */}
          <div className="metrics-grid">
            {/* Vendas Aprovadas */}
            <div className="metric-card purple">
              <div className="metric-card-header">
                <span className="metric-card-title">Vendas Aprovadas</span>
                <span
                  className="material-icons metric-card-info"
                  title="Total de vendas aprovadas no período"
                >
                  info
                </span>
              </div>
              <div className="metric-card-value">
                {formatCurrency(metrics.totalRevenue)}
              </div>
              <div className="metric-card-details">
                <div className="metric-detail-row">
                  <span>Faturamento ML</span>
                  <span>{formatCurrency(metrics.totalRevenue)}</span>
                </div>
                <div className="metric-detail-row">
                  <span>Vendas Canceladas</span>
                  <span>{formatCurrency(metrics.cancelledRevenue)}</span>
                </div>
                <label className="metric-checkbox">
                  <input
                    type="checkbox"
                    checked={considerBuyerShipping}
                    onChange={(e) => setConsiderBuyerShipping(e.target.checked)}
                  />
                  <span>Considerar frete comprador</span>
                </label>
              </div>
            </div>

            {/* Custo & Imposto */}
            <div className="metric-card blue">
              <div className="metric-card-header">
                <span className="metric-card-title">Custo & Imposto</span>
                <span
                  className="material-icons metric-card-info"
                  title="Custo dos produtos + Impostos cadastrados"
                >
                  info
                </span>
              </div>
              <div className="metric-card-value">
                {formatCurrency(metrics.totalCostAndTax)}
              </div>
              <div className="metric-card-details">
                <div className="metric-detail-row">
                  <span>Custo</span>
                  <span>{formatCurrency(metrics.totalCost)}</span>
                </div>
                <div className="metric-detail-row">
                  <span>Imposto</span>
                  <span>{formatCurrency(metrics.totalTax)}</span>
                </div>
              </div>
            </div>

            {/* Tarifa de Venda */}
            <div className="metric-card orange">
              <div className="metric-card-header">
                <span className="metric-card-title">Tarifa de Venda</span>
                <span
                  className="material-icons metric-card-info"
                  title="Tarifas cobradas pelo Mercado Livre"
                >
                  info
                </span>
              </div>
              <div className="metric-card-value">
                {formatCurrency(metrics.totalSaleFee)}
              </div>
              <div className="metric-card-details">
                <div className="metric-detail-row">
                  <span>Taxa ML</span>
                  <span>{formatCurrency(metrics.totalSaleFee)}</span>
                </div>
              </div>
            </div>

            {/* Frete Total */}
            <div className="metric-card yellow">
              <div className="metric-card-header">
                <span className="metric-card-title">Frete Total</span>
                <span
                  className="material-icons metric-card-info"
                  title="Custos de frete"
                >
                  info
                </span>
              </div>
              <div className="metric-card-value">
                {formatCurrency(metrics.totalShipping)}
              </div>
              <div className="metric-card-details">
                <div className="metric-detail-row">
                  <span>Frete Comprador</span>
                  <span>{formatCurrency(metrics.totalShippingBuyer)}</span>
                </div>
                <div className="metric-detail-row">
                  <span>Frete Vendedor</span>
                  <span>{formatCurrency(metrics.totalShippingSeller)}</span>
                </div>
              </div>
            </div>

            {/* Margem de Contribuição */}
            <div className="metric-card green">
              <div className="metric-card-header">
                <span className="metric-card-title">
                  Margem de Contribuição
                </span>
                <span
                  className="material-icons metric-card-info"
                  title="Lucro após custos, impostos e taxas"
                >
                  info
                </span>
              </div>
              <div className="metric-card-value">
                {formatCurrency(metrics.totalMargin)}
              </div>
              <div className="metric-card-details">
                <div className="metric-detail-row highlight">
                  <span>Percentual</span>
                  <span>{metrics.marginPercent?.toFixed(2) || 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Row 2 - 5 cards */}
          <div className="metrics-grid-secondary">
            {/* Canais / Modalidades */}
            <div className="metric-card gray">
              <div className="metric-card-header">
                <span className="metric-card-title">Canais / Modalidades</span>
                <span
                  className="material-icons metric-card-info"
                  title="Vendas por tipo de envio"
                >
                  info
                </span>
              </div>
              <div className="modality-list">
                {Object.entries(byModality).map(([mod, value]) => (
                  <div key={mod} className="modality-item">
                    <span>{mod}</span>
                    <span>{formatCurrency(value)}</span>
                  </div>
                ))}
                <div className="modality-item modality-total">
                  <span>Total</span>
                  <span>{formatCurrency(metrics.totalRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Qtd Vendas Aprovadas */}
            <div className="metric-card teal">
              <div className="metric-card-header">
                <span className="metric-card-title">Qtd Vendas Aprovadas</span>
                <span
                  className="material-icons metric-card-info"
                  title="Quantidade de itens vendidos"
                >
                  info
                </span>
              </div>
              <div className="metric-card-value">{metrics.totalQuantity}</div>
              <div className="metric-card-details">
                <div className="metric-detail-row">
                  <span>Qtd Total Vendas</span>
                  <span>
                    {metrics.totalQuantity} ({metrics.approvedCount} un)
                  </span>
                </div>
                <div className="metric-detail-row">
                  <span>Qtd Canceladas</span>
                  <span>
                    {metrics.cancelledQuantity} ({metrics.cancelledCount} un)
                  </span>
                </div>
              </div>
            </div>

            {/* Ticket Médio Venda */}
            <div className="metric-card pink">
              <div className="metric-card-header">
                <span className="metric-card-title">Ticket Médio Venda</span>
                <span
                  className="material-icons metric-card-info"
                  title="Valor médio por venda"
                >
                  info
                </span>
              </div>
              <div className="metric-card-value">
                {formatCurrency(metrics.avgTicket)}
              </div>
              <div className="metric-card-details">
                <div className="metric-detail-row">
                  <span>Ticket Médio</span>
                  <span>{formatCurrency(metrics.avgTicket)}</span>
                </div>
              </div>
            </div>

            {/* Ticket Médio Margem */}
            <div className="metric-card cyan">
              <div className="metric-card-header">
                <span className="metric-card-title">Ticket Médio Margem</span>
                <span
                  className="material-icons metric-card-info"
                  title="Margem média por venda"
                >
                  info
                </span>
              </div>
              <div className="metric-card-value">
                {formatCurrency(metrics.avgMargin)}
              </div>
              <div className="metric-card-details">
                <div className="metric-detail-row">
                  <span>Ticket MC</span>
                  <span>{formatCurrency(metrics.avgMargin)}</span>
                </div>
                <div className="metric-detail-row highlight">
                  <span>MC %</span>
                  <span>{metrics.avgMarginPercent?.toFixed(2) || 0}%</span>
                </div>
              </div>
            </div>

            {/* Devoluções Parciais */}
            <div className="metric-card red">
              <div className="metric-card-header">
                <span className="metric-card-title">Devoluções Parciais</span>
                <span
                  className="material-icons metric-card-info"
                  title="Devoluções parciais"
                >
                  info
                </span>
              </div>
              <div className="metric-card-value">
                {formatCurrency(metrics.partialReturns)}
              </div>
              <div className="metric-card-details">
                <div className="metric-detail-row">
                  <span>Valor</span>
                  <span>{formatCurrency(metrics.partialReturns)}</span>
                </div>
                <div className="metric-detail-row">
                  <span>Qtd Vendas</span>
                  <span>{metrics.partialReturnsQty}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Details Table */}
          <div className="sales-details-section">
            <div className="sales-details-header">
              <h3>Detalhes de Vendas</h3>
              <div className="sales-details-actions">
                <button
                  className="btn-action btn-action-primary"
                  onClick={() => refetch()}
                  disabled={loading}
                >
                  <span className="material-icons">
                    {loading ? "hourglass_empty" : "sync"}
                  </span>
                  <span>{loading ? "Atualizando..." : "Atualizar"}</span>
                </button>
                <button
                  className="btn-action btn-action-success"
                  onClick={exportCSV}
                  disabled={filteredSales.length === 0}
                >
                  <span className="material-icons">download</span>
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="sales-table">
                <thead>
                  <tr>
                    <th>Anúncio</th>
                    <th>Conta</th>
                    <th>SKU</th>
                    <th>Data</th>
                    <th>Frete</th>
                    <th>Valor Unit.</th>
                    <th>Qtd.</th>
                    <th className="col-revenue">Faturamento ML</th>
                    <th className="col-negative">Custo (-)</th>
                    <th className="col-negative">Imposto (-)</th>
                    <th className="col-negative">Tarifa (-)</th>
                    <th className="col-negative">Frete Comp. (-)</th>
                    <th className="col-negative">Frete Vend. (-)</th>
                    <th className="col-margin">Margem Contrib.</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="14">
                        <div className="empty-state">
                          <div className="spinner-lg"></div>
                          <p>Carregando vendas...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan="14">
                        <div className="empty-state">
                          <span className="material-icons">inbox</span>
                          <p>Nenhuma venda encontrada</p>
                          <small>
                            Sincronize seus pedidos na página de Pedidos
                          </small>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedSales.map((sale, idx) => (
                      <tr key={`${sale.orderId}-${idx}`}>
                        <td className="cell-title" title={sale.title}>
                          {sale.title?.substring(0, 40) || "Sem título"}...
                        </td>
                        <td>{sale.accountNickname}</td>
                        <td>
                          <button
                            className={`sku-button ${sale.hasSku ? "has-cost" : "no-cost"}`}
                            onClick={() =>
                              openSkuModal(sale.sku || sale.itemId)
                            }
                            title={
                              sale.hasSku
                                ? "Clique para editar custo"
                                : "Clique para cadastrar custo"
                            }
                          >
                            {sale.sku || sale.itemId || "-"}
                            <span className="material-icons">
                              {sale.hasSku ? "edit" : "add_circle"}
                            </span>
                          </button>
                        </td>
                        <td>{formatDate(sale.orderDate)}</td>
                        <td>{sale.modality || "-"}</td>
                        <td>{formatCurrency(sale.unitPrice)}</td>
                        <td>{sale.quantity}</td>
                        <td className="col-revenue">
                          {formatCurrency(sale.mlRevenue)}
                        </td>
                        <td className="col-negative">
                          {formatCurrency(sale.cost)}
                        </td>
                        <td className="col-negative">
                          {formatCurrency(sale.tax)}
                        </td>
                        <td className="col-negative">
                          {formatCurrency(sale.saleFee)}
                        </td>
                        <td className="col-negative">
                          {formatCurrency(sale.shippingCostBuyer)}
                        </td>
                        <td className="col-negative">
                          {formatCurrency(sale.shippingCostSeller)}
                        </td>
                        <td
                          className={`col-margin ${sale.margin >= 0 ? "positive" : "negative"}`}
                        >
                          {formatCurrency(sale.margin)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredSales.length > 0 && (
              <div className="table-footer">
                <div className="pagination-info">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, filteredSales.length)}{" "}
                  de {filteredSales.length} registros
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <span className="material-icons">chevron_left</span>
                    Anterior
                  </button>
                  <span className="pagination-page">Página {currentPage}</span>
                  <button
                    className="pagination-btn"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                    <span className="material-icons">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Charts Section */}
          <div className="charts-section">
            <h3>Representação Gráfica</h3>

            {dailyChartData.length > 0 || modalityChartData.length > 0 ? (
              <div className="charts-grid">
                {/* Sales by Modality */}
                {modalityChartData.length > 0 && (
                  <div className="chart-card">
                    <h4>Vendas por Modalidade</h4>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={modalityChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {modalityChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Daily Revenue */}
                {dailyChartData.length > 0 && (
                  <div className="chart-card">
                    <h4>Faturamento por Dia</h4>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={dailyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(d) => d.split("-").slice(1).join("/")}
                        />
                        <YAxis
                          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          labelFormatter={(d) => `Data: ${d}`}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Faturamento"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.3}
                        />
                        <Area
                          type="monotone"
                          dataKey="margin"
                          name="Margem"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Top Products */}
                {topProductsData.length > 0 && (
                  <div className="chart-card full-width">
                    <h4>Top 10 Produtos por Faturamento</h4>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart
                        data={topProductsData}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={180}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Bar
                          dataKey="revenue"
                          name="Faturamento"
                          fill="#3b82f6"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Margin by Day */}
                {dailyChartData.length > 0 && (
                  <div className="chart-card">
                    <h4>Margem por Dia</h4>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={dailyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(d) => d.split("-").slice(1).join("/")}
                        />
                        <YAxis
                          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="margin"
                          name="Margem"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Quantity by Day */}
                {dailyChartData.length > 0 && (
                  <div className="chart-card">
                    <h4>Quantidade Vendida por Dia</h4>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={dailyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(d) => d.split("-").slice(1).join("/")}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="qty"
                          name="Quantidade"
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <span className="material-icons">show_chart</span>
                <p>Nenhum dado disponível para gráficos</p>
                <small>
                  Sincronize seus pedidos para ver as representações gráficas
                </small>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* SKU Edit Modal */}
      {showSkuModal && (
        <div className="modal-overlay" onClick={() => setShowSkuModal(false)}>
          <div
            className="modal-content sku-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>SKU: {selectedSku}</h2>
              <button
                className="btn-close"
                onClick={() => setShowSkuModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="sku-modal-grid">
                <div className="sku-modal-section">
                  <h4>
                    <span className="material-icons">payments</span>
                    Custos & Impostos
                  </h4>
                  <div className="sku-form-group">
                    <label>
                      Custo (R$)
                      <span
                        className="material-icons"
                        title="Custo unitário do produto"
                      >
                        help
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={skuForm.cost}
                      onChange={(e) =>
                        setSkuForm({ ...skuForm, cost: e.target.value })
                      }
                      className="sku-input highlight"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="sku-form-group">
                    <label>
                      Imposto (%)
                      <span
                        className="material-icons"
                        title="Percentual de imposto sobre a venda"
                      >
                        help
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={skuForm.taxPercent}
                      onChange={(e) =>
                        setSkuForm({ ...skuForm, taxPercent: e.target.value })
                      }
                      className="sku-input"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="sku-form-group">
                    <label>
                      GTIN
                      <span
                        className="material-icons"
                        title="Código de barras do produto"
                      >
                        help
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="GTIN do produto"
                      value={skuForm.gtin}
                      onChange={(e) =>
                        setSkuForm({ ...skuForm, gtin: e.target.value })
                      }
                      className="sku-input"
                    />
                  </div>
                </div>

                <div className="sku-modal-section">
                  <h4>
                    <span className="material-icons">inventory_2</span>
                    Estoque Fixo
                  </h4>
                  <div className="sku-checkbox-group">
                    <input
                      type="checkbox"
                      id="fixedStock"
                      checked={skuForm.fixedStockEnabled}
                      onChange={(e) =>
                        setSkuForm({
                          ...skuForm,
                          fixedStockEnabled: e.target.checked,
                        })
                      }
                    />
                    <span>Sim, quero manter o estoque deste SKU fixo</span>
                  </div>
                  <div className="sku-form-group">
                    <label>
                      Manter estoque em:
                      <span
                        className="material-icons"
                        title="Quantidade fixa de estoque"
                      >
                        help
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={skuForm.fixedStockQuantity}
                      onChange={(e) =>
                        setSkuForm({
                          ...skuForm,
                          fixedStockQuantity: e.target.value,
                        })
                      }
                      className="sku-input"
                      disabled={!skuForm.fixedStockEnabled}
                    />
                  </div>

                  <h4 className="mt-4">
                    <span className="material-icons">sync</span>
                    Sincronização de Estoque
                  </h4>
                  <div className="sku-checkbox-group">
                    <input
                      type="checkbox"
                      id="stockSync"
                      checked={skuForm.stockSyncDisabled}
                      onChange={(e) =>
                        setSkuForm({
                          ...skuForm,
                          stockSyncDisabled: e.target.checked,
                        })
                      }
                    />
                    <span>
                      Não automatizar a sincronização de baixa de estoque neste
                      produto.
                    </span>
                  </div>

                  <div className="sku-warning-box">
                    <span className="material-icons">warning</span>
                    <p>
                      <strong>Atenção:</strong> Você não poderá ter{" "}
                      <strong>Estoque Fixo</strong> e{" "}
                      <strong>Sincronização de Estoque</strong> ativos ao mesmo
                      tempo. Estoque fixo possui prioridade sobre a
                      sincronização de estoque (baixa de estoque na venda).
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-sku btn-sku-primary"
                onClick={() => handleSaveSku(false)}
                disabled={saveSku.isPending}
              >
                {saveSku.isPending ? "Salvando..." : "Salvar"}
              </button>
              <button
                className="btn-sku btn-sku-secondary"
                onClick={() => handleSaveSku(true)}
                disabled={saveSku.isPending}
              >
                Salvar e Fechar
              </button>
              <button
                className="btn-sku btn-sku-ghost"
                onClick={() => setShowSkuModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesDashboard;
