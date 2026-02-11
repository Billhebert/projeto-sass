/**
 * API Helpers - Funções auxiliares para chamadas de API
 * Centraliza lógica comum de tratamento de API
 */

import { toast } from "../store/toastStore";

/**
 * Constrói query string a partir de objeto de filtros
 * @param {object} filters - Objeto com filtros
 * @returns {URLSearchParams} Query params
 */
export const buildQueryParams = (filters = {}) => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    // Ignora valores null, undefined ou string vazia
    if (value !== null && value !== undefined && value !== "") {
      // Se é array, adiciona múltiplos valores
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else {
        params.append(key, String(value));
      }
    }
  });
  
  return params;
};

/**
 * Trata erros de API de forma consistente
 * @param {Error} error - Erro da requisição
 * @param {string} defaultMessage - Mensagem padrão se não houver mensagem no erro
 * @param {boolean} showToast - Se deve mostrar toast (padrão: true)
 * @returns {string} Mensagem de erro
 */
export const handleApiError = (error, defaultMessage = "Erro ao processar requisição", showToast = true) => {
  let message = defaultMessage;
  
  // Tenta extrair mensagem do erro
  if (error.response?.data?.message) {
    message = error.response.data.message;
  } else if (error.response?.data?.error) {
    message = error.response.data.error;
  } else if (error.message) {
    message = error.message;
  }
  
  // Tratamento específico por status HTTP
  if (error.response?.status === 401) {
    message = "Sessão expirada. Faça login novamente.";
  } else if (error.response?.status === 403) {
    message = "Você não tem permissão para executar esta ação.";
  } else if (error.response?.status === 404) {
    message = "Recurso não encontrado.";
  } else if (error.response?.status === 429) {
    message = "Muitas requisições. Aguarde alguns instantes.";
  } else if (error.response?.status >= 500) {
    message = "Erro no servidor. Tente novamente mais tarde.";
  }
  
  // Mostra toast se solicitado
  if (showToast) {
    toast.error(message);
  }
  
  // Log do erro no console (desenvolvimento)
  if (process.env.NODE_ENV === "development") {
    console.error("API Error:", error);
  }
  
  return message;
};

/**
 * Extrai dados de resposta da API (normaliza formato)
 * @param {object} response - Resposta da API
 * @returns {any} Dados extraídos
 */
export const parseApiResponse = (response) => {
  // Formato: { success: true, data: {...} }
  if (response.data?.success && response.data?.data !== undefined) {
    return response.data.data;
  }
  
  // Formato: { data: {...} }
  if (response.data) {
    return response.data;
  }
  
  return response;
};

/**
 * Valida resposta de API bem-sucedida
 * @param {object} response - Resposta da API
 * @returns {boolean} True se sucesso
 */
export const isSuccessResponse = (response) => {
  return (
    response?.status >= 200 &&
    response?.status < 300 &&
    (response.data?.success !== false)
  );
};

/**
 * Cria configuração de paginação padrão
 * @param {number} page - Página atual
 * @param {number} limit - Itens por página
 * @param {string} sortBy - Campo de ordenação
 * @param {object} filters - Filtros adicionais
 * @returns {object} Configuração de query
 */
export const buildPaginationConfig = (page = 1, limit = 50, sortBy = "-createdAt", filters = {}) => {
  const offset = (page - 1) * limit;
  
  return {
    offset,
    limit,
    sort: sortBy,
    ...filters,
  };
};

/**
 * Extrai informações de paginação da resposta
 * @param {object} response - Resposta da API
 * @param {number} limit - Limite usado na requisição
 * @returns {object} Info de paginação { total, totalPages, currentPage, hasMore }
 */
export const parsePaginationInfo = (response, limit = 50) => {
  const data = parseApiResponse(response);
  
  const total = data?.total || data?.count || 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor((data?.offset || 0) / limit) + 1;
  const hasMore = currentPage < totalPages;
  
  return {
    total,
    totalPages,
    currentPage,
    hasMore,
  };
};

/**
 * Retry de requisição com backoff exponencial
 * @param {Function} requestFn - Função que faz a requisição
 * @param {number} maxRetries - Número máximo de tentativas (padrão: 3)
 * @param {number} delay - Delay inicial em ms (padrão: 1000)
 * @returns {Promise} Resultado da requisição
 */
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Não retry em erros 4xx (exceto 429)
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
        throw error;
      }
      
      // Se não é a última tentativa, aguarda antes de tentar novamente
      if (i < maxRetries - 1) {
        const backoffDelay = delay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Debounce de função (útil para busca)
 * @param {Function} func - Função para fazer debounce
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} Função com debounce
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle de função (limita execuções)
 * @param {Function} func - Função para fazer throttle
 * @param {number} limit - Tempo mínimo entre execuções em ms
 * @returns {Function} Função com throttle
 */
export const throttle = (func, limit = 1000) => {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Formata erros de validação
 * @param {object} errors - Objeto de erros de validação
 * @returns {string} Mensagem formatada
 */
export const formatValidationErrors = (errors) => {
  if (!errors || typeof errors !== "object") return "Erro de validação";
  
  const messages = Object.entries(errors)
    .map(([field, error]) => {
      const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
      const errorMessage = Array.isArray(error) ? error[0] : error;
      return `${fieldName}: ${errorMessage}`;
    });
  
  return messages.join("\n");
};

/**
 * Cancela requisições pendentes (útil para cleanup)
 * @param {AbortController} controller - Controller de abort
 */
export const cancelPendingRequests = (controller) => {
  if (controller) {
    controller.abort();
  }
};

/**
 * Cria AbortController para requisições canceláveis
 * @returns {AbortController} Controller
 */
export const createAbortController = () => {
  if (typeof AbortController !== "undefined") {
    return new AbortController();
  }
  return null;
};

export default {
  buildQueryParams,
  handleApiError,
  parseApiResponse,
  isSuccessResponse,
  buildPaginationConfig,
  parsePaginationInfo,
  retryRequest,
  debounce,
  throttle,
  formatValidationErrors,
  cancelPendingRequests,
  createAbortController,
};
