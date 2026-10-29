export type TagChange = <T extends { tags?: string[] }>(notes: T[]) => T[]
export type TagMutationRecovery = { change: TagChange; phase: 'pending' | 'uncertain' }

// Account changes remount the workspace. Keep unfinished batches associated
// with their owner until this browser context can verify the outcome.
const recoveries = new Map<string, TagMutationRecovery>()
const listeners = new Set<() => void>()

export function getTagMutationRecovery(ownerId?: string): TagMutationRecovery | undefined {
  return ownerId ? recoveries.get(ownerId) : undefined
}

export function setTagMutationRecovery(ownerId: string, recovery?: TagMutationRecovery): void {
  if (recovery) recoveries.set(ownerId, recovery)
  else recoveries.delete(ownerId)
  listeners.forEach((listener) => listener())
}

export function subscribeTagMutationRecovery(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
