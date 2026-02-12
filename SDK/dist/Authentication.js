"use strict";
/**
 * Autenticação OAuth2 do Mercado Livre
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Authentication = void 0;
const errors_1 = require("../errors");
class Authentication {
    constructor(mercadoLivre, config) {
        this.mercadoLivre = mercadoLivre;
        this.config = config;
    }
    /**
     * Gera URL de autorização OAuth2
     */
    getAuthorizationUrl(params = {}) {
        const clientId = this.config.clientId;
        const redirectUri = this.config.redirectUri;
        if (!clientId || !redirectUri) {
            throw new errors_1.AuthenticationError('Client ID e Redirect URI são necessários');
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
    /**
     * Troca código de autorização por access token
     */
    async exchangeCodeForToken(code) {
        if (!this.config.clientId || !this.config.clientSecret || !this.config.redirectUri) {
            throw new errors_1.AuthenticationError('Credenciais incompletas');
        }
        const response = await this.mercadoLivre.post('/oauth/token', {
            grant_type: 'authorization_code',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            code: code,
            redirect_uri: this.config.redirectUri,
        });
        // Armazenar tokens
        this.mercadoLivre.setAccessToken(response.access_token);
        if (response.refresh_token) {
            this.config.refreshToken = response.refresh_token;
        }
        return response;
    }
    /**
     * Atualiza access token usando refresh token
     */
    async refreshAccessToken() {
        if (!this.config.clientId || !this.config.clientSecret || !this.config.refreshToken) {
            throw new errors_1.AuthenticationError('Credenciais de refresh incompletas');
        }
        const response = await this.mercadoLivre.post('/oauth/token', {
            grant_type: 'refresh_token',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            refresh_token: this.config.refreshToken,
        });
        // Armazenar novos tokens
        this.mercadoLivre.setAccessToken(response.access_token);
        if (response.refresh_token) {
            this.config.refreshToken = response.refresh_token;
        }
        return response;
    }
    /**
     * Obtém access token via Client Credentials (para APIs públicas)
     */
    async getClientCredentialsToken() {
        if (!this.config.clientId || !this.config.clientSecret) {
            throw new errors_1.AuthenticationError('Client ID e Client Secret são necessários');
        }
        const response = await this.mercadoLivre.post('/oauth/token', {
            grant_type: 'client_credentials',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
        });
        this.mercadoLivre.setAccessToken(response.access_token);
        return response;
    }
    /**
     * Revoga access token
     */
    async revokeToken() {
        const accessToken = this.mercadoLivre.getAccessToken();
        if (!accessToken) {
            throw new errors_1.AuthenticationError('Nenhum token para revogar');
        }
        if (!this.config.clientId || !this.config.clientSecret) {
            throw new errors_1.AuthenticationError('Client ID e Client Secret são necessários');
        }
        await this.mercadoLivre.post('/oauth/revoke', {
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            access_token: accessToken,
        });
        this.mercadoLivre.setAccessToken('');
        this.config.refreshToken = undefined;
    }
    /**
     * Obtém token atual (para debugging)
     */
    getCurrentToken() {
        return this.mercadoLivre.getAccessToken();
    }
    /**
     * Verifica se está autenticado
     */
    isAuthenticated() {
        return this.mercadoLivre.isAuthenticated();
    }
    /**
     * Configura credenciais
     */
    setCredentials(credentials) {
        this.config.clientId = credentials.clientId;
        this.config.clientSecret = credentials.clientSecret;
        this.config.redirectUri = credentials.redirectUri;
        this.mercadoLivre.setCredentials(credentials);
    }
}
exports.Authentication = Authentication;
exports.default = Authentication;
//# sourceMappingURL=Authentication.js.map