// Backup and Restore Module
// Comprehensive backup/restore with error handling and data validation

const backupModule = (() => {
  const BACKUP_VERSION = '1.0';

  // Utility: Safe localStorage read
  function safeGetItem(key, defaultValue = '[]') {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (error) {
      console.error('localStorage.getItem error:', { key, error: error.message });
      return defaultValue;
    }
  }

  // Utility: Safe JSON parse
  function safeJsonParse(jsonString, defaultValue) {
    try {
      if (!jsonString) return defaultValue;
      const parsed = JSON.parse(jsonString);
      return parsed;
    } catch (error) {
      console.error('JSON.parse error:', { error: error.message, input: jsonString?.substring(0, 100) });
      return defaultValue;
    }
  }

  // Utility: Validate backup structure
  function validateBackupStructure(backup) {
    if (!backup || typeof backup !== 'object') {
      return false;
    }
    if (!backup.version || !backup.data || typeof backup.data !== 'object') {
      return false;
    }
    return true;
  }

  // Utility: Deep clone backup data safely
  function cloneBackupData(backup) {
    try {
      return JSON.parse(JSON.stringify(backup));
    } catch (error) {
      console.error('Error cloning backup data:', error);
      return null;
    }
  }

  // Create backup of all data
  function createBackup() {
    try {
      const backupData = {
        version: BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        data: {
          products: safeJsonParse(safeGetItem('products'), []),
          categories: safeJsonParse(safeGetItem('categories'), []),
          sales: safeJsonParse(safeGetItem('sales'), []),
          product_stock: safeJsonParse(safeGetItem('product_stock'), {}),
          stock_movements: safeJsonParse(safeGetItem('stock_movements'), []),
          account_settings: safeJsonParse(safeGetItem('account_settings'), {}),
          company_settings: safeJsonParse(safeGetItem('company_settings'), {}),
          notifications_settings: safeJsonParse(safeGetItem('notifications_settings'), {}),
          preferences_settings: safeJsonParse(safeGetItem('preferences_settings'), {}),
          authUser: safeJsonParse(safeGetItem('authUser'), {})
        }
      };

      // Validate that all data sections are arrays/objects
      Object.keys(backupData.data).forEach(key => {
        const value = backupData.data[key];
        if (value === null || value === undefined) {
          if (key.includes('stock') || key.includes('settings') || key.includes('authUser')) {
            backupData.data[key] = {};
          } else {
            backupData.data[key] = [];
          }
        }
      });

      return backupData;
    } catch (error) {
      console.error('createBackup error:', error);
      return null;
    }
  }

  // Download backup as JSON
  function downloadBackup() {
    try {
      const backup = createBackup();
      if (!backup) {
        alert('❌ Erro ao criar backup. Verifique o console.');
        return;
      }

      const fileName = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      
      try {
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        if (!link) {
          throw new Error('Failed to create download link element');
        }

        link.href = URL.createObjectURL(dataBlob);
        link.download = fileName;
        
        // Attempt to click
        try {
          link.click();
        } catch (err) {
          console.error('Error clicking download link:', err);
          alert('❌ Erro ao baixar backup: ' + err.message);
          return;
        }

        alert('✓ Backup criado com sucesso!\nArquivo: ' + fileName);
      } catch (error) {
        console.error('Error creating backup file:', error);
        alert('❌ Erro ao criar arquivo de backup: ' + error.message);
      }
    } catch (error) {
      console.error('downloadBackup error:', error);
      alert('❌ Erro ao download backup: ' + error.message);
    }
  }

  // Restore backup from file
  function restoreBackup(fileInput) {
    try {
      if (!fileInput || !fileInput.files) {
        console.error('Invalid file input');
        alert('❌ Entrada de arquivo inválida');
        return;
      }

      const file = fileInput.files[0];
      if (!file) {
        console.warn('No file selected');
        return;
      }

      // Validate file type
      if (!file.type.includes('json') && !file.name.endsWith('.json')) {
        alert('❌ Por favor, selecione um arquivo JSON válido.');
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('❌ Arquivo muito grande. Máximo: 10MB');
        return;
      }

      const reader = new FileReader();
      
      reader.onerror = function(error) {
        console.error('FileReader error:', error);
        alert('❌ Erro ao ler arquivo: ' + error.message);
      };

      reader.onload = function(e) {
        try {
          const backupData = safeJsonParse(e.target.result);

          // Validate backup structure
          if (!validateBackupStructure(backupData)) {
            alert('❌ Arquivo de backup inválido!\nEstrutura não reconhecida.');
            return;
          }

          // Confirm restore
          if (!confirm('Tem certeza? Isto substituirá todos os dados atuais.\n\nClique OK para confirmar.')) {
            return;
          }

          // Create safe copy before restoring
          const clonedData = cloneBackupData(backupData.data);
          if (!clonedData) {
            alert('❌ Erro ao processar dados do backup.');
            return;
          }

          // Restore data with error handling
          const restoreErrors = [];

          const restoreItems = [
            { key: 'products', fallback: [] },
            { key: 'categories', fallback: [] },
            { key: 'sales', fallback: [] },
            { key: 'product_stock', fallback: {} },
            { key: 'stock_movements', fallback: [] },
            { key: 'account_settings', fallback: {} },
            { key: 'company_settings', fallback: {} },
            { key: 'notifications_settings', fallback: {} },
            { key: 'preferences_settings', fallback: {} }
          ];

          restoreItems.forEach(({ key, fallback }) => {
            try {
              const dataToRestore = clonedData[key] || fallback;
              localStorage.setItem(key, JSON.stringify(dataToRestore));
            } catch (error) {
              console.error(`Error restoring ${key}:`, error);
              restoreErrors.push(key);
            }
          });

          if (restoreErrors.length > 0) {
            alert(`⚠️  Backup restaurado parcialmente.\nErros em: ${restoreErrors.join(', ')}`);
          } else {
            alert('✓ Dados restaurados com sucesso!\n\nA página será recarregada.');
          }

          try {
            location.reload();
          } catch (reloadError) {
            console.error('Error reloading page:', reloadError);
            alert('⚠️  Dados restaurados. Por favor, recarregue a página manualmente.');
          }
        } catch (error) {
          console.error('Error in FileReader.onload:', error);
          alert('❌ Erro ao restaurar backup: ' + error.message);
        }
      };

      try {
        reader.readAsText(file);
      } catch (error) {
        console.error('Error reading file:', error);
        alert('❌ Erro ao ler arquivo: ' + error.message);
      }
    } catch (error) {
      console.error('restoreBackup error:', error);
      alert('❌ Erro ao restaurar backup: ' + error.message);
    }
  }

  // Get backup info
  function getBackupInfo() {
    try {
      const backup = createBackup();
      if (!backup) {
        return null;
      }

      return {
        timestamp: backup.timestamp,
        products: Array.isArray(backup.data.products) ? backup.data.products.length : 0,
        categories: Array.isArray(backup.data.categories) ? backup.data.categories.length : 0,
        sales: Array.isArray(backup.data.sales) ? backup.data.sales.length : 0,
        movements: Array.isArray(backup.data.stock_movements) ? backup.data.stock_movements.length : 0,
        sizeEstimate: Math.round(JSON.stringify(backup).length / 1024) + ' KB'
      };
    } catch (error) {
      console.error('getBackupInfo error:', error);
      return null;
    }
  }

  // Clear all data
  function clearAllData() {
    try {
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
        'authToken', 'authUser', 'authExpiry', 'analytics_history', 'dashboard_widgets',
        'dashboard_presets', 'scheduled_reports'
      ];

      const clearErrors = [];
      keys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error(`Error removing ${key}:`, error);
          clearErrors.push(key);
        }
      });

      if (clearErrors.length > 0) {
        alert(`⚠️  Maioria dos dados foi deletada.\nErros em: ${clearErrors.join(', ')}`);
      } else {
        alert('✓ Todos os dados foram deletados.\n\nVocê será redirecionado para o login.');
      }

      try {
        window.location.href = '../../login.html';
      } catch (error) {
        console.error('Error redirecting:', error);
        alert('⚠️  Dados deletados. Por favor, navegue até a página de login manualmente.');
      }
    } catch (error) {
      console.error('clearAllData error:', error);
      alert('❌ Erro ao deletar dados: ' + error.message);
    }
  }

  return {
    createBackup,
    downloadBackup,
    restoreBackup,
    getBackupInfo,
    clearAllData
  };
})();
