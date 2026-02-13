// Plans configuration
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      'Ate 100 produtos',
      '1 usuario',
      'Dashboard basico',
      'Suporte por email',
    ],
    limits: {
      products: 100,
      users: 1,
      apiCalls: 1000,
    },
  },
  starter: {
    name: 'Starter',
    price: 49.9,
    features: [
      'Ate 500 produtos',
      '3 usuarios',
      'Dashboard completo',
      'Automacoes basicas',
      'Suporte prioritario',
    ],
    limits: {
      products: 500,
      users: 3,
      apiCalls: 10000,
    },
  },
  pro: {
    name: 'Pro',
    price: 149.9,
    features: [
      'Produtos ilimitados',
      '10 usuarios',
      'Dashboard avancado',
      'Automacoes avancadas',
      'API completa',
      'Webhooks',
      'Suporte 24/7',
    ],
    limits: {
      products: -1,
      users: 10,
      apiCalls: 100000,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: -1, // Custom
    features: [
      'Tudo do Pro',
      'Usuarios ilimitados',
      'API ilimitada',
      'SLA garantido',
      'Gerente de conta dedicado',
      'Integracao customizada',
    ],
    limits: {
      products: -1,
      users: -1,
      apiCalls: -1,
    },
  },
};

// Order statuses
export const ORDER_STATUS = {
  confirmed: { label: 'Confirmado', color: 'blue' },
  payment_required: { label: 'Aguardando Pagamento', color: 'yellow' },
  payment_in_process: { label: 'Pagamento em Processo', color: 'yellow' },
  partially_paid: { label: 'Parcialmente Pago', color: 'orange' },
  paid: { label: 'Pago', color: 'green' },
  partially_refunded: { label: 'Parcialmente Reembolsado', color: 'orange' },
  pending_cancel: { label: 'Cancelamento Pendente', color: 'red' },
  cancelled: { label: 'Cancelado', color: 'red' },
};

// Item statuses
export const ITEM_STATUS = {
  active: { label: 'Ativo', color: 'green' },
  paused: { label: 'Pausado', color: 'yellow' },
  closed: { label: 'Finalizado', color: 'gray' },
  under_review: { label: 'Em Revisao', color: 'orange' },
  inactive: { label: 'Inativo', color: 'red' },
};

// Mercado Livre sites
export const ML_SITES = {
  MLB: { name: 'Brasil', currency: 'BRL' },
  MLA: { name: 'Argentina', currency: 'ARS' },
  MLM: { name: 'Mexico', currency: 'MXN' },
  MLC: { name: 'Chile', currency: 'CLP' },
  MCO: { name: 'Colombia', currency: 'COP' },
};
