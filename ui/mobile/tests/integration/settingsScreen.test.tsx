import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
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
  const expectedPickerType = Platform.OS === 'android' ? '*/*' : ['application/xml', 'text/xml']

  beforeEach(() => {
    jest.clearAllMocks()

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

    fireEvent.press(screen.getByRole('tab', { name: 'API Keys' }))

    await waitFor(() => {
      expect(screen.getByText('External model credentials and secure storage.')).toBeTruthy()
    })

    fireEvent.changeText(screen.getByPlaceholderText('AIzaSy...'), 'AIza-test')
    fireEvent.press(screen.getByRole('tab', { name: 'My Account' }))
    fireEvent.press(screen.getByRole('tab', { name: 'API Keys' }))

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
    const testApplicationPassword = 'test-value'

    renderScreen()

    fireEvent.press(screen.getByRole('tab', { name: 'Import .enex file' }))

    await waitFor(() => {
      expect(screen.getByText('Bring notes in from Evernote exports.')).toBeTruthy()
    })

    fireEvent.press(screen.getByRole('button', { name: 'Choose and import .enex' }))

    await waitFor(() => {
      expect(mockGetDocumentAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expectedPickerType,
        })
      )
      expect(mockImportAsset).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'import.enex' }),
        'user-1',
        expect.any(Function)
      )
      expect(screen.getByText('Imported 2 note(s).')).toBeTruthy()
    })

    fireEvent.press(screen.getByRole('tab', { name: 'Export .enex file' }))
    fireEvent.press(screen.getByRole('button', { name: 'Export all notes' }))

    await waitFor(() => {
      expect(mockExportAllNotes).toHaveBeenCalledWith('user-1', expect.any(Function))
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

    fireEvent.press(screen.getByRole('tab', { name: 'WordPress settings' }))

    await waitFor(() => {
      expect(screen.getByText('Site URL, account, and publishing access.')).toBeTruthy()
    })

    fireEvent.changeText(screen.getByPlaceholderText('https://example.com'), 'https://example.com/')
    fireEvent.changeText(screen.getByPlaceholderText('editor-user'), 'editor-user')
    fireEvent.changeText(screen.getByPlaceholderText('xxxx xxxx xxxx xxxx'), testApplicationPassword)
    fireEvent.press(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockWordPressUpsert).toHaveBeenCalledWith({
        siteUrl: 'https://example.com',
        wpUsername: 'editor-user',
        applicationPassword: testApplicationPassword,
        enabled: true,
      })
      expect(screen.getByText('WordPress settings saved successfully.')).toBeTruthy()
    })
  })

  it('blocks import and export actions when no user is available', async () => {
    mockUseSupabase.mockReturnValue({
      client: {},
      user: null,
      session: null,
      loading: false,
      signOut: mockSignOut,
      deleteAccount: mockDeleteAccount,
    })

    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isAuthenticated: false,
      signOut: mockSignOut,
      deleteAccount: mockDeleteAccount,
    })

    renderScreen()

    fireEvent.press(screen.getByRole('tab', { name: 'Import .enex file' }))
    fireEvent.press(screen.getByRole('button', { name: 'Choose and import .enex' }))

    await waitFor(() => {
      expect(mockGetDocumentAsync).not.toHaveBeenCalled()
      expect(screen.getByText('You need to be signed in to import notes.')).toBeTruthy()
    })

    fireEvent.press(screen.getByRole('tab', { name: 'Export .enex file' }))
    fireEvent.press(screen.getByRole('button', { name: 'Export all notes' }))

    await waitFor(() => {
      expect(mockExportAllNotes).not.toHaveBeenCalled()
      expect(screen.getByText('You need to be signed in to export notes.')).toBeTruthy()
    })
  })

  it('shows import and export unhappy-path feedback', async () => {
    mockGetDocumentAsync.mockRejectedValueOnce(new Error('Picker unavailable'))
    mockImportAsset.mockResolvedValueOnce({
      success: 1,
      errors: 1,
      failedNotes: [{ title: 'Broken note', error: 'Import failed' }],
      message: 'Imported 1 note(s) with 1 error(s).',
    })

    renderScreen()

    fireEvent.press(screen.getByRole('tab', { name: 'Import .enex file' }))
    fireEvent.press(screen.getByRole('button', { name: 'Choose and import .enex' }))

    await waitFor(() => {
      expect(screen.getByText('Picker unavailable')).toBeTruthy()
      expect(mockImportAsset).not.toHaveBeenCalled()
    })

    fireEvent.press(screen.getByRole('button', { name: 'Choose and import .enex' }))

    await waitFor(() => {
      expect(screen.getByText('Imported 1 note(s) with 1 error(s).')).toBeTruthy()
      expect(mockImportAsset).toHaveBeenCalledTimes(1)
    })

    mockIsAvailableAsync.mockResolvedValueOnce(false)

    fireEvent.press(screen.getByRole('tab', { name: 'Export .enex file' }))
    fireEvent.press(screen.getByRole('button', { name: 'Export all notes' }))

    await waitFor(() => {
      expect(screen.getByText('Sharing is unavailable on this device')).toBeTruthy()
      expect(mockExportAllNotes).not.toHaveBeenCalled()
      expect(mockShareAsync).not.toHaveBeenCalled()
    })

    mockIsAvailableAsync.mockResolvedValueOnce(true)
    mockExportAllNotes.mockRejectedValueOnce(new Error('Export failed'))

    fireEvent.press(screen.getByRole('button', { name: 'Export all notes' }))

    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeTruthy()
      expect(mockShareAsync).not.toHaveBeenCalled()
    })
  })

  it('renders import and export progress states while work is in flight', async () => {
    let resolveImport!: () => void
    const importCompleted = new Promise<void>((resolve) => {
      resolveImport = resolve
    })
    let resolveExport!: () => void
    const exportCompleted = new Promise<void>((resolve) => {
      resolveExport = resolve
    })

    mockImportAsset.mockImplementationOnce(async (_asset, _userId, onProgress) => {
      onProgress?.({ processed: 2, total: 5 })
      await importCompleted
      return {
        success: 5,
        errors: 0,
        failedNotes: [],
        message: 'Imported 5 note(s).',
      }
    })

    mockExportAllNotes.mockImplementationOnce(async (_userId, onProgress) => {
      onProgress?.({ stage: 'loading', loaded: 3, total: 5 })
      onProgress?.({ stage: 'building', noteCount: 5 })
      await exportCompleted
      return {
        fileUri: 'file:///tmp/everfreenote-export-20260314-083000.enex',
        fileName: 'everfreenote-export-20260314-083000.enex',
        noteCount: 5,
      }
    })

    renderScreen()

    fireEvent.press(screen.getByRole('tab', { name: 'Import .enex file' }))
    fireEvent.press(screen.getByRole('button', { name: 'Choose and import .enex' }))

    await waitFor(() => {
      expect(screen.getByText('Importing notes 2 / 5...')).toBeTruthy()
    })

    resolveImport()

    await waitFor(() => {
      expect(screen.getByText('Imported 5 note(s).')).toBeTruthy()
    })

    fireEvent.press(screen.getByRole('tab', { name: 'Export .enex file' }))
    fireEvent.press(screen.getByRole('button', { name: 'Export all notes' }))

    await waitFor(() => {
      expect(screen.getByText('Building archive for 5 note(s)...')).toBeTruthy()
    })

    resolveExport()

    await waitFor(() => {
      expect(screen.getByText('Exported 5 note(s) to everfreenote-export-20260314-083000.enex.')).toBeTruthy()
    })
  })

  it('rejects picked files that are not .enex exports', async () => {
    mockGetDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/import.pdf',
          name: 'import.pdf',
          lastModified: 0,
        },
      ],
    })

    renderScreen()

    fireEvent.press(screen.getByRole('tab', { name: 'Import .enex file' }))
    fireEvent.press(screen.getByRole('button', { name: 'Choose and import .enex' }))

    await waitFor(() => {
      expect(screen.getByText('Only Evernote .enex export files are supported.')).toBeTruthy()
      expect(mockImportAsset).not.toHaveBeenCalled()
    })
  })

  it('shows WordPress load, validation, and save errors', async () => {
    const testApplicationPassword = 'test-value'
    mockWordPressGetStatus.mockRejectedValueOnce(new Error('Load failed'))
    mockWordPressUpsert.mockRejectedValueOnce(new Error('Save failed'))

    renderScreen()

    fireEvent.press(screen.getByRole('tab', { name: 'WordPress settings' }))

    await waitFor(() => {
      expect(screen.getByText('Load failed')).toBeTruthy()
    })

    fireEvent.press(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Site URL is required.')).toBeTruthy()
    })

    fireEvent.changeText(screen.getByPlaceholderText('https://example.com'), 'https://example.com/')
    fireEvent.changeText(screen.getByPlaceholderText('editor-user'), 'editor-user')
    fireEvent.press(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Application password is required for the initial setup.')).toBeTruthy()
    })

    fireEvent.changeText(screen.getByPlaceholderText('xxxx xxxx xxxx xxxx'), testApplicationPassword)
    fireEvent.press(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockWordPressUpsert).toHaveBeenCalledWith({
        siteUrl: 'https://example.com',
        wpUsername: 'editor-user',
        applicationPassword: testApplicationPassword,
        enabled: true,
      })
      expect(screen.getByText('Save failed')).toBeTruthy()
    })
  })
})
