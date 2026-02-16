import type { SupabaseClient } from '@supabase/supabase-js'

export type WordPressIntegrationStatus = {
  configured: boolean
  integration: {
    siteUrl: string
    wpUsername: string
    enabled: boolean
    hasPassword: boolean
  } | null
}

export type WordPressIntegrationUpsertInput = {
  siteUrl: string
  wpUsername: string
  applicationPassword?: string
  enabled: boolean
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
              : typeof payload.msg === 'string'
                ? payload.msg
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

export class WordPressSettingsService {
  constructor(private supabase: SupabaseClient) {}

  async getStatus(): Promise<WordPressIntegrationStatus> {
    const { data, error } = await this.supabase.functions.invoke('wordpress-settings-status', {
      body: {},
    })

    if (error) {
      throw new Error(await readErrorMessage(error, 'Failed to load WordPress settings'))
    }

    if (!data || typeof data !== 'object') {
      return {
        configured: false,
        integration: null,
      }
    }

    return data as WordPressIntegrationStatus
  }

  async upsert(input: WordPressIntegrationUpsertInput): Promise<WordPressIntegrationStatus> {
    const { data, error } = await this.supabase.functions.invoke('wordpress-settings-upsert', {
      body: input,
    })

    if (error) {
      throw new Error(await readErrorMessage(error, 'Failed to save WordPress settings'))
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Unexpected response while saving WordPress settings')
    }

    return data as WordPressIntegrationStatus
  }
}
