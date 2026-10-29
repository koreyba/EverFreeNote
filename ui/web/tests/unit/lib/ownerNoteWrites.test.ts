import type { CachedNote } from '@core/types/offline'
import { enqueueOwnerNoteWrite, getPendingOwnerNotes, subscribeOwnerNoteWrites, waitForOwnerNoteWrites } from '@ui/web/lib/ownerNoteWrites'

const note = (owner: string, title: string): CachedNote => ({
  id: 'shared-note-id', user_id: owner, title, status: 'pending', updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('owner note writes', () => {
  it('hides a discarded pending snapshot immediately without dropping write serialization', async () => {
    const original = note('owner-cancel', 'discarded')
    let release!: (result: CachedNote) => void
    const held = new Promise<CachedNote>(resolve => { release = resolve })
    const controller = new AbortController()
    const seen = jest.fn()
    const stop = subscribeOwnerNoteWrites('owner-cancel', seen)
    const pending = enqueueOwnerNoteWrite('owner-cancel', original.id, original, () => held, controller.signal)
    expect(getPendingOwnerNotes('owner-cancel')).toEqual([original])
    controller.abort()
    expect(getPendingOwnerNotes('owner-cancel')).toEqual([])
    expect(seen).toHaveBeenCalledTimes(2)
    let finished = false
    const waiting = waitForOwnerNoteWrites('owner-cancel', original.id).then(() => { finished = true })
    await Promise.resolve()
    expect(finished).toBe(false)
    release(original)
    await Promise.all([pending, waiting])
    expect(finished).toBe(true)
    stop()
  })

  it('does not hide a newer pending write when an older write is discarded', async () => {
    const earlier = note('owner-same-note', 'earlier')
    const later = note('owner-same-note', 'later')
    let release!: (result: CachedNote) => void
    const held = new Promise<CachedNote>(resolve => { release = resolve })
    const controller = new AbortController()
    const first = enqueueOwnerNoteWrite('owner-same-note', earlier.id, earlier, () => held, controller.signal)
    const second = enqueueOwnerNoteWrite('owner-same-note', later.id, later, async () => later)
    controller.abort()
    expect(getPendingOwnerNotes('owner-same-note')).toEqual([later])
    release(earlier)
    await Promise.all([first, second])
    expect(getPendingOwnerNotes('owner-same-note')).toEqual([])
  })

  it('exposes only the latest pending snapshot to its owner and reports its completed save', async () => {
    const firstNote = note('owner-a', 'first')
    const secondNote = note('owner-a', 'second')
    let release!: (result: CachedNote) => void
    const held = new Promise<CachedNote>(resolve => { release = resolve })
    const seenA = jest.fn()
    const seenB = jest.fn()
    const stopA = subscribeOwnerNoteWrites('owner-a', seenA)
    const stopB = subscribeOwnerNoteWrites('owner-b', seenB)
    const first = enqueueOwnerNoteWrite('owner-a', firstNote.id, firstNote, () => held)
    const second = enqueueOwnerNoteWrite('owner-a', secondNote.id, secondNote, async () => secondNote)
    expect(getPendingOwnerNotes('owner-a')).toEqual([secondNote])
    expect(getPendingOwnerNotes('owner-b')).toEqual([])
    expect(seenB).not.toHaveBeenCalled()
    release(firstNote)
    await Promise.all([first, second, waitForOwnerNoteWrites('owner-a', firstNote.id)])
    expect(getPendingOwnerNotes('owner-a')).toEqual([])
    expect(seenA).toHaveBeenLastCalledWith(secondNote)
    stopA()
    stopB()
  })

  it('clears a failed write and allows a later write to proceed', async () => {
    const failed = note('owner-failed', 'failed')
    const retry = note('owner-failed', 'retry')
    const first = enqueueOwnerNoteWrite('owner-failed', failed.id, failed, async () => { throw new Error('storage') })
    const second = enqueueOwnerNoteWrite('owner-failed', retry.id, retry, async () => retry)
    await expect(first).rejects.toThrow('storage')
    await expect(second).resolves.toEqual(retry)
    expect(getPendingOwnerNotes('owner-failed')).toEqual([])
  })
})
