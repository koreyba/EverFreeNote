import React from 'react'
import { render } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from '@ui/mobile/providers/ThemeProvider'

// Мокаем useAuth из SupabaseProvider
jest.mock('@ui/mobile/providers/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: {},
    user: null,
    session: null,
    loading: false,
    signOut: jest.fn(),
  }),
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    isAuthenticated: false,
    signOut: jest.fn(),
  }),
  SupabaseProvider: ({ children }: { children: React.ReactNode }) => children,
}))

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {ui}
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
