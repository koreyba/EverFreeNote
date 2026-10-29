import type { QueryClient } from '@tanstack/react-query'

// Tracks locally confirmed deletions that may not change a currently loaded page.
// A later refresh starts at the new revision and can show a recreated note.
const revisions = new WeakMap<QueryClient, Map<string, number>>()

export function noteListRevision(client: QueryClient, ownerId: string): number {
  return revisions.get(client)?.get(ownerId) ?? 0
}

export function advanceNoteListRevision(client: QueryClient, ownerId: string): void {
  const owners = revisions.get(client) ?? new Map<string, number>()
  owners.set(ownerId, (owners.get(ownerId) ?? 0) + 1)
  revisions.set(client, owners)
}
