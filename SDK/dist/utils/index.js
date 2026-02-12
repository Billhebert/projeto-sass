"use strict";
/**
 * Utilitários do Mercado Livre SDK
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUYING_MODES = exports.LISTING_TYPES = exports.SHIPMENT_STATUS = exports.ORDER_STATUS = exports.ITEM_STATUS = exports.ITEM_CONDITIONS = exports.CURRENCY_IDS = exports.SITE_IDS = void 0;
exports.buildPaginationParams = buildPaginationParams;
exports.getNextPage = getNextPage;
exports.getPreviousPage = getPreviousPage;
exports.hasNextPage = hasNextPage;
exports.hasPreviousPage = hasPreviousPage;
exports.formatPrice = formatPrice;
exports.formatDate = formatDate;
exports.formatRelativeTime = formatRelativeTime;
exports.buildQueryString = buildQueryString;
exports.parseQueryString = parseQueryString;
exports.replaceUrlParams = replaceUrlParams;
exports.isValidItemId = isValidItemId;
exports.isValidOrderId = isValidOrderId;
exports.isValidUserId = isValidUserId;
exports.isValidCategoryId = isValidCategoryId;
exports.isValidNickname = isValidNickname;
exports.isValidEmail = isValidEmail;
exports.isValidUrl = isValidUrl;
exports.getSiteId = getSiteId;
exports.delay = delay;
exports.retry = retry;
exports.chunkArray = chunkArray;
exports.sleep = sleep;
exports.toPaginatedResult = toPaginatedResult;
exports.validateItemId = validateItemId;
exports.validateOrderId = validateOrderId;
exports.validateUserId = validateUserId;
function buildPaginationParams(options) {
    const params = {};
    if (options.limit !== undefined) {
        params.limit = Math.min(Math.max(1, options.limit), 1000);
    }
    if (options.offset !== undefined) {
        params.offset = Math.max(0, options.offset);
    }
    return params;
}
function getNextPage(paging) {
    const nextOffset = paging.offset + paging.limit;
    if (nextOffset < paging.total) {
        return {
            limit: paging.limit,
            offset: nextOffset,
        };
    }
    return null;
}
function getPreviousPage(paging) {
    const prevOffset = paging.offset - paging.limit;
    if (prevOffset >= 0) {
        return {
            limit: paging.limit,
            offset: prevOffset,
        };
    }
    return null;
}
function hasNextPage(paging) {
    return paging.offset + paging.limit < paging.total;
}
function hasPreviousPage(paging) {
    return paging.offset > 0;
}
// ============================================
// FORMATAÇÃO
// ============================================
function formatPrice(amount, currencyId) {
    const currencySymbols = {
        BRL: 'R$',
        ARS: '$',
        CLP: '$',
        COP: '$',
        MXN: '$',
        UYU: '$',
        USD: 'US$',
    };
    const symbol = currencySymbols[currencyId] || currencyId;
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
    return `${symbol} ${formattedAmount}`;
}
function formatDate(dateString, locale = 'pt-BR') {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60) {
        return 'agora mesmo';
    }
    if (diffMin < 60) {
        return `${diffMin} minuto${diffMin > 1 ? 's' : ''} atrás`;
    }
    if (diffHour < 24) {
        return `${diffHour} hora${diffHour > 1 ? 's' : ''} atrás`;
    }
    if (diffDay < 30) {
        return `${diffDay} dia${diffDay > 1 ? 's' : ''} atrás`;
    }
    return formatDate(dateString);
}
// ============================================
// URL E PARÂMETROS
// ============================================
function buildQueryString(params) {
    const validParams = Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
        if (Array.isArray(value)) {
            return `${key}=${value.join(',')}`;
        }
        return `${key}=${encodeURIComponent(String(value))}`;
    });
    return validParams.length > 0 ? `?${validParams.join('&')}` : '';
}
function parseQueryString(queryString) {
    if (!queryString || queryString === '?') {
        return {};
    }
    const params = {};
    const searchParams = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);
    searchParams.forEach((value, key) => {
        if (params[key]) {
            if (Array.isArray(params[key])) {
                params[key].push(value);
            }
            else {
                params[key] = [params[key], value];
            }
        }
        else {
            params[key] = value;
        }
    });
    return params;
}
function replaceUrlParams(url, params) {
    let result = url;
    Object.entries(params).forEach(([key, value]) => {
        result = result.replace(`{${key}}`, String(value));
        result = result.replace(`:${key}`, String(value));
    });
    return result;
}
// ============================================
// VALIDAÇÃO
// ============================================
function isValidItemId(id) {
    return /^[A-Z]{2}\d{8,12}$/.test(id);
}
function isValidOrderId(id) {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    return Number.isInteger(numId) && numId > 0;
}
function isValidUserId(id) {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    return Number.isInteger(numId) && numId > 0;
}
function isValidCategoryId(id) {
    return /^[A-Z]{2,4}$/.test(id);
}
function isValidNickname(nickname) {
    return /^[a-zA-Z0-9_]{2,20}$/.test(nickname);
}
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
// ============================================
// SITE IDs
// ============================================
exports.SITE_IDS = {
    ARGENTINA: 'MLA',
    BRASIL: 'MLB',
    CHILE: 'MLC',
    COLÔMBIA: 'MCO',
    EQUADOR: 'MSE',
    MÉXIO: 'MLM',
    PANAMÁ: 'MPA',
    PERU: 'MPE',
    PORTUGAL: 'MPT',
    URUGUAI: 'MLU',
    VENEZUELA: 'MLV',
};
function getSiteId(country) {
    const mapping = {
        argentina: exports.SITE_IDS.ARGENTINA,
        brasil: exports.SITE_IDS.BRASIL,
        chile: exports.SITE_IDS.CHILE,
        colombia: exports.SITE_IDS.COLÔMBIA,
        equador: exports.SITE_IDS.EQUADOR,
        méxico: exports.SITE_IDS.MÉXIO,
        panamá: exports.SITE_IDS.PANAMÁ,
        peru: exports.SITE_IDS.PERU,
        portugal: exports.SITE_IDS.PORTUGAL,
        uruguai: exports.SITE_IDS.URUGUAI,
        venezuela: exports.SITE_IDS.VENEZUELA,
    };
    return mapping[country.toLowerCase()] || null;
}
// ============================================
// MOEDAS
// ============================================
exports.CURRENCY_IDS = {
    ARS: 'ARS',
    BOB: 'BOB',
    BRL: 'BRL',
    CLF: 'CLF',
    CLP: 'CLP',
    COP: 'COP',
    CRC: 'CRC',
    CUC: 'CUC',
    CUP: 'CUP',
    DOP: 'DOP',
    EUR: 'EUR',
    GTQ: 'GTQ',
    HNL: 'HNL',
    MXN: 'MXN',
    NIO: 'NIO',
    PAB: 'PAB',
    PEN: 'PEN',
    PYG: 'PYG',
    USD: 'USD',
    UYU: 'UYU',
    VEF: 'VEF',
};
// ============================================
// CONDITION E STATUS
// ============================================
exports.ITEM_CONDITIONS = {
    NEW: 'new',
    USED: 'used',
    NOT_SPECIFIED: 'not_specified',
};
exports.ITEM_STATUS = {
    ACTIVE: 'active',
    PAUSED: 'paused',
    CLOSED: 'closed',
    UNDER_REVIEW: 'under_review',
    IN_REVIEW: 'in_review',
    BLOCKED: 'blocked',
};
exports.ORDER_STATUS = {
    CONFIRMED: 'confirmed',
    PAID: 'paid',
    PENDING: 'pending_confirm',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
};
exports.SHIPMENT_STATUS = {
    PENDING: 'pending',
    READY_TO_SHIP: 'ready_to_ship',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    RETURNED: 'returned',
};
// ============================================
// LISTING TYPES
// ============================================
exports.LISTING_TYPES = {
    BRONZE: 'bronze',
    SILVER: 'silver',
    GOLD: 'gold',
    GOLD_SPECIAL: 'gold_special',
    GOLD_PREMIUM: 'gold_premium',
    PLATINUM: 'platinum',
    PREMIUM: 'premium',
};
// ============================================
// BUYING MODES
// ============================================
exports.BUYING_MODES = {
    BUY_IT_NOW: 'buy_it_now',
    AUCTION: 'auction',
    CLASSIFIED: 'classified',
};
// ============================================
// UTILIDADES GERAIS
// ============================================
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function retry(fn, maxRetries = 3, delayMs = 1000, backoff = 2) {
    return fn().catch(async (error, attempt = 0) => {
        if (attempt >= maxRetries) {
            throw error;
        }
        await delay(delayMs * Math.pow(backoff, attempt));
        return retry(fn, maxRetries, delayMs, backoff, attempt + 1);
    });
}
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function toPaginatedResult(data, paging) {
    return {
        data,
        paging,
        hasNextPage: hasNextPage(paging),
        hasPreviousPage: hasPreviousPage(paging),
        nextPage: () => getNextPage(paging),
        previousPage: () => getPreviousPage(paging),
    };
}
// ============================================
// DEPRECATED - COMPATIBILIDADE
// ============================================
/**
 * @deprecated Use isValidItemId instead
 */
function validateItemId(id) {
    return isValidItemId(id);
}
/**
 * @deprecated Use isValidOrderId instead
 */
function validateOrderId(id) {
    return isValidOrderId(id);
}
/**
 * @deprecated Use isValidUserId instead
 */
function validateUserId(id) {
    return isValidUserId(id);
}
//# sourceMappingURL=index.js.map