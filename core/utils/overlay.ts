import type { Note } from '../types/domain'
import type { CachedNote } from '../types/offline'

/**
 * Создаёт overlay заметок: оффлайн версии перекрывают серверные.
 * Заметки с deleted=true скрываются из результата (optimistic delete).
 */
export function applyNoteOverlay(serverNotes: Note[], offlineNotes: CachedNote[]): Note[] {
  const deletedIds = new Set<string>()
  const map = new Map<string, Note>()

  // First pass: collect deleted IDs
  offlineNotes.forEach((c) => {
    if (c.deleted) {
      deletedIds.add(c.id)
    }
  })

  // Add server notes (skip deleted)
  serverNotes.forEach((n) => {
    if (!deletedIds.has(n.id)) {
      map.set(n.id, n)
    }
  })

  // Apply offline overlays (skip deleted)
  offlineNotes.forEach((c) => {
    if (c.deleted) return
    const existing = map.get(c.id)
    map.set(c.id, {
      ...(existing ?? ({} as Note)),
      id: c.id,
      title: c.title ?? existing?.title ?? 'Untitled',
      description: c.description ?? existing?.description ?? '',
      tags: c.tags ?? existing?.tags ?? [],
      updated_at: c.updatedAt ?? (existing as unknown as { updated_at?: string })?.updated_at ?? new Date().toISOString(),
      created_at: (existing as unknown as { created_at?: string })?.created_at ?? new Date().toISOString(),
      user_id: (existing as unknown as { user_id?: string })?.user_id ?? '',
    })
  })
  return Array.from(map.values())
}
