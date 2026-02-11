import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { tokens } from '@/styles/tokens';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * 
 * Wrapper component that protects routes requiring authentication.
 * Redirects to login if user is not authenticated.
 * Shows loading spinner while checking authentication status.
 * 
 * @example
 * ```tsx
 * <Route
 *   path="/dashboard"
 *   element={
 *     <ProtectedRoute>
 *       <DashboardPage />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, initialize } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Initialize auth state on mount
    if (isLoading) {
      initialize();
    }
  }, [initialize, isLoading]);

  // Show loading spinner while checking auth status
  if (isLoading) {
    const loadingStyle: React.CSSProperties = {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.colors.neutral[50],
    };

    return (
      <div style={loadingStyle}>
        <Spinner size="xl" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
};
