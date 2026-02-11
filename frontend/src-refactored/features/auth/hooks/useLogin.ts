import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import { useAuth } from './useAuth';
import type { LoginCredentials } from '@/types/api.types';

/**
 * useLogin Hook
 * 
 * React Query mutation hook for user login.
 * Handles login API call, token storage, and auth state updates.
 * 
 * @example
 * ```tsx
 * const { mutate: login, isPending, error } = useLogin();
 * 
 * const handleSubmit = (data: LoginCredentials) => {
 *   login(data, {
 *     onSuccess: () => {
 *       console.log('Login successful!');
 *     },
 *     onError: (error) => {
 *       console.error('Login failed:', error);
 *     }
 *   });
 * };
 * ```
 */
export const useLogin = () => {
  const navigate = useNavigate();
  const { login: setAuthState } = useAuth();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => AuthService.login(credentials),
    onSuccess: (data) => {
      // Update auth store with user data
      setAuthState(data.user);
      
      // Navigate to dashboard
      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      
      // Don't clear tokens here - let the user retry
      // Tokens are only cleared on explicit logout or 401 errors
    },
  });
};
