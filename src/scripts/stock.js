// Stock Management Module

const stockModule = (() => {
  const STORAGE_KEY = 'stock_movements';
  const STOCK_KEY = 'product_stock';

  // Initialize stock management
  function init() {
    populateProductDropdown();
    renderStockHistory();
    setupForm();
    setupProductChangeListener();
  }

  // Get all stock data
  function getAllStockData() {
    const data = localStorage.getItem(STOCK_KEY);
    return data ? JSON.parse(data) : {};
  }

  // Save stock data
  function saveStockData(stockData) {
    localStorage.setItem(STOCK_KEY, JSON.stringify(stockData));
  }

  // Get all movements
  function getAllMovements() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Save movements
  function saveMovements(movements) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(movements));
  }

  // Populate products dropdown
  function populateProductDropdown() {
    const products = document.querySelectorAll ? [] : [];
    try {
      const productsData = localStorage.getItem('products');
      if (productsData) {
        const parsed = JSON.parse(productsData);
        const select = document.getElementById('productSku');
        select.innerHTML = '<option value="">Selecione um produto...</option>';
        
        parsed.forEach(product => {
          const option = document.createElement('option');
          option.value = product.sku;
          option.textContent = `${product.sku}`;
          select.appendChild(option);
        });
      }
    } catch (e) {
      console.error('Erro ao carregar produtos:', e);
    }
  }

  // Setup product change listener
  function setupProductChangeListener() {
    const productSelect = document.getElementById('productSku');
    productSelect.addEventListener('change', (e) => {
      const sku = e.target.value;
      if (sku) {
        const currentStock = getProductStock(sku);
        document.getElementById('currentStock').value = currentStock;
      } else {
        document.getElementById('currentStock').value = 0;
      }
    });
  }

  // Get current stock for a product
  function getProductStock(sku) {
    const stockData = getAllStockData();
    return stockData[sku] || 0;
  }

  // Update product stock
  function updateStock(sku, quantityChange, notes) {
    const stockData = getAllStockData();
    const currentStock = stockData[sku] || 0;
    const newStock = currentStock + quantityChange;

    if (newStock < 0) {
      return { success: false, message: 'Quantidade final não pode ser negativa!' };
    }

    // Save new stock
    stockData[sku] = newStock;
    saveStockData(stockData);

    // Record movement
    const movements = getAllMovements();
    const movementType = quantityChange > 0 ? 'Entrada' : 'Saída';
    
    movements.push({
      id: 'mov-' + Date.now(),
      sku: sku,
      type: movementType,
      quantity: Math.abs(quantityChange),
      previousStock: currentStock,
      newStock: newStock,
      timestamp: new Date().toLocaleString('pt-BR'),
      notes: notes.trim()
    });

    saveMovements(movements);
    return { success: true, message: 'Estoque atualizado com sucesso!' };
  }

  // Render stock history
  function renderStockHistory() {
    const movements = getAllMovements();
    const tbody = document.getElementById('stockHistoryBody');
    const emptyState = document.getElementById('emptyState');

    tbody.innerHTML = '';

    if (movements.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    // Show latest movements first
    [...movements].reverse().forEach(movement => {
      const row = document.createElement('tr');
      const typeClass = movement.type === 'Entrada' ? 'status-ativo' : 'status-inativo';
      const typeEmoji = movement.type === 'Entrada' ? '📥' : '📤';
      
      row.innerHTML = `
        <td><strong>${escapeHtml(movement.sku)}</strong></td>
        <td>${typeEmoji} ${movement.type}</td>
        <td>${Math.abs(movement.quantity)}</td>
        <td>${movement.previousStock}</td>
        <td><strong>${movement.newStock}</strong></td>
        <td>${movement.timestamp}</td>
        <td>${escapeHtml(movement.notes || '-')}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Setup form submission
  function setupForm() {
    const form = document.getElementById('stockForm');
    const successMessage = document.getElementById('successMessage');

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const sku = document.getElementById('productSku').value;
      const quantityChange = parseInt(document.getElementById('quantityChange').value);
      const notes = document.getElementById('stockNotes').value;

      if (!sku) {
        showError('skuError', 'Selecione um produto');
        return;
      }

      if (isNaN(quantityChange) || quantityChange === 0) {
        showError('quantityError', 'Digite uma quantidade válida (diferente de zero)');
        return;
      }

      const result = updateStock(sku, quantityChange, notes);

      if (result.success) {
        document.getElementById('quantityChange').value = '';
        document.getElementById('stockNotes').value = '';
        renderStockHistory();
        
        // Update current stock display
        const currentStock = getProductStock(sku);
        document.getElementById('currentStock').value = currentStock;
        
        // Show success message
        successMessage.style.display = 'block';
        setTimeout(() => {
          successMessage.style.display = 'none';
        }, 3000);

        clearErrors();
      } else {
        showError('quantityError', result.message);
      }
    });
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
    getProductStock,
    updateStock,
    renderStockHistory
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  stockModule.init();
});
