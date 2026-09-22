import { applyNoteOverlay } from '@core/utils/overlay'
import type { Note } from '@core/types/domain'

it('uses the server once a local copy is synced, but keeps that copy available offline', () => {
  const cached = { id: 'n1', title: 'Local', status: 'synced' as const, updatedAt: '2026-09-22T12:00:00Z' }
  const remote = { id: 'n1', title: 'Edited on another device', updated_at: '2026-09-22T12:01:00Z' } as Note
  expect(applyNoteOverlay([remote], [cached])).toEqual([remote])
  expect(applyNoteOverlay([], [cached])).toEqual([expect.objectContaining({ id: 'n1', title: 'Local' })])
})
