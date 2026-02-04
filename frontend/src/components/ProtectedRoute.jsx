import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

/**
 * Protected Route Component
 * Checks user authentication and role-based access control
 *
 * Usage:
 * <ProtectedRoute
 *   element={<AdminPage />}
 *   requiredRole="admin"
 * />
 */
export function ProtectedRoute({
  element,
  requiredRole = null,
  requiredRoles = [],
}) {
  const { user, token } = useAuthStore();

  // Check if user is authenticated
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required, check it
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="unauthorized-access">
        <div className="unauthorized-container">
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
          <p>
            Required role: <strong>{requiredRole}</strong>
          </p>
          <p>
            Your role: <strong>{user.role || "user"}</strong>
          </p>
          <a href="/">Return to Dashboard</a>
        </div>
        <style>{`
          .unauthorized-access {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #f5f5f5;
          }
          .unauthorized-container {
            text-align: center;
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 400px;
          }
          .unauthorized-container h2 {
            color: #d32f2f;
            margin-bottom: 1rem;
          }
          .unauthorized-container p {
            margin: 0.5rem 0;
            color: #666;
          }
          .unauthorized-container a {
            display: inline-block;
            margin-top: 1.5rem;
            padding: 0.5rem 1rem;
            background: #1976d2;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            transition: background 0.3s;
          }
          .unauthorized-container a:hover {
            background: #1565c0;
          }
        `}</style>
      </div>
    );
  }

  // If multiple roles are allowed, check if user has one of them
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div className="unauthorized-access">
        <div className="unauthorized-container">
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
          <p>
            Required roles: <strong>{requiredRoles.join(", ")}</strong>
          </p>
          <p>
            Your role: <strong>{user.role || "user"}</strong>
          </p>
          <a href="/">Return to Dashboard</a>
        </div>
      </div>
    );
  }

  // Check if email is verified (for sensitive operations)
  if (!user.emailVerified && requiredRole !== "user") {
    return (
      <div className="unauthorized-access">
        <div className="unauthorized-container">
          <h2>Email Verification Required</h2>
          <p>Please verify your email address to access this page.</p>
          <a href="/verify-email">Verify Email</a>
        </div>
      </div>
    );
  }

  // User is authorized, render the protected element
  return element;
}

/**
 * Hook to check if user has a specific role
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export function useHasRole(role) {
  const { user } = useAuthStore();
  return user?.role === role;
}

/**
 * Hook to check if user has any of the specified roles
 * @param {string[]} roles - Roles to check
 * @returns {boolean}
 */
export function useHasAnyRole(roles) {
  const { user } = useAuthStore();
  return roles.includes(user?.role);
}

/**
 * Hook to check if user can access admin features
 * @returns {boolean}
 */
export function useIsAdmin() {
  const { user } = useAuthStore();
  return user?.role === "admin" || user?.role === "super_admin";
}

/**
 * Hook to check if user can perform moderator actions
 * @returns {boolean}
 */
export function useCanModerate() {
  const { user } = useAuthStore();
  return ["admin", "moderator", "super_admin"].includes(user?.role);
}

/**
 * Hook to check if user can edit content
 * @returns {boolean}
 */
export function useCanEdit() {
  const { user } = useAuthStore();
  return ["admin", "moderator", "super_admin"].includes(user?.role);
}

/**
 * Hook to check if user has a specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function useHasPermission(permission) {
  const { user } = useAuthStore();
  return (
    user?.permissions?.includes(permission) || user?.role === "super_admin"
  );
}

/**
 * Higher-order component to protect a component with role checking
 * @param {React.ComponentType} Component - Component to protect
 * @param {string} requiredRole - Required role
 * @param {string[]} requiredRoles - Required roles (alternative to single role)
 * @returns {React.ComponentType}
 */
export function withRoleProtection(
  Component,
  requiredRole = null,
  requiredRoles = [],
) {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute
        element={<Component {...props} />}
        requiredRole={requiredRole}
        requiredRoles={requiredRoles}
      />
    );
  };
}
