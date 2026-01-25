/**
 * Mercado Livre Accounts Manager
 * Gerencia múltiplas contas com sincronização automática
 */

class MLAccountsManager {
  constructor(options = {}) {
    this.storageKey = 'ml_accounts';
    this.syncIntervalKey = 'ml_sync_interval';
    this.logKey = 'ml_sync_logs';
    this.apiBaseUrl = options.apiBaseUrl || 'http://localhost:3000/api';
    this.syncInterval = options.syncInterval || 5 * 60 * 1000; // 5 minutos
    this.maxSyncLogs = options.maxSyncLogs || 100;
    this.listeners = {
      accountAdded: [],
      accountRemoved: [],
      accountUpdated: [],
      syncStarted: [],
      syncCompleted: [],
      syncError: [],
      statusChanged: [],
    };
    this.syncTimers = new Map();
    this.isSyncing = new Map();
    this.lastSyncTime = new Map();

    this._initializeStorage();
  }

  /**
   * Inicializar armazenamento
   */
  _initializeStorage() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.logKey)) {
      localStorage.setItem(this.logKey, JSON.stringify([]));
    }
  }

  /**
   * Adicionar listener para eventos
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Disparar evento
   */
  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Obter todas as contas
   */
  getAccounts() {
    try {
      const accounts = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return accounts.map(account => ({
        ...account,
        isSyncing: this.isSyncing.get(account.id) || false,
        lastSync: this.lastSyncTime.get(account.id) || null,
      }));
    } catch (error) {
      console.error('Erro ao obter contas:', error);
      return [];
    }
  }

  /**
   * Obter conta por ID
   */
  getAccount(accountId) {
    const accounts = this.getAccounts();
    const account = accounts.find(acc => acc.id === accountId);
    return account || null;
  }

  /**
   * Adicionar nova conta (após OAuth bem-sucedido)
   */
  async addAccount(accountData) {
    try {
      const account = {
        id: accountData.id || this._generateId(),
        userId: accountData.userId,
        nickname: accountData.nickname,
        email: accountData.email,
        accessToken: accountData.accessToken,
        refreshToken: accountData.refreshToken,
        tokenExpiresAt: accountData.tokenExpiresAt,
        createdAt: new Date().toISOString(),
        lastSync: null,
        status: 'connected',
        products: 0,
        orders: 0,
        issues: 0,
        syncEnabled: true,
      };

      const accounts = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      accounts.push(account);
      localStorage.setItem(this.storageKey, JSON.stringify(accounts));

      // Iniciar sincronização automática para esta conta
      this.startAutoSync(account.id);

      this._emit('accountAdded', account);
      this._addLog('info', `Conta adicionada: ${account.nickname}`, account.id);

      return account;
    } catch (error) {
      console.error('Erro ao adicionar conta:', error);
      this._emit('syncError', {
        accountId: accountData.id,
        message: error.message,
      });
      throw error;
    }
  }

  /**
   * Atualizar conta
   */
  updateAccount(accountId, updates) {
    try {
      const accounts = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const index = accounts.findIndex(acc => acc.id === accountId);

      if (index === -1) {
        throw new Error('Conta não encontrada');
      }

      accounts[index] = {
        ...accounts[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(this.storageKey, JSON.stringify(accounts));
      this._emit('accountUpdated', accounts[index]);

      return accounts[index];
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      throw error;
    }
  }

  /**
   * Remover conta
   */
  removeAccount(accountId) {
    try {
      // Parar sincronização automática
      this.stopAutoSync(accountId);

      const accounts = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const account = accounts.find(acc => acc.id === accountId);
      const filtered = accounts.filter(acc => acc.id !== accountId);

      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      this._emit('accountRemoved', account);
      this._addLog('info', `Conta removida: ${account.nickname}`, accountId);

      return true;
    } catch (error) {
      console.error('Erro ao remover conta:', error);
      throw error;
    }
  }

  /**
   * Iniciar sincronização automática para uma conta
   */
  startAutoSync(accountId) {
    const account = this.getAccount(accountId);
    if (!account || !account.syncEnabled) {
      return;
    }

    // Limpar timer anterior se existir
    if (this.syncTimers.has(accountId)) {
      clearInterval(this.syncTimers.get(accountId));
    }

    // Sincronizar imediatamente
    this.sync(accountId).catch(error => {
      console.error(`Erro ao sincronizar conta ${accountId}:`, error);
    });

    // Configurar intervalo de sincronização automática
    const timer = setInterval(() => {
      this.sync(accountId).catch(error => {
        console.error(`Erro ao sincronizar conta ${accountId}:`, error);
      });
    }, this.syncInterval);

    this.syncTimers.set(accountId, timer);
  }

  /**
   * Parar sincronização automática para uma conta
   */
  stopAutoSync(accountId) {
    if (this.syncTimers.has(accountId)) {
      clearInterval(this.syncTimers.get(accountId));
      this.syncTimers.delete(accountId);
    }
  }

  /**
   * Pausar/retomar sincronização
   */
  toggleSyncEnabled(accountId) {
    const account = this.getAccount(accountId);
    if (!account) {
      throw new Error('Conta não encontrada');
    }

    const newState = !account.syncEnabled;
    this.updateAccount(accountId, { syncEnabled: newState });

    if (newState) {
      this.startAutoSync(accountId);
    } else {
      this.stopAutoSync(accountId);
    }

    return newState;
  }

  /**
   * Sincronizar dados da conta
   */
  async sync(accountId) {
    const account = this.getAccount(accountId);
    if (!account) {
      throw new Error('Conta não encontrada');
    }

    // Evitar múltiplas sincronizações simultâneas
    if (this.isSyncing.get(accountId)) {
      console.log(`Sincronização já em andamento para ${accountId}`);
      return;
    }

    try {
      this.isSyncing.set(accountId, true);
      this._emit('syncStarted', { accountId });

      // Verificar se token está expirado
      if (new Date(account.tokenExpiresAt) < new Date()) {
        await this._refreshToken(accountId);
      }

      // Sincronizar dados
      const syncData = await this._fetchAccountData(accountId);

      // Atualizar conta com dados sincronizados
      const updates = {
        ...syncData,
        lastSync: new Date().toISOString(),
        status: 'connected',
      };

      this.updateAccount(accountId, updates);
      this.lastSyncTime.set(accountId, new Date().toISOString());

      this._addLog('success', `Sincronização concluída. Produtos: ${syncData.products}, Pedidos: ${syncData.orders}`, accountId);

      this._emit('syncCompleted', {
        accountId,
        data: syncData,
      });

      return syncData;
    } catch (error) {
      console.error(`Erro ao sincronizar ${accountId}:`, error);

      this.updateAccount(accountId, {
        status: 'error',
        lastSyncError: error.message,
      });

      this._addLog('error', `Erro de sincronização: ${error.message}`, accountId);

      this._emit('syncError', {
        accountId,
        message: error.message,
      });

      throw error;
    } finally {
      this.isSyncing.set(accountId, false);
    }
  }

  /**
   * Sincronizar todas as contas
   */
  async syncAll() {
    const accounts = this.getAccounts();
    const results = [];

    for (const account of accounts) {
      if (account.syncEnabled) {
        try {
          const result = await this.sync(account.id);
          results.push({ accountId: account.id, success: true, data: result });
        } catch (error) {
          results.push({ accountId: account.id, success: false, error: error.message });
        }
      }
    }

    return results;
  }

  /**
   * Buscar dados da conta na API
   */
  async _fetchAccountData(accountId) {
    const account = this.getAccount(accountId);
    if (!account) {
      throw new Error('Conta não encontrada');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/sync/account/${accountId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro da API: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        products: data.products || 0,
        orders: data.orders || 0,
        issues: data.issues || 0,
        lastUpdate: data.lastUpdate || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao buscar dados da conta:', error);
      throw error;
    }
  }

  /**
   * Renovar token de acesso
   */
  async _refreshToken(accountId) {
    const account = this.getAccount(accountId);
    if (!account) {
      throw new Error('Conta não encontrada');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/ml/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          refreshToken: account.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao renovar token');
      }

      const { accessToken, refreshToken, expiresAt } = await response.json();

      this.updateAccount(accountId, {
        accessToken,
        refreshToken,
        tokenExpiresAt: expiresAt,
      });

      this._addLog('info', 'Token renovado com sucesso', accountId);
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      this.updateAccount(accountId, { status: 'token_expired' });
      throw error;
    }
  }

  /**
   * Adicionar log de sincronização
   */
  _addLog(level, message, accountId = null) {
    try {
      const logs = JSON.parse(localStorage.getItem(this.logKey) || '[]');
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        accountId,
      });

      // Manter apenas os últimos X logs
      if (logs.length > this.maxSyncLogs) {
        logs.shift();
      }

      localStorage.setItem(this.logKey, JSON.stringify(logs));
    } catch (error) {
      console.error('Erro ao adicionar log:', error);
    }
  }

  /**
   * Obter logs
   */
  getLogs(accountId = null) {
    try {
      const logs = JSON.parse(localStorage.getItem(this.logKey) || '[]');
      if (accountId) {
        return logs.filter(log => log.accountId === accountId);
      }
      return logs;
    } catch (error) {
      console.error('Erro ao obter logs:', error);
      return [];
    }
  }

  /**
   * Gerar ID único
   */
  _generateId() {
    return `ml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destruir - limpar tudo
   */
  destroy() {
    // Parar todas as sincronizações
    this.syncTimers.forEach((timer, accountId) => {
      clearInterval(timer);
    });
    this.syncTimers.clear();
  }
}

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MLAccountsManager;
}
