// ======================
// PRODUCTS PAGE STATE
// ======================

const productsApp = {
  products: JSON.parse(localStorage.getItem('products')) || [],
  filteredProducts: [],

  init() {
    this.setupFormHandlers();
    this.setupEditModal();
    this.setupSearchAndFilter();
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

  // Setup search and filter
  setupSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) {
      searchInput.addEventListener('input', () => this.applyFilters());
    }
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.applyFilters());
    }
  },

  // Apply search and filter
  applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusValue = statusFilter ? statusFilter.value : '';

    this.filteredProducts = this.products.filter(product => {
      const matchesSearch = !searchTerm || product.sku.toLowerCase().includes(searchTerm);
      const matchesStatus = !statusValue || product.status === statusValue;
      return matchesSearch && matchesStatus;
    });

    this.renderTable();
  },

  // Setup edit modal
  setupEditModal() {
    const modalHTML = `
      <div id="editModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
        <div class="modal-content" style="background: white; border-radius: 8px; padding: 30px; max-width: 500px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 20px;">Editar Produto</h2>
            <button onclick="productsApp.closeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
          </div>
          
          <form id="editForm" style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px;">SKU</label>
              <input type="text" id="editSku" placeholder="SKU" style="width: 100%; padding: 10px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 13px;" required>
            </div>
            
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px;">Status</label>
              <select id="editStatus" style="width: 100%; padding: 10px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 13px;">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 10px;">
              <button type="submit" style="flex: 1; padding: 10px; background: #5D4DB3; color: white; border: none; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer;">Salvar</button>
              <button type="button" onclick="productsApp.closeModal()" style="flex: 1; padding: 10px; background: #e0e0e0; color: #333; border: none; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('editForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProductEdit();
    });
  },

  // Show edit modal
  showEditModal(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;

    this.editingProductId = id;
    document.getElementById('editSku').value = product.sku;
    document.getElementById('editStatus').value = product.status;
    document.getElementById('editModal').style.display = 'flex';
  },

  // Close edit modal
  closeModal() {
    document.getElementById('editModal').style.display = 'none';
    this.editingProductId = null;
  },

  // Save product edit
  saveProductEdit() {
    const newSku = document.getElementById('editSku').value.trim().toUpperCase();
    const newStatus = document.getElementById('editStatus').value;

    if (!newSku) {
      alert('SKU não pode estar vazio');
      return;
    }

    const skuRegex = /^[A-Za-z0-9\-]{3,}$/;
    if (!skuRegex.test(newSku)) {
      alert('Formato inválido: use letras, números e hífens (mínimo 3 caracteres)');
      return;
    }

    // Check for duplicate SKU (excluding current product)
    if (this.products.some(p => p.id !== this.editingProductId && p.sku.toUpperCase() === newSku)) {
      alert('Este SKU já está cadastrado');
      return;
    }

    const product = this.products.find(p => p.id === this.editingProductId);
    if (product) {
      product.sku = newSku;
      product.status = newStatus;
      localStorage.setItem('products', JSON.stringify(this.products));
      this.renderTable();
      this.closeModal();
      alert('Produto atualizado com sucesso!');
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
    const productsToShow = this.filteredProducts.length > 0 ? this.filteredProducts : this.products;

    if (productsToShow.length === 0) {
      if (tableWrapper) tableWrapper.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    if (tableWrapper) tableWrapper.style.display = 'block';
    emptyState.style.display = 'none';

    tbody.innerHTML = productsToShow.map(product => `
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
            <button class="action-btn" onclick="productsApp.showEditModal(${product.id})" title="Editar">
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

  // Edit product (show modal)
  editProduct(id) {
    this.showEditModal(id);
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
