import type { QueryClient } from '@tanstack/react-query'

export function noteVersionHistoryKey(userId: string | undefined, noteId: string) {
  return ['note-versions', userId, noteId] as const
}

export async function refreshNoteVersionHistory(queryClient: QueryClient, userId: string, noteId: string) {
  const queryKey = noteVersionHistoryKey(userId, noteId)
  if (!queryClient.getQueryState(queryKey)) return

  const history = { queryKey, exact: true }
  // A first read started before the write can otherwise be reused by React Query.
  await queryClient.cancelQueries(history)
  await queryClient.invalidateQueries(history)
}
