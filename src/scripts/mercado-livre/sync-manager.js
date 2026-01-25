/**
 * Sincronizador Central Mercado Livre
 * Gerencia sincronização de múltiplas contas
 */

class MLSyncManager {
  constructor() {
    this.storage = new SecureTokenStorage();
    this.auth = new MercadoLivreAuth();
    this.clients = new Map(); // userId -> MLAPIClient
    this.syncState = new Map(); // userId -> { status, progress, lastSync, error }
    this.syncInterval = null;
    this.autoSyncEnabled = true;
    
    console.log('✓ MLSyncManager inicializado');
  }

  /**
   * Inicializar todos os clientes
   */
  async initialize() {
    try {
      console.log('[SYNC] Inicializando clientes...');
      const accounts = this.storage.getAllAccounts();

      for (const account of accounts) {
        try {
          // Renovar token se necessário
          if (this.storage.isTokenExpired(account.id)) {
            console.log(`[SYNC] Renovando token para ${account.nickname}...`);
            await this.auth.refreshToken(account.id);
          }

          // Obter token válido
          const token = await this.auth.getValidToken(account.id);
          this.clients.set(account.id, new MLAPIClient(token, account.id));
          
          this.syncState.set(account.id, {
            status: 'ready',
            progress: 0,
            lastSync: null,
            error: null
          });

          console.log(`✓ Cliente criado para ${account.nickname}`);

        } catch (error) {
          console.error(`✗ Erro ao inicializar ${account.nickname}:`, error);
          this.syncState.set(account.id, {
            status: 'error',
            error: error.message,
            progress: 0
          });
        }
      }

      console.log(`✓ ${this.clients.size} cliente(s) inicializado(s)`);

    } catch (error) {
      console.error('Erro ao inicializar sincronizador:', error);
      throw error;
    }
  }

  /**
   * Sincronizar todas as contas
   */
  async syncAllAccounts() {
    console.log('[SYNC] Iniciando sincronização de todas as contas...');
    const results = new Map();

    for (const [userId, client] of this.clients) {
      try {
        this.syncState.set(userId, {
          status: 'syncing',
          progress: 0,
          lastSync: new Date(),
          error: null
        });

        const data = await this.syncAccount(userId, client);
        results.set(userId, { status: 'success', data });

        this.syncState.set(userId, {
          status: 'success',
          lastSync: new Date(),
          progress: 100,
          error: null
        });

        console.log(`✓ Sincronização concluída para user ${userId}`);

      } catch (error) {
        console.error(`✗ Erro ao sincronizar ${userId}:`, error);
        results.set(userId, { status: 'error', error: error.message });

        this.syncState.set(userId, {
          status: 'error',
          error: error.message,
          progress: 0
        });
      }
    }

    return results;
  }

  /**
   * Sincronizar uma conta específica
   */
  async syncAccount(userId, client) {
    try {
      const data = {
        userId,
        user: null,
        summary: null,
        items: [],
        orders: [],
        metrics: null,
        syncedAt: new Date().toISOString()
      };

      // Atualizar progresso
      this._updateProgress(userId, 10);

      // Dados do usuário
      try {
        data.user = await client.getUser();
        this._updateProgress(userId, 30);
      } catch (error) {
        console.error(`Erro ao buscar usuário: ${error.message}`);
      }

      // Resumo
      try {
        data.summary = await client.getUserSummary();
        this._updateProgress(userId, 50);
      } catch (error) {
        console.error(`Erro ao buscar summary: ${error.message}`);
      }

      // Produtos
      try {
        const itemsResult = await client.getItems(50, 0);
        data.items = itemsResult.results || [];
        this._updateProgress(userId, 70);
      } catch (error) {
        console.error(`Erro ao buscar itens: ${error.message}`);
      }

      // Vendas (últimas 30 dias)
      try {
        const ordersResult = await client.getOrdersLastDays(30);
        data.orders = ordersResult.orders || [];
        this._updateProgress(userId, 85);
      } catch (error) {
        console.error(`Erro ao buscar orders: ${error.message}`);
      }

      // Métricas
      try {
        data.metrics = {
          reputation: await client.getReputationMetrics(),
          sales_distribution: await client.getSalesDistribution()
        };
        this._updateProgress(userId, 100);
      } catch (error) {
        console.error(`Erro ao buscar métricas: ${error.message}`);
      }

      // Salvar dados sincronizados
      this._saveAccountData(userId, data);

      return data;

    } catch (error) {
      console.error('Erro ao sincronizar conta:', error);
      throw error;
    }
  }

  /**
   * Ativar sincronização automática a cada X minutos
   */
  enableAutoSync(intervalMinutes = 5) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    console.log(`✓ Auto-sync ativado (a cada ${intervalMinutes} minutos)`);

    this.syncInterval = setInterval(
      () => this.syncAllAccounts(),
      intervalMinutes * 60 * 1000
    );

    this.autoSyncEnabled = true;
  }

  /**
   * Desativar sincronização automática
   */
  disableAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.autoSyncEnabled = false;
    console.log('✓ Auto-sync desativado');
  }

  /**
   * Obter status de sincronização
   */
  getSyncStatus(userId = null) {
    if (userId) {
      return this.syncState.get(userId) || { status: 'unknown' };
    }

    // Retornar status de todas as contas
    const statuses = {};
    for (const [userId, status] of this.syncState) {
      statuses[userId] = status;
    }
    return statuses;
  }

  /**
   * Obter dados sincronizados
   */
  getAccountData(userId) {
    const key = `ml_account_data_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Obter dados de todas as contas
   */
  getAllAccountData() {
    const data = {};
    const accounts = this.storage.getAllAccounts();

    for (const account of accounts) {
      data[account.id] = this.getAccountData(account.id);
    }

    return data;
  }

  /**
   * Calcular métricas agregadas
   */
  getAggregatedMetrics() {
    const allData = this.getAllAccountData();
    const metrics = {
      totalProducts: 0,
      totalSales: 0,
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      accountCount: Object.keys(allData).length,
      accounts: {}
    };

    let totalOrderAmount = 0;
    let totalOrders = 0;

    for (const [userId, accountData] of Object.entries(allData)) {
      if (!accountData) continue;

      const account = this.storage.getAllAccounts().find(a => a.id === parseInt(userId));

      metrics.accounts[userId] = {
        nickname: account?.nickname || 'Desconhecido',
        products: accountData.items?.length || 0,
        sales: accountData.orders?.length || 0,
        revenue: (accountData.orders || []).reduce((sum, order) => 
          sum + (order.total_amount || 0), 0
        )
      };

      metrics.totalProducts += accountData.items?.length || 0;
      metrics.totalSales += accountData.orders?.length || 0;
      metrics.totalRevenue += metrics.accounts[userId].revenue;

      // Calcular AOV
      const accountOrders = accountData.orders || [];
      if (accountOrders.length > 0) {
        const accountRevenue = accountOrders.reduce((sum, order) => 
          sum + (order.total_amount || 0), 0
        );
        totalOrderAmount += accountRevenue;
        totalOrders += accountOrders.length;
      }
    }

    metrics.averageOrderValue = totalOrders > 0 ? totalOrderAmount / totalOrders : 0;

    return metrics;
  }

  /**
   * Atualizar progresso
   */
  _updateProgress(userId, progress) {
    const state = this.syncState.get(userId);
    if (state) {
      state.progress = progress;
    }
  }

  /**
   * Salvar dados sincronizados em localStorage
   */
  _saveAccountData(userId, data) {
    const key = `ml_account_data_${userId}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  /**
   * Conectar nova conta
   */
  connectAccount(userNickname) {
    const auth = new MercadoLivreAuth();
    const authUrl = auth.getAuthorizationURL();
    window.location.href = authUrl;
  }

  /**
   * Desconectar conta
   */
  async disconnectAccount(userId) {
    try {
      // Remover do storage
      this.storage.removeAccount(userId);

      // Remover cliente
      this.clients.delete(userId);

      // Remover dados sincronizados
      const key = `ml_account_data_${userId}`;
      localStorage.removeItem(key);

      // Remover status
      this.syncState.delete(userId);

      console.log(`✓ Conta ${userId} desconectada`);

      return true;

    } catch (error) {
      console.error('Erro ao desconectar:', error);
      return false;
    }
  }

  /**
   * Obter lista de contas conectadas
   */
  getConnectedAccounts() {
    return this.storage.getAllAccounts();
  }
}

// Exportar para uso global
window.MLSyncManager = MLSyncManager;
