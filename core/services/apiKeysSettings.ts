import type { SupabaseClient } from '@supabase/supabase-js'

import type { RagIndexingSettings } from '@core/rag/indexingSettings'
import type { RagSearchSettings } from '@core/rag/searchSettings'
import { readSettingsErrorMessage } from '@core/services/settingsErrorMessage'

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

export class ApiKeysSettingsService {
  constructor(private supabase: SupabaseClient) {}

  private async invokeAndReadStatus(
    body: Record<string, unknown>,
    fallbackMessage: string
  ): Promise<ApiKeysStatus> {
    const { data, error } = await this.supabase.functions.invoke('api-keys-upsert', { body })
    if (error) {
      throw new Error(await readSettingsErrorMessage(error, fallbackMessage))
    }
    if (!isApiKeysStatus(data)) {
      throw new Error('Unexpected response while updating API key settings')
    }
    return data
  }

  async getStatus(): Promise<ApiKeysStatus> {
    const { data, error } = await this.supabase.functions.invoke('api-keys-status', { body: {} })
    if (error) {
      throw new Error(await readSettingsErrorMessage(error, 'Failed to load API key settings'))
    }
    if (!isApiKeysStatus(data)) {
      return { gemini: { configured: false } }
    }
    return data
  }

  async upsert(geminiApiKey: string): Promise<ApiKeysStatus> {
    return this.invokeAndReadStatus({ geminiApiKey }, 'Failed to save API key')
  }

  async removeGeminiApiKey(): Promise<ApiKeysStatus> {
    return this.invokeAndReadStatus({ removeGeminiApiKey: true }, 'Failed to remove API key')
  }
}
