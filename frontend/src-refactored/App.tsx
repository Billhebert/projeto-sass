import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/config/query-client';
import { ToastProvider } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { tokens } from '@/styles/tokens';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const OAuthCallbackPage = lazy(() => import('@/features/auth/pages/OAuthCallbackPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const MLAccountsPage = lazy(() => import('@/features/ml-accounts/pages/MLAccountsPage'));
const ItemsPage = lazy(() => import('@/features/items/pages/ItemsPage'));
const OrdersPage = lazy(() => import('@/features/orders/pages/OrdersPage'));
const QuestionsPage = lazy(() => import('@/features/questions/pages/QuestionsPage'));
const ClaimsPage = lazy(() => import('@/features/claims/pages/ClaimsPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));

/**
 * Loading Fallback Component
 */
const LoadingFallback: React.FC = () => {
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.neutral[50],
  };

  return (
    <div style={containerStyle}>
      <Spinner size="xl" />
    </div>
  );
};

/**
 * Main App Component
 */
function App() {
  const { initialize } = useAuth();

  // Initialize auth on app mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Auth routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/callback" element={<OAuthCallbackPage />} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/ml-accounts"
                element={
                  <ProtectedRoute>
                    <MLAccountsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/items"
                element={
                  <ProtectedRoute>
                    <ItemsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/questions"
                element={
                  <ProtectedRoute>
                    <QuestionsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/claims"
                element={
                  <ProtectedRoute>
                    <ClaimsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* 404 - redirect to dashboard for now */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>

      {/* React Query DevTools (only in development) */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
