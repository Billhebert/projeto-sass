// Sales Management Module

const salesModule = (() => {
  const STORAGE_KEY = 'sales';

  // Initialize sales management
  function init() {
    populateProductDropdown();
    renderSales();
    updateSalesSummary();
    setupForm();
  }

  // Get all sales from localStorage
  function getAll() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Save sales to localStorage
  function save(sales) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  }

  // Populate products dropdown
  function populateProductDropdown() {
    try {
      const productsData = localStorage.getItem('products');
      if (productsData) {
        const parsed = JSON.parse(productsData);
        const select = document.getElementById('productSku');
        select.innerHTML = '<option value="">Selecione um produto...</option>';
        
        parsed.forEach(product => {
          const option = document.createElement('option');
          option.value = product.sku;
          option.textContent = product.sku;
          select.appendChild(option);
        });
      }
    } catch (e) {
      console.error('Erro ao carregar produtos:', e);
    }
  }

  // Add new sale
  function add(sku, quantity, unitPrice, discount, marketplace, paymentMethod, status, notes) {
    const sales = getAll();

    if (!sku || !quantity || !unitPrice) {
      return { success: false, message: 'Preencha os campos obrigatórios' };
    }

    if (quantity <= 0) {
      return { success: false, message: 'Quantidade deve ser maior que 0' };
    }

    if (unitPrice < 0) {
      return { success: false, message: 'Preço não pode ser negativo' };
    }

    const discountValue = (unitPrice * quantity * discount) / 100;
    const total = unitPrice * quantity - discountValue;

    const newSale = {
      id: 'sale-' + Date.now(),
      sku: sku.trim(),
      quantity: parseInt(quantity),
      unitPrice: parseFloat(unitPrice),
      discount: parseFloat(discount) || 0,
      discountValue: discountValue,
      total: total,
      marketplace: marketplace,
      paymentMethod: paymentMethod,
      status: status,
      notes: notes.trim(),
      createdAt: new Date().toLocaleString('pt-BR')
    };

    sales.push(newSale);
    save(sales);
    return { success: true, message: 'Venda registrada com sucesso!' };
  }

  // Render sales table
  function renderSales() {
    const sales = getAll();
    const tbody = document.getElementById('salesTableBody');
    const emptyState = document.getElementById('emptyState');

    tbody.innerHTML = '';

    if (sales.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    // Show latest sales first
    [...sales].reverse().forEach(sale => {
      const row = document.createElement('tr');
      const statusClass = getStatusClass(sale.status);
      const statusLabel = getStatusLabel(sale.status);
      const marketplaceLabel = getMarketplaceLabel(sale.marketplace);
      const paymentLabel = getPaymentLabel(sale.paymentMethod);
      
      row.innerHTML = `
        <td><strong>${escapeHtml(sale.sku)}</strong></td>
        <td>${sale.quantity}</td>
        <td>R$ ${sale.unitPrice.toFixed(2)}</td>
        <td>${sale.discount > 0 ? sale.discount.toFixed(2) + '%' : '-'}</td>
        <td><strong>R$ ${sale.total.toFixed(2)}</strong></td>
        <td>${marketplaceLabel}</td>
        <td>${paymentLabel}</td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td>${sale.createdAt}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Update sales summary
  function updateSalesSummary() {
    const sales = getAll();
    const summaryEl = document.getElementById('salesSummary');

    if (sales.length === 0) {
      summaryEl.style.display = 'none';
      return;
    }

    summaryEl.style.display = 'block';

    const totalSales = sales.length;
    const totalQuantity = sales.reduce((sum, s) => sum + s.quantity, 0);
    const totalValue = sales.reduce((sum, s) => sum + s.total, 0);
    const averageTicket = totalValue / totalSales;

    document.getElementById('totalSales').textContent = totalSales;
    document.getElementById('totalQuantity').textContent = totalQuantity;
    document.getElementById('totalValue').textContent = 'R$ ' + totalValue.toFixed(2);
    document.getElementById('averageTicket').textContent = 'R$ ' + averageTicket.toFixed(2);
  }

  // Setup form submission
  function setupForm() {
    const form = document.getElementById('saleForm');
    const successMessage = document.getElementById('successMessage');

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const sku = document.getElementById('productSku').value;
      const quantity = document.getElementById('quantity').value;
      const unitPrice = document.getElementById('unitPrice').value;
      const discount = document.getElementById('discount').value;
      const marketplace = document.getElementById('marketplace').value;
      const paymentMethod = document.getElementById('paymentMethod').value;
      const status = document.getElementById('saleStatus').value;
      const notes = document.getElementById('notes').value;

      const result = add(sku, quantity, unitPrice, discount, marketplace, paymentMethod, status, notes);

      if (result.success) {
        form.reset();
        renderSales();
        updateSalesSummary();
        
        // Show success message
        successMessage.style.display = 'block';
        setTimeout(() => {
          successMessage.style.display = 'none';
        }, 3000);

        clearErrors();
      } else {
        showError('skuError', result.message);
      }
    });
  }

  // Get status CSS class
  function getStatusClass(status) {
    const statusMap = {
      'pendente': 'status-inativo',
      'confirmada': 'status-ativo',
      'enviada': 'status-ativo',
      'entregue': 'status-ativo',
      'cancelada': 'status-inativo'
    };
    return statusMap[status] || 'status-inativo';
  }

  // Get status label
  function getStatusLabel(status) {
    const statusMap = {
      'pendente': 'Pendente',
      'confirmada': 'Confirmada',
      'enviada': 'Enviada',
      'entregue': 'Entregue',
      'cancelada': 'Cancelada'
    };
    return statusMap[status] || 'Desconhecido';
  }

  // Get marketplace label
  function getMarketplaceLabel(marketplace) {
    const marketplaceMap = {
      'mercado-livre': '🔵 Mercado Livre',
      'b2b-brasil': '🏢 B2B Brasil',
      'amazon': '🔶 Amazon',
      'shopee': '🛍️ Shopee',
      'loja-propria': '🏪 Loja Própria',
      'outro': 'Outro'
    };
    return marketplaceMap[marketplace] || marketplace;
  }

  // Get payment method label
  function getPaymentLabel(method) {
    const methodMap = {
      'cartao-credito': '💳 Crédito',
      'cartao-debito': '💳 Débito',
      'boleto': '📄 Boleto',
      'pix': '📱 PIX',
      'dinheiro': '💵 Dinheiro',
      'cheque': '📋 Cheque'
    };
    return methodMap[method] || method;
  }

  // Show error message
  function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
  }

  // Clear all errors
  function clearErrors() {
    document.querySelectorAll('.form-error').forEach(el => {
      el.textContent = '';
      el.classList.remove('show');
    });
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return {
    init,
    getAll,
    add,
    renderSales,
    updateSalesSummary
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  salesModule.init();
});
