import type { SupabaseClient } from '@supabase/supabase-js'

export type ApiKeysStatus = {
  gemini: { configured: boolean }
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
    if (!data || typeof data !== 'object') {
      return { gemini: { configured: false } }
    }
    return data as ApiKeysStatus
  }

  async upsert(geminiApiKey: string): Promise<ApiKeysStatus> {
    const { data, error } = await this.supabase.functions.invoke('api-keys-upsert', {
      body: { geminiApiKey },
    })
    if (error) {
      throw new Error(await readErrorMessage(error, 'Failed to save API key'))
    }
    if (!data || typeof data !== 'object') {
      throw new Error('Unexpected response while saving API key')
    }
    return data as ApiKeysStatus
  }
}
