import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin' | 'super_admin';
  organizationId?: string;
  mlUserId?: number;
  mlNickname?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  mlConnected: boolean;
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setOrganization: (org: Organization) => void;
  setToken: (token: string) => void;
  refreshToken: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/api/v1/auth/login', {
            email,
            password,
          });
          const { user, organization, accessToken } = response.data;
          set({
            user,
            organization,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          await api.post('/api/v1/auth/register', {
            name,
            email,
            password,
          });
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          organization: null,
          token: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: User) => set({ user }),

      setOrganization: (organization: Organization) => set({ organization }),

      setToken: (token: string) => set({ token, isAuthenticated: true }),

      refreshToken: async () => {
        try {
          const response = await api.post('/api/v1/auth/refresh');
          const { accessToken } = response.data;
          set({ token: accessToken });
        } catch (error) {
          get().logout();
          throw error;
        }
      },

      fetchUser: async () => {
        const { token } = get();
        
        // Don't fetch if no token exists
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
        
        set({ isLoading: true });
        try {
          const response = await api.get('/api/v1/auth/me');
          const { user, organization } = response.data;
          set({ user, organization, isLoading: false, isAuthenticated: true });
        } catch (error: any) {
          // Only logout if it's a 401 error (unauthorized)
          if (error?.response?.status === 401) {
            get().logout();
          }
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // If we have a token after hydration, set isAuthenticated
        if (state?.token) {
          useAuthStore.setState({ isAuthenticated: true });
        }
      },
    }
  )
);
