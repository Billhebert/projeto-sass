/**
 * Mercado Livre OAuth 2.0 Authentication
 * Gerencia autenticação, tokens e renovação
 */

class MercadoLivreAuth {
  constructor() {
    this.CLIENT_ID = process.env.ML_CLIENT_ID || '';
    this.REDIRECT_URI = process.env.ML_REDIRECT_URI || 'http://localhost:3000/auth/callback';
    this.API_BASE = 'https://api.mercadolibre.com';
    this.AUTH_BASE = 'https://auth.mercadolibre.com.br';
    this.storage = new SecureTokenStorage();
  }

  /**
   * Gera URL de autorização para o usuário fazer login
   */
  getAuthorizationURL(state = null) {
    if (!state) state = this._generateState();
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      state: state,
      scope: 'read write offline_access'
    });

    // Salvar state para validação depois
    sessionStorage.setItem('ml_oauth_state', state);
    
    return `${this.AUTH_BASE}/authorization?${params.toString()}`;
  }

  /**
   * Processar callback do OAuth
   * Deve ser chamado pela página de callback
   */
  async handleCallback() {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      if (error) {
        throw new Error(`OAuth Error: ${error} - ${params.get('error_description')}`);
      }

      if (!code) {
        throw new Error('Código de autorização não recebido');
      }

      // Validar state para CSRF protection
      const savedState = sessionStorage.getItem('ml_oauth_state');
      if (state !== savedState) {
        throw new Error('State mismatch - possível ataque CSRF');
      }

      // Chamar backend para trocar código por token
      const backendResponse = await this._exchangeCodeForToken(code);
      
      // Salvar conta com dados retornados do backend
      const account = backendResponse.account;
      this.storage.saveAccount({
        account_id: account.id,
        user_id: account.userId,
        nickname: account.nickname,
        email: account.email,
        first_name: account.firstName,
        last_name: account.lastName,
        access_token: backendResponse.accessToken || account.accessToken,
        refresh_token: backendResponse.refreshToken || account.refreshToken,
        expires_at: account.tokenExpiry,
        status: account.status
      });

      // Limpar state
      sessionStorage.removeItem('ml_oauth_state');

      return {
        success: true,
        account: {
          id: account.id,
          userId: account.userId,
          nickname: account.nickname,
          email: account.email
        },
        message: `Conta ${account.nickname} conectada com sucesso!`
      };

    } catch (error) {
      console.error('Erro no callback OAuth:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Trocar código de autorização por tokens
   * Chama o backend que fará a troca com Mercado Livre
   */
  async _exchangeCodeForToken(code) {
    try {
      const backendURL = window.location.origin + '/api/auth/ml-callback';
      
      const response = await fetch(backendURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ao trocar código: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Falha na troca de código');
      }

      return data;

    } catch (error) {
      console.error('Erro na troca de código:', error);
      throw error;
    }
  }

  /**
   * Buscar informações do usuário
   */
  async _getUserInfo(accessToken) {
    try {
      const response = await fetch(`${this.API_BASE}/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar usuário: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Erro ao buscar info do usuário:', error);
      throw error;
    }
  }

  /**
   * Renovar token expirado
   */
  async refreshToken(accountId) {
    try {
      const account = this.storage.getAccount(accountId);
      if (!account) {
        throw new Error('Conta não encontrada');
      }

      // Chamar backend para renovar
      const backendURL = window.location.origin + '/api/auth/ml-refresh';
      const response = await fetch(backendURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ao renovar token: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Falha ao renovar token');
      }

      // Atualizar token armazenado
      this.storage.updateToken(
        accountId,
        data.accessToken,
        data.refreshToken
      );

      return {
        success: true,
        accessToken: data.accessToken,
        tokenExpiry: data.tokenExpiry
      };

    } catch (error) {
      console.error('Erro ao renovar token:', error);
      throw error;
    }
  }

  /**
   * Obter token válido (renova se necessário)
   */
  async getValidToken(accountId) {
    const account = this.storage.getAccount(accountId);
    
    if (!account) {
      throw new Error('Conta não encontrada');
    }

    // Verificar se token ainda é válido
    if (account.expires_at && account.expires_at > Date.now()) {
      return account.access_token;
    }

    // Token expirado, renovar
    const result = await this.refreshToken(accountId);
    return result.accessToken;
  }

  /**
   * Gerar state aleatório para CSRF protection
   */
  _generateState() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Fazer logout (remover conta) e notificar backend
   */
  async logout(accountId) {
    try {
      // Notificar backend para desconectar conta
      const backendURL = window.location.origin + '/api/auth/ml-logout';
      await fetch(backendURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });
    } catch (error) {
      console.error('Erro ao fazer logout no backend:', error);
    }

    // Remover conta local
    this.storage.removeAccount(accountId);
  }
}

// Exportar para uso global
window.MercadoLivreAuth = MercadoLivreAuth;
