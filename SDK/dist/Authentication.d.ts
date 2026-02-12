/**
 * Autenticação OAuth2 do Mercado Livre
 */
import { MercadoLivre, MercadoLivreConfig } from '../MercadoLivre';
import { Credentials, TokenResponse, AuthUrlParams } from '../types';
export declare class Authentication {
    private mercadoLivre;
    private config;
    constructor(mercadoLivre: MercadoLivre, config: MercadoLivreConfig);
    /**
     * Gera URL de autorização OAuth2
     */
    getAuthorizationUrl(params?: Partial<AuthUrlParams>): string;
    /**
     * Troca código de autorização por access token
     */
    exchangeCodeForToken(code: string): Promise<TokenResponse>;
    /**
     * Atualiza access token usando refresh token
     */
    refreshAccessToken(): Promise<TokenResponse>;
    /**
     * Obtém access token via Client Credentials (para APIs públicas)
     */
    getClientCredentialsToken(): Promise<TokenResponse>;
    /**
     * Revoga access token
     */
    revokeToken(): Promise<void>;
    /**
     * Obtém token atual (para debugging)
     */
    getCurrentToken(): string | undefined;
    /**
     * Verifica se está autenticado
     */
    isAuthenticated(): boolean;
    /**
     * Configura credenciais
     */
    setCredentials(credentials: Credentials): void;
}
export default Authentication;
//# sourceMappingURL=Authentication.d.ts.map