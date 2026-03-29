import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Platform } from 'react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { resolveRagIndexingSettings } from '@core/rag/indexingSettings'
import { resolveRagSearchSettings } from '@core/rag/searchSettings'
import { createTestQueryClient } from '../testUtils'

const mockUseSupabase = jest.fn()
const mockGetDocumentAsync = jest.fn()
const mockImportAsset = jest.fn()
const mockIsAvailableAsync = jest.fn()
const mockShareAsync = jest.fn()
const mockExportAllNotes = jest.fn()
const mockWordPressGetStatus = jest.fn()
const mockWordPressUpsert = jest.fn()
const mockApiKeysGetStatus = jest.fn()
const mockApiKeysUpsert = jest.fn()
const mockApiKeysRemove = jest.fn()
const mockRagIndexUpsert = jest.fn()
const mockRagSearchUpsert = jest.fn()

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}))

jest.mock('expo-sharing', () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
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

jest.mock('@core/services/wordpressSettings', () => ({
  WordPressSettingsService: jest.fn().mockImplementation(() => ({
    getStatus: mockWordPressGetStatus,
    upsert: mockWordPressUpsert,
  })),
}))

jest.mock('@core/services/apiKeysSettings', () => ({
  ApiKeysSettingsService: jest.fn().mockImplementation(() => ({
    getStatus: mockApiKeysGetStatus,
    upsert: mockApiKeysUpsert,
    removeGeminiApiKey: mockApiKeysRemove,
  })),
}))

jest.mock('@core/services/ragSearchSettings', () => ({
  RagSearchSettingsService: jest.fn().mockImplementation(() => ({
    upsert: mockRagSearchUpsert,
  })),
}))

jest.mock('@core/services/ragIndexSettings', () => ({
  RagIndexSettingsService: jest.fn().mockImplementation(() => ({
    upsert: mockRagIndexUpsert,
  })),
}))

jest.mock('@ui/mobile/providers', () => {
  const { getThemeColors } = jest.requireActual('@ui/mobile/lib/theme')

  return {
    __esModule: true,
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    useTheme: () => ({
      colors: getThemeColors('light'),
      mode: 'light',
      setMode: jest.fn(),
      colorScheme: 'light',
      isHydrated: true,
    }),
    useSupabase: () => mockUseSupabase(),
  }
})

import { ApiKeysSettingsPanel } from '@ui/mobile/components/settings/ApiKeysSettingsPanel'
import { EnexExportPanel } from '@ui/mobile/components/settings/EnexExportPanel'
import { EnexImportPanel } from '@ui/mobile/components/settings/EnexImportPanel'
import { WordPressSettingsPanel } from '@ui/mobile/components/settings/WordPressSettingsPanel'

const renderWithTheme = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('settings panels', () => {
  const expectedPickerType = Platform.OS === 'android' ? '*/*' : ['application/xml', 'text/xml']

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseSupabase.mockReturnValue({
      client: {},
      user: { id: 'user-1', email: 'test@example.com' },
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

    mockImportAsset.mockResolvedValue({
      success: 2,
      errors: 0,
      failedNotes: [],
      message: 'Imported 2 note(s).',
    })

    mockIsAvailableAsync.mockResolvedValue(true)
    mockShareAsync.mockResolvedValue(undefined)
    mockExportAllNotes.mockResolvedValue({
      fileUri: 'file:///tmp/everfreenote-export-20260315-120000.enex',
      fileName: 'everfreenote-export-20260315-120000.enex',
      noteCount: 4,
    })

    mockWordPressGetStatus.mockResolvedValue({
      configured: true,
      integration: {
        siteUrl: 'https://saved.example.com',
        wpUsername: 'saved-user',
        enabled: true,
        hasPassword: true,
      },
    })
    mockWordPressUpsert.mockResolvedValue({
      configured: true,
      integration: {
        siteUrl: 'https://example.com',
        wpUsername: 'editor-user',
        enabled: false,
        hasPassword: true,
      },
    })

    mockApiKeysGetStatus.mockResolvedValue({
      gemini: { configured: false },
      ragIndexing: resolveRagIndexingSettings(),
      ragSearch: resolveRagSearchSettings({ top_k: 15, similarity_threshold: 0.55 }),
    })
    mockApiKeysUpsert.mockResolvedValue({
      gemini: { configured: true },
      ragIndexing: resolveRagIndexingSettings(),
      ragSearch: resolveRagSearchSettings({ top_k: 15, similarity_threshold: 0.55 }),
    })
    mockApiKeysRemove.mockResolvedValue({
      gemini: { configured: false },
      ragIndexing: resolveRagIndexingSettings(),
      ragSearch: resolveRagSearchSettings({ top_k: 15, similarity_threshold: 0.55 }),
    })
    mockRagIndexUpsert.mockResolvedValue(resolveRagIndexingSettings({ target_chunk_size: 700 }))
    mockRagSearchUpsert.mockResolvedValue(resolveRagSearchSettings({ top_k: 30, similarity_threshold: 0.55 }))
  })

  it('imports only .enex files and passes the selected asset to the mobile import service', async () => {
    renderWithTheme(<EnexImportPanel />)

    fireEvent.press(screen.getByRole('button', { name: 'Choose and import .enex' }))

    await waitFor(() => {
      expect(mockGetDocumentAsync).toHaveBeenCalledWith({
        type: expectedPickerType,
        copyToCacheDirectory: true,
        multiple: false,
      })
      expect(mockImportAsset).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'import.enex' }),
        'user-1',
        {
          duplicateStrategy: 'prefix',
          skipFileDuplicates: false,
        },
        expect.any(Function)
      )
      expect(screen.getByText('Imported 2 note(s).')).toBeTruthy()
    })
  })

  it('passes the selected duplicate settings into the import service', async () => {
    renderWithTheme(<EnexImportPanel />)

    fireEvent.press(screen.getByRole('radio', { name: 'Replace existing notes' }))
    fireEvent.press(screen.getByRole('checkbox', { name: 'Skip duplicates inside imported file(s)' }))
    fireEvent.press(screen.getByRole('button', { name: 'Choose and import .enex' }))

    await waitFor(() => {
      expect(mockImportAsset).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'import.enex' }),
        'user-1',
        {
          duplicateStrategy: 'replace',
          skipFileDuplicates: true,
        },
        expect.any(Function)
      )
    })
  })

  it('shows note-based progress while import is running', async () => {
    let resolveImport!: () => void
    const importCompleted = new Promise<void>((resolve) => {
      resolveImport = resolve
    })

    mockImportAsset.mockImplementationOnce(async (_asset, _userId, _settings, onProgress) => {
      onProgress?.({ processed: 1, total: 3 })
      await importCompleted
      return {
        success: 3,
        errors: 0,
        failedNotes: [],
        message: 'Imported 3 note(s).',
      }
    })

    renderWithTheme(<EnexImportPanel />)

    fireEvent.press(screen.getByRole('button', { name: 'Choose and import .enex' }))

    await waitFor(() => {
      expect(screen.getByText('Importing notes 1 / 3...')).toBeTruthy()
    })

    resolveImport()

    await waitFor(() => {
      expect(screen.getByText('Imported 3 note(s).')).toBeTruthy()
    })
  })

  it('rejects picked files that do not use the .enex extension', async () => {
    mockGetDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/import.xml',
          name: 'import.xml',
          lastModified: 0,
        },
      ],
    })

    renderWithTheme(<EnexImportPanel />)

    fireEvent.press(screen.getByRole('button', { name: 'Choose and import .enex' }))

    await waitFor(() => {
      expect(screen.getByText('Only Evernote .enex export files are supported.')).toBeTruthy()
      expect(mockImportAsset).not.toHaveBeenCalled()
    })
  })

  it('exports all notes through the share sheet', async () => {
    renderWithTheme(<EnexExportPanel />)

    fireEvent.press(screen.getByRole('button', { name: 'Export all notes' }))

    await waitFor(() => {
      expect(mockExportAllNotes).toHaveBeenCalledWith('user-1', expect.any(Function))
      expect(mockShareAsync).toHaveBeenCalledWith(
        'file:///tmp/everfreenote-export-20260315-120000.enex',
        expect.objectContaining({
          mimeType: 'application/xml',
          dialogTitle: 'Export .enex file',
        })
      )
      expect(
        screen.getByText('Exported 4 note(s) to everfreenote-export-20260315-120000.enex.')
      ).toBeTruthy()
    })
  })

  it('shows staged progress while export is running', async () => {
    let resolveExport!: () => void
    const exportCompleted = new Promise<void>((resolve) => {
      resolveExport = resolve
    })

    mockExportAllNotes.mockImplementationOnce(async (_userId, onProgress) => {
      onProgress?.({ stage: 'loading', loaded: 4, total: 4 })
      onProgress?.({ stage: 'building', noteCount: 4 })
      onProgress?.({
        stage: 'writing',
        noteCount: 4,
        fileName: 'everfreenote-export-20260315-120000.enex',
      })
      await exportCompleted
      return {
        fileUri: 'file:///tmp/everfreenote-export-20260315-120000.enex',
        fileName: 'everfreenote-export-20260315-120000.enex',
        noteCount: 4,
      }
    })

    renderWithTheme(<EnexExportPanel />)

    fireEvent.press(screen.getByRole('button', { name: 'Export all notes' }))

    await waitFor(() => {
      expect(screen.getByText('Saving everfreenote-export-20260315-120000.enex...')).toBeTruthy()
    })

    resolveExport()

    await waitFor(() => {
      expect(screen.getByText('Exported 4 note(s) to everfreenote-export-20260315-120000.enex.')).toBeTruthy()
    })
  })

  it('normalizes WordPress settings before saving and supports saving without a new password when one already exists', async () => {
    renderWithTheme(<WordPressSettingsPanel />)

    await waitFor(() => {
      expect(mockWordPressGetStatus).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Saved WordPress credentials are available.')).toBeTruthy()
    })

    fireEvent.changeText(screen.getByPlaceholderText('https://example.com'), ' https://example.com/// ')
    fireEvent.changeText(screen.getByPlaceholderText('editor-user'), ' editor-user ')
    fireEvent.press(screen.getByRole('checkbox'))
    fireEvent.press(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockWordPressUpsert).toHaveBeenCalledWith({
        siteUrl: 'https://example.com',
        wpUsername: 'editor-user',
        applicationPassword: undefined,
        enabled: false,
      })
      expect(screen.getByText('WordPress settings saved successfully.')).toBeTruthy()
    })
  })

  it('keeps API key validation local and trims the submitted key', async () => {
    renderWithTheme(<ApiKeysSettingsPanel />)

    await waitFor(() => {
      expect(mockApiKeysGetStatus).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.queryByText('Loading indexing settings...')).toBeNull()
    })

    fireEvent.press(screen.getByRole('button', { name: 'Save API key' }))

    await waitFor(() => {
      expect(screen.getByText('Enter a Gemini API key to continue.')).toBeTruthy()
      expect(mockApiKeysUpsert).not.toHaveBeenCalled()
    })

    fireEvent.changeText(screen.getByPlaceholderText('AIzaSy...'), '  AIza-unit-test  ')
    fireEvent.press(screen.getByRole('button', { name: 'Save API key' }))

    await waitFor(() => {
      expect(mockApiKeysUpsert).toHaveBeenCalledWith('AIza-unit-test')
      expect(screen.getByText('Gemini API key saved successfully.')).toBeTruthy()
    })
  })

  it('does not clobber unsaved indexing and retrieval edits when saving the Gemini key', async () => {
    mockApiKeysGetStatus.mockResolvedValueOnce({
      gemini: { configured: false },
      ragIndexing: resolveRagIndexingSettings({ target_chunk_size: 500 }),
      ragSearch: resolveRagSearchSettings({ top_k: 15, similarity_threshold: 0.55 }),
    })
    mockApiKeysUpsert.mockResolvedValueOnce({
      gemini: { configured: true },
      ragIndexing: resolveRagIndexingSettings({ target_chunk_size: 900 }),
      ragSearch: resolveRagSearchSettings({ top_k: 40, similarity_threshold: 0.55 }),
    })

    renderWithTheme(<ApiKeysSettingsPanel />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('500')).toBeTruthy()
      expect(screen.getByDisplayValue('15')).toBeTruthy()
    })

    fireEvent.changeText(screen.getByDisplayValue('500'), '650')
    fireEvent.changeText(screen.getByDisplayValue('15'), '30')
    fireEvent.changeText(screen.getByPlaceholderText('AIzaSy...'), 'AIza-preserve-drafts')
    fireEvent.press(screen.getByRole('button', { name: 'Save API key' }))

    await waitFor(() => {
      expect(mockApiKeysUpsert).toHaveBeenCalledWith('AIza-preserve-drafts')
      expect(screen.getByText('Gemini API key saved successfully.')).toBeTruthy()
      expect(screen.getByDisplayValue('650')).toBeTruthy()
      expect(screen.getByDisplayValue('30')).toBeTruthy()
      expect(screen.queryByDisplayValue('900')).toBeNull()
      expect(screen.queryByDisplayValue('40')).toBeNull()
    })
  })

  it('shows indexing and retrieval settings, saves both, and allows removing a stored key', async () => {
    mockApiKeysGetStatus.mockResolvedValueOnce({
      gemini: { configured: true },
      ragIndexing: resolveRagIndexingSettings({ target_chunk_size: 600 }),
      ragSearch: resolveRagSearchSettings({ top_k: 15, similarity_threshold: 0.4 }),
    })

    renderWithTheme(<ApiKeysSettingsPanel />)

    await waitFor(() => {
      expect(screen.getByText('RAG indexing')).toBeTruthy()
      expect(screen.getByDisplayValue('600')).toBeTruthy()
      expect(screen.getByText('Current precision threshold')).toBeTruthy()
      expect(screen.getByText('0.40')).toBeTruthy()
    })

    fireEvent.changeText(screen.getByDisplayValue('600'), '700')
    fireEvent.press(screen.getByRole('button', { name: 'Save indexing settings' }))

    await waitFor(() => {
      expect(mockRagIndexUpsert).toHaveBeenCalledWith(expect.objectContaining({
        target_chunk_size: 700,
      }))
      expect(screen.getByText('RAG indexing settings saved. Changes apply to future indexing and future manual reindexing.')).toBeTruthy()
    })

    fireEvent.changeText(screen.getByDisplayValue('15'), '30')
    fireEvent.press(screen.getByRole('button', { name: 'Save retrieval settings' }))

    await waitFor(() => {
      expect(mockRagSearchUpsert).toHaveBeenCalledWith({ top_k: 30 })
      expect(screen.getByText('RAG retrieval settings saved.')).toBeTruthy()
    })

    fireEvent.press(screen.getByRole('button', { name: 'Remove key' }))

    await waitFor(() => {
      expect(mockApiKeysRemove).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Gemini API key removed.')).toBeTruthy()
    })
  })

  it('falls back to default retrieval values when live settings cannot be loaded', async () => {
    mockApiKeysGetStatus.mockRejectedValueOnce(new Error('Settings service is unavailable.'))

    renderWithTheme(<ApiKeysSettingsPanel />)

    await waitFor(() => {
      expect(screen.getByText('Showing default indexing values until live settings can be loaded from the server.')).toBeTruthy()
      expect(screen.getByText('Showing default retrieval values until live settings can be loaded from the server.')).toBeTruthy()
      expect(screen.getByText('0.55')).toBeTruthy()
      expect(screen.getByDisplayValue('15')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Save indexing settings' }).props.accessibilityState.disabled).toBe(true)
      expect(screen.getByRole('button', { name: 'Save retrieval settings' }).props.accessibilityState.disabled).toBe(true)
    })
  })
})
