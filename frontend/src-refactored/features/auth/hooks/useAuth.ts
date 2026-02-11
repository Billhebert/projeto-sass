import { useAuthStore, authSelectors } from '../store/auth.store';

/**
 * useAuth Hook
 * 
 * Primary hook for accessing authentication state and actions.
 * Use this hook in components that need to read or update auth state.
 * 
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth();
 * 
 * if (!isAuthenticated) {
 *   return <LoginPage />;
 * }
 * 
 * return <div>Welcome {user?.name}</div>;
 * ```
 */
export const useAuth = () => {
  const user = useAuthStore(authSelectors.user);
  const isAuthenticated = useAuthStore(authSelectors.isAuthenticated);
  const isLoading = useAuthStore(authSelectors.isLoading);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useAuthStore((state) => state.updateUser);
  const initialize = useAuthStore((state) => state.initialize);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser,
    initialize,
  };
};

/**
 * useUser Hook
 * 
 * Convenience hook to access current user data.
 * Returns null if user is not authenticated.
 * 
 * @example
 * ```tsx
 * const user = useUser();
 * console.log(user?.email);
 * ```
 */
export const useUser = () => {
  return useAuthStore(authSelectors.user);
};

/**
 * useIsAuthenticated Hook
 * 
 * Convenience hook to check if user is authenticated.
 * 
 * @example
 * ```tsx
 * const isAuthenticated = useIsAuthenticated();
 * if (!isAuthenticated) return <Redirect to="/login" />;
 * ```
 */
export const useIsAuthenticated = () => {
  return useAuthStore(authSelectors.isAuthenticated);
};
