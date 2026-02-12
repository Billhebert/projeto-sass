/**
 * Autenticação OAuth2 do Mercado Livre
 */

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
  constructor(
    private exchangeCodeForToken: (code: string) => Promise<TokenResponse>,
    private refreshAccessToken: () => Promise<TokenResponse>,
    private getClientCredentialsToken: () => Promise<TokenResponse>,
    private revokeToken: () => Promise<void>,
    private getCurrentToken: () => string | undefined,
    private isAuthenticated: () => boolean,
    private setCredentials: (credentials: Credentials) => void,
    private config: any
  ) {}

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
    });

    if (params.state) {
      queryParams.append('state', params.state);
    }

    return `https://auth.mercadolibre.com.br/authorization?${queryParams.toString()}`;
  }

  async exchangeCodeForTokenMethod(code: string): Promise<TokenResponse> {
    return this.exchangeCodeForToken(code);
  }

  async refreshAccessTokenMethod(): Promise<TokenResponse> {
    return this.refreshAccessToken();
  }

  async getClientCredentialsTokenMethod(): Promise<TokenResponse> {
    return this.getClientCredentialsToken();
  }

  async revokeTokenMethod(): Promise<void> {
    return this.revokeToken();
  }

  getCurrentTokenMethod(): string | undefined {
    return this.getCurrentToken();
  }

  isAuthenticatedMethod(): boolean {
    return this.isAuthenticated();
  }
}

export default Authentication;
