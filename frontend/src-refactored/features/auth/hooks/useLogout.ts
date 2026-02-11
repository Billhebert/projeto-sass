import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import { useAuth } from './useAuth';

/**
 * useLogout Hook
 * 
 * React Query mutation hook for user logout.
 * Handles logout API call, token cleanup, and auth state reset.
 * 
 * @example
 * ```tsx
 * const { mutate: logout, isPending } = useLogout();
 * 
 * const handleLogout = () => {
 *   logout();
 * };
 * ```
 */
export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout: clearAuthState } = useAuth();

  return useMutation({
    mutationFn: () => AuthService.logout(),
    onSuccess: () => {
      // Clear auth state
      clearAuthState();
      
      // Clear all React Query cache
      queryClient.clear();
      
      // Navigate to login
      navigate('/login');
    },
    onError: (error: any) => {
      console.error('Logout error:', error);
      
      // Even if API call fails, clear local state
      clearAuthState();
      queryClient.clear();
      navigate('/login');
    },
  });
};
