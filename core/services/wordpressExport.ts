import type { SupabaseClient } from '@supabase/supabase-js'

export type WordPressCategory = {
  id: number
  name: string
}

export type WordPressCategoriesResponse = {
  categories: WordPressCategory[]
  rememberedCategoryIds: number[]
}

export type ExportNoteToWordPressPayload = {
  noteId: string
  categoryIds: number[]
  tags: string[]
  slug: string
  status?: 'publish'
}

export type ExportNoteToWordPressResponse = {
  postId: number
  postUrl: string
  slug: string
}

export class WordPressBridgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'WordPressBridgeError'
  }
}

const parseInvokeError = async (error: unknown): Promise<WordPressBridgeError> => {
  if (typeof error === 'object' && error && 'context' in error) {
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      try {
        const body = await context.json()
        if (body && typeof body === 'object') {
          const code = typeof body.code === 'string' ? body.code : 'bridge_error'
          const message = typeof body.message === 'string' ? body.message : 'WordPress export failed'
          const details = 'details' in body ? body.details : undefined
          return new WordPressBridgeError(message, code, details)
        }
      } catch {
        // Ignore parse failure and fallback to generic message below.
      }
    }
  }

  if (error instanceof Error) {
    return new WordPressBridgeError(error.message || 'WordPress export failed', 'bridge_error')
  }

  return new WordPressBridgeError('WordPress export failed', 'bridge_error')
}

export class WordPressExportService {
  constructor(private supabase: SupabaseClient) {}

  async getCategories(): Promise<WordPressCategoriesResponse> {
    const { data, error } = await this.supabase.functions.invoke('wordpress-bridge', {
      body: {
        action: 'get_categories',
      },
    })

    if (error) {
      throw await parseInvokeError(error)
    }

    if (!data || typeof data !== 'object') {
      throw new WordPressBridgeError('Invalid categories response', 'invalid_response')
    }

    return data as WordPressCategoriesResponse
  }

  async exportNote(payload: ExportNoteToWordPressPayload): Promise<ExportNoteToWordPressResponse> {
    const { data, error } = await this.supabase.functions.invoke('wordpress-bridge', {
      body: {
        action: 'export_note',
        noteId: payload.noteId,
        categoryIds: payload.categoryIds,
        tags: payload.tags,
        slug: payload.slug,
        status: payload.status ?? 'publish',
      },
    })

    if (error) {
      throw await parseInvokeError(error)
    }

    if (!data || typeof data !== 'object') {
      throw new WordPressBridgeError('Invalid export response', 'invalid_response')
    }

    return data as ExportNoteToWordPressResponse
  }
}
