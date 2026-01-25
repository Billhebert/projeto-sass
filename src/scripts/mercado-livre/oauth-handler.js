/**
 * Mercado Livre OAuth Handler
 * Gerencia o fluxo de autenticação OAuth 2.0 com PKCE
 */

class MLOAuthHandler {
  constructor(options = {}) {
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri;
    this.apiBaseUrl = options.apiBaseUrl || 'http://localhost:3000/api';
    this.mlAuthUrl = 'https://auth.mercadolibre.com.br/authorization';
    this.mlTokenUrl = 'https://api.mercadolibre.com/oauth/token';
  }

  /**
   * Obter Client ID do backend
   */
  async getClientId() {
    if (this.clientId) {
      return this.clientId;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/ml/client-id`);
      if (!response.ok) {
        throw new Error('Falha ao obter Client ID');
      }
      const data = await response.json();
      this.clientId = data.clientId;
      return this.clientId;
    } catch (error) {
      console.error('Erro ao obter Client ID:', error);
      throw error;
    }
  }

  /**
   * Gerar desafio PKCE
   * PKCE (Proof Key for Public Clients) adiciona segurança ao fluxo OAuth
   */
  generatePKCE() {
    const codeVerifier = this._generateRandomString(128);
    const codeChallenge = this._generateCodeChallenge(codeVerifier);

    return {
      codeVerifier,
      codeChallenge,
    };
  }

  /**
   * Gerar string aleatória
   */
  _generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => String.fromCharCode(byte)).join('');
  }

  /**
   * Gerar desafio de código (hash do verificador)
   */
  _generateCodeChallenge(codeVerifier) {
    const buffer = new TextEncoder().encode(codeVerifier);
    return crypto.subtle
      .digest('SHA-256', buffer)
      .then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashString = String.fromCharCode.apply(null, hashArray);
        return btoa(hashString)
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      });
  }

  /**
   * Iniciar autenticação OAuth
   */
  async startAuthentication() {
    try {
      // Obter Client ID do backend
      const clientId = await this.getClientId();

      // Gerar PKCE
      const { codeVerifier, codeChallenge } = this.generatePKCE();

      // Gerar state para segurança
      const state = this._generateRandomString(32);

      // Armazenar valores para verificação posterior
      sessionStorage.setItem('oauth_code_verifier', codeVerifier);
      sessionStorage.setItem('oauth_state', state);

      // Construir URL de autorização
      const authUrl = new URL(this.mlAuthUrl);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', clientId);
      authParams.append('redirect_uri', this.redirectUri);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');

      // Redirecionar para Mercado Livre
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Erro ao iniciar autenticação:', error);
      throw error;
    }
  }

  /**
   * Trocar código por tokens (chamado pelo backend)
   */
  async exchangeCodeForTokens(code) {
    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

    if (!codeVerifier) {
      throw new Error('Code verifier não encontrado. Sessão expirada?');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/ml/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          codeVerifier,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao trocar código por tokens');
      }

      const data = await response.json();

      // Limpar valores armazenados
      sessionStorage.removeItem('oauth_code_verifier');
      sessionStorage.removeItem('oauth_state');

      return data;
    } catch (error) {
      console.error('Erro ao trocar código:', error);
      throw error;
    }
  }
}

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MLOAuthHandler;
}
