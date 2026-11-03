export const NOTE_DRAG_TYPE = 'application/x-everfreenote-note'

export type NoteDragPayload = {
  version: 1
  ownerId: string
  noteId?: string
  tabId?: string
}

export function isNoteDrag(data: Pick<DataTransfer, 'types'>): boolean {
  return Array.from(data.types).includes(NOTE_DRAG_TYPE)
}

export function readNoteDrag(data: Pick<DataTransfer, 'getData'>, ownerId: string): NoteDragPayload | null {
  try {
    const raw = data.getData(NOTE_DRAG_TYPE)
    if (!raw || raw.length > 2048) return null
    const payload = JSON.parse(raw) as Partial<NoteDragPayload> | null
    if (!payload || payload.version !== 1 || payload.ownerId !== ownerId) return null
    if (payload.noteId !== undefined && (typeof payload.noteId !== 'string' || !payload.noteId)) return null
    if (payload.tabId !== undefined && (typeof payload.tabId !== 'string' || !payload.tabId)) return null
    if (!payload.noteId && !payload.tabId) return null
    return { version: 1, ownerId, noteId: payload.noteId, tabId: payload.tabId }
  } catch { return null }
}
