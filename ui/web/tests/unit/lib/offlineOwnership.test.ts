import type { CachedNote, MutationQueueItem } from '@core/types/offline'
import type { Note } from '@core/types/domain'
import { countUnverifiedNotes, isMatchingLegacySnapshot, queueForOwner, snapshotEvidence, visibleLegacyNoteIds } from '@ui/web/lib/offlineOwnership'

const legacy: CachedNote = { id: 'note', title: 'Local draft', description: 'Body', tags: ['x'], status: 'pending', updatedAt: '2026-10-01T00:00:00Z', created_at: '2026-09-01T00:00:00Z' }
const remote = { id: legacy.id, user_id: 'owner-a', title: legacy.title, description: legacy.description, tags: legacy.tags, created_at: legacy.created_at } as Note
const create: MutationQueueItem = { id: 'create', noteId: 'note', operation: 'create', payload: { user_id: 'owner-a', title: legacy.title, description: legacy.description, tags: legacy.tags }, status: 'pending', clientUpdatedAt: legacy.updatedAt }
const update: MutationQueueItem = { id: 'update', noteId: 'note', operation: 'update', payload: { title: 'New text' }, status: 'pending', clientUpdatedAt: legacy.updatedAt }

it('shows an exactly matched legacy copy only to the owner named in its operation', () => {
  expect(visibleLegacyNoteIds([legacy], [create, update], 'owner-a', new Map())).toEqual(new Set(['note']))
  expect(visibleLegacyNoteIds([legacy], [create, update], 'owner-b', new Map())).toEqual(new Set())
  expect(queueForOwner([create, update], [legacy], 'owner-a')).toEqual([create])
  expect(queueForOwner([create, update], [legacy], 'owner-b')).toEqual([])
})

it('keeps conflicting owner evidence hidden and unsent', () => {
  const conflict = { ...update, payload: { user_id: 'owner-b', title: 'Other owner' } }
  expect(visibleLegacyNoteIds([legacy], [create, conflict], 'owner-a', new Map([[legacy.id, snapshotEvidence(legacy)]])).size).toBe(0)
  expect(queueForOwner([create, conflict], [legacy], 'owner-a')).toEqual([])
})

it('does not attribute a different cached draft or unowned update from a same-ID owned update', () => {
  const ownedUpdate = { ...update, payload: { user_id: 'owner-a', title: 'Different owner update' } }
  expect(visibleLegacyNoteIds([legacy], [ownedUpdate, update], 'owner-a', new Map()).size).toBe(0)
  expect(queueForOwner([ownedUpdate, update], [legacy], 'owner-a')).toEqual([ownedUpdate])
  expect(countUnverifiedNotes([ownedUpdate, update], [legacy], 'owner-a', new Map())).toBe(1)
})

it('requires the owned operation and local snapshot to have the same version', () => {
  const older = { ...create, clientUpdatedAt: '2026-09-01T00:00:00Z' }
  expect(visibleLegacyNoteIds([legacy], [older], 'owner-a', new Map()).size).toBe(0)
  expect(visibleLegacyNoteIds([legacy], [create], 'owner-a', new Map())).toEqual(new Set(['note']))
})

it('requires matching content, owner and valid immutable creation time', () => {
  expect(isMatchingLegacySnapshot(legacy, remote, 'owner-a')).toBe(true)
  expect(isMatchingLegacySnapshot(legacy, { ...remote, user_id: 'owner-b' }, 'owner-a')).toBe(false)
  expect(isMatchingLegacySnapshot(legacy, { ...remote, title: 'Changed elsewhere' }, 'owner-a')).toBe(false)
  expect(isMatchingLegacySnapshot({ ...legacy, created_at: undefined }, remote, 'owner-a')).toBe(false)
  expect(isMatchingLegacySnapshot(legacy, { ...remote, created_at: '2026-09-02T00:00:00Z' }, 'owner-a')).toBe(false)
})

it('invalidates evidence after local content changes and never sends a different unowned payload', () => {
  const evidence = new Map([[legacy.id, snapshotEvidence(legacy)]])
  const noOp = { ...update, payload: { title: legacy.title, description: legacy.description, tags: legacy.tags } }
  expect(visibleLegacyNoteIds([legacy], [update], 'owner-a', evidence)).toEqual(new Set(['note']))
  expect(queueForOwner([update], [legacy], 'owner-a', evidence)).toEqual([])
  expect(queueForOwner([noOp], [legacy], 'owner-a', evidence)).toEqual([noOp])
  expect(queueForOwner([{ ...noOp, operation: 'delete' }], [legacy], 'owner-a', evidence)).toEqual([])
  expect(visibleLegacyNoteIds([{ ...legacy, title: 'Changed locally' }], [], 'owner-a', evidence).size).toBe(0)
  expect(countUnverifiedNotes([update], [legacy], 'owner-a', evidence)).toBe(1)
})

it('warns about unassigned data without counting a known foreign owner as their issue', () => {
  expect(countUnverifiedNotes([update], [legacy], 'owner-a', new Map())).toBe(1)
  expect(countUnverifiedNotes([create], [legacy], 'owner-b', new Map())).toBe(0)
})
