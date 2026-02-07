/**
 * Export Utilities
 * Helper functions for exporting data to CSV and PDF
 */

/**
 * Convert array of objects to CSV string
 */
export const arrayToCSV = (data, headers = null) => {
  if (!data || data.length === 0) return "";

  // Use provided headers or extract from first object
  const headerKeys = headers || Object.keys(data[0]);

  // Create header row
  const csvHeaders = headerKeys.join(",");

  // Create data rows
  const csvRows = data.map((row) => {
    return headerKeys
      .map((key) => {
        const value = row[key];
        // Handle values with commas or quotes
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");
  });

  return [csvHeaders, ...csvRows].join("\n");
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent, filename = "export.csv") => {
  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export financial report to CSV
 */
export const exportFinancialReportToCSV = (
  stats,
  chartData,
  feeBreakdown,
  dateRange,
) => {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `relatorio-financeiro-${timestamp}.csv`;

  let csvContent = "";

  // Header
  csvContent += `Relatório Financeiro\n`;
  csvContent += `Período: ${dateRange.start} até ${dateRange.end}\n`;
  csvContent += `Gerado em: ${new Date().toLocaleString("pt-BR")}\n\n`;

  // Summary Stats
  csvContent += `RESUMO FINANCEIRO\n`;
  csvContent += `Métrica,Valor\n`;
  csvContent += `Total Recebido,R$ ${stats.totalReceived.toFixed(2)}\n`;
  csvContent += `Total em Taxas,R$ ${stats.totalFees.toFixed(2)}\n`;
  csvContent += `Lucro Líquido,R$ ${stats.netProfit.toFixed(2)}\n`;
  csvContent += `Saldo Pendente,R$ ${stats.pendingBalance.toFixed(2)}\n`;
  csvContent += `Reembolsos,R$ ${stats.refunds.toFixed(2)}\n`;
  csvContent += `Chargebacks,R$ ${stats.chargebacks.toFixed(2)}\n\n`;

  // Chart Data
  csvContent += `EVOLUÇÃO DIÁRIA\n`;
  csvContent += `Data,Recebido,Taxas,Líquido\n`;
  chartData.forEach((row) => {
    csvContent += `${row.date},${row.received},${row.fees},${row.net}\n`;
  });
  csvContent += `\n`;

  // Fee Breakdown
  csvContent += `DETALHAMENTO DE TAXAS\n`;
  csvContent += `Categoria,Valor,Percentual\n`;
  feeBreakdown.forEach((fee) => {
    csvContent += `${fee.name},R$ ${fee.value.toFixed(2)},${fee.percentage}%\n`;
  });

  downloadCSV(csvContent, filename);
};

/**
 * Export conciliation report to CSV
 */
export const exportConciliationToCSV = (transactions, stats, dateRange) => {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `conciliacao-${timestamp}.csv`;

  let csvContent = "";

  // Header
  csvContent += `Relatório de Conciliação\n`;
  csvContent += `Período: ${dateRange.start} até ${dateRange.end}\n`;
  csvContent += `Gerado em: ${new Date().toLocaleString("pt-BR")}\n\n`;

  // Summary
  csvContent += `RESUMO\n`;
  csvContent += `Status,Quantidade,Valor Total\n`;
  csvContent += `Pendentes,${stats.pendingCount},R$ ${stats.pendingAmount.toFixed(2)}\n`;
  csvContent += `Conciliadas,${stats.reconciledCount},R$ ${stats.reconciledAmount.toFixed(2)}\n`;
  csvContent += `Divergências,${stats.discrepancyCount},R$ ${stats.discrepancyAmount.toFixed(2)}\n\n`;

  // Transactions
  csvContent += `TRANSAÇÕES\n`;
  csvContent += `Data,Pedido,Produto,Comprador,Tipo,Valor ML,Taxas,Valor Banco,Status\n`;
  transactions.forEach((t) => {
    const date = new Date(t.date).toLocaleString("pt-BR");
    csvContent += `${date},${t.orderId},"${t.product}",${t.buyer},${t.type},${t.mlAmount},${t.fees},${t.bankAmount},${t.status}\n`;
  });

  downloadCSV(csvContent, filename);
};

/**
 * Export analytics report to CSV
 */
export const exportAnalyticsToCSV = (chartsData, timeRange) => {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `analytics-${timestamp}.csv`;

  let csvContent = "";

  // Header
  csvContent += `Relatório de Análises\n`;
  csvContent += `Período: ${timeRange}\n`;
  csvContent += `Gerado em: ${new Date().toLocaleString("pt-BR")}\n\n`;

  // KPIs
  csvContent += `INDICADORES PRINCIPAIS\n`;
  csvContent += `Métrica,Valor,Variação\n`;
  chartsData.dailyMetrics.forEach((metric) => {
    csvContent += `${metric.metric},${metric.value},${metric.change}\n`;
  });
  csvContent += `\n`;

  // Sales Trend
  csvContent += `TENDÊNCIA DE VENDAS\n`;
  csvContent += `Data,Vendas (R$),Pedidos\n`;
  chartsData.salesTrend.forEach((row) => {
    csvContent += `${row.date},${row.sales},${row.orders}\n`;
  });
  csvContent += `\n`;

  // Top Products
  csvContent += `TOP PRODUTOS\n`;
  csvContent += `Produto,Vendas (R$),Margem (%)\n`;
  chartsData.topProducts.forEach((product) => {
    csvContent += `"${product.name}",${product.sales},${product.margin}\n`;
  });
  csvContent += `\n`;

  // Revenue by Category
  csvContent += `RECEITA POR CATEGORIA\n`;
  csvContent += `Categoria,Receita (R$),Crescimento (%)\n`;
  chartsData.revenueByCategory.forEach((cat) => {
    csvContent += `"${cat.name}",${cat.revenue},${cat.growth}\n`;
  });

  downloadCSV(csvContent, filename);
};

/**
 * Simple PDF export using browser print
 * For more advanced PDF, would need library like jsPDF
 */
export const exportToPDF = () => {
  window.print();
};
