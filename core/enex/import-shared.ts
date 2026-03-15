import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/supabase/types'
import type { DuplicateStrategy, ImportSettings } from './types'

export const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
  duplicateStrategy: 'prefix',
  skipFileDuplicates: false,
}

export const IMPORT_SETTINGS_COPY = {
  title: 'Import Settings',
  duplicateQuestion: 'What to do with duplicate notes?',
  skipFileDuplicatesLabel: 'Skip duplicates inside imported file(s)',
} as const

export const DUPLICATE_STRATEGY_OPTIONS: ReadonlyArray<{
  value: DuplicateStrategy
  label: string
}> = [
  { value: 'prefix', label: 'Add [duplicate] prefix to title' },
  { value: 'skip', label: 'Skip duplicate notes' },
  { value: 'replace', label: 'Replace existing notes' },
]

export const DUPLICATE_LOOKUP_UNAVAILABLE_MESSAGE =
  'Could not verify existing notes. Try again, or switch duplicate handling to "Add [duplicate] prefix to title".'

export function normalizeNoteTitle(title?: string | null): string {
  const trimmed = typeof title === 'string' ? title.trim() : ''
  return trimmed.length > 0 ? trimmed : 'Untitled'
}

export async function fetchExistingTitles(
  client: SupabaseClient<Database>,
  userId: string
): Promise<Map<string, string>> {
  const { data, error } = await client
    .from('notes')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch existing titles: ${error.message}`)
  }

  const map = new Map<string, string>()
  data?.forEach((row) => {
    const title = normalizeNoteTitle(row?.title)

    if (!map.has(title)) {
      map.set(title, row.id)
    }
  })

  return map
}

export async function resolveExistingTitlesForImport(
  client: SupabaseClient<Database>,
  userId: string,
  duplicateStrategy: DuplicateStrategy
): Promise<Map<string, string> | null> {
  try {
    return await fetchExistingTitles(client, userId)
  } catch (error) {
    if (duplicateStrategy === 'prefix') {
      console.error('Failed to fetch existing titles for prefix import:', error)
      return null
    }

    throw new Error(DUPLICATE_LOOKUP_UNAVAILABLE_MESSAGE)
  }
}
