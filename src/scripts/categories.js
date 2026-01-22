// Categories Management Module

const categoriesModule = (() => {
  const STORAGE_KEY = 'categories';

  // Initialize categories table
  function init() {
    renderCategories();
    setupForm();
  }

  // Get all categories from localStorage
  function getAll() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Save categories to localStorage
  function save(categories) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }

  // Add new category
  function add(name, description, status) {
    const categories = getAll();
    
    // Check for duplicates
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      return { success: false, message: 'Esta categoria já existe!' };
    }

    const newCategory = {
      id: 'cat-' + Date.now(),
      name: name.trim(),
      description: description.trim(),
      status: status,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      productCount: 0
    };

    categories.push(newCategory);
    save(categories);
    return { success: true, message: 'Categoria adicionada com sucesso!' };
  }

  // Update category
  function update(id, name, description, status) {
    const categories = getAll();
    const index = categories.findIndex(c => c.id === id);

    if (index === -1) {
      return { success: false, message: 'Categoria não encontrada!' };
    }

    // Check for duplicate name (excluding current category)
    if (categories.some((c, i) => i !== index && c.name.toLowerCase() === name.toLowerCase())) {
      return { success: false, message: 'Esta categoria já existe!' };
    }

    categories[index] = {
      ...categories[index],
      name: name.trim(),
      description: description.trim(),
      status: status
    };

    save(categories);
    return { success: true, message: 'Categoria atualizada com sucesso!' };
  }

  // Delete category
  function remove(id) {
    const categories = getAll();
    const filtered = categories.filter(c => c.id !== id);
    save(filtered);
    return { success: true, message: 'Categoria removida com sucesso!' };
  }

  // Render categories table
  function renderCategories() {
    const categories = getAll();
    const tbody = document.getElementById('categoriesTableBody');
    const emptyState = document.getElementById('emptyState');

    tbody.innerHTML = '';

    if (categories.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    categories.forEach(category => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${escapeHtml(category.name)}</strong></td>
        <td>${escapeHtml(category.description || '-')}</td>
        <td>
          <span class="status-badge status-${category.status}">
            ${category.status === 'ativo' ? 'Ativa' : 'Inativa'}
          </span>
        </td>
        <td>${category.productCount || 0}</td>
        <td>
          <div class="product-actions">
            <button class="action-btn" onclick="categoriesModule.editCategory('${category.id}')">✏️ Editar</button>
            <button class="action-btn delete" onclick="categoriesModule.deleteCategory('${category.id}')">🗑️ Deletar</button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  // Setup form submission
  function setupForm() {
    const form = document.getElementById('categoryForm');
    const successMessage = document.getElementById('successMessage');

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('categoryName').value;
      const description = document.getElementById('categoryDescription').value;
      const status = document.getElementById('categoryStatus').value;

      const result = add(name, description, status);

      if (result.success) {
        form.reset();
        renderCategories();
        
        // Show success message
        successMessage.style.display = 'block';
        setTimeout(() => {
          successMessage.style.display = 'none';
        }, 3000);

        clearErrors();
      } else {
        showError('nameError', result.message);
      }
    });
  }

  // Edit category (shows modal/alert for now)
  function editCategory(id) {
    const categories = getAll();
    const category = categories.find(c => c.id === id);

    if (!category) return;

    const newName = prompt('Nome da categoria:', category.name);
    if (newName === null) return;

    if (newName.trim().length < 3) {
      alert('O nome da categoria deve ter pelo menos 3 caracteres');
      return;
    }

    const newDescription = prompt('Descrição:', category.description);
    const result = update(id, newName, newDescription || '', category.status);

    if (result.success) {
      renderCategories();
      alert(result.message);
    } else {
      alert(result.message);
    }
  }

  // Delete category
  function deleteCategory(id) {
    const categories = getAll();
    const category = categories.find(c => c.id === id);

    if (!category) return;

    if (confirm(`Tem certeza que deseja deletar a categoria "${category.name}"?`)) {
      const result = remove(id);
      if (result.success) {
        renderCategories();
        alert(result.message);
      }
    }
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
    update,
    remove,
    renderCategories,
    editCategory,
    deleteCategory
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  categoriesModule.init();
});
