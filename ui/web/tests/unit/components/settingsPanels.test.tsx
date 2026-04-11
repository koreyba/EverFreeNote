import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type React from 'react'

import { ApiKeysSettingsPanel } from '@/components/features/settings/ApiKeysSettingsPanel'
import { RagIndexingSettingsPanel } from '@/components/features/settings/RagIndexingSettingsPanel'
import { RagSearchSettingsPanel } from '@/components/features/settings/RagSearchSettingsPanel'
import { resolveRagIndexingSettings } from '@core/rag/indexingSettings'
import { resolveRagSearchSettings } from '@core/rag/searchSettings'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'

const defaultRagIndexing = resolveRagIndexingSettings(null)
const defaultRagSearch = resolveRagSearchSettings(null)

function renderWithSupabase(ui: React.ReactElement, invoke: jest.Mock) {
  return render(
    <SupabaseTestProvider supabase={{ functions: { invoke } } as never}>
      {ui}
    </SupabaseTestProvider>
  )
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('settings panels', () => {
  it('shows retrieval defaults even when live retrieval settings fail to load', async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('name resolution failed'),
    })

    renderWithSupabase(<RagSearchSettingsPanel />, invoke)

    await waitFor(() => {
      expect(
        screen.getByText('Showing default system values until live retrieval settings can be loaded from the server.')
      ).toBeTruthy()
    })

    expect(screen.getByText('Current precision threshold')).toBeTruthy()
    expect(screen.getByText(defaultRagSearch.similarity_threshold.toFixed(2))).toBeTruthy()
    expect(screen.getByText(String(defaultRagSearch.output_dimensionality))).toBeTruthy()
    expect((screen.getByLabelText('Top K per page') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Save retrieval settings' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows indexing defaults even when live indexing settings fail to load', async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('name resolution failed'),
    })

    renderWithSupabase(<RagIndexingSettingsPanel />, invoke)

    await waitFor(() => {
      expect(
        screen.getByText('Showing default system values until live indexing settings can be loaded from the server.')
      ).toBeTruthy()
    })

    expect(screen.getByText('Embedding settings')).toBeTruthy()
    expect(screen.getByLabelText('Embedding model').textContent).toContain('Gemini Embedding 1')
    expect(screen.getByText(String(defaultRagIndexing.output_dimensionality))).toBeTruthy()
    expect(
      screen.getByText((content) => content.includes('Tags: {tag1}, {tag2}, {tag3}'))
    ).toBeTruthy()
  })

  it('keeps the remove key action disabled until a Gemini key is configured', async () => {
    const invoke = jest.fn().mockImplementation(async (name: string) => {
      if (name === 'api-keys-status') {
        return {
          data: {
            gemini: { configured: false },
            ragIndexing: defaultRagIndexing,
            ragSearch: defaultRagSearch,
          },
          error: null,
        }
      }

      throw new Error(`Unexpected function invoke: ${name}`)
    })

    renderWithSupabase(<ApiKeysSettingsPanel />, invoke)

    await waitFor(() => {
      expect(screen.getByText('Not configured')).toBeTruthy()
    })

    expect((screen.getByRole('button', { name: 'Remove key' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('removes the stored Gemini key from the settings panel', async () => {
    const invoke = jest.fn().mockImplementation(async (name: string, options?: { body?: Record<string, unknown> }) => {
      if (name === 'api-keys-status') {
        return {
          data: {
            gemini: { configured: true },
            ragIndexing: defaultRagIndexing,
            ragSearch: defaultRagSearch,
          },
          error: null,
        }
      }

      if (name === 'api-keys-upsert' && options?.body?.removeGeminiApiKey === true) {
        return {
          data: {
            gemini: { configured: false },
            ragIndexing: defaultRagIndexing,
            ragSearch: defaultRagSearch,
          },
          error: null,
        }
      }

      throw new Error(`Unexpected function invoke: ${name}`)
    })

    jest.spyOn(window, 'confirm').mockReturnValue(true)

    renderWithSupabase(<ApiKeysSettingsPanel />, invoke)

    await waitFor(() => {
      expect(screen.getByText('Configured')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remove key' }))

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('api-keys-upsert', {
        body: { removeGeminiApiKey: true },
      })
    })

    await waitFor(() => {
      expect(screen.getByText('API key removed.')).toBeTruthy()
    })

    expect((screen.getByRole('button', { name: 'Remove key' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('does not remove the stored Gemini key when the confirmation is cancelled', async () => {
    const invoke = jest.fn().mockImplementation(async (name: string) => {
      if (name === 'api-keys-status') {
        return {
          data: {
            gemini: { configured: true },
            ragIndexing: defaultRagIndexing,
            ragSearch: defaultRagSearch,
          },
          error: null,
        }
      }

      throw new Error(`Unexpected function invoke: ${name}`)
    })

    jest.spyOn(window, 'confirm').mockReturnValue(false)

    renderWithSupabase(<ApiKeysSettingsPanel />, invoke)

    await waitFor(() => {
      expect(screen.getByText('Configured')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remove key' }))

    expect(invoke).not.toHaveBeenCalledWith('api-keys-upsert', {
      body: { removeGeminiApiKey: true },
    })
    expect(screen.queryByText('API key removed.')).toBeNull()
    expect((screen.getByRole('button', { name: 'Remove key' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
