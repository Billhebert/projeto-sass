import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Advanced PDF export utilities with custom templates
 * Uses jsPDF for PDF generation and jspdf-autotable for tables
 */

// Brand colors
const COLORS = {
  primary: "#2563eb", // Blue
  secondary: "#475569", // Slate gray
  success: "#16a34a", // Green
  danger: "#dc2626", // Red
  warning: "#ea580c", // Orange
  lightGray: "#f1f5f9",
  darkGray: "#334155",
  text: "#1e293b",
};

/**
 * Add header to PDF with logo and title
 */
function addHeader(doc, title, subtitle = null) {
  const pageWidth = doc.internal.pageSize.width;

  // Add brand name/logo (you can replace with actual logo image)
  doc.setFontSize(20);
  doc.setTextColor(COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.text("VENDATA", 20, 20);

  // Add title
  doc.setFontSize(16);
  doc.setTextColor(COLORS.text);
  doc.text(title, 20, 35);

  // Add subtitle if provided
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.secondary);
    doc.text(subtitle, 20, 42);
  }

  // Add date on the right
  doc.setFontSize(10);
  doc.setTextColor(COLORS.secondary);
  doc.setFont("helvetica", "normal");
  const dateStr = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const dateWidth = doc.getTextWidth(dateStr);
  doc.text(dateStr, pageWidth - dateWidth - 20, 20);

  // Add line separator
  doc.setDrawColor(COLORS.lightGray);
  doc.setLineWidth(0.5);
  doc.line(20, 48, pageWidth - 20, 48);

  return 55; // Return Y position for next content
}

/**
 * Add footer to PDF with page number
 */
function addFooter(doc, pageNum, totalPages) {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  doc.setFontSize(8);
  doc.setTextColor(COLORS.secondary);
  doc.setFont("helvetica", "normal");

  // Page number
  const pageText = `Página ${pageNum} de ${totalPages}`;
  const textWidth = doc.getTextWidth(pageText);
  doc.text(pageText, pageWidth - textWidth - 20, pageHeight - 15);

  // Platform info
  doc.text("Gerado por VENDATA - vendata.com.br", 20, pageHeight - 15);

  // Line separator
  doc.setDrawColor(COLORS.lightGray);
  doc.setLineWidth(0.5);
  doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
}

/**
 * Add KPI cards section
 */
function addKPISection(doc, kpis, startY) {
  const pageWidth = doc.internal.pageSize.width;
  const cardWidth = (pageWidth - 60) / 4; // 4 cards with spacing
  let currentY = startY;

  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.text("Indicadores Principais", 20, currentY);
  currentY += 10;

  // Draw KPI cards
  kpis.forEach((kpi, index) => {
    const x = 20 + index * (cardWidth + 5);

    // Card background
    doc.setFillColor(COLORS.lightGray);
    doc.roundedRect(x, currentY, cardWidth, 25, 2, 2, "F");

    // KPI label
    doc.setFontSize(8);
    doc.setTextColor(COLORS.secondary);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.label, x + 5, currentY + 8);

    // KPI value
    doc.setFontSize(14);
    doc.setTextColor(kpi.color || COLORS.primary);
    doc.setFont("helvetica", "bold");
    const valueText = kpi.value.toString();
    doc.text(valueText, x + 5, currentY + 18);
  });

  return currentY + 30;
}

/**
 * Format currency for display
 */
function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Format percentage
 */
function formatPercentage(value) {
  return `${value.toFixed(2)}%`;
}

/**
 * Export Financial Report to PDF with custom template
 */
export function exportFinancialReportToPDF(
  stats,
  chartData,
  feeBreakdown,
  dateRange,
) {
  const doc = new jsPDF();

  // Add header
  const dateRangeStr = dateRange
    ? `${format(new Date(dateRange.from), "dd/MM/yyyy")} - ${format(
        new Date(dateRange.to),
        "dd/MM/yyyy",
      )}`
    : "Todos os períodos";
  let currentY = addHeader(
    doc,
    "Relatório Financeiro",
    `Período: ${dateRangeStr}`,
  );

  // Add KPIs
  const kpis = [
    {
      label: "Receita Total",
      value: formatCurrency(stats.totalRevenue || 0),
      color: COLORS.success,
    },
    {
      label: "Taxas Totais",
      value: formatCurrency(stats.totalFees || 0),
      color: COLORS.danger,
    },
    {
      label: "Lucro Líquido",
      value: formatCurrency(stats.netProfit || 0),
      color: COLORS.primary,
    },
    {
      label: "Margem",
      value: formatPercentage(stats.profitMargin || 0),
      color: COLORS.warning,
    },
  ];

  currentY = addKPISection(doc, kpis, currentY);

  // Add fee breakdown table
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.text("Detalhamento de Taxas", 20, currentY);
  currentY += 5;

  const feeTableData = [
    [
      "Taxa ML/MP",
      formatCurrency(feeBreakdown?.marketplaceFees || 0),
      formatPercentage(feeBreakdown?.marketplacePercentage || 0),
    ],
    [
      "Frete",
      formatCurrency(feeBreakdown?.shippingCost || 0),
      formatPercentage(feeBreakdown?.shippingPercentage || 0),
    ],
    [
      "Total",
      formatCurrency(feeBreakdown?.totalFees || 0),
      formatPercentage(
        (feeBreakdown?.marketplacePercentage || 0) +
          (feeBreakdown?.shippingPercentage || 0),
      ),
    ],
  ];

  doc.autoTable({
    startY: currentY,
    head: [["Tipo de Taxa", "Valor", "% da Receita"]],
    body: feeTableData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: "#ffffff",
      fontSize: 10,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // Add daily evolution table (last 10 days)
  if (chartData && chartData.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.text("Evolução Diária (Últimos 10 dias)", 20, currentY);
    currentY += 5;

    const evolutionData = chartData
      .slice(-10)
      .map((day) => [
        format(new Date(day.date), "dd/MM/yyyy"),
        formatCurrency(day.revenue || 0),
        formatCurrency(day.fees || 0),
        formatCurrency(day.netProfit || 0),
      ]);

    doc.autoTable({
      startY: currentY,
      head: [["Data", "Receita", "Taxas", "Lucro Líquido"]],
      body: evolutionData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: "#ffffff",
        fontSize: 9,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 8,
        cellPadding: 4,
      },
      alternateRowStyles: {
        fillColor: COLORS.lightGray,
      },
    });
  }

  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(doc, i, pageCount);
  }

  // Save PDF
  const filename = `relatorio-financeiro-${format(
    new Date(),
    "yyyy-MM-dd",
  )}.pdf`;
  doc.save(filename);
}

/**
 * Export Conciliation Report to PDF
 */
export function exportConciliationToPDF(transactions, stats, dateRange) {
  const doc = new jsPDF();

  // Add header
  const dateRangeStr = dateRange
    ? `${format(new Date(dateRange.from), "dd/MM/yyyy")} - ${format(
        new Date(dateRange.to),
        "dd/MM/yyyy",
      )}`
    : "Todos os períodos";
  let currentY = addHeader(
    doc,
    "Relatório de Conciliação",
    `Período: ${dateRangeStr}`,
  );

  // Add KPIs
  const kpis = [
    {
      label: "Total Transações",
      value: stats?.total || 0,
      color: COLORS.primary,
    },
    {
      label: "Conciliadas",
      value: stats?.conciliated || 0,
      color: COLORS.success,
    },
    {
      label: "Pendentes",
      value: stats?.pending || 0,
      color: COLORS.warning,
    },
    {
      label: "Divergentes",
      value: stats?.divergent || 0,
      color: COLORS.danger,
    },
  ];

  currentY = addKPISection(doc, kpis, currentY);

  // Add summary by status table
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo por Status", 20, currentY);
  currentY += 5;

  const summaryData = [
    [
      "Conciliadas",
      stats?.conciliated || 0,
      formatCurrency(stats?.conciliatedValue || 0),
    ],
    [
      "Pendentes",
      stats?.pending || 0,
      formatCurrency(stats?.pendingValue || 0),
    ],
    [
      "Divergentes",
      stats?.divergent || 0,
      formatCurrency(stats?.divergentValue || 0),
    ],
    ["Total", stats?.total || 0, formatCurrency(stats?.totalValue || 0)],
  ];

  doc.autoTable({
    startY: currentY,
    head: [["Status", "Quantidade", "Valor Total"]],
    body: summaryData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: "#ffffff",
      fontSize: 10,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // Add transactions table (first 50)
  if (transactions && transactions.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.text("Transações (Primeiras 50)", 20, currentY);
    currentY += 5;

    const transactionData = transactions
      .slice(0, 50)
      .map((tx) => [
        format(new Date(tx.date), "dd/MM/yy"),
        tx.orderId?.substring(0, 15) || "-",
        tx.status || "-",
        formatCurrency(tx.amount || 0),
      ]);

    doc.autoTable({
      startY: currentY,
      head: [["Data", "ID Pedido", "Status", "Valor"]],
      body: transactionData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: "#ffffff",
        fontSize: 9,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
      },
      alternateRowStyles: {
        fillColor: COLORS.lightGray,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35, halign: "right" },
      },
    });
  }

  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(doc, i, pageCount);
  }

  // Save PDF
  const filename = `conciliacao-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}

/**
 * Export Analytics to PDF
 */
export function exportAnalyticsToPDF(chartsData, timeRange) {
  const doc = new jsPDF();

  // Add header
  let currentY = addHeader(
    doc,
    "Relatório de Analytics",
    `Período: ${timeRange || "Todos os períodos"}`,
  );

  // Add KPIs if available
  if (chartsData.kpis) {
    const kpis = [
      {
        label: "Pedidos",
        value: chartsData.kpis.totalOrders || 0,
        color: COLORS.primary,
      },
      {
        label: "Receita",
        value: formatCurrency(chartsData.kpis.totalRevenue || 0),
        color: COLORS.success,
      },
      {
        label: "Ticket Médio",
        value: formatCurrency(chartsData.kpis.avgOrderValue || 0),
        color: COLORS.warning,
      },
      {
        label: "Taxa Conversão",
        value: formatPercentage(chartsData.kpis.conversionRate || 0),
        color: COLORS.primary,
      },
    ];

    currentY = addKPISection(doc, kpis, currentY);
  }

  // Add top products table
  if (chartsData.products && chartsData.products.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.text("Top 10 Produtos", 20, currentY);
    currentY += 5;

    const productsData = chartsData.products
      .slice(0, 10)
      .map((product) => [
        product.name?.substring(0, 40) || "-",
        product.quantity || 0,
        formatCurrency(product.revenue || 0),
        formatPercentage(product.margin || 0),
      ]);

    doc.autoTable({
      startY: currentY,
      head: [["Produto", "Qtd", "Receita", "Margem"]],
      body: productsData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: "#ffffff",
        fontSize: 9,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: "linebreak",
      },
      alternateRowStyles: {
        fillColor: COLORS.lightGray,
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 25, halign: "right" },
      },
    });

    currentY = doc.lastAutoTable.finalY + 10;
  }

  // Add top categories table
  if (chartsData.categories && chartsData.categories.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.text("Top Categorias", 20, currentY);
    currentY += 5;

    const categoriesData = chartsData.categories
      .slice(0, 10)
      .map((cat) => [
        cat.name || "-",
        cat.quantity || 0,
        formatCurrency(cat.revenue || 0),
      ]);

    doc.autoTable({
      startY: currentY,
      head: [["Categoria", "Qtd Vendas", "Receita"]],
      body: categoriesData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: "#ffffff",
        fontSize: 9,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 8,
        cellPadding: 4,
      },
      alternateRowStyles: {
        fillColor: COLORS.lightGray,
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 30, halign: "center" },
        2: { cellWidth: 45, halign: "right" },
      },
    });
  }

  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(doc, i, pageCount);
  }

  // Save PDF
  const filename = `analytics-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}
