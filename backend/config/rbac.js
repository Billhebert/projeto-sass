/**
 * Role-Based Access Control (RBAC) Configuration
 *
 * Define roles and their permissions for the application
 */

const ROLES = {
  USER: "user",
  ADMIN: "admin",
  MODERATOR: "moderator",
  VIEWER: "viewer",
  SUPER_ADMIN: "super_admin",
};

const PERMISSIONS = {
  // User Management
  USER_READ: "user:read",
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_LIST: "user:list",

  // Admin Management
  ADMIN_READ: "admin:read",
  ADMIN_CREATE: "admin:create",
  ADMIN_UPDATE: "admin:update",
  ADMIN_DELETE: "admin:delete",
  ADMIN_LIST: "admin:list",
  ADMIN_VERIFY_EMAIL: "admin:verify_email",
  ADMIN_RESEND_EMAIL: "admin:resend_email",

  // Product Management
  PRODUCT_READ: "product:read",
  PRODUCT_CREATE: "product:create",
  PRODUCT_UPDATE: "product:update",
  PRODUCT_DELETE: "product:delete",

  // Order Management
  ORDER_READ: "order:read",
  ORDER_CREATE: "order:create",
  ORDER_UPDATE: "order:update",

  // Analytics
  ANALYTICS_READ: "analytics:read",
  ANALYTICS_EXPORT: "analytics:export",

  // System
  SYSTEM_CONFIG: "system:config",
  SYSTEM_LOGS: "system:logs",
  SYSTEM_BACKUP: "system:backup",
};

const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    // Super admin tem todas as permissões
    Object.values(PERMISSIONS),
  ].flat(),

  [ROLES.ADMIN]: [
    // Admin padrão
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_LIST,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.ADMIN_READ,
    PERMISSIONS.ADMIN_LIST,
    PERMISSIONS.ADMIN_VERIFY_EMAIL,
    PERMISSIONS.ADMIN_RESEND_EMAIL,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.SYSTEM_LOGS,
  ],

  [ROLES.MODERATOR]: [
    // Moderador
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_LIST,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ANALYTICS_READ,
  ],

  [ROLES.VIEWER]: [
    // Apenas visualização
    PERMISSIONS.USER_READ,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ANALYTICS_READ,
  ],

  [ROLES.USER]: [
    // Usuário comum
    PERMISSIONS.USER_READ, // Apenas seu próprio perfil
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.ORDER_READ,
  ],
};

const ROLE_DESCRIPTIONS = {
  [ROLES.SUPER_ADMIN]: "Acesso total ao sistema. Pode fazer qualquer coisa.",
  [ROLES.ADMIN]:
    "Acesso administrativo. Gerencia usuários, produtos, pedidos e análises.",
  [ROLES.MODERATOR]: "Acesso moderado. Pode visualizar e editar conteúdo.",
  [ROLES.VIEWER]: "Acesso de visualização. Pode ver dashboards e relatórios.",
  [ROLES.USER]: "Usuário padrão. Acesso limitado ao seu próprio perfil.",
};

/**
 * Check if user has permission
 * @param {Object} user - User object with role and permissions
 * @param {String} permission - Permission to check
 * @returns {Boolean}
 */
function hasPermission(user, permission) {
  if (!user || !user.role) return false;

  // Super admin tem todas as permissões
  if (user.role === ROLES.SUPER_ADMIN) return true;

  // Verificar permissões do role
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];

  // Verificar permissões customizadas do usuário
  const customPermissions = user.permissions || [];

  return (
    rolePermissions.includes(permission) ||
    customPermissions.includes(permission)
  );
}

/**
 * Check if user has all permissions
 * @param {Object} user - User object
 * @param {Array<String>} permissions - Permissions to check
 * @returns {Boolean}
 */
function hasAllPermissions(user, permissions) {
  return permissions.every((permission) => hasPermission(user, permission));
}

/**
 * Check if user has any permission
 * @param {Object} user - User object
 * @param {Array<String>} permissions - Permissions to check
 * @returns {Boolean}
 */
function hasAnyPermission(user, permissions) {
  return permissions.some((permission) => hasPermission(user, permission));
}

/**
 * Check if user is admin or above
 * @param {Object} user - User object
 * @returns {Boolean}
 */
function isAdmin(user) {
  return user && [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user.role);
}

/**
 * Check if user is super admin
 * @param {Object} user - User object
 * @returns {Boolean}
 */
function isSuperAdmin(user) {
  return user && user.role === ROLES.SUPER_ADMIN;
}

/**
 * Get all permissions for a role
 * @param {String} role - Role name
 * @returns {Array<String>}
 */
function getPermissionsByRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Get all roles
 * @returns {Array<String>}
 */
function getAllRoles() {
  return Object.values(ROLES);
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isAdmin,
  isSuperAdmin,
  getPermissionsByRole,
  getAllRoles,
};
