/**
 * API Data Normalizer
 * Converte snake_case para camelCase e normaliza estruturas de dados inconsistentes
 */

import logger from "./logger";

/**
 * Converte string de snake_case para camelCase
 */
const snakeToCamel = (str) => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

/**
 * Converte objeto/array de snake_case para camelCase recursivamente
 */
export const normalizeKeys = (data) => {
  if (data === null || data === undefined) {
    return data;
  }

  // Se for array, normaliza cada elemento
  if (Array.isArray(data)) {
    return data.map(normalizeKeys);
  }

  // Se não for objeto, retorna como está
  if (typeof data !== "object") {
    return data;
  }

  // Normaliza chaves do objeto
  const normalized = {};
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const camelKey = snakeToCamel(key);
      normalized[camelKey] = normalizeKeys(data[key]);
    }
  }

  return normalized;
};

/**
 * Normaliza ordem/pedido do Mercado Livre
 */
export const normalizeOrder = (order) => {
  if (!order) return null;

  const normalized = normalizeKeys(order);

  return {
    id: normalized.id || normalized.mlOrderId || normalized.orderId,
    mlOrderId: normalized.mlOrderId || normalized.id,
    dateCreated: normalized.dateCreated || normalized.date_created,
    lastUpdated:
      normalized.lastUpdated ||
      normalized.last_updated ||
      normalized.dateLastUpdated,
    status: normalized.status,
    statusDetail: normalized.statusDetail || normalized.status_detail,
    buyer: {
      id: normalized.buyer?.id || normalized.buyer?.userId,
      nickname: normalized.buyer?.nickname,
      email: normalized.buyer?.email,
      phone: normalized.buyer?.phone,
      firstName: normalized.buyer?.firstName || normalized.buyer?.first_name,
      lastName: normalized.buyer?.lastName || normalized.buyer?.last_name,
    },
    seller: normalized.seller,
    totalAmount: normalized.totalAmount || normalized.total_amount,
    paidAmount: normalized.paidAmount || normalized.paid_amount,
    currencyId: normalized.currencyId || normalized.currency_id || "BRL",
    orderItems: normalized.orderItems || normalized.items || [],
    payments: normalized.payments || [],
    shipping: normalized.shipping,
    tags: normalized.tags || [],
    ...normalized,
  };
};

/**
 * Normaliza produto/item do Mercado Livre
 */
export const normalizeProduct = (product) => {
  if (!product) return null;

  const normalized = normalizeKeys(product);

  return {
    id: normalized.id || normalized.mlProductId || normalized.itemId,
    mlProductId: normalized.mlProductId || normalized.id,
    title: normalized.title,
    categoryId: normalized.categoryId || normalized.category_id,
    price: normalized.price,
    availableQuantity:
      normalized.availableQuantity ||
      normalized.available_quantity ||
      normalized.quantity,
    soldQuantity: normalized.soldQuantity || normalized.sold_quantity,
    condition: normalized.condition,
    status: normalized.status,
    permalink: normalized.permalink || normalized.permalinkUrl,
    thumbnailUrl:
      normalized.thumbnailUrl ||
      normalized.thumbnail_url ||
      normalized.thumbnail,
    pictures: normalized.pictures || [],
    attributes: normalized.attributes || [],
    dateCreated: normalized.dateCreated || normalized.date_created,
    lastUpdated: normalized.lastUpdated || normalized.last_updated,
    ...normalized,
  };
};

/**
 * Normaliza pergunta do Mercado Livre
 */
export const normalizeQuestion = (question) => {
  if (!question) return null;

  const normalized = normalizeKeys(question);

  return {
    id: normalized.id,
    itemId: normalized.itemId || normalized.item_id,
    text: normalized.text,
    status: normalized.status,
    dateCreated: normalized.dateCreated || normalized.date_created,
    answer: {
      text: normalized.answer?.text,
      status: normalized.answer?.status,
      dateCreated:
        normalized.answer?.dateCreated || normalized.answer?.date_created,
    },
    from: {
      id: normalized.from?.id,
      answeredQuestions:
        normalized.from?.answeredQuestions ||
        normalized.from?.answered_questions,
    },
    ...normalized,
  };
};

/**
 * Normaliza conta do Mercado Livre
 */
export const normalizeMLAccount = (account) => {
  if (!account) return null;

  const normalized = normalizeKeys(account);

  return {
    id: normalized.id,
    userId: normalized.userId || normalized.user_id,
    mlUserId: normalized.mlUserId || normalized.ml_user_id,
    nickname: normalized.nickname,
    email: normalized.email,
    status: normalized.status,
    accessToken: normalized.accessToken || normalized.access_token,
    refreshToken: normalized.refreshToken || normalized.refresh_token,
    expiresAt: normalized.expiresAt || normalized.expires_at,
    siteId: normalized.siteId || normalized.site_id || "MLB",
    ...normalized,
  };
};

/**
 * Normaliza envio/shipment
 */
export const normalizeShipment = (shipment) => {
  if (!shipment) return null;

  const normalized = normalizeKeys(shipment);

  return {
    id: normalized.id,
    orderId: normalized.orderId || normalized.order_id,
    trackingNumber: normalized.trackingNumber || normalized.tracking_number,
    trackingMethod: normalized.trackingMethod || normalized.tracking_method,
    status: normalized.status,
    substatus: normalized.substatus || normalized.subStatus,
    shippingMode: normalized.shippingMode || normalized.shipping_mode,
    dateCreated: normalized.dateCreated || normalized.date_created,
    lastUpdated: normalized.lastUpdated || normalized.last_updated,
    ...normalized,
  };
};

/**
 * Normaliza pagamento
 */
export const normalizePayment = (payment) => {
  if (!payment) return null;

  const normalized = normalizeKeys(payment);

  return {
    id: normalized.id,
    orderId: normalized.orderId || normalized.order_id,
    transactionAmount:
      normalized.transactionAmount || normalized.transaction_amount,
    totalPaidAmount: normalized.totalPaidAmount || normalized.total_paid_amount,
    currencyId: normalized.currencyId || normalized.currency_id || "BRL",
    status: normalized.status,
    statusDetail: normalized.statusDetail || normalized.status_detail,
    paymentType: normalized.paymentType || normalized.payment_type,
    paymentMethodId: normalized.paymentMethodId || normalized.payment_method_id,
    dateCreated: normalized.dateCreated || normalized.date_created,
    dateApproved: normalized.dateApproved || normalized.date_approved,
    ...normalized,
  };
};

/**
 * Normaliza estatísticas/métricas
 */
export const normalizeStats = (stats) => {
  if (!stats) return null;

  const normalized = normalizeKeys(stats);

  return {
    totalOrders: normalized.totalOrders || normalized.total_orders || 0,
    totalRevenue: normalized.totalRevenue || normalized.total_revenue || 0,
    totalProducts: normalized.totalProducts || normalized.total_products || 0,
    activeProducts:
      normalized.activeProducts || normalized.active_products || 0,
    totalQuestions:
      normalized.totalQuestions || normalized.total_questions || 0,
    pendingQuestions:
      normalized.pendingQuestions || normalized.pending_questions || 0,
    ...normalized,
  };
};

/**
 * Normaliza resposta de API automaticamente baseado no tipo de dados
 */
export const normalizeApiResponse = (data, type = "auto") => {
  if (!data) return data;

  try {
    // Se for array, normaliza cada item
    if (Array.isArray(data)) {
      switch (type) {
        case "orders":
          return data.map(normalizeOrder);
        case "products":
          return data.map(normalizeProduct);
        case "questions":
          return data.map(normalizeQuestion);
        case "accounts":
          return data.map(normalizeMLAccount);
        case "shipments":
          return data.map(normalizeShipment);
        case "payments":
          return data.map(normalizePayment);
        default:
          return data.map(normalizeKeys);
      }
    }

    // Se for objeto único, normaliza baseado no tipo
    switch (type) {
      case "order":
        return normalizeOrder(data);
      case "product":
        return normalizeProduct(data);
      case "question":
        return normalizeQuestion(data);
      case "account":
        return normalizeMLAccount(data);
      case "shipment":
        return normalizeShipment(data);
      case "payment":
        return normalizePayment(data);
      case "stats":
        return normalizeStats(data);
      default:
        return normalizeKeys(data);
    }
  } catch (error) {
    logger.error("Erro ao normalizar dados da API:", error);
    return data; // Retorna dados originais em caso de erro
  }
};

/**
 * Normaliza resposta de paginação
 */
export const normalizePaginatedResponse = (response) => {
  if (!response) return null;

  const normalized = normalizeKeys(response);

  return {
    data: normalized.data || normalized.results || [],
    total: normalized.total || normalized.totalCount || 0,
    page: normalized.page || normalized.currentPage || 1,
    pageSize: normalized.pageSize || normalized.limit || 50,
    totalPages:
      normalized.totalPages ||
      Math.ceil((normalized.total || 0) / (normalized.pageSize || 50)),
    hasMore:
      normalized.hasMore !== undefined
        ? normalized.hasMore
        : (normalized.page || 1) < (normalized.totalPages || 1),
    ...normalized,
  };
};

export default {
  normalizeKeys,
  normalizeOrder,
  normalizeProduct,
  normalizeQuestion,
  normalizeMLAccount,
  normalizeShipment,
  normalizePayment,
  normalizeStats,
  normalizeApiResponse,
  normalizePaginatedResponse,
};
