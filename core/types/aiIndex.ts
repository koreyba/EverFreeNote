export type AIIndexStatus = "indexed" | "not_indexed" | "outdated"

export type AIIndexFilter = "all" | AIIndexStatus

export interface AIIndexMutationResult {
  noteId: string
  previousStatus: AIIndexStatus
  nextStatus: AIIndexStatus
}

export interface AIIndexNoteRow {
  id: string
  title: string
  updatedAt: string
  lastIndexedAt: string | null
  status: AIIndexStatus
}

export interface AIIndexNotesPage {
  notes: AIIndexNoteRow[]
  totalCount: number
  hasMore: boolean
  nextCursor?: number
}
