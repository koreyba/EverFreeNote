import type { SupabaseClient } from '@supabase/supabase-js'
import type { PublicNoteResult, Tables } from '@/supabase/types'

export type PublicNoteSharePermission = 'view'

export type PublicNoteShareLink = Pick<
  Tables<'note_share_links'>,
  'id' | 'note_id' | 'user_id' | 'token' | 'permission' | 'is_active' | 'created_at' | 'updated_at'
>

export type PublicNote = PublicNoteResult

const SHARE_LINK_COLUMNS = 'id, note_id, user_id, token, permission, is_active, created_at, updated_at'

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return fallback
}

const trimTrailingSlashes = (value: string) => {
  let end = value.length
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1
  }

  return value.slice(0, end)
}

export const buildPublicNoteUrl = (origin: string, token: string) => {
  const normalizedOrigin = trimTrailingSlashes(origin)
  return `${normalizedOrigin}/share/?token=${encodeURIComponent(token)}`
}

export class PublicNoteShareService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getOrCreateViewLink(noteId: string, userId: string): Promise<PublicNoteShareLink> {
    const existing = await this.findExistingViewLink(noteId, userId)
    if (existing) return existing

    const { data, error } = await this.supabase
      .from('note_share_links')
      .insert([
        {
          note_id: noteId,
          user_id: userId,
          permission: 'view' satisfies PublicNoteSharePermission,
        },
      ])
      .select(SHARE_LINK_COLUMNS)
      .single()

    if (error) {
      const retry = await this.findExistingViewLink(noteId, userId)
      if (retry) return retry
      throw new Error(getErrorMessage(error, 'Failed to create share link'))
    }

    return data as PublicNoteShareLink
  }

  async getPublicNoteByToken(token: string): Promise<PublicNote | null> {
    const normalizedToken = token.trim()
    if (!normalizedToken) return null

    const { data, error } = await this.supabase
      .rpc('get_public_note_by_token', { share_token: normalizedToken })
      .maybeSingle()

    if (error) throw new Error(getErrorMessage(error, 'Failed to load public note'))
    if (!data) return null

    return data as PublicNote
  }

  private async findExistingViewLink(noteId: string, userId: string): Promise<PublicNoteShareLink | null> {
    const { data, error } = await this.supabase
      .from('note_share_links')
      .select(SHARE_LINK_COLUMNS)
      .eq('note_id', noteId)
      .eq('user_id', userId)
      .eq('permission', 'view')
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw new Error(getErrorMessage(error, 'Failed to load share link'))
    return (data as PublicNoteShareLink | null) ?? null
  }
}
