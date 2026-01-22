// ======================
// PRODUCTS PAGE STATE
// ======================

const productsApp = {
  products: JSON.parse(localStorage.getItem('products')) || [],

  init() {
    this.setupFormHandlers();
    this.renderTable();
  },

  // Setup form event handlers
  setupFormHandlers() {
    const form = document.getElementById('productForm');
    const skuInput = document.getElementById('sku');
    const successMessage = document.getElementById('successMessage');

    // Form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Input validation on change
    skuInput.addEventListener('change', () => {
      this.validateSKU();
    });

    // Clear error on input
    skuInput.addEventListener('input', () => {
      const errorDiv = document.getElementById('skuError');
      errorDiv.classList.remove('show');
    });

    // Auto-hide success message
    if (successMessage) {
      const observer = new MutationObserver(() => {
        if (successMessage.style.display !== 'none') {
          setTimeout(() => {
            successMessage.style.display = 'none';
          }, 3000);
        }
      });
      
      observer.observe(successMessage, { attributes: true });
    }
  },

  // Validate SKU format
  validateSKU() {
    const skuInput = document.getElementById('sku');
    const errorDiv = document.getElementById('skuError');
    const sku = skuInput.value.trim();

    // Check if empty
    if (!sku) {
      errorDiv.textContent = 'SKU é obrigatório';
      errorDiv.classList.add('show');
      return false;
    }

    // Check format (letters, numbers, hyphens, min 3 chars)
    const skuRegex = /^[A-Za-z0-9\-]{3,}$/;
    if (!skuRegex.test(sku)) {
      errorDiv.textContent = 'Formato inválido: use letras, números e hífens (mínimo 3 caracteres)';
      errorDiv.classList.add('show');
      return false;
    }

    // Check for duplicates
    if (this.products.some(p => p.sku.toUpperCase() === sku.toUpperCase())) {
      errorDiv.textContent = 'Este SKU já está cadastrado';
      errorDiv.classList.add('show');
      return false;
    }

    errorDiv.classList.remove('show');
    return true;
  },

  // Handle form submission
  handleSubmit() {
    if (!this.validateSKU()) {
      return;
    }

    const skuInput = document.getElementById('sku');
    const sku = skuInput.value.trim().toUpperCase();

    // Create product object
    const product = {
      id: Date.now(),
      sku: sku,
      dataCadastro: new Date().toLocaleDateString('pt-BR'),
      status: 'ativo'
    };

    // Add to products array
    this.products.unshift(product);

    // Save to localStorage
    localStorage.setItem('products', JSON.stringify(this.products));

    // Clear form
    skuInput.value = '';
    skuInput.focus();

    // Show success message
    const successMessage = document.getElementById('successMessage');
    successMessage.style.display = 'block';

    // Re-render table
    this.renderTable();
  },

  // Render products table
  renderTable() {
    const tbody = document.getElementById('productsTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableWrapper = document.querySelector('.products-table-wrapper');

    if (this.products.length === 0) {
      if (tableWrapper) tableWrapper.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    if (tableWrapper) tableWrapper.style.display = 'block';
    emptyState.style.display = 'none';

    tbody.innerHTML = this.products.map(product => `
      <tr>
        <td>
          <span style="font-family: 'Courier New', monospace; font-weight: 600;">
            ${product.sku}
          </span>
        </td>
        <td>${product.dataCadastro}</td>
        <td>
          <span class="status-badge status-${product.status}">
            ${product.status === 'ativo' ? '✓ Ativo' : '✗ Inativo'}
          </span>
        </td>
        <td>
          <div class="product-actions">
            <button class="action-btn" onclick="productsApp.editProduct(${product.id})" title="Editar">
              ✎ Editar
            </button>
            <button class="action-btn delete" onclick="productsApp.deleteProduct(${product.id})" title="Deletar">
              🗑 Deletar
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  // Edit product (placeholder)
  editProduct(id) {
    const product = this.products.find(p => p.id === id);
    if (product) {
      alert(`Editar: ${product.sku}\n(Funcionalidade em desenvolvimento)`);
    }
  },

  // Delete product
  deleteProduct(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;

    if (!confirm(`Tem certeza que deseja deletar o SKU "${product.sku}"?`)) {
      return;
    }

    // Remove from array
    this.products = this.products.filter(p => p.id !== id);

    // Save to localStorage
    localStorage.setItem('products', JSON.stringify(this.products));

    // Re-render table
    this.renderTable();
  }
};

// Logout function
function logout() {
  if (confirm('Deseja sair da sua conta?')) {
    authService.logout();
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  productsApp.init();
});
