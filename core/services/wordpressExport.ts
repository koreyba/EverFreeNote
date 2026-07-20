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

const parseCategoryItem = (category: unknown): WordPressCategory | null => {
  if (!isRecord(category) || typeof category.name !== 'string') return null
  const id = parsePostId(category.id)
  return id ? { id, name: category.name } : null
}

const parseRememberedIds = (rememberedCategoryIds: unknown[]): number[] | null => {
  const normalizedRememberedIds: number[] = []
  for (const categoryId of rememberedCategoryIds) {
    const id = parsePostId(categoryId)
    if (!id) return null
    normalizedRememberedIds.push(id)
  }
  return normalizedRememberedIds
}

const parseCategoriesResponse = (data: unknown): WordPressCategoriesResponse | null => {
  if (!isRecord(data) || !Array.isArray(data.categories) || !Array.isArray(data.rememberedCategoryIds)) {
    return null
  }

  const categories: WordPressCategory[] = []
  for (const category of data.categories) {
    const parsed = parseCategoryItem(category)
    if (!parsed) return null
    categories.push(parsed)
  }

  const rememberedCategoryIds = parseRememberedIds(data.rememberedCategoryIds)
  if (!rememberedCategoryIds) return null

  return {
    categories,
    rememberedCategoryIds,
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

import { readJsonErrorMessage } from './settingsErrorMessage'

const parseContextResponseBody = async (context: Response): Promise<WordPressBridgeError | null> => {
  if (typeof context.json !== 'function') return null
  try {
    const messageFromHelper = await readJsonErrorMessage(context, ['message', 'msg'])
    const body = await context.json()
    if (!isRecord(body)) return null

    const code = typeof body.code === 'string' ? body.code : 'bridge_error'
    const message = messageFromHelper || 'WordPress export failed'
    const details = 'details' in body ? body.details : undefined
    return new WordPressBridgeError(message, code, details)
  } catch {
    return null
  }
}

const parseInvokeError = async (error: unknown): Promise<WordPressBridgeError> => {
  if (isRecord(error) && 'context' in error && error.context) {
    const parsed = await parseContextResponseBody(error.context as Response)
    if (parsed) return parsed
  }

  if (error instanceof Error) {
    return new WordPressBridgeError(error.message || 'WordPress export failed', 'bridge_error')
  }

  return new WordPressBridgeError('WordPress export failed', 'bridge_error')
}

export class WordPressExportService {
  constructor(private readonly supabase: SupabaseClient) {}

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
