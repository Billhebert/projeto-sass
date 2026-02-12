"use strict";
/**
 * Mercado Livre SDK - Classe Principal
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoLivre = void 0;
const axios_1 = __importDefault(require("axios"));
const errors_1 = require("./errors");
const Authentication_1 = require("./Authentication");
const Users_1 = require("./resources/Users");
const Items_1 = require("./resources/Items");
const Orders_1 = require("./resources/Orders");
const Shipments_1 = require("./resources/Shipments");
const Payments_1 = require("./resources/Payments");
const Categories_1 = require("./resources/Categories");
const Sites_1 = require("./resources/Sites");
const Questions_1 = require("./resources/Questions");
const Search_1 = require("./resources/Search");
const Pictures_1 = require("./resources/Pictures");
const Notifications_1 = require("./resources/Notifications");
const Moderations_1 = require("./resources/Moderations");
const Feedback_1 = require("./resources/Feedback");
const Promotions_1 = require("./resources/Promotions");
const Billing_1 = require("./resources/Billing");
const Messages_1 = require("./resources/Messages");
const Claims_1 = require("./resources/Claims");
const Advertising_1 = require("./resources/Advertising");
const Reports_1 = require("./resources/Reports");
const Favorites_1 = require("./resources/Favorites");
const Currencies_1 = require("./resources/Currencies");
const Locations_1 = require("./resources/Locations");
const Variations_1 = require("./resources/Variations");
const Catalog_1 = require("./resources/Catalog");
const Pricing_1 = require("./resources/Pricing");
const Flex_1 = require("./resources/Flex");
const Fulfillment_1 = require("./resources/Fulfillment");
const Trends_1 = require("./resources/Trends");
const Reputation_1 = require("./resources/Reputation");
const Visits_1 = require("./resources/Visits");
class MercadoLivre {
    constructor(config = {}) {
        this.config = {
            siteId: 'MLB',
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
            baseURL: 'https://api.mercadolibre.com',
            ...config,
        };
        this.retries = this.config.retries || 3;
        this.retryDelay = this.config.retryDelay || 1000;
        // Criar cliente axios
        this.client = axios_1.default.create({
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MercadoLivre-SDK/1.0',
            },
        });
        // Adicionar interceptors
        this.setupRequestInterceptor();
        this.setupResponseInterceptor();
        // Inicializar recursos
        this.auth = new Authentication_1.Authentication(this, this.config);
        this.users = new Users_1.Users(this);
        this.items = new Items_1.Items(this);
        this.orders = new Orders_1.Orders(this);
        this.shipments = new Shipments_1.Shipments(this);
        this.payments = new Payments_1.Payments(this);
        this.categories = new Categories_1.Categories(this);
        this.sites = new Sites_1.Sites(this);
        this.questions = new Questions_1.Questions(this);
        this.search = new Search_1.Search(this);
        this.pictures = new Pictures_1.Pictures(this);
        this.notifications = new Notifications_1.Notifications(this);
        this.moderations = new Moderations_1.Moderations(this);
        this.feedback = new Feedback_1.Feedback(this);
        this.promotions = new Promotions_1.Promotions(this);
        this.billing = new Billing_1.Billing(this);
        this.messages = new Messages_1.Messages(this);
        this.claims = new Claims_1.Claims(this);
        this.advertising = new Advertising_1.Advertising(this);
        this.reports = new Reports_1.Reports(this);
        this.favorites = new Favorites_1.Favorites(this);
        this.currencies = new Currencies_1.Currencies(this);
        this.locations = new Locations_1.Locations(this);
        this.variations = (0, Variations_1.variations)(this);
        this.catalog = new Catalog_1.Catalog(this);
        this.pricing = new Pricing_1.Pricing(this);
        this.flex = new Flex_1.Flex(this);
        this.fulfillment = (0, Fulfillment_1.fulfillment)(this);
        this.trends = new Trends_1.Trends(this);
        this.reputation = new Reputation_1.Reputation(this);
        this.visits = new Visits_1.Visits(this);
    }
    // ============================================
    // CONFIGURAÇÃO
    // ============================================
    /**
     * Define o access token para as requisições
     */
    setAccessToken(accessToken) {
        this.config.accessToken = accessToken;
        this.client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    }
    /**
     * Obtém o access token atual
     */
    getAccessToken() {
        return this.config.accessToken;
    }
    /**
     * Define o site ID
     */
    setSiteId(siteId) {
        this.config.siteId = siteId;
    }
    /**
     * Obtém o site ID atual
     */
    getSiteId() {
        return this.config.siteId || 'MLB';
    }
    /**
     * Define as credenciais OAuth
     */
    setCredentials(credentials) {
        this.config.clientId = credentials.clientId;
        this.config.clientSecret = credentials.clientSecret;
        this.config.redirectUri = credentials.redirectUri;
    }
    /**
     * Configura timeout
     */
    setTimeout(timeout) {
        this.client.defaults.timeout = timeout;
    }
    /**
     * Configura número de retries
     */
    setRetries(retries) {
        this.retries = retries;
    }
    // ============================================
    // INTERCEPTORS
    // ============================================
    setupRequestInterceptor() {
        this.client.interceptors.request.use((config) => {
            // Adicionar access token se disponível e não for skipAuth
            if (this.config.accessToken && !config.headers?.skipAuth) {
                config.headers.Authorization = `Bearer ${this.config.accessToken}`;
            }
            // Adicionar site ID
            if (this.config.siteId) {
                config.headers['X-Site-Id'] = this.config.siteId;
            }
            return config;
        }, (error) => Promise.reject(error));
    }
    setupResponseInterceptor() {
        this.client.interceptors.response.use((response) => response, async (error) => {
            const config = error.config;
            // Se não houver config, propagar erro
            if (!config) {
                throw (0, errors_1.createErrorFromResponse)(error.response);
            }
            // Tratar erro 401 (token expirado)
            if (error.response?.status === 401 && this.config.refreshToken && !config.skipAuth) {
                try {
                    await this.refreshAccessToken();
                    // Retry com novo token
                    return this.client.request(config);
                }
                catch (refreshError) {
                    throw new errors_1.TokenExpiredError('Token expirado e não foi possível renovar');
                }
            }
            // Tratar rate limit (429)
            if (error.response?.status === 429 &&
                config.retryOnRateLimit !== false &&
                this.retries > 0) {
                const retryAfter = parseInt(error.response.headers['retry-after'] || String(this.retryDelay), 10);
                await this.sleep(retryAfter);
                this.retries--;
                return this.client.request(config);
            }
            // Propagar erro
            throw (0, errors_1.createErrorFromResponse)(error.response);
        });
    }
    async refreshAccessToken() {
        if (!this.config.refreshToken || !this.config.clientId || !this.config.clientSecret) {
            throw new errors_1.AuthenticationError('Credenciais insuficientes para refresh token');
        }
        const response = await this.client.post('/oauth/token', {
            grant_type: 'refresh_token',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            refresh_token: this.config.refreshToken,
        });
        this.setAccessToken(response.data.access_token);
        if (response.data.refresh_token) {
            this.config.refreshToken = response.data.refresh_token;
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    // ============================================
    // MÉTODOS HTTP
    // ============================================
    /**
     * Faz uma requisição GET
     */
    async get(url, options) {
        const response = await this.client.get(url, options);
        return response.data;
    }
    /**
     * Faz uma requisição POST
     */
    async post(url, data, options) {
        const response = await this.client.post(url, data, options);
        return response.data;
    }
    /**
     * Faz uma requisição PUT
     */
    async put(url, data, options) {
        const response = await this.client.put(url, data, options);
        return response.data;
    }
    /**
     * Faz uma requisição PATCH
     */
    async patch(url, data, options) {
        const response = await this.client.patch(url, data, options);
        return response.data;
    }
    /**
     * Faz uma requisição DELETE
     */
    async delete(url, options) {
        const response = await this.client.delete(url, options);
        return response.data;
    }
    // ============================================
    // URL BUILDERS
    // ============================================
    /**
     * Constrói URL com base no site ID
     */
    buildUrl(path, params) {
        let url = path;
        // Substituir placeholders
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url = url.replace(`{${key}}`, String(value));
                url = url.replace(`:${key}`, String(value));
            });
        }
        return url;
    }
    /**
     * Constrói URL de autenticação
     */
    buildAuthUrl(responseType = 'code', state) {
        if (!this.config.clientId || !this.config.redirectUri) {
            throw new errors_1.AuthenticationError('Client ID e Redirect URI são necessários');
        }
        const params = new URLSearchParams({
            response_type: responseType,
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
        });
        if (state) {
            params.append('state', state);
        }
        return `https://auth.mercadolibre.com.br/authorization?${params.toString()}`;
    }
    // ============================================
    // HELPERS
    // ============================================
    /**
     * Verifica se o token está configurado
     */
    isAuthenticated() {
        return !!this.config.accessToken;
    }
    /**
     * Verifica se as credenciais estão configuradas
     */
    hasCredentials() {
        return !!(this.config.clientId && this.config.clientSecret);
    }
}
exports.MercadoLivre = MercadoLivre;
exports.default = MercadoLivre;
//# sourceMappingURL=MercadoLivre.js.map