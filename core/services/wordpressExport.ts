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
  title?: string
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object'

const parsePostId = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed > 0) return parsed
  }

  return null
}

const parseCategoriesResponse = (data: unknown): WordPressCategoriesResponse | null => {
  if (!isRecord(data)) return null
  const categories = data.categories
  const rememberedCategoryIds = data.rememberedCategoryIds

  if (!Array.isArray(categories) || !Array.isArray(rememberedCategoryIds)) {
    return null
  }

  const normalizedCategories: WordPressCategory[] = []
  for (const category of categories) {
    if (!isRecord(category)) return null
    if (typeof category.name !== 'string') return null
    const id = parsePostId(category.id)
    if (!id) return null
    normalizedCategories.push({ id, name: category.name })
  }

  const normalizedRememberedIds: number[] = []
  for (const categoryId of rememberedCategoryIds) {
    const id = parsePostId(categoryId)
    if (!id) return null
    normalizedRememberedIds.push(id)
  }

  return {
    categories: normalizedCategories,
    rememberedCategoryIds: normalizedRememberedIds,
  }
}

const parseExportResponse = (data: unknown): ExportNoteToWordPressResponse | null => {
  if (!isRecord(data)) return null
  if (typeof data.postUrl !== 'string' || typeof data.slug !== 'string') {
    return null
  }

  const postId = parsePostId(data.postId)
  if (!postId) return null

  return {
    postId,
    postUrl: data.postUrl,
    slug: data.slug,
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
          const message =
            typeof body.message === 'string'
              ? body.message
              : typeof body.msg === 'string'
                ? body.msg
                : 'WordPress export failed'
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

    const parsed = parseCategoriesResponse(data)
    if (!parsed) {
      throw new WordPressBridgeError('Invalid categories response', 'invalid_response')
    }

    return parsed
  }

  async exportNote(payload: ExportNoteToWordPressPayload): Promise<ExportNoteToWordPressResponse> {
    const { data, error } = await this.supabase.functions.invoke('wordpress-bridge', {
      body: {
        action: 'export_note',
        noteId: payload.noteId,
        categoryIds: payload.categoryIds,
        tags: payload.tags,
        slug: payload.slug,
        title: payload.title,
        status: payload.status ?? 'publish',
      },
    })

    if (error) {
      throw await parseInvokeError(error)
    }

    const parsed = parseExportResponse(data)
    if (!parsed) {
      throw new WordPressBridgeError('Invalid export response', 'invalid_response')
    }

    return parsed
  }
}
