/**
 * Formatters - Funções de formatação centralizadas
 * Substitui todas as funções de formatação duplicadas em 20+ arquivos
 */

/**
 * Formata data para string localizada
 * @param {string|Date} dateString - Data para formatar
 * @param {object} options - Opções de formatação
 * @returns {string} Data formatada
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", options);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Data inválida";
  }
};

/**
 * Formata data e hora para string localizada
 * @param {string|Date} dateString - Data para formatar
 * @returns {string} Data e hora formatadas
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR");
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return "Data inválida";
  }
};

/**
 * Formata valor monetário para BRL
 * @param {number} value - Valor para formatar
 * @param {string} currency - Código da moeda (padrão: BRL)
 * @returns {string} Valor formatado
 */
export const formatCurrency = (value, currency = "BRL") => {
  if (value === null || value === undefined || isNaN(value)) return "R$ 0,00";
  
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return `R$ ${value}`;
  }
};

/**
 * Formata número com separadores
 * @param {number} value - Número para formatar
 * @returns {string} Número formatado
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) return "0";
  
  try {
    return new Intl.NumberFormat("pt-BR").format(value);
  } catch (error) {
    console.error("Error formatting number:", error);
    return String(value);
  }
};

/**
 * Formata porcentagem
 * @param {number} value - Valor (0-100)
 * @param {number} decimals - Casas decimais (padrão: 1)
 * @returns {string} Porcentagem formatada
 */
export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return "0%";
  
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Retorna tempo relativo desde uma data (ex: "5 min atrás")
 * @param {string|Date} dateString - Data de referência
 * @returns {string} Tempo relativo
 */
export const getTimeSince = (dateString) => {
  if (!dateString) return "N/A";
  
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000); // diferença em segundos
    
    // Segundos
    if (diff < 60) return `${diff}s atrás`;
    
    // Minutos
    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes} min atrás`;
    
    // Horas
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    // Dias
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ${days === 1 ? "dia" : "dias"} atrás`;
    
    // Meses
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"} atrás`;
    
    // Anos
    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? "ano" : "anos"} atrás`;
  } catch (error) {
    console.error("Error calculating time since:", error);
    return "N/A";
  }
};

/**
 * Formata tempo até uma data futura
 * @param {string|Date} dateString - Data futura
 * @returns {string} Tempo restante
 */
export const getTimeUntil = (dateString) => {
  if (!dateString) return "N/A";
  
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((date - now) / 1000); // diferença em segundos
    
    if (diff <= 0) return "Expirado";
    
    // Minutos
    if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes} min restantes`;
    }
    
    // Horas
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours}h restantes`;
    }
    
    // Dias
    const days = Math.floor(diff / 86400);
    return `${days} ${days === 1 ? "dia" : "dias"} restantes`;
  } catch (error) {
    console.error("Error calculating time until:", error);
    return "N/A";
  }
};

/**
 * Formata bytes para tamanho legível
 * @param {number} bytes - Número de bytes
 * @param {number} decimals - Casas decimais (padrão: 2)
 * @returns {string} Tamanho formatado
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  if (!bytes) return "N/A";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Trunca texto longo
 * @param {string} text - Texto para truncar
 * @param {number} maxLength - Tamanho máximo
 * @param {string} suffix - Sufixo (padrão: "...")
 * @returns {string} Texto truncado
 */
export const truncateText = (text, maxLength, suffix = "...") => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Pluraliza palavra baseado na quantidade
 * @param {number} count - Quantidade
 * @param {string} singular - Palavra no singular
 * @param {string} plural - Palavra no plural (opcional, adiciona "s" se não fornecido)
 * @returns {string} Palavra pluralizada
 */
export const pluralize = (count, singular, plural = null) => {
  if (count === 1) return singular;
  return plural || `${singular}s`;
};

/**
 * Formata quantidade com rótulo pluralizado
 * @param {number} count - Quantidade
 * @param {string} singular - Palavra no singular
 * @param {string} plural - Palavra no plural (opcional)
 * @returns {string} Texto formatado (ex: "5 produtos")
 */
export const formatCount = (count, singular, plural = null) => {
  return `${formatNumber(count)} ${pluralize(count, singular, plural)}`;
};

export default {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  formatPercent,
  getTimeSince,
  getTimeUntil,
  formatBytes,
  truncateText,
  pluralize,
  formatCount,
};
