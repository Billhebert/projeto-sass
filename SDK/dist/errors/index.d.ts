/**
 * Erros do Mercado Livre SDK
 */
export declare class MercadoLivreError extends Error {
    statusCode?: number | undefined;
    errorCode?: string | undefined;
    response?: any | undefined;
    constructor(message: string, statusCode?: number | undefined, errorCode?: string | undefined, response?: any | undefined);
}
export declare class AuthenticationError extends MercadoLivreError {
    constructor(message?: string);
}
export declare class TokenExpiredError extends AuthenticationError {
    constructor(message?: string);
}
export declare class InvalidTokenError extends AuthenticationError {
    constructor(message?: string);
}
export declare class InsufficientPermissionsError extends MercadoLivreError {
    constructor(message?: string);
}
export declare class RateLimitError extends MercadoLivreError {
    retryAfter?: number | undefined;
    constructor(message?: string, retryAfter?: number | undefined);
}
export declare class ResourceNotFoundError extends MercadoLivreError {
    constructor(resource: string);
}
export declare class ValidationError extends MercadoLivreError {
    field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare class ServerError extends MercadoLivreError {
    constructor(message?: string);
}
export declare class BadRequestError extends MercadoLivreError {
    constructor(message?: string);
}
export declare class ConflictError extends MercadoLivreError {
    constructor(message?: string);
}
export declare class TooManyRequestsError extends RateLimitError {
    constructor(message?: string, retryAfter?: number);
}
export declare const ERROR_CODES: Record<string, new (msg?: string) => MercadoLivreError>;
export declare function createErrorFromResponse(response: any): MercadoLivreError;
export declare function isMercadoLivreError(error: any): error is MercadoLivreError;
//# sourceMappingURL=index.d.ts.map