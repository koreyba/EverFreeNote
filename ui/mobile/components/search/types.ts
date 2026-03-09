import type { Note } from '@core/types/domain'

export type SearchResultItem = Note & {
  snippet?: string | null
  headline?: string | null
}
