// ========================================
// Dashboard JavaScript - Vanilla JS Implementation
// ========================================

// Demo Data
// ========================================

const DEMO_DATA = {
  stats: [
    {
      id: 'revenue',
      label: 'Receita Total',
      value: 'R$ 284.500',
      icon: '💰',
      trend: { direction: 'up', value: '12.5%' },
      variant: 'primary',
      miniBlocks: [
        { label: 'Hoje', value: 'R$ 8.4k' },
        { label: 'Mês', value: 'R$ 142k' }
      ]
    },
    {
      id: 'orders',
      label: 'Pedidos',
      value: '1,284',
      icon: '📦',
      trend: { direction: 'up', value: '8.2%' },
      variant: 'success',
      miniBlocks: [
        { label: 'Pendentes', value: '48' },
        { label: 'Entregues', value: '1.2k' }
      ]
    },
    {
      id: 'customers',
      label: 'Clientes',
      value: '3,847',
      icon: '👥',
      trend: { direction: 'up', value: '5.7%' },
      variant: 'info',
      miniBlocks: [
        { label: 'Novos', value: '124' },
        { label: 'Ativos', value: '3.7k' }
      ]
    },
    {
      id: 'products',
      label: 'Produtos',
      value: '428',
      icon: '🛍️',
      trend: { direction: 'down', value: '2.1%' },
      variant: 'warning',
      miniBlocks: [
        { label: 'Em estoque', value: '385' },
        { label: 'Esgotados', value: '43' }
      ]
    },
    {
      id: 'conversion',
      label: 'Taxa Conversão',
      value: '4.8%',
      icon: '📈',
      trend: { direction: 'up', value: '1.2%' },
      variant: 'purple',
      miniBlocks: [
        { label: 'Visitantes', value: '18.5k' },
        { label: 'Vendas', value: '892' }
      ]
    },
    {
      id: 'tickets',
      label: 'Ticket Médio',
      value: 'R$ 221',
      icon: '💳',
      trend: { direction: 'up', value: '3.4%' },
      variant: 'danger',
      miniBlocks: [
        { label: 'Menor', value: 'R$ 45' },
        { label: 'Maior', value: 'R$ 1.2k' }
      ]
    }
  ],
  
  chartData: {
    labels: ['Eletrônicos', 'Moda', 'Casa', 'Esportes', 'Livros'],
    datasets: [{
      data: [35, 25, 20, 12, 8],
      backgroundColor: [
        '#667eea',
        '#48bb78',
        '#ed8936',
        '#f56565',
        '#9f7aea'
      ],
      borderWidth: 0
    }]
  },
  
  tableData: [
    {
      id: 'ORD-2024-1847',
      customer: 'Maria Silva Santos',
      product: 'Smartphone Galaxy S23 Ultra 256GB',
      date: '2024-01-22',
      amount: 'R$ 4.299,00',
      status: 'Entregue',
      category: 'Eletrônicos'
    },
    {
      id: 'ORD-2024-1846',
      customer: 'João Pedro Oliveira',
      product: 'Notebook Dell Inspiron 15 i5',
      date: '2024-01-22',
      amount: 'R$ 3.499,00',
      status: 'Em Trânsito',
      category: 'Eletrônicos'
    },
    {
      id: 'ORD-2024-1845',
      customer: 'Ana Carolina Mendes',
      product: 'Tênis Nike Air Max 270',
      date: '2024-01-21',
      amount: 'R$ 699,90',
      status: 'Processando',
      category: 'Esportes'
    },
    {
      id: 'ORD-2024-1844',
      customer: 'Carlos Eduardo Lima',
      product: 'Smart TV Samsung 55" 4K QLED',
      date: '2024-01-21',
      amount: 'R$ 2.899,00',
      status: 'Entregue',
      category: 'Eletrônicos'
    },
    {
      id: 'ORD-2024-1843',
      customer: 'Beatriz Rodrigues Costa',
      product: 'Cafeteira Nespresso Essenza Mini',
      date: '2024-01-21',
      amount: 'R$ 399,00',
      status: 'Entregue',
      category: 'Casa'
    },
    {
      id: 'ORD-2024-1842',
      customer: 'Fernando Santos Almeida',
      product: 'Fone de Ouvido Sony WH-1000XM5',
      date: '2024-01-20',
      amount: 'R$ 1.899,00',
      status: 'Em Trânsito',
      category: 'Eletrônicos'
    },
    {
      id: 'ORD-2024-1841',
      customer: 'Juliana Ferreira Souza',
      product: 'Vestido Longo Floral Primavera',
      date: '2024-01-20',
      amount: 'R$ 189,90',
      status: 'Entregue',
      category: 'Moda'
    },
    {
      id: 'ORD-2024-1840',
      customer: 'Ricardo Barbosa Santos',
      product: 'Bicicleta Mountain Bike Aro 29',
      date: '2024-01-20',
      amount: 'R$ 1.299,00',
      status: 'Processando',
      category: 'Esportes'
    },
    {
      id: 'ORD-2024-1839',
      customer: 'Patricia Lima Cardoso',
      product: 'Kit Panelas Tramontina Antiaderente',
      date: '2024-01-19',
      amount: 'R$ 349,90',
      status: 'Entregue',
      category: 'Casa'
    },
    {
      id: 'ORD-2024-1838',
      customer: 'Marcos Paulo Ribeiro',
      product: 'Livro "Clean Code" - Robert Martin',
      date: '2024-01-19',
      amount: 'R$ 89,90',
      status: 'Entregue',
      category: 'Livros'
    },
    {
      id: 'ORD-2024-1837',
      customer: 'Camila Nunes Pereira',
      product: 'Smartwatch Apple Watch Series 9',
      date: '2024-01-19',
      amount: 'R$ 3.799,00',
      status: 'Em Trânsito',
      category: 'Eletrônicos'
    },
    {
      id: 'ORD-2024-1836',
      customer: 'Lucas Henrique Martins',
      product: 'Cadeira Gamer RGB Pro',
      date: '2024-01-18',
      amount: 'R$ 1.199,00',
      status: 'Entregue',
      category: 'Casa'
    },
    {
      id: 'ORD-2024-1835',
      customer: 'Amanda Silva Rocha',
      product: 'Bolsa Michael Kors Jet Set',
      date: '2024-01-18',
      amount: 'R$ 899,00',
      status: 'Cancelado',
      category: 'Moda'
    },
    {
      id: 'ORD-2024-1834',
      customer: 'Gabriel Costa Araújo',
      product: 'Console PlayStation 5 Digital',
      date: '2024-01-18',
      amount: 'R$ 3.499,00',
      status: 'Entregue',
      category: 'Eletrônicos'
    },
    {
      id: 'ORD-2024-1833',
      customer: 'Isabela Martins Ferreira',
      product: 'Aspirador Robô Xiaomi S10+',
      date: '2024-01-17',
      amount: 'R$ 1.899,00',
      status: 'Processando',
      category: 'Casa'
    }
  ]
};

// State Management
// ========================================

let state = {
  currentPage: 1,
  rowsPerPage: 10,
  sortColumn: null,
  sortDirection: 'asc',
  filteredData: [...DEMO_DATA.tableData],
  filters: {
    status: 'all',
    dateFrom: '',
    dateTo: '',
    category: 'all'
  }
};

// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  console.log('Initializing Dashboard...');
  
  // Show loading state briefly for demo
  showLoadingState();
  
  setTimeout(() => {
    renderStatsCards();
    renderChart();
    renderTable();
    initializeFilters();
    initializeEventListeners();
    hideLoadingState();
    console.log('Dashboard initialized successfully');
  }, 800);
}

// Stats Cards Rendering
// ========================================

function renderStatsCards() {
  const container = document.getElementById('statsCards');
  if (!container) return;
  
  container.innerHTML = DEMO_DATA.stats.map(stat => `
    <div class="stat-card stat-card--${stat.variant}" role="article" aria-label="${stat.label}">
      <div class="stat-icon" aria-hidden="true">${stat.icon}</div>
      <div class="stat-label">${stat.label}</div>
      <div class="stat-value">${stat.value}</div>
      ${stat.miniBlocks ? `
        <div class="stat-mini-blocks">
          ${stat.miniBlocks.map(block => `
            <div class="mini-block">
              <div class="mini-label">${block.label}</div>
              <div class="mini-value">${block.value}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${stat.trend ? `
        <div class="stat-trend trend-${stat.trend.direction}">
          <span class="trend-icon">${stat.trend.direction === 'up' ? '↑' : '↓'}</span>
          <span>${stat.trend.value}</span>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Chart Rendering (Chart.js)
// ========================================

let chartInstance = null;

function renderChart() {
  const canvas = document.getElementById('dashboardChart');
  if (!canvas) return;
  
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded. Skipping chart rendering.');
    renderChartLegend(); // Still render the legend with data
    return;
  }
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart if it exists
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: DEMO_DATA.chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1a202c',
          padding: 12,
          cornerRadius: 8,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${value}%`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true
      },
      cutout: '70%'
    }
  });
  
  // Render custom legend
  renderChartLegend();
}

function renderChartLegend() {
  const container = document.getElementById('chartLegend');
  if (!container) return;
  
  const { labels, datasets } = DEMO_DATA.chartData;
  const data = datasets[0].data;
  const colors = datasets[0].backgroundColor;
  
  container.innerHTML = labels.map((label, index) => `
    <div class="legend-item">
      <div class="legend-label">
        <span class="legend-color" style="background-color: ${colors[index]}"></span>
        <span>${label}</span>
      </div>
      <div class="legend-value">${data[index]}%</div>
    </div>
  `).join('');
}

// Table Rendering
// ========================================

function renderTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  
  const start = (state.currentPage - 1) * state.rowsPerPage;
  const end = start + state.rowsPerPage;
  const pageData = state.filteredData.slice(start, end);
  
  if (pageData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: #718096;">
          Nenhum pedido encontrado
        </td>
      </tr>
    `;
    updatePaginationControls();
    return;
  }
  
  tbody.innerHTML = pageData.map(row => `
    <tr>
      <td>${row.id}</td>
      <td class="truncate-cell" data-tooltip="${escapeHtml(row.customer)}">${escapeHtml(row.customer)}</td>
      <td class="truncate-cell hide-on-mobile" data-tooltip="${escapeHtml(row.product)}">${escapeHtml(row.product)}</td>
      <td class="hide-on-tablet">${formatDate(row.date)}</td>
      <td>${row.amount}</td>
      <td>
        <span class="status-badge ${getStatusClass(row.status)}">${row.status}</span>
      </td>
      <td class="hide-on-mobile">${row.category}</td>
    </tr>
  `).join('');
  
  updatePaginationControls();
}

function getStatusClass(status) {
  const statusMap = {
    'Entregue': 'status-success',
    'Em Trânsito': 'status-info',
    'Processando': 'status-warning',
    'Cancelado': 'status-danger'
  };
  return statusMap[status] || 'status-info';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Table Sorting
// ========================================

function initializeSorting() {
  const headers = document.querySelectorAll('th.sortable');
  
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.dataset.column;
      handleSort(column);
    });
  });
}

function handleSort(column) {
  // Toggle sort direction if same column
  if (state.sortColumn === column) {
    state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortColumn = column;
    state.sortDirection = 'asc';
  }
  
  // Sort data
  state.filteredData.sort((a, b) => {
    let aVal = a[column];
    let bVal = b[column];
    
    // Handle monetary values
    if (column === 'amount') {
      aVal = parseFloat(aVal.replace('R$ ', '').replace('.', '').replace(',', '.'));
      bVal = parseFloat(bVal.replace('R$ ', '').replace('.', '').replace(',', '.'));
    }
    
    // Handle dates
    if (column === 'date') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }
    
    if (aVal < bVal) return state.sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return state.sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Update UI
  updateSortIndicators(column);
  renderTable();
}

function updateSortIndicators(column) {
  const headers = document.querySelectorAll('th.sortable');
  
  headers.forEach(header => {
    header.classList.remove('sorted-asc', 'sorted-desc');
    
    if (header.dataset.column === column) {
      header.classList.add(`sorted-${state.sortDirection}`);
    }
  });
}

// Pagination
// ========================================

function updatePaginationControls() {
  const totalPages = Math.ceil(state.filteredData.length / state.rowsPerPage);
  const paginationInfo = document.getElementById('paginationInfo');
  const paginationControls = document.getElementById('paginationControls');
  
  if (paginationInfo) {
    const start = (state.currentPage - 1) * state.rowsPerPage + 1;
    const end = Math.min(state.currentPage * state.rowsPerPage, state.filteredData.length);
    paginationInfo.textContent = `Mostrando ${start}-${end} de ${state.filteredData.length} pedidos`;
  }
  
  if (paginationControls) {
    paginationControls.innerHTML = `
      <button 
        onclick="changePage(${state.currentPage - 1})" 
        ${state.currentPage === 1 ? 'disabled' : ''}
        aria-label="Página anterior"
      >
        Anterior
      </button>
      ${generatePageButtons(totalPages)}
      <button 
        onclick="changePage(${state.currentPage + 1})" 
        ${state.currentPage === totalPages ? 'disabled' : ''}
        aria-label="Próxima página"
      >
        Próxima
      </button>
    `;
  }
}

function generatePageButtons(totalPages) {
  let buttons = '';
  const maxButtons = 5;
  let startPage = Math.max(1, state.currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    buttons += `
      <button 
        onclick="changePage(${i})" 
        class="${i === state.currentPage ? 'active' : ''}"
        aria-label="Página ${i}"
        aria-current="${i === state.currentPage ? 'page' : 'false'}"
      >
        ${i}
      </button>
    `;
  }
  
  return buttons;
}

function changePage(page) {
  const totalPages = Math.ceil(state.filteredData.length / state.rowsPerPage);
  
  if (page < 1 || page > totalPages) return;
  
  state.currentPage = page;
  renderTable();
  
  // Scroll to table top on page change
  document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Filters
// ========================================

function initializeFilters() {
  const applyBtn = document.getElementById('applyFilters');
  const resetBtn = document.getElementById('resetFilters');
  
  if (applyBtn) {
    applyBtn.addEventListener('click', applyFilters);
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', resetFilters);
  }
}

function applyFilters() {
  // Get filter values
  state.filters.status = document.getElementById('filterStatus')?.value || 'all';
  state.filters.dateFrom = document.getElementById('filterDateFrom')?.value || '';
  state.filters.dateTo = document.getElementById('filterDateTo')?.value || '';
  state.filters.category = document.getElementById('filterCategory')?.value || 'all';
  
  // Filter data
  state.filteredData = DEMO_DATA.tableData.filter(row => {
    // Status filter
    if (state.filters.status !== 'all' && row.status !== state.filters.status) {
      return false;
    }
    
    // Category filter
    if (state.filters.category !== 'all' && row.category !== state.filters.category) {
      return false;
    }
    
    // Date range filter
    if (state.filters.dateFrom) {
      const rowDate = new Date(row.date);
      const fromDate = new Date(state.filters.dateFrom);
      if (rowDate < fromDate) return false;
    }
    
    if (state.filters.dateTo) {
      const rowDate = new Date(row.date);
      const toDate = new Date(state.filters.dateTo);
      if (rowDate > toDate) return false;
    }
    
    return true;
  });
  
  // Reset to first page
  state.currentPage = 1;
  
  // Re-render table
  renderTable();
  
  console.log('Filters applied:', state.filters);
}

function resetFilters() {
  // Reset form
  document.getElementById('filterStatus').value = 'all';
  document.getElementById('filterDateFrom').value = '';
  document.getElementById('filterDateTo').value = '';
  document.getElementById('filterCategory').value = 'all';
  
  // Reset state
  state.filters = {
    status: 'all',
    dateFrom: '',
    dateTo: '',
    category: 'all'
  };
  
  state.filteredData = [...DEMO_DATA.tableData];
  state.currentPage = 1;
  
  // Re-render table
  renderTable();
  
  console.log('Filters reset');
}

// CSV Export
// ========================================

function exportToCSV() {
  const headers = ['ID', 'Cliente', 'Produto', 'Data', 'Valor', 'Status', 'Categoria'];
  const rows = state.filteredData.map(row => [
    row.id,
    row.customer,
    row.product,
    row.date,
    row.amount,
    row.status,
    row.category
  ]);
  
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });
  
  // Create download link
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `pedidos_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log('CSV exported successfully');
}

// Event Listeners
// ========================================

function initializeEventListeners() {
  // Export button
  const exportBtn = document.getElementById('exportCSV');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToCSV);
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Deseja realmente sair?')) {
        window.location.href = '../login.html';
      }
    });
  }
  
  // Initialize sorting
  initializeSorting();
  
  console.log('Event listeners initialized');
}

// Loading State
// ========================================

function showLoadingState() {
  const statsCards = document.getElementById('statsCards');
  const tableBody = document.getElementById('tableBody');
  
  if (statsCards) {
    statsCards.innerHTML = Array(6).fill(0).map(() => 
      '<div class="skeleton skeleton-card"></div>'
    ).join('');
  }
  
  if (tableBody) {
    tableBody.innerHTML = Array(10).fill(0).map(() => `
      <tr>
        <td colspan="7"><div class="skeleton skeleton-row"></div></td>
      </tr>
    `).join('');
  }
}

function hideLoadingState() {
  // Loading states are replaced by actual content in render functions
  console.log('Loading state hidden');
}

// Global functions (for inline event handlers)
// ========================================

window.changePage = changePage;
window.exportToCSV = exportToCSV;

// API Integration Points (for future use)
// ========================================

/*
  To integrate with a real API, replace the DEMO_DATA object with API calls:
  
  async function fetchStats() {
    const response = await fetch('/api/stats');
    return response.json();
  }
  
  async function fetchTableData(page, filters) {
    const params = new URLSearchParams({
      page,
      limit: state.rowsPerPage,
      ...filters
    });
    const response = await fetch(`/api/orders?${params}`);
    return response.json();
  }
  
  Then update initializeApp() to use these functions instead of DEMO_DATA.
*/
