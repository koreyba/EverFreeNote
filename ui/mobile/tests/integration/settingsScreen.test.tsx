import React from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import SettingsScreen from '@ui/mobile/app/(tabs)/settings'
import { renderWithProviders } from '../utils/renderWithProviders'

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
