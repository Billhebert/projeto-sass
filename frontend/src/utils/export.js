// Export utilities for reports

/**
 * Export data as CSV file
 */
export const exportToCSV = (data, filename = 'export') => {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  const csvRows = []
  
  // Add header row
  csvRows.push(headers.join(','))
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value ?? '').replace(/"/g, '""')
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
        ? `"${escaped}"`
        : escaped
    })
    csvRows.push(values.join(','))
  }
  
  // Create blob and download
  const csvContent = csvRows.join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Export data as JSON file
 */
export const exportToJSON = (data, filename = 'export') => {
  if (!data) {
    console.warn('No data to export')
    return
  }

  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  downloadBlob(blob, `${filename}.json`)
}

/**
 * Export HTML table to PDF using print
 */
export const exportToPDF = (title, data, columns) => {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Create print window
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Por favor, permita pop-ups para exportar PDF')
    return
  }

  // Generate HTML table
  const tableRows = data.map(row => {
    const cells = columns.map(col => `<td style="padding: 8px; border: 1px solid #ddd;">${formatValue(row[col.key], col.format)}</td>`)
    return `<tr>${cells.join('')}</tr>`
  }).join('')

  const tableHeaders = columns.map(col => 
    `<th style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">${col.label}</th>`
  ).join('')

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
      <p style="color: #666; margin-bottom: 20px;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
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
  `

  printWindow.document.write(html)
  printWindow.document.close()
}

/**
 * Helper to download blob
 */
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format value based on type
 */
const formatValue = (value, format) => {
  if (value === null || value === undefined) return '-'
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    case 'number':
      return new Intl.NumberFormat('pt-BR').format(value)
    case 'percent':
      return `${value}%`
    case 'date':
      return new Date(value).toLocaleDateString('pt-BR')
    default:
      return String(value)
  }
}

/**
 * Prepare products data for export
 */
export const prepareProductsForExport = (products) => {
  return products.map(p => ({
    'ID ML': p.mlProductId || '',
    'Título': p.title || '',
    'Preço': p.price || 0,
    'Estoque': p.quantity || 0,
    'Vendas': p.salesCount || 0,
    'Categoria': p.category?.categoryName || '',
    'Status': p.status || '',
    'URL': p.permalinkUrl || '',
  }))
}

/**
 * Prepare stats summary for export
 */
export const prepareStatsForExport = (stats, accountName) => {
  return {
    'Conta': accountName,
    'Data do Relatório': new Date().toLocaleDateString('pt-BR'),
    'Total de Produtos': stats.products?.total || 0,
    'Produtos Ativos': stats.products?.active || 0,
    'Produtos Pausados': stats.products?.paused || 0,
    'Estoque Baixo': stats.products?.lowStock || 0,
    'Sem Estoque': stats.products?.outOfStock || 0,
    'Total de Vendas': stats.sales || 0,
    'Total de Visualizações': stats.views || 0,
    'Total de Perguntas': stats.questions || 0,
    'Valor Estimado em Estoque': stats.estimatedValue || 0,
  }
}

export default {
  exportToCSV,
  exportToJSON,
  exportToPDF,
  prepareProductsForExport,
  prepareStatsForExport,
}
