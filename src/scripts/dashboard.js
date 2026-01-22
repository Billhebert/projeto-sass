// ======================
// API CONFIG
// ======================

const API_CONFIG = {
  baseURL: process.env.API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('authToken') || null;
}

// Add token to headers if available
function getHeaders() {
  const headers = { ...API_CONFIG.headers };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ======================
// API SERVICE
// ======================

const apiService = {
  async fetchWithTimeout(url, options = {}, timeout = API_CONFIG.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: getHeaders()
      });
      
      if (!response.ok) {
        throw new ApiError(
          response.statusText,
          response.status,
          await response.text()
        );
      }
      
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async getSummary() {
    return this.fetchWithTimeout(
      `${API_CONFIG.baseURL}/dashboard/summary`,
      { method: 'GET' }
    );
  },

  async getTableData(filters = {}, page = 1, pageSize = 30, sort = {}) {
    const params = new URLSearchParams({
      page,
      pageSize,
      ...filters,
      ...(sort.field && { sortField: sort.field, sortDir: sort.dir })
    });
    
    return this.fetchWithTimeout(
      `${API_CONFIG.baseURL}/dashboard/rows?${params}`,
      { method: 'GET' }
    );
  },

  async getChartData() {
    return this.fetchWithTimeout(
      `${API_CONFIG.baseURL}/dashboard/chart`,
      { method: 'GET' }
    );
  }
};

// ======================
// API ERROR CLASS
// ======================

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// ======================
// DEMO DATA (Fallback)
// ======================

const DEMO_DATA = {
  summary: {
    vendas: {
      total: 6954.98,
      faturamento: 6954.98
    },
    custo_imposto: {
      total: 3799.77,
      custo: 3530.70,
      imposto: 269.07
    },
    tarifa: {
      total: 1266.52
    },
    frete: {
      total: 679.93,
      comprador: 76.97,
      vendedor: 602.96
    },
    margem: {
      total: 1285.73,
      pct: 18.49
    },
    modalidades: {
      places: 59.18,
      flex: 348.45,
      full: 6547.37,
      me1: 0.00,
      outros: 0.00
    },
    qtd_vendas: {
      aprovadas: 74,
      unidades: 89,
      canceladas: 0
    },
    ticket_medio_venda: 93.99,
    ticket_medio_margem: 17.37,
    devolucoes: {
      valor: 0.00,
      qtd: 0
    }
  },
  chart: {
    labels: ["Frete", "Tarifa", "Margem", "Custo", "Imposto"],
    values: [679.93, 1266.52, 1285.73, 3530.70, 269.07],
    colors: ["#2F9BD6", "#F4C85A", "#33A37A", "#E08B7C", "#EE7F66"]
  }
};

// Generate table rows (demo data)
DEMO_DATA.rows = Array.from({ length: 150 }, (_, i) => {
  const statuses = ['aprovado', 'cancelado'];
  const fretes = ['Full', 'Flex', 'Places'];
  const modalidades = ['places', 'flex', 'full'];
  const publicidades = ['sim', 'nao'];
  
  const valor = parseFloat((Math.random() * 500 + 20).toFixed(2));
  const qtd = Math.floor(Math.random() * 5) + 1;
  const faturamento = parseFloat((valor * qtd).toFixed(2));
  const custo = parseFloat((faturamento * (Math.random() * 0.4 + 0.35)).toFixed(2));
  const imposto = parseFloat((faturamento * (Math.random() * 0.08 + 0.02)).toFixed(2));
  const tarifa = parseFloat((faturamento * (Math.random() * 0.15 + 0.10)).toFixed(2));
  const freteComprador = parseFloat((Math.random() * 30).toFixed(2));
  const freteVendedor = parseFloat((Math.random() * 50 + 5).toFixed(2));
  const margem = parseFloat((faturamento - custo - imposto - tarifa - freteVendedor).toFixed(2));
  const mcPct = parseFloat(((margem / faturamento) * 100).toFixed(2));
  const freteType = i % 2 === 0 ? 'frete-comprador' : 'frete-vendedor';

  return {
    id: i + 1,
    anuncio: `Produto Premium ${i + 1}`,
    conta: `Loja ${Math.floor(i / 20) + 1}`,
    sku: `SKU-${String(i + 1).padStart(5, '0')}`,
    data: new Date(2026, 0, (i % 28) + 1).toLocaleDateString('pt-BR'),
    frete: fretes[i % 3],
    valor,
    qtd,
    faturamento,
    custo,
    imposto,
    tarifa,
    freteComprador,
    freteVendedor,
    margem,
    mcPct,
    status: statuses[i % 2],
    modality: modalidades[i % 3],
    freteType: freteType,
    publicidade: publicidades[i % 2]
  };
});

// ======================
// NOTIFICATION SERVICE
// ======================

const notificationService = {
  show(message, type = 'info', duration = 3000) {
    // Create or get notification container
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    const bgColor = {
      'success': '#33A37A',
      'error': '#E08B7C',
      'warning': '#F4C85A',
      'info': '#2F9BD6'
    }[type] || '#2F9BD6';

    notification.style.cssText = `
      background: ${bgColor};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      max-width: 300px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-in-out;
    `;
    notification.textContent = message;
    container.appendChild(notification);

    // Auto-remove
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in-out';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  },

  success(message, duration) {
    this.show(message, 'success', duration);
  },

  error(message, duration) {
    this.show(message, 'error', duration);
  },

  warning(message, duration) {
    this.show(message, 'warning', duration);
  },

  info(message, duration) {
    this.show(message, 'info', duration);
  }
};

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
  
  @keyframes skeleton-loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  
  .loader {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary);
    animation: pulse 1.5s ease-in-out infinite;
    margin-left: 4px;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`;
document.head.appendChild(style);

// ======================
// APP STATE
// ======================
const app = {
  data: DEMO_DATA.rows,
  filteredData: [],
  currentPage: 1,
  pageSize: 30,
  sortField: 'data',
  sortDir: 'desc',
  isLoading: false,
  useAPI: false, // Set to true when API is ready

  async init() {
     try {
      // Check if API is available
      try {
        await apiService.getSummary();
        this.useAPI = true;
        console.log('✓ API available - using live data');
      } catch (e) {
        console.warn('✗ API unavailable - using demo data');
        this.useAPI = false;
      }

      this.filteredData = [...this.data];
      await this.renderChart();
      await this.renderTable();
      this.updateStatistics();
      console.log('Dashboard initialized');
    } catch (error) {
      console.error('Initialization error:', error);
      notificationService.error('Erro ao inicializar dashboard');
    }
  },

  // Format currency
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  // Show/hide loading state
  setLoading(isLoading, element = null) {
    this.isLoading = isLoading;
    if (element) {
      if (isLoading) {
        element.disabled = true;
        element.style.opacity = '0.6';
        element.style.pointerEvents = 'none';
        const originalText = element.textContent;
        element.dataset.originalText = originalText;
        element.innerHTML = originalText + ' <span class="loader"></span>';
      } else {
        element.disabled = false;
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
        element.textContent = element.dataset.originalText || 'Done';
      }
    }
  },

  // Show table skeleton loader
  showTableSkeleton() {
    const tbody = document.getElementById('tableBody');
    const skeletonRows = Array(this.pageSize).fill(`
      <tr>
        <td colspan="15">
          <div style="height: 20px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 4px;"></div>
        </td>
      </tr>
    `);
    tbody.innerHTML = skeletonRows.join('');
  },

  // =====================
  // RENDER CHART (SVG DONUT)
  // =====================
  // RENDER CHART (SVG DONUT)
  // =====================
  async renderChart() {
    try {
      let chartData;
      
      if (this.useAPI) {
        chartData = await apiService.getChartData();
      } else {
        chartData = DEMO_DATA.chart;
      }

      const svg = document.getElementById('donutChart');
      svg.innerHTML = '';

      const cx = 60;
      const cy = 60;
      const outerRadius = 50;
      const innerRadius = 30;

      const total = chartData.values.reduce((a, b) => a + b, 0);
      let currentAngle = -90;

      chartData.values.forEach((value, index) => {
        const sliceAngle = (value / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + sliceAngle;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = cx + outerRadius * Math.cos(startRad);
        const y1 = cy + outerRadius * Math.sin(startRad);
        const x2 = cx + outerRadius * Math.cos(endRad);
        const y2 = cy + outerRadius * Math.sin(endRad);
        const x3 = cx + innerRadius * Math.cos(endRad);
        const y3 = cy + innerRadius * Math.sin(endRad);
        const x4 = cx + innerRadius * Math.cos(startRad);
        const y4 = cy + innerRadius * Math.sin(startRad);

        const largeArc = sliceAngle > 180 ? 1 : 0;

        const path = `
          M ${x1} ${y1}
          A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}
          L ${x3} ${y3}
          A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
          Z
        `;

        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', path);
        pathElement.setAttribute('fill', chartData.colors[index]);
        pathElement.setAttribute('stroke', 'white');
        pathElement.setAttribute('stroke-width', '2');
        
        pathElement.addEventListener('mouseenter', () => {
          pathElement.style.opacity = '0.8';
        });
        
        pathElement.addEventListener('mouseleave', () => {
          pathElement.style.opacity = '1';
        });

        svg.appendChild(pathElement);
        currentAngle = endAngle;
      });

      this.renderLegend(chartData, total);
    } catch (error) {
      console.error('Chart render error:', error);
      notificationService.error('Erro ao carregar gráfico');
    }
  },

  renderLegend(chartData, total) {
    const legendContainer = document.getElementById('chartLegend');
    legendContainer.innerHTML = '';

    chartData.labels.forEach((label, index) => {
      const value = chartData.values[index];
      const pct = ((value / total) * 100).toFixed(1);

      const item = document.createElement('div');
      item.className = 'legend-item';

      const color = document.createElement('div');
      color.className = 'legend-color';
      color.style.backgroundColor = chartData.colors[index];

      const labelSpan = document.createElement('span');
      labelSpan.className = 'legend-label';
      labelSpan.textContent = label;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'legend-value';
      valueSpan.textContent = `${pct}%`;

      item.appendChild(color);
      item.appendChild(labelSpan);
      item.appendChild(valueSpan);
      legendContainer.appendChild(item);
    });
  },

  // =====================
  // RENDER TABLE
  // =====================
  async renderTable() {
    try {
      const tbody = document.getElementById('tableBody');
      
      // Show skeleton loading
      this.showTableSkeleton();
      
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      
      let pageData;
      
      if (this.useAPI) {
        const filters = this.getFilterValues();
        const response = await apiService.getTableData(
          filters,
          this.currentPage,
          this.pageSize,
          { field: this.sortField, dir: this.sortDir }
        );
        pageData = response.data;
        this.filteredData = response.data; // Update filtered data from API
      } else {
        pageData = this.filteredData.slice(start, end);
      }

      tbody.innerHTML = pageData.map(row => `
        <tr>
          <td class="col-anuncio">
            ${row.anuncio}
            <span class="anuncio-link" title="Abrir anúncio">🔗</span>
          </td>
          <td>${row.conta}</td>
          <td>
            ${row.sku}
            <span class="sku-copy" title="Copiar SKU">📋</span>
          </td>
          <td>${row.data}</td>
          <td>${row.frete}</td>
          <td class="numeric">${this.formatCurrency(row.valor)}</td>
          <td class="numeric">${row.qtd}</td>
          <td class="numeric revenue">${this.formatCurrency(row.faturamento)}</td>
          <td class="numeric cost">${this.formatCurrency(row.custo)}</td>
          <td class="numeric tax">${this.formatCurrency(row.imposto)}</td>
          <td class="numeric fee">${this.formatCurrency(row.tarifa)}</td>
          <td class="numeric">${this.formatCurrency(row.freteComprador)}</td>
          <td class="numeric frete-vend">${this.formatCurrency(row.freteVendedor)}</td>
          <td class="numeric margin">${this.formatCurrency(row.margem)}</td>
          <td class="numeric mcpct">${row.mcPct.toFixed(2)}%</td>
        </tr>
      `).join('');

      // Update pagination
      const totalRecords = this.useAPI ? pageData.total : this.filteredData.length;
      document.getElementById('pageStart').textContent = start + 1;
      document.getElementById('pageEnd').textContent = Math.min(end, totalRecords);
      document.getElementById('totalRows').textContent = totalRecords;
      document.getElementById('pageNumber').textContent = `Página ${this.currentPage}`;
      
      const maxPage = Math.ceil(totalRecords / this.pageSize);
      document.getElementById('btnPrev').disabled = this.currentPage === 1;
      document.getElementById('btnNext').disabled = this.currentPage >= maxPage;
    } catch (error) {
      console.error('Table render error:', error);
      notificationService.error('Erro ao carregar tabela');
    }
  },

  // =====================
  // PAGINATION
  // =====================
  async nextPage() {
    const maxPage = Math.ceil(this.filteredData.length / this.pageSize);
    if (this.currentPage < maxPage) {
      this.currentPage++;
      await this.renderTable();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  async prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.renderTable();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  // =====================
  // SORTING
  // =====================
  async sort(field) {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }

    if (this.useAPI) {
      this.currentPage = 1;
      await this.renderTable();
    } else {
      // Client-side sorting
      this.filteredData.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
          return this.sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        return this.sortDir === 'asc' ? valA - valB : valB - valA;
      });

      this.currentPage = 1;
      this.renderTable();
    }
  },

  // =====================
  // EXPORT CSV
  // =====================
  async exportCSV() {
    try {
      const headers = ['Anúncio', 'Conta', 'SKU', 'Data', 'Frete', 'Valor Unit.', 'Qtd.', 'Faturamento ML', 'Custo', 'Imposto', 'Tarifa', 'Frete Comprador', 'Frete Vendedor', 'Margem', 'MC %'];
      const rows = this.filteredData.map(row => [
        row.anuncio,
        row.conta,
        row.sku,
        row.data,
        row.frete,
        row.valor,
        row.qtd,
        row.faturamento,
        row.custo,
        row.imposto,
        row.tarifa,
        row.freteComprador,
        row.freteVendedor,
        row.margem,
        row.mcPct
      ]);

      let csv = headers.join(',') + '\n';
      rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `vendas_${new Date().toISOString().slice(0, 10)}.csv`);
      link.click();
      
      notificationService.success('Arquivo exportado com sucesso');
    } catch (error) {
      console.error('Export error:', error);
      notificationService.error('Erro ao exportar arquivo');
    }
  },

  // =====================
  // REFRESH
  // =====================
  async refreshTable() {
    try {
      const btn = document.querySelector('.btn-refresh');
      this.setLoading(true, btn);
      this.currentPage = 1;
      await this.renderTable();
      notificationService.success('Tabela atualizada');
      this.setLoading(false, btn);
    } catch (error) {
      console.error('Refresh error:', error);
      notificationService.error('Erro ao atualizar tabela');
      const btn = document.querySelector('.btn-refresh');
      this.setLoading(false, btn);
    }
  },

  // =====================
  // STATISTICS
  // =====================
  updateStatistics() {
    try {
      // Get data from localStorage
      const products = JSON.parse(localStorage.getItem('products')) || [];
      const categories = JSON.parse(localStorage.getItem('categories')) || [];
      const sales = JSON.parse(localStorage.getItem('sales')) || [];
      const stockData = JSON.parse(localStorage.getItem('product_stock')) || {};

      // Update total products
      document.getElementById('totalProducts').textContent = products.length;

      // Update total categories
      document.getElementById('totalCategories').textContent = categories.length;

      // Calculate low stock items (assume min stock of 10)
      const lowStockItems = Object.keys(stockData).filter(sku => {
        return stockData[sku] < 10;
      }).length;
      document.getElementById('lowStockItems').textContent = lowStockItems;

      // Calculate monthly sales (from this month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlySalesCount = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
      }).length;
      document.getElementById('monthlySales').textContent = monthlySalesCount;

      // Calculate average order value
      if (sales.length > 0) {
        const totalValue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const avgValue = totalValue / sales.length;
        document.getElementById('avgOrder').textContent = 'R$ ' + avgValue.toFixed(2);
      }

      // Top seller (most sold SKU)
      if (sales.length > 0) {
        const skuCounts = {};
        sales.forEach(sale => {
          skuCounts[sale.sku] = (skuCounts[sale.sku] || 0) + sale.quantity;
        });
        const topSku = Object.keys(skuCounts).reduce((a, b) => 
          skuCounts[a] > skuCounts[b] ? a : b
        );
        document.getElementById('topSeller').textContent = topSku;
      }

      // Top products list
      if (sales.length > 0) {
        const skuRevenue = {};
        sales.forEach(sale => {
          skuRevenue[sale.sku] = (skuRevenue[sale.sku] || 0) + sale.total;
        });
        
        const topProducts = Object.keys(skuRevenue)
          .sort((a, b) => skuRevenue[b] - skuRevenue[a])
          .slice(0, 5);

        const topProductsList = document.getElementById('topProductsList');
        topProductsList.innerHTML = topProducts.map((sku, index) => `
          <div style="display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
            <div style="font-size: 18px; font-weight: bold; color: #5D4DB3; width: 30px;">${index + 1}.</div>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 600; color: #333;">${sku}</div>
              <div style="font-size: 11px; color: #999;">R$ ${skuRevenue[sku].toFixed(2)}</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #666;">⭐ Popular</div>
          </div>
        `).join('');
      }

    } catch (error) {
      console.error('Statistics update error:', error);
    }
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  app.init().catch(error => {
    console.error('Fatal initialization error:', error);
    notificationService.error('Erro crítico ao inicializar dashboard');
  });
});

// Logout
function logout() {
  if (confirm('Deseja sair da sua conta?')) {
    authService.logout();
  }
}
