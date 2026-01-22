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

// ======================
// APP
// ======================

const app = {
  init() {
    this.renderChart();
    console.log('Dashboard initialized');
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

    // Calculate total
    const total = chartData.values.reduce((a, b) => a + b, 0);

    // Create donut segments
    let currentAngle = -90; // Start from top

    chartData.values.forEach((value, index) => {
      const sliceAngle = (value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      // Convert to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // Calculate points
      const x1 = cx + outerRadius * Math.cos(startRad);
      const y1 = cy + outerRadius * Math.sin(startRad);
      const x2 = cx + outerRadius * Math.cos(endRad);
      const y2 = cy + outerRadius * Math.sin(endRad);

      const x3 = cx + innerRadius * Math.cos(endRad);
      const y3 = cy + innerRadius * Math.sin(endRad);
      const x4 = cx + innerRadius * Math.cos(startRad);
      const y4 = cy + innerRadius * Math.sin(startRad);

      // Large arc flag
      const largeArc = sliceAngle > 180 ? 1 : 0;

      // Create path
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
      pathElement.style.cursor = 'pointer';
      pathElement.style.transition = 'opacity 0.2s';
      
      pathElement.addEventListener('mouseenter', () => {
        pathElement.style.opacity = '0.8';
      });
      
      pathElement.addEventListener('mouseleave', () => {
        pathElement.style.opacity = '1';
      });

      svg.appendChild(pathElement);
      currentAngle = endAngle;
    });

    // Create legend
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

    console.log('Filtros aplicados:', {
      startDate, endDate, order, title, sku, status, modality, freteType, publicity
    });

    alert('Filtros aplicados com sucesso!');
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

    console.log('Filtros limpos');
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
