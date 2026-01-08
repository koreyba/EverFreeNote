import React from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { renderWithProviders } from '../utils/renderWithProviders'

// Мок должен быть объявлен до импорта SettingsScreen (jest hoisting)
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

import SettingsScreen from '@ui/mobile/app/(tabs)/settings'

describe('SettingsScreen', () => {
  it('updates the current mode when an option is selected', async () => {
    const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>
    mockAsyncStorage.getItem.mockResolvedValueOnce('light')

    renderWithProviders(<SettingsScreen />)

    await waitFor(() => {
      expect(screen.getByText('Current: light (light)')).toBeTruthy()
    })

    fireEvent.press(screen.getByRole('button', { name: 'Theme option Dark' }))

    await waitFor(() => {
      expect(screen.getByText('Current: dark (dark)')).toBeTruthy()
    })
  })
})
