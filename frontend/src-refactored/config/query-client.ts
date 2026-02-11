import { QueryClient } from '@tanstack/react-query';

/**
 * React Query client configuration
 * 
 * This is the global configuration for React Query.
 * It handles caching, refetching, and error handling for all queries.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Time before data is considered stale
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // Time before inactive queries are garbage collected
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      
      // Retry failed requests once
      retry: 1,
      
      // Don't refetch when window regains focus
      refetchOnWindowFocus: false,
      
      // Don't refetch on component mount if data exists
      refetchOnMount: false,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});
