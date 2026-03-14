import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { ThemeProvider } from '@ui/mobile/providers/ThemeProvider'

const mockSignOut = jest.fn()
const mockDeleteAccount = jest.fn()
const mockUseSupabase = jest.fn()
const mockUseAuth = jest.fn()
const mockApiKeysGetStatus = jest.fn()
const mockApiKeysUpsert = jest.fn()
const mockWordPressGetStatus = jest.fn()
const mockWordPressUpsert = jest.fn()
const mockImportAsset = jest.fn()
const mockExportAllNotes = jest.fn()
const mockGetDocumentAsync = jest.fn()
const mockIsAvailableAsync = jest.fn()
const mockShareAsync = jest.fn()

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}))

jest.mock('expo-sharing', () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}))

jest.mock('@core/services/apiKeysSettings', () => ({
  ApiKeysSettingsService: jest.fn().mockImplementation(() => ({
    getStatus: mockApiKeysGetStatus,
    upsert: mockApiKeysUpsert,
  })),
}))

jest.mock('@core/services/wordpressSettings', () => ({
  WordPressSettingsService: jest.fn().mockImplementation(() => ({
    getStatus: mockWordPressGetStatus,
    upsert: mockWordPressUpsert,
  })),
}))

jest.mock('@ui/mobile/services/enexImport', () => ({
  MobileEnexImportService: jest.fn().mockImplementation(() => ({
    importAsset: mockImportAsset,
  })),
}))

jest.mock('@ui/mobile/services/enexExport', () => ({
  MobileEnexExportService: jest.fn().mockImplementation(() => ({
    exportAllNotes: mockExportAllNotes,
  })),
}))

jest.mock('@ui/mobile/providers/SupabaseProvider', () => ({
  useSupabase: () => mockUseSupabase(),
  useAuth: () => mockUseAuth(),
  SupabaseProvider: ({ children }: { children: React.ReactNode }) => children,
}))

import SettingsScreen from '@ui/mobile/app/(tabs)/settings'

const renderScreen = () =>
  render(
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  )

describe('SettingsScreen', () => {
  beforeEach(() => {
    const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>
    mockAsyncStorage.getItem.mockResolvedValue('light')

    mockUseSupabase.mockReturnValue({
      client: {},
      user: { id: 'user-1', email: 'test@example.com' },
      session: null,
      loading: false,
      signOut: mockSignOut,
      deleteAccount: mockDeleteAccount,
    })

    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      session: null,
      loading: false,
      isAuthenticated: true,
      signOut: mockSignOut,
      deleteAccount: mockDeleteAccount,
    })

    mockApiKeysGetStatus.mockResolvedValue({ gemini: { configured: false } })
    mockApiKeysUpsert.mockResolvedValue({ gemini: { configured: true } })
    mockWordPressGetStatus.mockResolvedValue({
      configured: false,
      integration: null,
    })
    mockWordPressUpsert.mockResolvedValue({
      configured: true,
      integration: {
        siteUrl: 'https://example.com',
        wpUsername: 'editor-user',
        enabled: true,
        hasPassword: true,
      },
    })
    mockImportAsset.mockResolvedValue({
      success: 2,
      errors: 0,
      failedNotes: [],
      message: 'Imported 2 note(s).',
    })
    mockExportAllNotes.mockResolvedValue({
      fileUri: 'file:///tmp/everfreenote-export-20260314-083000.enex',
      fileName: 'everfreenote-export-20260314-083000.enex',
      noteCount: 3,
    })
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/import.enex',
          name: 'import.enex',
          lastModified: 0,
        },
      ],
    })
    mockIsAvailableAsync.mockResolvedValue(true)
    mockShareAsync.mockResolvedValue(undefined)
  })

  it('switches tabs and updates theme inside My Account', async () => {
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeTruthy()
      expect(screen.getByText('test@example.com')).toBeTruthy()
      expect(screen.getByText('Current: light (light)')).toBeTruthy()
    })

    fireEvent.press(screen.getByRole('button', { name: 'Theme option Dark' }))

    await waitFor(() => {
      expect(screen.getByText('Current: dark (dark)')).toBeTruthy()
    })

    fireEvent.press(screen.getByRole('button', { name: 'API Keys' }))

    await waitFor(() => {
      expect(screen.getByText('External model credentials and secure storage.')).toBeTruthy()
    })

    fireEvent.changeText(screen.getByPlaceholderText('AIzaSy...'), 'AIza-test')
    fireEvent.press(screen.getByRole('button', { name: 'My Account' }))
    fireEvent.press(screen.getByRole('button', { name: 'API Keys' }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('AIza-test')).toBeTruthy()
      expect(mockApiKeysGetStatus).toHaveBeenCalledTimes(1)
    })

    fireEvent.press(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockApiKeysUpsert).toHaveBeenCalledWith('AIza-test')
      expect(screen.getByText('Gemini API key saved successfully.')).toBeTruthy()
    })
  })

  it('handles import, export, and WordPress save flows', async () => {
    renderScreen()

    fireEvent.press(screen.getByRole('button', { name: 'Import .enex file' }))

    await waitFor(() => {
      expect(screen.getByText('Bring notes in from Evernote exports.')).toBeTruthy()
    })

    fireEvent.press(screen.getByRole('button', { name: 'Choose and import file' }))

    await waitFor(() => {
      expect(mockImportAsset).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'import.enex' }),
        'user-1'
      )
      expect(screen.getByText('Imported 2 note(s).')).toBeTruthy()
    })

    fireEvent.press(screen.getByRole('button', { name: 'Export .enex file' }))
    fireEvent.press(screen.getByRole('button', { name: 'Export and share' }))

    await waitFor(() => {
      expect(mockExportAllNotes).toHaveBeenCalledWith('user-1')
      expect(mockShareAsync).toHaveBeenCalledWith(
        'file:///tmp/everfreenote-export-20260314-083000.enex',
        expect.objectContaining({
          mimeType: 'application/xml',
          dialogTitle: 'Export .enex file',
        })
      )
      expect(
        screen.getByText('Exported 3 note(s) to everfreenote-export-20260314-083000.enex.')
      ).toBeTruthy()
    })

    fireEvent.press(screen.getByRole('button', { name: 'WordPress settings' }))

    await waitFor(() => {
      expect(screen.getByText('Site URL, account, and publishing access.')).toBeTruthy()
    })

    fireEvent.changeText(screen.getByPlaceholderText('https://example.com'), 'https://example.com/')
    fireEvent.changeText(screen.getByPlaceholderText('editor-user'), 'editor-user')
    fireEvent.changeText(screen.getByPlaceholderText('xxxx xxxx xxxx xxxx'), 'secret secret secret')
    fireEvent.press(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockWordPressUpsert).toHaveBeenCalledWith({
        siteUrl: 'https://example.com',
        wpUsername: 'editor-user',
        applicationPassword: 'secret secret secret',
        enabled: true,
      })
      expect(screen.getByText('WordPress settings saved successfully.')).toBeTruthy()
    })
  })
})
