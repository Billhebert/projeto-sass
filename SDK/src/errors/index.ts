/**
 * Erros do Mercado Livre SDK - Simplificado
 */

export class MercadoLivreError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string,
    public response?: any
  ) {
    super(message);
    this.name = 'MercadoLivreError';
  }
}

export class AuthenticationError extends MercadoLivreError {
  constructor(message: string = 'Erro de autenticação') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class TokenExpiredError extends AuthenticationError {
  constructor(message: string = 'Token expirado') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends AuthenticationError {
  constructor(message: string = 'Token inválido') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class InsufficientPermissionsError extends MercadoLivreError {
  constructor(message: string = 'Permissões insuficientes') {
    super(message, 403, 'INSUFFICIENT_PERMISSIONS');
    this.name = 'InsufficientPermissionsError';
  }
}

export class RateLimitError extends MercadoLivreError {
  constructor(
    message: string = 'Limite de requisições excedido',
    public retryAfter?: number
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ResourceNotFoundError extends MercadoLivreError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404, 'RESOURCE_NOT_FOUND');
    this.name = 'ResourceNotFoundError';
  }
}

export class ValidationError extends MercadoLivreError {
  constructor(message: string = 'Erro de validação') {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ServerError extends MercadoLivreError {
  constructor(message: string = 'Erro interno do servidor') {
    super(message, 500, 'SERVER_ERROR');
    this.name = 'ServerError';
  }
}

export class BadRequestError extends MercadoLivreError {
  constructor(message: string = 'Requisição inválida') {
    super(message, 400, 'BAD_REQUEST');
    this.name = 'BadRequestError';
  }
}

export class ConflictError extends MercadoLivreError {
  constructor(message: string = 'Conflito') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends RateLimitError {
  constructor(message: string = 'Muitas requisições', retryAfter?: number) {
    super(message, retryAfter);
    this.name = 'TooManyRequestsError';
  }
}

export function createErrorFromResponse(response: any): MercadoLivreError {
  const statusCode = response?.status || 500;
  const errorData = response?.data || {};
  
  const message = errorData.message || errorData.error || 'Erro desconhecido';
  const errorCode = errorData.code || errorData.error_code || String(statusCode);
  
  if (statusCode === 401) {
    return new InvalidTokenError(message);
  }
  if (statusCode === 403) {
    return new InsufficientPermissionsError(message);
  }
  if (statusCode === 404) {
    return new ResourceNotFoundError(message);
  }
  if (statusCode === 429) {
    const retryAfter = response?.headers?.['retry-after'];
    return new RateLimitError(message, retryAfter);
  }
  if (statusCode === 400) {
    return new BadRequestError(message);
  }
  if (statusCode >= 500) {
    return new ServerError(message);
  }
  
  return new MercadoLivreError(message, statusCode, errorCode, response?.data);
}

export function isMercadoLivreError(error: any): error is MercadoLivreError {
  return error instanceof MercadoLivreError;
}
