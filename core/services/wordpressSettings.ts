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

import { readJsonErrorMessage } from './settingsErrorMessage'

const extractJsonMessage = async (context: Response): Promise<string | null> => {
  return readJsonErrorMessage(context, ['message', 'msg'])
}

const readErrorMessage = async (error: unknown, fallback: string): Promise<string> => {
  if (typeof error === 'object' && error && 'context' in error) {
    const context = (error as { context?: Response }).context
    if (context) {
      const message = await extractJsonMessage(context)
      if (message) return message
    }
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}

export class WordPressSettingsService {
  constructor(private readonly supabase: SupabaseClient) {}

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
