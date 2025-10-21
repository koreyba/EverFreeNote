'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }) {
  // Create QueryClient inside component to ensure it's created only once per request
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 10, // 10 minutes (as decided in design review)
        gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
        refetchOnWindowFocus: false, // Don't refetch on window focus (SPA behavior)
        retry: 3, // Retry failed requests 3 times
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        // Global error handler for queries (logged, not thrown to Error Boundary)
        onError: (error) => {
          console.error('React Query error:', error)
          // Errors are handled by individual query hooks with toast notifications
        },
      },
      mutations: {
        // Global error handler for mutations (logged, handled by mutation hooks)
        onError: (error) => {
          console.error('React Query mutation error:', error)
          // Errors are handled by individual mutation hooks with toast + rollback
        },
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

