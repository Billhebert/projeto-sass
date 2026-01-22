// ======================
// DEMO DATA
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

// Generate table rows
DEMO_DATA.rows = Array.from({ length: 150 }, (_, i) => {
  const modalidades = ['Places/Coleta', 'Flex', 'Full', 'ME1'];
  const fretes = ['Full', 'Flex', 'Places'];
  
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
    mcPct
  };
});

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

  init() {
    this.filteredData = [...this.data];
    this.renderChart();
    this.renderTable();
    console.log('Dashboard initialized');
  },

  // Format currency
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  // =====================
  // RENDER CHART (SVG DONUT)
  // =====================
  renderChart() {
    const chartData = DEMO_DATA.chart;
    const svg = document.getElementById('donutChart');
    
    if (!svg) return;

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
  renderTable() {
    const tbody = document.getElementById('tableBody');
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    const pageData = this.filteredData.slice(start, end);

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
    document.getElementById('pageStart').textContent = start + 1;
    document.getElementById('pageEnd').textContent = Math.min(end, this.filteredData.length);
    document.getElementById('totalRows').textContent = this.filteredData.length;
    document.getElementById('pageNumber').textContent = `Página ${this.currentPage}`;
    
    document.getElementById('btnPrev').disabled = this.currentPage === 1;
    document.getElementById('btnNext').disabled = end >= this.filteredData.length;
  },

  // =====================
  // PAGINATION
  // =====================
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

  // =====================
  // SORTING
  // =====================
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
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        return this.sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return this.sortDir === 'asc' ? valA - valB : valB - valA;
    });

    this.currentPage = 1;
    this.renderTable();
  },

  // =====================
  // FILTERS
  // =====================
  applyFilters() {
    const startDate = document.getElementById('filterStart').value;
    const endDate = document.getElementById('filterEnd').value;
    const order = document.getElementById('filterOrder').value.toLowerCase();
    const title = document.getElementById('filterTitle').value.toLowerCase();
    const sku = document.getElementById('filterSKU').value.toLowerCase();
    const status = document.getElementById('filterStatus').value;
    const modality = document.getElementById('filterModality').value;
    const freteType = document.getElementById('filterFreteType').value;
    const publicity = document.getElementById('filterPublicity').value;

    this.filteredData = this.data.filter(row => {
      const rowDate = new Date(row.data.split('/').reverse().join('-'));
      const startD = startDate ? new Date(startDate) : null;
      const endD = endDate ? new Date(endDate) : null;

      return (!startD || rowDate >= startD) &&
             (!endD || rowDate <= endD) &&
             (!title || row.anuncio.toLowerCase().includes(title)) &&
             (!sku || row.sku.toLowerCase().includes(sku)) &&
             (!order || row.id.toString().includes(order));
    });

    this.currentPage = 1;
    this.renderTable();
    alert(`Filtros aplicados! ${this.filteredData.length} registros encontrados.`);
  },

  clearFilters() {
    document.getElementById('filterStart').value = '2026-01-01';
    document.getElementById('filterEnd').value = '2026-01-31';
    document.getElementById('filterOrder').value = '';
    document.getElementById('filterTitle').value = '';
    document.getElementById('filterSKU').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterModality').value = '';
    document.getElementById('filterFreteType').value = '';
    document.getElementById('filterPublicity').value = '';

    this.filteredData = [...this.data];
    this.currentPage = 1;
    this.renderTable();
  },

  // =====================
  // EXPORT CSV
  // =====================
  exportCSV() {
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
  },

  // =====================
  // REFRESH
  // =====================
  refreshTable() {
    this.currentPage = 1;
    this.renderTable();
    alert('Tabela atualizada com sucesso!');
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
