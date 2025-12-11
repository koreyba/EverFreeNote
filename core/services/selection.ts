export function toggleSelection(ids: Set<string>, noteId: string): Set<string> {
  const next = new Set(ids)
  if (next.has(noteId)) {
    next.delete(noteId)
  } else {
    next.add(noteId)
  }
  return next
}

export function selectAll(ids: string[]): Set<string> {
  return new Set(ids)
}

export function clearSelection(): Set<string> {
  return new Set()
}
