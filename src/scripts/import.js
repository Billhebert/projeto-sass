/**
 * CSV Import Module
 * Handles bulk import of products, sales, and categories via CSV files
 */

const importModule = (() => {
  // Private variables
  let productsData = [];
  let salesData = [];
  let categoriesData = [];

  // Helper function to parse CSV content
  function parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }

    return data;
  }

  // Helper to show notification
  function showNotification(message, type = 'success') {
    const resultDiv = document.getElementById(type === 'error' ? 'productsResult' : 'productsResult');
    const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
    
    const alertHTML = `
      <div style="margin-top: 15px; padding: 12px 15px; background: ${type === 'error' ? '#fee' : '#efe'}; 
                  border: 1px solid ${type === 'error' ? '#fcc' : '#cfc'}; border-radius: 4px; color: ${type === 'error' ? '#c00' : '#060'}; font-size: 13px;">
        ${type === 'error' ? '❌' : '✅'} ${message}
      </div>
    `;
    
    return alertHTML;
  }

  // Helper to generate unique ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ==================== PRODUCTS ====================

  function previewProducts() {
    const fileInput = document.getElementById('productsFile');
    
    if (!fileInput.files.length) {
      alert('Por favor, selecione um arquivo CSV');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csvContent = e.target.result;
        productsData = parseCSV(csvContent);

        if (productsData.length === 0) {
          alert('Arquivo CSV vazio ou inválido');
          return;
        }

        // Validate required fields
        const isValid = productsData.every(row => row.sku && row.estoque !== undefined && row.status);
        if (!isValid) {
          alert('Arquivo com campos obrigatórios faltando. Verifique: SKU, Estoque e Status');
          return;
        }

        // Show preview
        const previewDiv = document.getElementById('productsPreview');
        const tableBody = document.getElementById('productsPreviewTable');
        
        tableBody.innerHTML = '';
        productsData.slice(0, 10).forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${row.sku}</td>
            <td>${row.estoque}</td>
            <td>${row.status}</td>
          `;
          tableBody.appendChild(tr);
        });

        previewDiv.style.display = 'block';
        
        if (productsData.length > 10) {
          const moreDiv = document.createElement('div');
          moreDiv.style.fontSize = '12px';
          moreDiv.style.color = '#999';
          moreDiv.style.marginTop = '10px';
          moreDiv.textContent = `... e ${productsData.length - 10} registros mais`;
          previewDiv.appendChild(moreDiv);
        }

      } catch (error) {
        alert('Erro ao processar arquivo: ' + error.message);
      }
    };

    reader.readAsText(file);
  }

  function importProducts() {
    if (productsData.length === 0) {
      alert('Primeiro, visualize o arquivo para validação');
      return;
    }

    try {
      // Get existing products
      const existingProducts = JSON.parse(localStorage.getItem('products') || '[]');
      const existingSKUs = new Set(existingProducts.map(p => p.sku));
      
      // Get existing stock
      const stock = JSON.parse(localStorage.getItem('product_stock') || '{}');

      let imported = 0;
      let skipped = 0;
      const errors = [];

      productsData.forEach(row => {
        // Validate SKU format
        if (!/^[A-Za-z0-9\-]{3,}$/.test(row.sku)) {
          errors.push(`SKU inválido: ${row.sku}`);
          skipped++;
          return;
        }

        // Check if SKU already exists
        if (existingSKUs.has(row.sku)) {
          skipped++;
          return;
        }

        // Add product
        const product = {
          id: generateId(),
          sku: row.sku.toUpperCase(),
          dataCadastro: new Date().toISOString().split('T')[0],
          status: row.status.toLowerCase() === 'ativo' ? 'ativo' : 'inativo'
        };

        existingProducts.push(product);

        // Add stock
        stock[row.sku.toUpperCase()] = parseInt(row.estoque) || 0;

        imported++;
      });

      // Save data
      localStorage.setItem('products', JSON.stringify(existingProducts));
      localStorage.setItem('product_stock', JSON.stringify(stock));

      // Show result
      const resultDiv = document.getElementById('productsResult');
      let message = `✅ ${imported} produtos importados com sucesso!`;
      if (skipped > 0) {
        message += ` (${skipped} pulados)`;
      }
      if (errors.length > 0) {
        message += `<br><br>Erros:<br>` + errors.slice(0, 5).join('<br>');
      }

      resultDiv.innerHTML = `
        <div style="margin-top: 15px; padding: 12px 15px; background: #efe; border: 1px solid #cfc; border-radius: 4px; color: #060; font-size: 13px;">
          ${message}
        </div>
      `;

      // Reset form
      document.getElementById('productsFile').value = '';
      document.getElementById('productsPreview').style.display = 'none';
      productsData = [];

    } catch (error) {
      const resultDiv = document.getElementById('productsResult');
      resultDiv.innerHTML = `
        <div style="margin-top: 15px; padding: 12px 15px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c00; font-size: 13px;">
          ❌ Erro ao importar: ${error.message}
        </div>
      `;
    }
  }

  // ==================== SALES ====================

  function previewSales() {
    const fileInput = document.getElementById('salesFile');
    
    if (!fileInput.files.length) {
      alert('Por favor, selecione um arquivo CSV');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csvContent = e.target.result;
        salesData = parseCSV(csvContent);

        if (salesData.length === 0) {
          alert('Arquivo CSV vazio ou inválido');
          return;
        }

        // Validate required fields
        const requiredFields = ['sku', 'quantidade', 'precunitario', 'marketplace', 'pagamento', 'status'];
        const isValid = salesData.every(row => requiredFields.every(field => row[field]));
        
        if (!isValid) {
          alert('Arquivo com campos obrigatórios faltando.\nVerifique: SKU, Quantidade, PrecoUnitario, Marketplace, Pagamento, Status');
          return;
        }

        // Show preview
        const previewDiv = document.getElementById('salesPreview');
        const tableBody = document.getElementById('salesPreviewTable');
        
        tableBody.innerHTML = '';
        salesData.slice(0, 10).forEach(row => {
          const tr = document.createElement('tr');
          const total = (parseFloat(row.precunitario) * parseInt(row.quantidade) * (1 - parseFloat(row.desconto || 0) / 100)).toFixed(2);
          
          tr.innerHTML = `
            <td>${row.sku}</td>
            <td>${row.quantidade}</td>
            <td>R$ ${parseFloat(row.precunitario).toFixed(2)}</td>
            <td>${row.marketplace}</td>
            <td>${row.pagamento}</td>
          `;
          tableBody.appendChild(tr);
        });

        previewDiv.style.display = 'block';
        
        if (salesData.length > 10) {
          const moreDiv = document.createElement('div');
          moreDiv.style.fontSize = '12px';
          moreDiv.style.color = '#999';
          moreDiv.style.marginTop = '10px';
          moreDiv.textContent = `... e ${salesData.length - 10} registros mais`;
          previewDiv.appendChild(moreDiv);
        }

      } catch (error) {
        alert('Erro ao processar arquivo: ' + error.message);
      }
    };

    reader.readAsText(file);
  }

  function importSales() {
    if (salesData.length === 0) {
      alert('Primeiro, visualize o arquivo para validação');
      return;
    }

    try {
      const existingSales = JSON.parse(localStorage.getItem('sales') || '[]');
      const validMarketplaces = ['mercado-livre', 'b2b', 'amazon', 'shopee', 'propria'];
      const validPayments = ['cartao-credito', 'cartao-debito', 'pix', 'boleto', 'dinheiro', 'cheque'];
      const validStatus = ['pendente', 'confirmada', 'enviada', 'entregue', 'cancelada'];

      let imported = 0;
      let skipped = 0;
      const errors = [];

      salesData.forEach(row => {
        // Validate marketplace
        const marketplace = row.marketplace.toLowerCase().replace(' ', '-');
        if (!validMarketplaces.includes(marketplace)) {
          errors.push(`Marketplace inválido: ${row.marketplace}`);
          skipped++;
          return;
        }

        // Validate payment method
        const paymentMethod = row.pagamento.toLowerCase().replace(' ', '-');
        if (!validPayments.includes(paymentMethod)) {
          errors.push(`Pagamento inválido: ${row.pagamento}`);
          skipped++;
          return;
        }

        // Validate status
        const status = row.status.toLowerCase();
        if (!validStatus.includes(status)) {
          errors.push(`Status inválido: ${row.status}`);
          skipped++;
          return;
        }

        // Add sale
        const quantity = parseInt(row.quantidade) || 0;
        const unitPrice = parseFloat(row.precunitario) || 0;
        const discount = parseFloat(row.desconto || 0);
        const total = quantity * unitPrice * (1 - discount / 100);

        const sale = {
          id: generateId(),
          sku: row.sku.toUpperCase(),
          quantity: quantity,
          unitPrice: unitPrice,
          discount: discount,
          total: parseFloat(total.toFixed(2)),
          marketplace: marketplace,
          paymentMethod: paymentMethod,
          status: status,
          createdAt: new Date().toISOString()
        };

        existingSales.push(sale);
        imported++;
      });

      // Save data
      localStorage.setItem('sales', JSON.stringify(existingSales));

      // Show result
      const resultDiv = document.getElementById('salesResult');
      let message = `✅ ${imported} vendas importadas com sucesso!`;
      if (skipped > 0) {
        message += ` (${skipped} puladas)`;
      }
      if (errors.length > 0) {
        message += `<br><br>Erros:<br>` + errors.slice(0, 5).join('<br>');
      }

      resultDiv.innerHTML = `
        <div style="margin-top: 15px; padding: 12px 15px; background: #efe; border: 1px solid #cfc; border-radius: 4px; color: #060; font-size: 13px;">
          ${message}
        </div>
      `;

      // Reset form
      document.getElementById('salesFile').value = '';
      document.getElementById('salesPreview').style.display = 'none';
      salesData = [];

    } catch (error) {
      const resultDiv = document.getElementById('salesResult');
      resultDiv.innerHTML = `
        <div style="margin-top: 15px; padding: 12px 15px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c00; font-size: 13px;">
          ❌ Erro ao importar: ${error.message}
        </div>
      `;
    }
  }

  // ==================== CATEGORIES ====================

  function previewCategories() {
    const fileInput = document.getElementById('categoriesFile');
    
    if (!fileInput.files.length) {
      alert('Por favor, selecione um arquivo CSV');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csvContent = e.target.result;
        categoriesData = parseCSV(csvContent);

        if (categoriesData.length === 0) {
          alert('Arquivo CSV vazio ou inválido');
          return;
        }

        // Validate required fields
        const isValid = categoriesData.every(row => row.nome && row.descricao !== undefined && row.status);
        if (!isValid) {
          alert('Arquivo com campos obrigatórios faltando. Verifique: Nome, Descrição e Status');
          return;
        }

        // Show preview
        const previewDiv = document.getElementById('categoriesPreview');
        const tableBody = document.getElementById('categoriesPreviewTable');
        
        tableBody.innerHTML = '';
        categoriesData.slice(0, 10).forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${row.nome}</td>
            <td>${row.descricao.substring(0, 50)}${row.descricao.length > 50 ? '...' : ''}</td>
            <td>${row.status}</td>
          `;
          tableBody.appendChild(tr);
        });

        previewDiv.style.display = 'block';
        
        if (categoriesData.length > 10) {
          const moreDiv = document.createElement('div');
          moreDiv.style.fontSize = '12px';
          moreDiv.style.color = '#999';
          moreDiv.style.marginTop = '10px';
          moreDiv.textContent = `... e ${categoriesData.length - 10} registros mais`;
          previewDiv.appendChild(moreDiv);
        }

      } catch (error) {
        alert('Erro ao processar arquivo: ' + error.message);
      }
    };

    reader.readAsText(file);
  }

  function importCategories() {
    if (categoriesData.length === 0) {
      alert('Primeiro, visualize o arquivo para validação');
      return;
    }

    try {
      const existingCategories = JSON.parse(localStorage.getItem('categories') || '[]');
      const existingNames = new Set(existingCategories.map(c => c.name.toLowerCase()));
      
      let imported = 0;
      let skipped = 0;
      const errors = [];

      categoriesData.forEach(row => {
        // Check if category name already exists
        if (existingNames.has(row.nome.toLowerCase())) {
          skipped++;
          return;
        }

        // Add category
        const category = {
          id: generateId(),
          name: row.nome,
          description: row.descricao || '',
          status: row.status.toLowerCase() === 'ativo' ? 'ativo' : 'inativo',
          productCount: 0
        };

        existingCategories.push(category);
        imported++;
      });

      // Save data
      localStorage.setItem('categories', JSON.stringify(existingCategories));

      // Show result
      const resultDiv = document.getElementById('categoriesResult');
      let message = `✅ ${imported} categorias importadas com sucesso!`;
      if (skipped > 0) {
        message += ` (${skipped} puladas)`;
      }
      if (errors.length > 0) {
        message += `<br><br>Erros:<br>` + errors.slice(0, 5).join('<br>');
      }

      resultDiv.innerHTML = `
        <div style="margin-top: 15px; padding: 12px 15px; background: #efe; border: 1px solid #cfc; border-radius: 4px; color: #060; font-size: 13px;">
          ${message}
        </div>
      `;

      // Reset form
      document.getElementById('categoriesFile').value = '';
      document.getElementById('categoriesPreview').style.display = 'none';
      categoriesData = [];

    } catch (error) {
      const resultDiv = document.getElementById('categoriesResult');
      resultDiv.innerHTML = `
        <div style="margin-top: 15px; padding: 12px 15px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c00; font-size: 13px;">
          ❌ Erro ao importar: ${error.message}
        </div>
      `;
    }
  }

  // Public API
  return {
    previewProducts,
    importProducts,
    previewSales,
    importSales,
    previewCategories,
    importCategories
  };
})();
