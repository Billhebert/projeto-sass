// Reports Module with PDF Generation

const reportModule = (() => {
  let charts = {};

  // Initialize
  function init() {
    setDefaultDates();
  }

  // Set default dates (last 30 days)
  function setDefaultDates() {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('salesStartDate').valueAsDate = startDate;
    document.getElementById('salesEndDate').valueAsDate = endDate;
  }

  // Generate Sales Report
  function generateSalesReport() {
    const sales = JSON.parse(localStorage.getItem('sales')) || [];
    const startDate = new Date(document.getElementById('salesStartDate').value);
    const endDate = new Date(document.getElementById('salesEndDate').value);
    const marketplace = document.getElementById('salesMarketplace').value;

    // Filter sales
    let filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const matchesDate = saleDate >= startDate && saleDate <= endDate;
      const matchesMarketplace = !marketplace || sale.marketplace === marketplace;
      return matchesDate && matchesMarketplace;
    });

    // Calculate summary
    const totalSales = filteredSales.length;
    const totalQuantity = filteredSales.reduce((sum, s) => sum + s.quantity, 0);
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    document.getElementById('salesCount').textContent = totalSales;
    document.getElementById('totalQuantity').textContent = totalQuantity;
    document.getElementById('totalRevenue').textContent = 'R$ ' + totalRevenue.toFixed(2);
    document.getElementById('avgTicket').textContent = 'R$ ' + avgTicket.toFixed(2);

    // Render sales table
    renderSalesTable(filteredSales);

    // Create charts
    createSalesCharts(filteredSales);
  }

  // Render sales table
  function renderSalesTable(sales) {
    const tbody = document.getElementById('salesReportTable');
    tbody.innerHTML = sales.map(sale => `
      <tr>
        <td><strong>${sale.sku}</strong></td>
        <td>${sale.quantity}</td>
        <td>R$ ${sale.unitPrice.toFixed(2)}</td>
        <td>R$ ${sale.total.toFixed(2)}</td>
        <td>${getMarketplaceLabel(sale.marketplace)}</td>
        <td>${getPaymentLabel(sale.paymentMethod)}</td>
        <td>${sale.createdAt}</td>
      </tr>
    `).join('');
  }

  // Create sales charts
  function createSalesCharts(sales) {
    // Sales by Marketplace
    const marketplaceData = {};
    sales.forEach(sale => {
      marketplaceData[sale.marketplace] = (marketplaceData[sale.marketplace] || 0) + sale.total;
    });

    const marketplaceCtx = document.getElementById('salesByMarketplaceChart').getContext('2d');
    if (charts.marketplace) charts.marketplace.destroy();
    charts.marketplace = new Chart(marketplaceCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(marketplaceData).map(m => getMarketplaceLabel(m)),
        datasets: [{
          data: Object.values(marketplaceData),
          backgroundColor: ['#667eea', '#f093fb', '#fa709a', '#fee140', '#43e97b']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });

    // Sales by Payment Method
    const paymentData = {};
    sales.forEach(sale => {
      paymentData[sale.paymentMethod] = (paymentData[sale.paymentMethod] || 0) + sale.total;
    });

    const paymentCtx = document.getElementById('salesByPaymentChart').getContext('2d');
    if (charts.payment) charts.payment.destroy();
    charts.payment = new Chart(paymentCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(paymentData).map(p => getPaymentLabel(p)),
        datasets: [{
          data: Object.values(paymentData),
          backgroundColor: ['#667eea', '#f093fb', '#fa709a', '#fee140', '#43e97b', '#4facfe']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  // Generate Products Report
  function generateProductsReport() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const categories = JSON.parse(localStorage.getItem('categories')) || [];
    const stockData = JSON.parse(localStorage.getItem('product_stock')) || {};

    document.getElementById('prodCount').textContent = products.length;
    document.getElementById('prodCategories').textContent = categories.length;
    
    const totalStock = Object.values(stockData).reduce((sum, qty) => sum + qty, 0);
    document.getElementById('totalStock').textContent = totalStock;

    // Render products table
    const tbody = document.getElementById('productsReportTable');
    tbody.innerHTML = products.map(product => `
      <tr>
        <td><strong>${product.sku}</strong></td>
        <td>${stockData[product.sku] || 0}</td>
        <td><span class="status-badge status-${product.status}">${product.status === 'ativo' ? 'Ativo' : 'Inativo'}</span></td>
        <td>${product.dataCadastro}</td>
      </tr>
    `).join('');
  }

  // Generate Inventory Report
  function generateInventoryReport() {
    const movements = JSON.parse(localStorage.getItem('stock_movements')) || [];
    const skuFilter = document.getElementById('inventorySKU').value.toLowerCase();

    let filteredMovements = movements;
    if (skuFilter) {
      filteredMovements = movements.filter(m => m.sku.toLowerCase().includes(skuFilter));
    }

    // Render inventory table
    const tbody = document.getElementById('inventoryReportTable');
    tbody.innerHTML = filteredMovements.reverse().map(movement => `
      <tr>
        <td><strong>${movement.sku}</strong></td>
        <td>${movement.type}</td>
        <td>${movement.quantity}</td>
        <td>${movement.previousStock}</td>
        <td>${movement.newStock}</td>
        <td>${movement.timestamp}</td>
      </tr>
    `).join('');
  }

  // Generate Financial Report
  function generateFinancialReport() {
    const sales = JSON.parse(localStorage.getItem('sales')) || [];

    if (sales.length === 0) {
      document.getElementById('finTotalRevenue').textContent = 'R$ 0,00';
      document.getElementById('finTotalDiscount').textContent = 'R$ 0,00';
      document.getElementById('finAvgMargin').textContent = '0%';
      document.getElementById('finAvgTicket').textContent = 'R$ 0,00';
      return;
    }

    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalDiscount = sales.reduce((sum, s) => sum + (s.discountValue || 0), 0);
    const avgTicket = totalRevenue / sales.length;

    document.getElementById('finTotalRevenue').textContent = 'R$ ' + totalRevenue.toFixed(2);
    document.getElementById('finTotalDiscount').textContent = 'R$ ' + totalDiscount.toFixed(2);
    document.getElementById('finAvgTicket').textContent = 'R$ ' + avgTicket.toFixed(2);

    // Calculate daily revenue
    const dailyData = {};
    sales.forEach(sale => {
      const dateStr = sale.createdAt.split(' ')[0];
      dailyData[dateStr] = (dailyData[dateStr] || 0) + sale.total;
    });

    // Create financial chart
    const ctx = document.getElementById('finRevenueChart').getContext('2d');
    if (charts.financial) charts.financial.destroy();
    charts.financial = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Object.keys(dailyData),
        datasets: [{
          label: 'Receita Diária',
          data: Object.values(dailyData),
          borderColor: '#5D4DB3',
          backgroundColor: 'rgba(93, 77, 179, 0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#5D4DB3'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: value => 'R$ ' + value.toFixed(0) }
          }
        }
      }
    });

    // Render financial table
    const tbody = document.getElementById('financialReportTable');
    tbody.innerHTML = Object.keys(dailyData).map(date => {
      const daySales = sales.filter(s => s.createdAt.split(' ')[0] === date);
      const dayRevenue = dailyData[date];
      const dayDiscount = daySales.reduce((sum, s) => sum + (s.discountValue || 0), 0);
      const dayNet = dayRevenue - dayDiscount;
      const dayAvgTicket = dayRevenue / daySales.length;

      return `
        <tr>
          <td>${date}</td>
          <td>${daySales.length}</td>
          <td>R$ ${dayRevenue.toFixed(2)}</td>
          <td>R$ ${dayDiscount.toFixed(2)}</td>
          <td>R$ ${dayNet.toFixed(2)}</td>
          <td>R$ ${dayAvgTicket.toFixed(2)}</td>
        </tr>
      `;
    }).join('');
  }

  // Export to PDF
  function exportPDF(reportType) {
    const element = document.getElementById(reportType + '-report');
    const opt = {
      margin: 10,
      filename: `relatorio-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
    };
    html2pdf().set(opt).from(element).save();
  }

  // Export to CSV
  function exportCSV(reportType) {
    let csv = '';
    let filename = '';

    if (reportType === 'products') {
      const products = JSON.parse(localStorage.getItem('products')) || [];
      const stockData = JSON.parse(localStorage.getItem('product_stock')) || {};

      csv = 'SKU,Estoque,Status,Data Cadastro\n';
      products.forEach(p => {
        csv += `${p.sku},${stockData[p.sku] || 0},${p.status},${p.dataCadastro}\n`;
      });
      filename = `produtos-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (reportType === 'inventory') {
      const movements = JSON.parse(localStorage.getItem('stock_movements')) || [];
      csv = 'SKU,Tipo,Quantidade,Estoque Anterior,Novo Estoque,Data/Hora\n';
      movements.forEach(m => {
        csv += `${m.sku},${m.type},${m.quantity},${m.previousStock},${m.newStock},${m.timestamp}\n`;
      });
      filename = `estoque-${new Date().toISOString().slice(0, 10)}.csv`;
    }

    if (csv) {
      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    }
  }

  // Helper: Get marketplace label
  function getMarketplaceLabel(marketplace) {
    const map = {
      'mercado-livre': '🔵 Mercado Livre',
      'b2b-brasil': '🏢 B2B Brasil',
      'amazon': '🔶 Amazon',
      'shopee': '🛍️ Shopee',
      'loja-propria': '🏪 Loja Própria'
    };
    return map[marketplace] || marketplace;
  }

  // Helper: Get payment label
  function getPaymentLabel(method) {
    const map = {
      'cartao-credito': '💳 Crédito',
      'cartao-debito': '💳 Débito',
      'boleto': '📄 Boleto',
      'pix': '📱 PIX',
      'dinheiro': '💵 Dinheiro',
      'cheque': '📋 Cheque'
    };
    return map[method] || method;
  }

  return {
    init,
    generateSalesReport,
    generateProductsReport,
    generateInventoryReport,
    generateFinancialReport,
    exportPDF,
    exportCSV
  };
})();
