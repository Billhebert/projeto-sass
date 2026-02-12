"use strict";
/**
 * Erros do Mercado Livre SDK
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = exports.TooManyRequestsError = exports.ConflictError = exports.BadRequestError = exports.ServerError = exports.ValidationError = exports.ResourceNotFoundError = exports.RateLimitError = exports.InsufficientPermissionsError = exports.InvalidTokenError = exports.TokenExpiredError = exports.AuthenticationError = exports.MercadoLivreError = void 0;
exports.createErrorFromResponse = createErrorFromResponse;
exports.isMercadoLivreError = isMercadoLivreError;
class MercadoLivreError extends Error {
    constructor(message, statusCode, errorCode, response) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.response = response;
        this.name = 'MercadoLivreError';
    }
}
exports.MercadoLivreError = MercadoLivreError;
class AuthenticationError extends MercadoLivreError {
    constructor(message = 'Erro de autenticação') {
        super(message, 401, 'AUTH_ERROR');
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class TokenExpiredError extends AuthenticationError {
    constructor(message = 'Token expirado') {
        super(message, 401, 'TOKEN_EXPIRED');
        this.name = 'TokenExpiredError';
    }
}
exports.TokenExpiredError = TokenExpiredError;
class InvalidTokenError extends AuthenticationError {
    constructor(message = 'Token inválido') {
        super(message, 401, 'INVALID_TOKEN');
        this.name = 'InvalidTokenError';
    }
}
exports.InvalidTokenError = InvalidTokenError;
class InsufficientPermissionsError extends MercadoLivreError {
    constructor(message = 'Permissões insuficientes') {
        super(message, 403, 'INSUFFICIENT_PERMISSIONS');
        this.name = 'InsufficientPermissionsError';
    }
}
exports.InsufficientPermissionsError = InsufficientPermissionsError;
class RateLimitError extends MercadoLivreError {
    constructor(message = 'Limite de requisições excedido', retryAfter) {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        this.retryAfter = retryAfter;
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class ResourceNotFoundError extends MercadoLivreError {
    constructor(resource) {
        super(`Recurso não encontrado: ${resource}`, 404, 'RESOURCE_NOT_FOUND');
        this.name = 'ResourceNotFoundError';
    }
}
exports.ResourceNotFoundError = ResourceNotFoundError;
class ValidationError extends MercadoLivreError {
    constructor(message, field) {
        super(message, 400, 'VALIDATION_ERROR');
        this.field = field;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class ServerError extends MercadoLivreError {
    constructor(message = 'Erro interno do servidor') {
        super(message, 500, 'SERVER_ERROR');
        this.name = 'ServerError';
    }
}
exports.ServerError = ServerError;
class BadRequestError extends MercadoLivreError {
    constructor(message = 'Requisição inválida') {
        super(message, 400, 'BAD_REQUEST');
        this.name = 'BadRequestError';
    }
}
exports.BadRequestError = BadRequestError;
class ConflictError extends MercadoLivreError {
    constructor(message = 'Conflito') {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class TooManyRequestsError extends RateLimitError {
    constructor(message = 'Muitas requisições', retryAfter) {
        super(message, retryAfter);
        this.name = 'TooManyRequestsError';
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
// ============================================
// CÓDIGOS DE ERRO DO MERCADO LIVRE
// ============================================
exports.ERROR_CODES = {
    // Autenticação
    UNAUTHORIZED: InvalidTokenError,
    INVALID_TOKEN: InvalidTokenError,
    TOKEN_EXPIRED: TokenExpiredError,
    AUTH_ERROR: AuthenticationError,
    // Permissões
    FORBIDDEN: InsufficientPermissionsError,
    INSUFFICIENT_PERMISSIONS: InsufficientPermissionsError,
    // Rate Limiting
    TOO_MANY_REQUESTS: TooManyRequestsError,
    RATE_LIMIT_EXCEEDED: RateLimitError,
    // Recursos
    NOT_FOUND: ResourceNotFoundError,
    RESOURCE_NOT_FOUND: ResourceNotFoundError,
    // Validação
    BAD_REQUEST: BadRequestError,
    VALIDATION_ERROR: ValidationError,
    // Servidor
    INTERNAL_SERVER_ERROR: ServerError,
    SERVER_ERROR: ServerError,
    // Conflito
    CONFLICT: ConflictError,
    409: ConflictError,
};
// ============================================
// FUNÇÕES DE CRIAÇÃO DE ERROS
// ============================================
function createErrorFromResponse(response) {
    const statusCode = response.status;
    const errorData = response.data || {};
    const message = errorData.message || errorData.error || 'Erro desconhecido';
    const errorCode = errorData.code || errorData.error_code || String(statusCode);
    // Verificar se há um mapeamento de código de erro
    const ErrorClass = exports.ERROR_CODES[errorCode] || exports.ERROR_CODES[String(statusCode)];
    if (ErrorClass) {
        return new ErrorClass(message);
    }
    // Criar erro genérico baseado no status
    if (statusCode === 401) {
        return new InvalidTokenError(message);
    }
    if (statusCode === 403) {
        return new InsufficientPermissionsError(message);
    }
    if (statusCode === 404) {
        return new ResourceNotFoundError(errorCode);
    }
    if (statusCode === 429) {
        const retryAfter = response.headers?.['retry-after'];
        return new RateLimitError(message, retryAfter);
    }
    if (statusCode === 400) {
        return new BadRequestError(message);
    }
    if (statusCode >= 500) {
        return new ServerError(message);
    }
    return new MercadoLivreError(message, statusCode, errorCode, response.data);
}
function isMercadoLivreError(error) {
    return error instanceof MercadoLivreError;
}
//# sourceMappingURL=index.js.map