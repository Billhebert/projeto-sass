import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import { useAuth } from './useAuth';
import type { RegisterData } from '@/types/api.types';

/**
 * useRegister Hook
 * 
 * React Query mutation hook for user registration.
 * Handles registration API call, token storage, and auth state updates.
 * 
 * @example
 * ```tsx
 * const { mutate: register, isPending, error } = useRegister();
 * 
 * const handleSubmit = (data: RegisterData) => {
 *   register(data, {
 *     onSuccess: () => {
 *       console.log('Registration successful!');
 *     },
 *     onError: (error) => {
 *       console.error('Registration failed:', error);
 *     }
 *   });
 * };
 * ```
 */
export const useRegister = () => {
  const navigate = useNavigate();
  const { login: setAuthState } = useAuth();

  return useMutation({
    mutationFn: (data: RegisterData) => AuthService.register(data),
    onSuccess: (data) => {
      // Update auth store with user data
      setAuthState(data.user);
      
      // Navigate to dashboard
      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
    },
  });
};
