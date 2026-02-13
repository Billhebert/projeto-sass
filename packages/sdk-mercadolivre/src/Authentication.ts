/**
 * Autenticação OAuth2 do Mercado Livre
 */

import { MercadoLivre, MercadoLivreConfig } from './MercadoLivre';

export interface Credentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token?: string;
}

export interface AuthUrlParams {
  response_type: 'code' | 'token';
  client_id: string;
  redirect_uri: string;
  state?: string;
}

export class Authentication {
  private mercadoLivre: MercadoLivre;
  private config: MercadoLivreConfig;

  constructor(mercadoLivre: MercadoLivre, config: MercadoLivreConfig) {
    this.mercadoLivre = mercadoLivre;
    this.config = config;
  }

  getAuthorizationUrl(params: Partial<AuthUrlParams> = {}): string {
    const clientId = this.config.clientId;
    const redirectUri = this.config.redirectUri;

    if (!clientId || !redirectUri) {
      throw new Error('Client ID e Redirect URI são necessários');
    }

    const queryParams = new URLSearchParams({
      response_type: params.response_type || 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      platform_id: 'MLB',
    });

    if (params.state) {
      queryParams.append('state', params.state);
    }

    return `https://auth.mercadolibre.com/authorization?${queryParams.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    return this.mercadoLivre.post<TokenResponse>('/oauth/token', {
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    return this.mercadoLivre.post<TokenResponse>('/oauth/token', {
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
    });
  }

  async getClientCredentialsToken(): Promise<TokenResponse> {
    return this.mercadoLivre.post<TokenResponse>('/oauth/token', {
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
  }

  async revokeToken(accessToken: string): Promise<void> {
    await this.mercadoLivre.post('/oauth/token/revoke', {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      token: accessToken,
    });
  }

  getCurrentToken(): string | undefined {
    return this.mercadoLivre.getAccessToken();
  }

  isAuthenticated(): boolean {
    return this.mercadoLivre.isAuthenticated();
  }
}

export default Authentication;
