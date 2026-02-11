/**
 * Status Utilities - Centraliza lógica de status e badges
 * Substitui getStatusBadgeClass() duplicado em 10+ arquivos
 */

/**
 * Mapas de status por tipo de entidade
 */
export const STATUS_MAPS = {
  // Produtos
  product: {
    active: "Ativo",
    paused: "Pausado",
    closed: "Encerrado",
    inactive: "Inativo",
    under_review: "Em Revisão",
  },
  
  // Pedidos
  order: {
    confirmed: "Confirmado",
    payment_required: "Aguardando Pagamento",
    payment_in_process: "Pagamento em Processo",
    paid: "Pago",
    delivered: "Entregue",
    cancelled: "Cancelado",
    invalid: "Inválido",
  },
  
  // Reclamações
  claim: {
    opened: "Aberta",
    closed: "Fechada",
    claim_closed: "Encerrada",
    dispute: "Disputa",
    mediation: "Mediação",
  },
  
  // Perguntas
  question: {
    UNANSWERED: "Pendente",
    ANSWERED: "Respondida",
    CLOSED_UNANSWERED: "Fechada sem Resposta",
    UNDER_REVIEW: "Em Revisão",
    BANNED: "Bloqueada",
    DELETED: "Deletada",
  },
  
  // Envios
  shipment: {
    pending: "Pendente",
    ready_to_ship: "Pronto para Envio",
    shipped: "Enviado",
    delivered: "Entregue",
    not_delivered: "Não Entregue",
    cancelled: "Cancelado",
    returned: "Devolvido",
  },
  
  // Pagamentos (Mercado Pago)
  payment: {
    approved: "Aprovado",
    pending: "Pendente",
    in_process: "Em Processo",
    rejected: "Rejeitado",
    refunded: "Reembolsado",
    cancelled: "Cancelado",
    charged_back: "Chargeback",
  },
  
  // Assinaturas
  subscription: {
    authorized: "Autorizada",
    paused: "Pausada",
    cancelled: "Cancelada",
    pending: "Pendente",
  },
  
  // Notificações
  notification: {
    unread: "Não Lida",
    read: "Lida",
    archived: "Arquivada",
  },
  
  // Avaliações/Reviews
  review: {
    pending: "Pendente",
    published: "Publicada",
    moderated: "Moderada",
    deleted: "Deletada",
  },
};

/**
 * Mapa de variantes de cor por status
 */
export const STATUS_VARIANTS = {
  // Sucesso/Positivo
  success: ["active", "paid", "delivered", "approved", "published", "ANSWERED"],
  
  // Aviso/Pendente
  warning: [
    "paused",
    "pending",
    "payment_in_process",
    "ready_to_ship",
    "shipped",
    "opened",
    "UNANSWERED",
    "unread",
    "under_review",
  ],
  
  // Erro/Negativo
  danger: [
    "closed",
    "cancelled",
    "rejected",
    "not_delivered",
    "returned",
    "refunded",
    "charged_back",
    "dispute",
    "BANNED",
    "DELETED",
    "deleted",
  ],
  
  // Informativo
  info: [
    "confirmed",
    "payment_required",
    "in_process",
    "mediation",
    "CLOSED_UNANSWERED",
    "UNDER_REVIEW",
    "read",
    "moderated",
  ],
  
  // Neutro/Secundário
  secondary: ["inactive", "claim_closed", "archived", "invalid"],
};

/**
 * Retorna a variante de cor para um status
 * @param {string} status - Status para mapear
 * @returns {string} Variante de cor (success, warning, danger, info, secondary)
 */
export const getStatusVariant = (status) => {
  if (!status) return "secondary";
  
  const statusLower = String(status).toLowerCase();
  
  // Procura em cada variante
  for (const [variant, statuses] of Object.entries(STATUS_VARIANTS)) {
    if (statuses.some((s) => s.toLowerCase() === statusLower)) {
      return variant;
    }
  }
  
  return "secondary";
};

/**
 * Retorna a classe CSS do badge baseado no status
 * @param {string} status - Status da entidade
 * @param {string} type - Tipo da entidade (product, order, claim, etc.)
 * @returns {string} Classes CSS do badge
 */
export const getStatusBadgeClass = (status, type = null) => {
  if (!status) return "badge badge-secondary";
  
  const variant = getStatusVariant(status);
  return `badge badge-${variant}`;
};

/**
 * Retorna o label traduzido de um status
 * @param {string} status - Status da entidade
 * @param {string} type - Tipo da entidade (product, order, claim, etc.)
 * @returns {string} Label traduzido
 */
export const getStatusLabel = (status, type = null) => {
  if (!status) return "Desconhecido";
  
  // Se tem tipo, procura no mapa específico
  if (type && STATUS_MAPS[type]) {
    const label = STATUS_MAPS[type][status];
    if (label) return label;
  }
  
  // Procura em todos os mapas
  for (const map of Object.values(STATUS_MAPS)) {
    if (map[status]) return map[status];
  }
  
  // Fallback: capitaliza o status
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Retorna ícone Material Icons para um status
 * @param {string} status - Status da entidade
 * @param {string} type - Tipo da entidade
 * @returns {string} Nome do ícone Material Icons
 */
export const getStatusIcon = (status, type = null) => {
  const variant = getStatusVariant(status);
  
  const iconMap = {
    success: "check_circle",
    warning: "schedule",
    danger: "cancel",
    info: "info",
    secondary: "remove_circle",
  };
  
  return iconMap[variant] || "help";
};

/**
 * Verifica se um status é final (não pode mais mudar)
 * @param {string} status - Status para verificar
 * @param {string} type - Tipo da entidade
 * @returns {boolean} True se é status final
 */
export const isFinalStatus = (status, type = null) => {
  const finalStatuses = [
    "closed",
    "cancelled",
    "delivered",
    "refunded",
    "charged_back",
    "claim_closed",
    "DELETED",
    "deleted",
    "archived",
  ];
  
  return finalStatuses.some((s) => s.toLowerCase() === String(status).toLowerCase());
};

/**
 * Verifica se um status requer ação
 * @param {string} status - Status para verificar
 * @param {string} type - Tipo da entidade
 * @returns {boolean} True se requer ação
 */
export const requiresAction = (status, type = null) => {
  const actionStatuses = [
    "pending",
    "payment_required",
    "ready_to_ship",
    "UNANSWERED",
    "opened",
    "unread",
    "under_review",
  ];
  
  return actionStatuses.some((s) => s.toLowerCase() === String(status).toLowerCase());
};

/**
 * Retorna componente de badge completo (objeto com props)
 * @param {string} status - Status da entidade
 * @param {string} type - Tipo da entidade
 * @returns {object} Props para componente Badge
 */
export const getStatusBadgeProps = (status, type = null) => {
  return {
    status,
    variant: getStatusVariant(status),
    label: getStatusLabel(status, type),
    icon: getStatusIcon(status, type),
    isFinal: isFinalStatus(status, type),
    requiresAction: requiresAction(status, type),
    className: getStatusBadgeClass(status, type),
  };
};

export default {
  STATUS_MAPS,
  STATUS_VARIANTS,
  getStatusVariant,
  getStatusBadgeClass,
  getStatusLabel,
  getStatusIcon,
  isFinalStatus,
  requiresAction,
  getStatusBadgeProps,
};
