import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User } from '@/types/api.types';
import { AuthService } from '../services/auth.service';

/**
 * Auth Store State
 */
interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  initialize: () => Promise<void>;
}

/**
 * Auth Store
 * 
 * Global authentication state management using Zustand.
 * Handles user session, authentication status, and related actions.
 * 
 * Features:
 * - Persists user data to localStorage
 * - Redux DevTools integration (in development)
 * - Type-safe actions and state
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: true,

        // Set user
        setUser: (user) => {
          set({ user }, false, 'auth/setUser');
        },

        // Set authentication status
        setIsAuthenticated: (isAuthenticated) => {
          set({ isAuthenticated }, false, 'auth/setIsAuthenticated');
        },

        // Set loading state
        setIsLoading: (isLoading) => {
          set({ isLoading }, false, 'auth/setIsLoading');
        },

        // Login action
        login: (user) => {
          set(
            {
              user,
              isAuthenticated: true,
              isLoading: false,
            },
            false,
            'auth/login'
          );
        },

        // Logout action
        logout: () => {
          set(
            {
              user: null,
              isAuthenticated: false,
              isLoading: false,
            },
            false,
            'auth/logout'
          );
        },

        // Update user data
        updateUser: (updates) => {
          const currentUser = get().user;
          if (currentUser) {
            set(
              {
                user: { ...currentUser, ...updates },
              },
              false,
              'auth/updateUser'
            );
          }
        },

        // Initialize auth state on app load
        initialize: async () => {
          set({ isLoading: true }, false, 'auth/initialize/start');

          try {
            // Check if we have a token
            const hasToken = AuthService.isAuthenticated();

            if (!hasToken) {
              set(
                {
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                },
                false,
                'auth/initialize/noToken'
              );
              return;
            }

            // Initialize API client with token
            AuthService.initialize();

            // Fetch current user
            const user = await AuthService.getCurrentUser();

            set(
              {
                user,
                isAuthenticated: true,
                isLoading: false,
              },
              false,
              'auth/initialize/success'
            );
          } catch (error) {
            console.error('Failed to initialize auth:', error);

            // Clear invalid tokens
            AuthService.logout();

            set(
              {
                user: null,
                isAuthenticated: false,
                isLoading: false,
              },
              false,
              'auth/initialize/error'
            );
          }
        },
      }),
      {
        name: 'vendata-auth',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'AuthStore',
      enabled: import.meta.env.DEV,
    }
  )
);

/**
 * Selectors for common auth state queries
 */
export const authSelectors = {
  user: (state: AuthState) => state.user,
  isAuthenticated: (state: AuthState) => state.isAuthenticated,
  isLoading: (state: AuthState) => state.isLoading,
  userId: (state: AuthState) => state.user?.id,
  userEmail: (state: AuthState) => state.user?.email,
  userName: (state: AuthState) => state.user?.name,
};
