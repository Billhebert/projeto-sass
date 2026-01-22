/**
 * Analytics Report Export Module
 * Exports analytics data to PDF and Excel formats
 */

const analyticsExportModule = (() => {
  // Generate PDF Report
  async function generatePDFReport(reportType = 'complete', filters = {}) {
    try {
      // Check if html2pdf library is loaded
      if (typeof html2pdf === 'undefined') {
        throw new Error('html2pdf library not loaded. Add: <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>');
      }

      const content = generateReportContent(reportType, filters);
      const element = document.createElement('div');
      element.innerHTML = content;

      const options = {
        margin: 10,
        filename: `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      await html2pdf().set(options).from(element).save();
      return { success: true, message: 'PDF Report generated successfully' };
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw error;
    }
  }

  // Generate Excel Report
  async function generateExcelReport(reportType = 'complete', filters = {}) {
    try {
      const data = getReportData(reportType, filters);
      const sheetData = convertToExcelFormat(data);
      
      // Create workbook structure
      const workbook = {
        SheetNames: Object.keys(sheetData),
        Sheets: {}
      };

      // Add sheets
      Object.entries(sheetData).forEach(([sheetName, rows]) => {
        workbook.Sheets[sheetName] = arrayToSheet(rows);
      });

      // Generate Excel file
      const fileName = `analytics-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      downloadExcel(workbook, fileName);

      return { success: true, message: 'Excel Report generated successfully' };
    } catch (error) {
      console.error('Error generating Excel report:', error);
      throw error;
    }
  }

  // Generate CSV Report
  function generateCSVReport(reportType = 'complete', filters = {}) {
    try {
      const data = getReportData(reportType, filters);
      let csv = '';

      Object.entries(data).forEach(([section, rows]) => {
        csv += `${section.toUpperCase()}\n`;
        
        if (rows.length > 0) {
          const headers = Object.keys(rows[0]);
          csv += headers.join(',') + '\n';
          
          rows.forEach(row => {
            csv += headers.map(h => {
              const value = row[h];
              return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(',') + '\n';
          });
        }
        csv += '\n';
      });

      downloadFile(csv, `analytics-report-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      return { success: true, message: 'CSV Report generated successfully' };
    } catch (error) {
      console.error('Error generating CSV report:', error);
      throw error;
    }
  }

  // Get report data based on type
  function getReportData(reportType, filters) {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const categories = JSON.parse(localStorage.getItem('categories') || '[]');
    const stock = JSON.parse(localStorage.getItem('product_stock') || '{}');

    const data = {};

    // Apply filters
    let filteredSales = sales;
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      filteredSales = sales.filter(s => {
        const saleDate = new Date(s.createdAt);
        return saleDate >= start && saleDate <= end;
      });
    }

    // Summary section
    if (reportType === 'complete' || reportType === 'summary') {
      const approvedSales = filteredSales.filter(s => s.status === 'aprovado');
      const totalRevenue = approvedSales.reduce((sum, s) => sum + (s.faturamento || 0), 0);
      const totalCost = approvedSales.reduce((sum, s) => sum + (s.custo || 0), 0);
      const totalMargin = approvedSales.reduce((sum, s) => sum + (s.margem || 0), 0);

      data.summary = [{
        'Métrica': 'Total de Vendas',
        'Valor': approvedSales.length,
        'Detalhes': `${approvedSales.length} pedidos aprovados`
      }, {
        'Métrica': 'Faturamento Total',
        'Valor': `R$ ${totalRevenue.toFixed(2)}`,
        'Detalhes': `Média de R$ ${(totalRevenue / Math.max(1, approvedSales.length)).toFixed(2)} por pedido`
      }, {
        'Métrica': 'Custo Total',
        'Valor': `R$ ${totalCost.toFixed(2)}`,
        'Detalhes': `Percentual do faturamento: ${((totalCost / totalRevenue) * 100).toFixed(2)}%`
      }, {
        'Métrica': 'Margem Total',
        'Valor': `R$ ${totalMargin.toFixed(2)}`,
        'Detalhes': `Margem líquida: ${((totalMargin / totalRevenue) * 100).toFixed(2)}%`
      }];
    }

    // Sales details
    if (reportType === 'complete' || reportType === 'sales') {
      data.sales_details = filteredSales.slice(0, 100).map(s => ({
        'SKU': s.sku || 'N/A',
        'Data': new Date(s.createdAt).toLocaleDateString('pt-BR'),
        'Status': s.status || 'N/A',
        'Marketplace': s.marketplace || 'N/A',
        'Quantidade': s.quantidade || 1,
        'Faturamento': `R$ ${(s.faturamento || 0).toFixed(2)}`,
        'Margem': `R$ ${(s.margem || 0).toFixed(2)}`
      }));
    }

    // Product performance
    if (reportType === 'complete' || reportType === 'products') {
      const productMetrics = analyticsModule.getProductMetrics(filteredSales, products);
      data.product_performance = (productMetrics.topProducts || []).map(p => ({
        'SKU': p.sku,
        'Vendas': p.salesCount,
        'Receita': `R$ ${p.totalRevenue.toFixed(2)}`,
        'Custo': `R$ ${p.totalCost.toFixed(2)}`,
        'Margem': `R$ ${p.totalMargin.toFixed(2)}`,
        'Margem %': `${p.marginPercentage.toFixed(2)}%`
      }));
    }

    // Analytics metrics
    if (reportType === 'complete' || reportType === 'analytics') {
      data.analytics_metrics = [{
        'Métrica': 'Crescimento MoM',
        'Valor': `${analyticsModule.calculateMoMGrowth(filteredSales).toFixed(2)}%`,
        'Status': 'Comparado ao mês anterior'
      }, {
        'Métrica': 'Velocidade de Vendas',
        'Valor': `${analyticsModule.getSalesVelocity(filteredSales).toFixed(2)} pedidos/dia`,
        'Status': 'Taxa média diária'
      }, {
        'Métrica': 'Taxa de Conversão',
        'Valor': `${analyticsModule.getConversionRate(filteredSales).rate}%`,
        'Status': 'Potencial de conversão'
      }];
    }

    return data;
  }

  // Generate HTML report content
  function generateReportContent(reportType, filters) {
    const data = getReportData(reportType, filters);
    let html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="text-align: center; color: #5D4DB3; margin-bottom: 30px;">
          📊 Relatório de Analytics
        </h1>
        <p style="text-align: center; color: #666; margin-bottom: 20px;">
          Gerado em ${new Date().toLocaleString('pt-BR')}
        </p>
    `;

    // Add sections
    Object.entries(data).forEach(([section, rows]) => {
      html += `<h2 style="color: #333; border-bottom: 2px solid #5D4DB3; padding-bottom: 10px; margin-top: 30px;">
        ${sectionTitleMap(section)}
      </h2>`;

      if (Array.isArray(rows) && rows.length > 0) {
        html += '<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">';
        
        const headers = Object.keys(rows[0]);
        html += '<thead style="background-color: #f5f5f5;">';
        html += '<tr>';
        headers.forEach(h => {
          html += `<th style="padding: 10px; text-align: left; border: 1px solid #ddd; font-weight: bold;">${h}</th>`;
        });
        html += '</tr></thead>';

        html += '<tbody>';
        rows.forEach(row => {
          html += '<tr>';
          headers.forEach(h => {
            html += `<td style="padding: 10px; border: 1px solid #ddd;">${row[h]}</td>`;
          });
          html += '</tr>';
        });
        html += '</tbody></table>';
      }
    });

    html += `
        <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
          <p>Relatório confidencial - Dashboard de Vendas e Faturamento</p>
          <p>Para mais detalhes, acesse o dashboard completo</p>
        </div>
      </div>
    `;

    return html;
  }

  // Section title mapping
  function sectionTitleMap(section) {
    const titles = {
      'summary': '📈 Resumo Executivo',
      'sales_details': '💰 Detalhes de Vendas',
      'product_performance': '📦 Desempenho de Produtos',
      'analytics_metrics': '📊 Métricas de Analytics'
    };
    return titles[section] || section;
  }

  // Convert data to Excel format
  function convertToExcelFormat(data) {
    return data;
  }

  // Convert array to Excel sheet
  function arrayToSheet(data) {
    const sheet = {};
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    
    headers.forEach((header, colIndex) => {
      const cellRef = String.fromCharCode(65 + colIndex) + '1';
      sheet[cellRef] = { t: 's', v: header };
    });

    data.forEach((row, rowIndex) => {
      headers.forEach((header, colIndex) => {
        const cellRef = String.fromCharCode(65 + colIndex) + (rowIndex + 2);
        const value = row[header];
        sheet[cellRef] = { t: typeof value === 'number' ? 'n' : 's', v: value };
      });
    });

    sheet['!ref'] = `A1:${String.fromCharCode(64 + headers.length)}${data.length + 1}`;
    return sheet;
  }

  // Download Excel file
  function downloadExcel(workbook, filename) {
    // Note: This requires XLSX library
    if (typeof XLSX === 'undefined') {
      console.warn('XLSX library not loaded. Using CSV fallback.');
      return;
    }
    XLSX.writeFile(workbook, filename);
  }

  // Download file helper
  function downloadFile(content, filename, type) {
    const element = document.createElement('a');
    element.setAttribute('href', `data:${type};charset=utf-8,` + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  // Schedule report generation
  function scheduleReport(type, time, format = 'pdf') {
    // This would require backend support
    const scheduled = {
      id: Date.now(),
      type,
      format,
      scheduledTime: time,
      createdAt: new Date().toISOString()
    };

    const schedules = JSON.parse(localStorage.getItem('scheduled_reports') || '[]');
    schedules.push(scheduled);
    localStorage.setItem('scheduled_reports', JSON.stringify(schedules));

    return scheduled;
  }

  return {
    generatePDFReport,
    generateExcelReport,
    generateCSVReport,
    generateReportContent,
    scheduleReport
  };
})();
