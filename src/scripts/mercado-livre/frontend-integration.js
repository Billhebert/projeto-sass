/**
 * Frontend Integration Helper
 * Helper para facilitar integração do gerenciador de contas no frontend
 */

class MLFrontendIntegration {
  constructor(options = {}) {
    this.accountsManager = null;
    this.config = {
      apiBaseUrl: options.apiBaseUrl || 'http://localhost:3000/api',
      syncInterval: options.syncInterval || 5 * 60 * 1000,
      defaultLanguage: options.defaultLanguage || 'pt-BR',
      ...options,
    };
  }

  /**
   * Inicializar integração
   */
  async init() {
    try {
      // Carregamnto dinâmico dos scripts necessários
      await this._loadScripts();

      // Inicializar gerenciador
      this.accountsManager = new MLAccountsManager({
        apiBaseUrl: this.config.apiBaseUrl,
        syncInterval: this.config.syncInterval,
      });

      // Configurar listeners
      this._setupListeners();

      // Carregar contas existentes
      this._loadExistingAccounts();

      return true;
    } catch (error) {
      console.error('Erro ao inicializar integração:', error);
      throw error;
    }
  }

  /**
   * Carregar scripts necessários
   */
  async _loadScripts() {
    const scripts = [
      '/src/scripts/mercado-livre/accounts-manager.js',
      '/src/scripts/mercado-livre/oauth-handler.js',
    ];

    for (const scriptPath of scripts) {
      if (!document.querySelector(`script[src="${scriptPath}"]`)) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = scriptPath;
          script.onload = resolve;
          script.onerror = () => reject(new Error(`Falha ao carregar ${scriptPath}`));
          document.head.appendChild(script);
        });
      }
    }
  }

  /**
   * Configurar listeners
   */
  _setupListeners() {
    if (!this.accountsManager) return;

    this.accountsManager.on('accountAdded', (account) => {
      this._onAccountAdded(account);
    });

    this.accountsManager.on('accountRemoved', (account) => {
      this._onAccountRemoved(account);
    });

    this.accountsManager.on('syncStarted', (data) => {
      this._onSyncStarted(data);
    });

    this.accountsManager.on('syncCompleted', (data) => {
      this._onSyncCompleted(data);
    });

    this.accountsManager.on('syncError', (data) => {
      this._onSyncError(data);
    });
  }

  /**
   * Carregar contas existentes e reiniciar sincronização
   */
  _loadExistingAccounts() {
    const accounts = this.accountsManager.getAccounts();

    accounts.forEach(account => {
      if (account.syncEnabled) {
        this.accountsManager.startAutoSync(account.id);
      }
    });
  }

  /**
   * Callback quando conta é adicionada
   */
  _onAccountAdded(account) {
    // Emitir evento customizado
    window.dispatchEvent(
      new CustomEvent('mlAccountAdded', {
        detail: { account },
      })
    );

    // Log
    console.log('Conta adicionada:', account);
  }

  /**
   * Callback quando conta é removida
   */
  _onAccountRemoved(account) {
    window.dispatchEvent(
      new CustomEvent('mlAccountRemoved', {
        detail: { account },
      })
    );

    console.log('Conta removida:', account);
  }

  /**
   * Callback quando sincronização começa
   */
  _onSyncStarted(data) {
    window.dispatchEvent(
      new CustomEvent('mlSyncStarted', {
        detail: { accountId: data.accountId },
      })
    );
  }

  /**
   * Callback quando sincronização é concluída
   */
  _onSyncCompleted(data) {
    window.dispatchEvent(
      new CustomEvent('mlSyncCompleted', {
        detail: { accountId: data.accountId, data: data.data },
      })
    );

    console.log('Sincronização concluída:', data);
  }

  /**
   * Callback quando erro ocorre
   */
  _onSyncError(data) {
    window.dispatchEvent(
      new CustomEvent('mlSyncError', {
        detail: { accountId: data.accountId, message: data.message },
      })
    );

    console.error('Erro de sincronização:', data);
  }

  /**
   * Obter gerenciador
   */
  getManager() {
    return this.accountsManager;
  }

  /**
   * Obter todas as contas
   */
  getAccounts() {
    return this.accountsManager?.getAccounts() || [];
  }

  /**
   * Obter conta específica
   */
  getAccount(accountId) {
    return this.accountsManager?.getAccount(accountId);
  }

  /**
   * Adicionar nova conta
   */
  async addAccount(accountData) {
    if (!this.accountsManager) {
      throw new Error('Gerenciador não inicializado');
    }

    return this.accountsManager.addAccount(accountData);
  }

  /**
   * Remover conta
   */
  removeAccount(accountId) {
    if (!this.accountsManager) {
      throw new Error('Gerenciador não inicializado');
    }

    return this.accountsManager.removeAccount(accountId);
  }

  /**
   * Sincronizar conta
   */
  async sync(accountId) {
    if (!this.accountsManager) {
      throw new Error('Gerenciador não inicializado');
    }

    return this.accountsManager.sync(accountId);
  }

  /**
   * Sincronizar todas as contas
   */
  async syncAll() {
    if (!this.accountsManager) {
      throw new Error('Gerenciador não inicializado');
    }

    return this.accountsManager.syncAll();
  }

  /**
   * Pausar/retomar sincronização
   */
  toggleSync(accountId) {
    if (!this.accountsManager) {
      throw new Error('Gerenciador não inicializado');
    }

    return this.accountsManager.toggleSyncEnabled(accountId);
  }

  /**
   * Obter logs
   */
  getLogs(accountId = null) {
    if (!this.accountsManager) {
      return [];
    }

    return this.accountsManager.getLogs(accountId);
  }

  /**
   * Destruir instância
   */
  destroy() {
    if (this.accountsManager) {
      this.accountsManager.destroy();
      this.accountsManager = null;
    }
  }
}

// Global reference
window.MLFrontendIntegration = MLFrontendIntegration;

// Auto-initialize se houver elemento com data-ml-init
document.addEventListener('DOMContentLoaded', () => {
  const initElement = document.querySelector('[data-ml-init]');
  if (initElement) {
    const config = JSON.parse(initElement.dataset.mlConfig || '{}');
    const integration = new MLFrontendIntegration(config);
    integration.init().catch(error => {
      console.error('Erro ao inicializar Mercado Livre Integration:', error);
    });
  }
});

// Exportar
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MLFrontendIntegration;
}
