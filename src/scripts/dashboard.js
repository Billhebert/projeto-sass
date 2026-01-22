// ======================
// DEMO DATA
// ======================

const DEMO_DATA = {
  summary: {
    vendas: {
      total: 6954.98,
      minis: [
        { label: "Places/Coleta", value: 59.16, type: "flex" },
        { label: "Flex", value: 1205.82, type: "flex" },
        { label: "Full", value: 4890.00, type: "full" },
        { label: "ME1", value: 800.00, type: "me" }
      ]
    },
    custo: {
      total: 3799.77,
      custo: 3530.70,
      imposto: 269.07,
      minis: [
        { label: "Custo", value: 3530.70, type: "cost" },
        { label: "Imposto", value: 269.07, type: "tax" }
      ]
    },
    tarifa: {
      total: 1266.52
    },
    frete: {
      total: 679.93
    },
    margem: {
      total: 1285.73,
      pct: 18.49
    }
  },
  chart: {
    labels: ["Frete", "Tarifa", "Margem", "Custo", "Imposto"],
    values: [8.7, 18.2, 18.5, 50.8, 3.8],
    colors: ["#4AA3D8", "#F4C85A", "#33A37A", "#333333", "#EE7F66"]
  },
  rows: Array.from({ length: 123 }, (_, i) => ({
    id: i + 1,
    anuncio: `Produto Premium ${i + 1}`,
    conta: `Conta ${Math.floor(i / 10) + 1}`,
    sku: `SKU-${String(i + 1).padStart(5, '0')}`,
    data: new Date(2026, 0, Math.floor(i / 4) + 1).toLocaleDateString('pt-BR'),
    frete: i % 3 === 0 ? "Full" : i % 3 === 1 ? "Flex" : "Places",
    valor: parseFloat((Math.random() * 500 + 50).toFixed(2)),
    qtd: Math.floor(Math.random() * 5) + 1,
    faturamento: 0,
    custo: parseFloat((Math.random() * 200 + 30).toFixed(2)),
    imposto: parseFloat((Math.random() * 50 + 5).toFixed(2)),
    tarifa: parseFloat((Math.random() * 100 + 10).toFixed(2)),
    freteComprador: parseFloat((Math.random() * 30 + 5).toFixed(2)),
    freteVendedor: parseFloat((Math.random() * 20 + 2).toFixed(2)),
    margem: 0,
    mcPct: 0
  })).map(row => {
    row.faturamento = parseFloat((row.valor * row.qtd).toFixed(2));
    row.margem = parseFloat((row.faturamento - row.custo - row.imposto - row.tarifa - row.freteVendedor).toFixed(2));
    row.mcPct = parseFloat(((row.margem / row.faturamento) * 100).toFixed(2));
    return row;
  })
};

// ======================
// APP STATE & LOGIC
// ======================

const app = {
  data: [],
  filteredData: [],
  currentPage: 1,
  pageSize: 50,
  sortField: 'anuncio',
  sortDir: 'asc',
  isLoading: false,

  // Initialize
  init() {
    this.loadDemoData();
    this.renderCards();
    this.renderChart();
    this.renderTable();
    console.log('Dashboard initialized');
  },

  // Load demo data
  loadDemoData() {
    this.data = [...DEMO_DATA.rows];
    this.filteredData = [...this.data];
  },

  // Format currency
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  // Render Cards
  renderCards() {
    if (this.isLoading) {
      document.getElementById('cardVendas').classList.add('skeleton');
      return;
    }

    const summary = DEMO_DATA.summary;

    // Vendas
    document.querySelector('[data-field="vendas-total"]').textContent = this.formatCurrency(summary.vendas.total);
    const miniVendas = document.getElementById('miniVendas');
    miniVendas.innerHTML = summary.vendas.minis.map(m => `
      <div class="mini-block type-${m.type}">
        <div class="mini-label">${m.label}</div>
        <div class="mini-value">${this.formatCurrency(m.value)}</div>
      </div>
    `).join('');

    // Custo
    document.querySelector('[data-field="custo-total"]').textContent = this.formatCurrency(summary.custo.total);
    const miniCusto = document.getElementById('miniCusto');
    miniCusto.innerHTML = summary.custo.minis.map(m => `
      <div class="mini-block type-${m.type}">
        <div class="mini-label">${m.label}</div>
        <div class="mini-value">${this.formatCurrency(m.value)}</div>
      </div>
    `).join('');

    // Tarifa
    document.querySelector('[data-field="tarifa-total"]').textContent = this.formatCurrency(summary.tarifa.total);

    // Frete
    document.querySelector('[data-field="frete-total"]').textContent = this.formatCurrency(summary.frete.total);

    // Margem
    document.querySelector('[data-field="margem-total"]').textContent = this.formatCurrency(summary.margem.total);
    document.querySelector('[data-field="margem-pct"]').textContent = summary.margem.pct.toFixed(2) + '%';

    document.getElementById('cardVendas').classList.remove('skeleton');
  },

  // Render Chart (Custom Donut)
  renderChart() {
    const chart = DEMO_DATA.chart;
    const svg = document.getElementById('donutChart');
    svg.innerHTML = '';

    const centerX = 75, centerY = 75, outerRadius = 60, innerRadius = 40;
    let currentAngle = -90;

    const total = chart.values.reduce((a, b) => a + b, 0);

    chart.values.forEach((value, i) => {
      const sliceAngle = (value / total) * 360;
      const startAngle = currentAngle * (Math.PI / 180);
      const endAngle = (currentAngle + sliceAngle) * (Math.PI / 180);

      const x1 = centerX + outerRadius * Math.cos(startAngle);
      const y1 = centerY + outerRadius * Math.sin(startAngle);
      const x2 = centerX + outerRadius * Math.cos(endAngle);
      const y2 = centerY + outerRadius * Math.sin(endAngle);

      const x3 = centerX + innerRadius * Math.cos(endAngle);
      const y3 = centerY + innerRadius * Math.sin(endAngle);
      const x4 = centerX + innerRadius * Math.cos(startAngle);
      const y4 = centerY + innerRadius * Math.sin(startAngle);

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
      pathElement.setAttribute('fill', chart.colors[i]);
      pathElement.setAttribute('stroke', 'white');
      pathElement.setAttribute('stroke-width', '2');
      pathElement.style.cursor = 'pointer';
      svg.appendChild(pathElement);

      currentAngle += sliceAngle;
    });

    // Legend
    const legend = document.getElementById('chartLegend');
    legend.innerHTML = chart.labels.map((label, i) => `
      <div class="legend-item">
        <div class="legend-color" style="background: ${chart.colors[i]}"></div>
        <div class="legend-label">${label}</div>
        <div class="legend-value">${chart.values[i].toFixed(1)}%</div>
      </div>
    `).join('');
  },

  // Render Table
  renderTable() {
    const tbody = document.getElementById('tableBody');
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    const pageData = this.filteredData.slice(start, end);

    tbody.innerHTML = pageData.map(row => `
      <tr>
        <td class="col-anuncio" title="${row.anuncio}">${row.anuncio}</td>
        <td>${row.conta}</td>
        <td>${row.sku}</td>
        <td>${row.data}</td>
        <td class="col-frete">${row.frete}</td>
        <td>${this.formatCurrency(row.valor)}</td>
        <td class="col-qtd">${row.qtd}</td>
        <td>${this.formatCurrency(row.faturamento)}</td>
        <td class="col-cost">${this.formatCurrency(row.custo)}</td>
        <td class="col-tax">${this.formatCurrency(row.imposto)}</td>
        <td class="col-fee">${this.formatCurrency(row.tarifa)}</td>
        <td class="col-frete-vendedor">${this.formatCurrency(row.freteVendedor)}</td>
        <td class="col-margin">${this.formatCurrency(row.margem)}</td>
        <td class="col-mc-percent">${row.mcPct.toFixed(2)}%</td>
      </tr>
    `).join('');

    // Update pagination
    document.getElementById('pageInfo').textContent = `${start + 1}-${Math.min(end, this.filteredData.length)}`;
    document.getElementById('totalInfo').textContent = this.filteredData.length;
    document.getElementById('btnPrev').disabled = this.currentPage === 1;
    document.getElementById('btnNext').disabled = end >= this.filteredData.length;
  },

  // Pagination
  nextPage() {
    const maxPage = Math.ceil(this.filteredData.length / this.pageSize);
    if (this.currentPage < maxPage) {
      this.currentPage++;
      this.renderTable();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderTable();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  // Sorting
  sort(field) {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }

    this.filteredData.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (typeof valA === 'string') {
        return this.sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return this.sortDir === 'asc' ? valA - valB : valB - valA;
    });

    this.currentPage = 1;
    this.renderTable();
    this.updateSortHeaders();
  },

  updateSortHeaders() {
    document.querySelectorAll('th.sortable').forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
    });

    const th = Array.from(document.querySelectorAll('th')).find(t => {
      return t.textContent.toLowerCase().includes(this.sortField) || 
             (this.sortField === 'anuncio' && t.textContent.includes('Anúncio'));
    });

    if (th) {
      th.classList.add(this.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  },

  // Filters
  applyFilters() {
    const startDate = document.getElementById('filterStart').value;
    const endDate = document.getElementById('filterEnd').value;
    const title = document.getElementById('filterTitle').value.toLowerCase();
    const sku = document.getElementById('filterSKU').value.toLowerCase();

    this.filteredData = this.data.filter(row => {
      const rowDate = row.data.split('/').reverse().join('-');
      return (!startDate || rowDate >= startDate) &&
             (!endDate || rowDate <= endDate) &&
             (!title || row.anuncio.toLowerCase().includes(title)) &&
             (!sku || row.sku.toLowerCase().includes(sku));
    });

    this.currentPage = 1;
    this.renderTable();
  },

  clearFilters() {
    document.getElementById('filterStart').value = '2026-01-01';
    document.getElementById('filterEnd').value = '2026-01-31';
    document.getElementById('filterTitle').value = '';
    document.getElementById('filterSKU').value = '';
    this.filteredData = [...this.data];
    this.currentPage = 1;
    this.renderTable();
  },

  // Export CSV
  exportCSV() {
    const headers = ['Anúncio', 'Conta', 'SKU', 'Data', 'Frete', 'Valor Unit.', 'Qtd.', 'Faturamento ML', 'Custo', 'Imposto', 'Tarifa', 'Frete Vendedor', 'Margem', 'MC %'];
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
  },

  // Simulate Loading
  simulateLoading() {
    this.isLoading = true;
    document.getElementById('cardVendas').classList.add('skeleton');
    setTimeout(() => {
      this.isLoading = false;
      this.renderCards();
    }, 2000);
  },

  // Refresh
  refresh() {
    this.simulateLoading();
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => app.init());

// Logout
function logout() {
  if (confirm('Deseja sair?')) {
    window.location.href = '../login.html';
  }
}
