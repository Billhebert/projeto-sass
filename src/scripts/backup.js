// Backup and Restore Module

const backupModule = (() => {
  const BACKUP_VERSION = '1.0';

  // Create backup of all data
  function createBackup() {
    const backupData = {
      version: BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      data: {
        products: JSON.parse(localStorage.getItem('products') || '[]'),
        categories: JSON.parse(localStorage.getItem('categories') || '[]'),
        sales: JSON.parse(localStorage.getItem('sales') || '[]'),
        product_stock: JSON.parse(localStorage.getItem('product_stock') || '{}'),
        stock_movements: JSON.parse(localStorage.getItem('stock_movements') || '[]'),
        account_settings: JSON.parse(localStorage.getItem('account_settings') || '{}'),
        company_settings: JSON.parse(localStorage.getItem('company_settings') || '{}'),
        notifications_settings: JSON.parse(localStorage.getItem('notifications_settings') || '{}'),
        preferences_settings: JSON.parse(localStorage.getItem('preferences_settings') || '{}'),
        authUser: JSON.parse(localStorage.getItem('authUser') || '{}')
      }
    };

    return backupData;
  }

  // Download backup as JSON
  function downloadBackup() {
    const backup = createBackup();
    const fileName = `backup-${new Date().toISOString().slice(0, 10)}.json`;
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = fileName;
    link.click();

    alert('✓ Backup criado com sucesso!\nArquivo: ' + fileName);
  }

  // Restore backup from file
  function restoreBackup(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const backupData = JSON.parse(e.target.result);

        // Validate backup structure
        if (!backupData.version || !backupData.data) {
          alert('❌ Arquivo de backup inválido!');
          return;
        }

        // Confirm restore
        if (!confirm('Tem certeza? Isto substituirá todos os dados atuais.\n\nClique OK para confirmar.')) {
          return;
        }

        // Restore data
        localStorage.setItem('products', JSON.stringify(backupData.data.products || []));
        localStorage.setItem('categories', JSON.stringify(backupData.data.categories || []));
        localStorage.setItem('sales', JSON.stringify(backupData.data.sales || []));
        localStorage.setItem('product_stock', JSON.stringify(backupData.data.product_stock || {}));
        localStorage.setItem('stock_movements', JSON.stringify(backupData.data.stock_movements || []));
        localStorage.setItem('account_settings', JSON.stringify(backupData.data.account_settings || {}));
        localStorage.setItem('company_settings', JSON.stringify(backupData.data.company_settings || {}));
        localStorage.setItem('notifications_settings', JSON.stringify(backupData.data.notifications_settings || {}));
        localStorage.setItem('preferences_settings', JSON.stringify(backupData.data.preferences_settings || {}));

        alert('✓ Dados restaurados com sucesso!\n\nA página será recarregada.');
        location.reload();
      } catch (error) {
        alert('❌ Erro ao restaurar backup: ' + error.message);
      }
    };
    reader.readAsText(file);
  }

  // Get backup info
  function getBackupInfo() {
    const backup = createBackup();
    return {
      timestamp: backup.timestamp,
      products: backup.data.products.length,
      categories: backup.data.categories.length,
      sales: backup.data.sales.length,
      movements: backup.data.stock_movements.length
    };
  }

  // Clear all data
  function clearAllData() {
    if (!confirm('Tem certeza? Esta ação não pode ser desfeita!\n\nClique OK para deletar todos os dados.')) {
      return;
    }

    if (!confirm('ÚLTIMA CONFIRMAÇÃO: Você realmente deseja deletar TODOS os dados do sistema?')) {
      return;
    }

    // Clear all localStorage items
    const keys = [
      'products', 'categories', 'sales', 'product_stock', 'stock_movements',
      'account_settings', 'company_settings', 'notifications_settings', 'preferences_settings',
      'authToken', 'authUser', 'authExpiry'
    ];

    keys.forEach(key => localStorage.removeItem(key));
    
    alert('✓ Todos os dados foram deletados.\n\nVocê será redirecionado para o login.');
    window.location.href = '../../login.html';
  }

  return {
    createBackup,
    downloadBackup,
    restoreBackup,
    getBackupInfo,
    clearAllData
  };
})();
