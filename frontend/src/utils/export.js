/**
 * Export Utilities - Sistema unificado de exportação
 * Suporta CSV, JSON e PDF para diversos tipos de relatórios
 */

import logger from "./logger";

/**
 * Helper para download de blob
 */
const downloadBlob = (blob, filename) => {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logger.info(`Arquivo ${filename} baixado com sucesso`);
  } catch (error) {
    logger.error("Erro ao baixar arquivo:", error);
    throw error;
  }
};

/**
 * Formata valor baseado no tipo
 */
const formatValue = (value, format) => {
  if (value === null || value === undefined) return "-";

  switch (format) {
    case "currency":
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    case "number":
      return new Intl.NumberFormat("pt-BR").format(value);
    case "percent":
      return `${value}%`;
    case "date":
      return new Date(value).toLocaleDateString("pt-BR");
    case "datetime":
      return new Date(value).toLocaleString("pt-BR");
    default:
      return String(value);
  }
};

/**
 * Converte array de objetos para string CSV
 */
export const arrayToCSV = (data, headers = null) => {
  if (!data || data.length === 0) {
    logger.warn("Nenhum dado para converter em CSV");
    return "";
  }

  // Usa headers fornecidos ou extrai do primeiro objeto
  const headerKeys = headers || Object.keys(data[0]);

  // Cria linha de cabeçalho
  const csvHeaders = headerKeys.join(",");

  // Cria linhas de dados
  const csvRows = data.map((row) => {
    return headerKeys
      .map((key) => {
        const value = row[key];
        // Trata valores com vírgulas ou aspas
        const stringValue = String(value ?? "");
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",");
  });

  return [csvHeaders, ...csvRows].join("\n");
};

/**
 * Baixa conteúdo CSV
 */
export const downloadCSV = (csvContent, filename = "export.csv") => {
  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, filename);
};

/**
 * Exporta dados para CSV (função genérica)
 */
export const exportToCSV = (data, filename = "export", headers = null) => {
  if (!data || data.length === 0) {
    logger.warn("Nenhum dado para exportar");
    return;
  }

  const csvContent = arrayToCSV(data, headers);
  downloadCSV(csvContent, `${filename}.csv`);
};

/**
 * Exporta dados para JSON
 */
export const exportToJSON = (data, filename = "export") => {
  if (!data) {
    logger.warn("Nenhum dado para exportar");
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], {
    type: "application/json;charset=utf-8;",
  });
  downloadBlob(blob, `${filename}.json`);
};

/**
 * Exporta tabela HTML para PDF usando print
 */
export const exportTableToPDF = (title, data, columns) => {
  if (!data || data.length === 0) {
    logger.warn("Nenhum dado para exportar");
    return;
  }

  // Cria janela de impressão
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Por favor, permita pop-ups para exportar PDF");
    return;
  }

  // Gera linhas da tabela
  const tableRows = data
    .map((row) => {
      const cells = columns.map(
        (col) =>
          `<td style="padding: 8px; border: 1px solid #ddd;">${formatValue(row[col.key], col.format)}</td>`,
      );
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");

  const tableHeaders = columns
    .map(
      (col) =>
        `<th style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">${col.label}</th>`,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { text-align: left; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p style="color: #666; margin-bottom: 20px;">Gerado em: ${new Date().toLocaleString("pt-BR")}</p>
      <table>
        <thead>
          <tr>${tableHeaders}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div class="footer">
        <p>Total de registros: ${data.length}</p>
      </div>
      <div class="no-print" style="margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #0066cc; color: white; border: none; cursor: pointer; border-radius: 4px;">
          Imprimir / Salvar como PDF
        </button>
        <button onclick="window.close()" style="padding: 10px 20px; margin-left: 10px; background: #666; color: white; border: none; cursor: pointer; border-radius: 4px;">
          Fechar
        </button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Exporta usando print simples
 */
export const exportToPDF = () => {
  window.print();
};

// ========================================
// EXPORTAÇÕES ESPECIALIZADAS
// ========================================

/**
 * Exporta relatório financeiro para CSV
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

  // Cabeçalho
  csvContent += `Relatório Financeiro\n`;
  csvContent += `Período: ${dateRange.start} até ${dateRange.end}\n`;
  csvContent += `Gerado em: ${new Date().toLocaleString("pt-BR")}\n\n`;

  // Resumo Financeiro
  csvContent += `RESUMO FINANCEIRO\n`;
  csvContent += `Métrica,Valor\n`;
  csvContent += `Total Recebido,R$ ${stats.totalReceived.toFixed(2)}\n`;
  csvContent += `Total em Taxas,R$ ${stats.totalFees.toFixed(2)}\n`;
  csvContent += `Lucro Líquido,R$ ${stats.netProfit.toFixed(2)}\n`;
  csvContent += `Saldo Pendente,R$ ${stats.pendingBalance.toFixed(2)}\n`;
  csvContent += `Reembolsos,R$ ${stats.refunds.toFixed(2)}\n`;
  csvContent += `Chargebacks,R$ ${stats.chargebacks.toFixed(2)}\n\n`;

  // Evolução Diária
  csvContent += `EVOLUÇÃO DIÁRIA\n`;
  csvContent += `Data,Recebido,Taxas,Líquido\n`;
  chartData.forEach((row) => {
    csvContent += `${row.date},${row.received},${row.fees},${row.net}\n`;
  });
  csvContent += `\n`;

  // Detalhamento de Taxas
  csvContent += `DETALHAMENTO DE TAXAS\n`;
  csvContent += `Categoria,Valor,Percentual\n`;
  feeBreakdown.forEach((fee) => {
    csvContent += `${fee.name},R$ ${fee.value.toFixed(2)},${fee.percentage}%\n`;
  });

  downloadCSV(csvContent, filename);
};

/**
 * Exporta relatório de conciliação para CSV
 */
export const exportConciliationToCSV = (transactions, stats, dateRange) => {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `conciliacao-${timestamp}.csv`;

  let csvContent = "";

  // Cabeçalho
  csvContent += `Relatório de Conciliação\n`;
  csvContent += `Período: ${dateRange.start} até ${dateRange.end}\n`;
  csvContent += `Gerado em: ${new Date().toLocaleString("pt-BR")}\n\n`;

  // Resumo
  csvContent += `RESUMO\n`;
  csvContent += `Status,Quantidade,Valor Total\n`;
  csvContent += `Pendentes,${stats.pendingCount},R$ ${stats.pendingAmount.toFixed(2)}\n`;
  csvContent += `Conciliadas,${stats.reconciledCount},R$ ${stats.reconciledAmount.toFixed(2)}\n`;
  csvContent += `Divergências,${stats.discrepancyCount},R$ ${stats.discrepancyAmount.toFixed(2)}\n\n`;

  // Transações
  csvContent += `TRANSAÇÕES\n`;
  csvContent += `Data,Pedido,Produto,Comprador,Tipo,Valor ML,Taxas,Valor Banco,Status\n`;
  transactions.forEach((t) => {
    const date = new Date(t.date).toLocaleString("pt-BR");
    csvContent += `${date},${t.orderId},"${t.product}",${t.buyer},${t.type},${t.mlAmount},${t.fees},${t.bankAmount},${t.status}\n`;
  });

  downloadCSV(csvContent, filename);
};

/**
 * Exporta relatório de analytics para CSV
 */
export const exportAnalyticsToCSV = (chartsData, timeRange) => {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `analytics-${timestamp}.csv`;

  let csvContent = "";

  // Cabeçalho
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

  // Tendência de Vendas
  csvContent += `TENDÊNCIA DE VENDAS\n`;
  csvContent += `Data,Vendas (R$),Pedidos\n`;
  chartsData.salesTrend.forEach((row) => {
    csvContent += `${row.date},${row.sales},${row.orders}\n`;
  });
  csvContent += `\n`;

  // Top Produtos
  csvContent += `TOP PRODUTOS\n`;
  csvContent += `Produto,Vendas (R$),Margem (%)\n`;
  chartsData.topProducts.forEach((product) => {
    csvContent += `"${product.name}",${product.sales},${product.margin}\n`;
  });
  csvContent += `\n`;

  // Receita por Categoria
  csvContent += `RECEITA POR CATEGORIA\n`;
  csvContent += `Categoria,Receita (R$),Crescimento (%)\n`;
  chartsData.revenueByCategory.forEach((cat) => {
    csvContent += `"${cat.name}",${cat.revenue},${cat.growth}\n`;
  });

  downloadCSV(csvContent, filename);
};

/**
 * Prepara produtos para exportação
 */
export const prepareProductsForExport = (products) => {
  return products.map((p) => ({
    "ID ML": p.mlProductId || "",
    Título: p.title || "",
    Preço: p.price || 0,
    Estoque: p.quantity || 0,
    Vendas: p.salesCount || 0,
    Categoria: p.category?.categoryName || "",
    Status: p.status || "",
    URL: p.permalinkUrl || "",
  }));
};

/**
 * Prepara resumo de estatísticas para exportação
 */
export const prepareStatsForExport = (stats, accountName) => {
  return {
    Conta: accountName,
    "Data do Relatório": new Date().toLocaleDateString("pt-BR"),
    "Total de Produtos": stats.products?.total || 0,
    "Produtos Ativos": stats.products?.active || 0,
    "Produtos Pausados": stats.products?.paused || 0,
    "Estoque Baixo": stats.products?.lowStock || 0,
    "Sem Estoque": stats.products?.outOfStock || 0,
    "Total de Vendas": stats.sales || 0,
    "Total de Visualizações": stats.views || 0,
    "Total de Perguntas": stats.questions || 0,
    "Valor Estimado em Estoque": stats.estimatedValue || 0,
  };
};

// Export padrão com todas as funções
export default {
  arrayToCSV,
  downloadCSV,
  exportToCSV,
  exportToJSON,
  exportTableToPDF,
  exportToPDF,
  exportFinancialReportToCSV,
  exportConciliationToCSV,
  exportAnalyticsToCSV,
  prepareProductsForExport,
  prepareStatsForExport,
};
