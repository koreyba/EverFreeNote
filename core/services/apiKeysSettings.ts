import type { SupabaseClient } from '@supabase/supabase-js'

import type { RagIndexingSettings } from '@core/rag/indexingSettings'
import type { RagSearchSettings } from '@core/rag/searchSettings'

export type ApiKeysStatus = {
  gemini: { configured: boolean }
  ragIndexing?: RagIndexingSettings
  ragSearch?: RagSearchSettings
}

const isApiKeysStatus = (data: unknown): data is ApiKeysStatus => {
  if (!data || typeof data !== 'object') return false
  const gemini = (data as { gemini?: unknown }).gemini
  if (!gemini || typeof gemini !== 'object') return false
  return typeof (gemini as { configured?: unknown }).configured === 'boolean'
}

const readErrorMessage = async (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'context' in error) {
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      try {
        const payload = await context.json()
        if (payload && typeof payload === 'object') {
          const message =
            typeof payload.message === 'string'
              ? payload.message
              : typeof payload.error === 'string'
                ? payload.error
                : null
          if (message) return message
        }
      } catch {
        // Ignore parse failure and continue fallback chain.
      }
    }
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export class ApiKeysSettingsService {
  constructor(private supabase: SupabaseClient) {}

  async getStatus(): Promise<ApiKeysStatus> {
    const { data, error } = await this.supabase.functions.invoke('api-keys-status', { body: {} })
    if (error) {
      throw new Error(await readErrorMessage(error, 'Failed to load API key settings'))
    }
    if (!isApiKeysStatus(data)) {
      return { gemini: { configured: false } }
    }
    return data
  }

  async upsert(geminiApiKey: string): Promise<ApiKeysStatus> {
    const { data, error } = await this.supabase.functions.invoke('api-keys-upsert', {
      body: { geminiApiKey },
    })
    if (error) {
      throw new Error(await readErrorMessage(error, 'Failed to save API key'))
    }
    if (!isApiKeysStatus(data)) {
      throw new Error('Unexpected response while saving API key')
    }
    return data
  }
}
