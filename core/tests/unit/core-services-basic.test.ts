import { getAIIndexActionPresentation, getAIIndexActionableNotes, isAIIndexStatusActionable } from '../../constants/aiIndex'
import {
  formatBulkIndexSummary,
  incrementBulkIndexCounters,
  processBulkIndexNote,
} from '../../bulkIndex'
import { AuthService } from '../../services/auth'
import { computeFtsHasMore, computeFtsTotal } from '../../services/ftsPagination'
import { clearSelection, selectAll, toggleSelection } from '../../services/selection'

describe('core service and indexing helpers', () => {
  it('covers authentication service delegation and account deletion errors', async () => {
    const supabase = {
      auth: {
        signInWithOAuth: jest.fn().mockResolvedValue({ data: 'oauth' }),
        signInWithPassword: jest.fn().mockResolvedValue({ data: 'password' }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      },
      functions: {
        invoke: jest.fn().mockResolvedValue({ data: { deleted: true }, error: null }),
      },
    }
    const service = new AuthService(supabase as never)

    await expect(service.signInWithGoogle('https://app/callback')).resolves.toEqual({ data: 'oauth' })
    await expect(service.signInWithPassword('a@b.test', 'secret')).resolves.toEqual({ data: 'password' })
    await expect(service.signOut()).resolves.toEqual({ error: null })
    await expect(service.getSession()).resolves.toEqual({ data: { session: null } })
    await expect(service.deleteAccount()).resolves.toEqual({ deleted: true })
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://app/callback' },
    })
    expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account', { body: { deleteNotes: true } })

    supabase.functions.invoke.mockResolvedValueOnce({ data: null, error: { message: '' } })
    await expect(service.deleteAccount()).rejects.toThrow('Failed to delete account')
    supabase.functions.invoke.mockResolvedValueOnce({ data: null, error: { message: 'denied' } })
    await expect(service.deleteAccount()).rejects.toThrow('denied')
  })

  it('computes FTS pagination for known and unknown totals', () => {
    expect(computeFtsHasMore(10, 4, 4, 4)).toBe(true)
    expect(computeFtsHasMore(4, 4, 4, 4)).toBe(false)
    expect(computeFtsHasMore(undefined, 4, 4, 4)).toBe(true)
    expect(computeFtsHasMore(undefined, 4, 2, 4)).toBe(false)
    expect(computeFtsTotal(10, 4, true)).toBe(10)
    expect(computeFtsTotal(undefined, 4, true)).toBeUndefined()
    expect(computeFtsTotal(undefined, 4, false)).toBe(4)
  })

  it('manages selected note ids without mutating the input set', () => {
    const initial = new Set(['one'])
    expect(toggleSelection(initial, 'two')).toEqual(new Set(['one', 'two']))
    expect(toggleSelection(initial, 'one')).toEqual(new Set())
    expect(initial).toEqual(new Set(['one']))
    expect(selectAll(['one', 'two'])).toEqual(new Set(['one', 'two']))
    expect(clearSelection()).toEqual(new Set())
  })

  it('exposes AI index actions and filters actionable notes', () => {
    expect(getAIIndexActionPresentation('outdated')).toMatchObject({ action: 'reindex', buttonVariant: 'default' })
    expect(getAIIndexActionPresentation('indexed')).toMatchObject({ action: 'reindex', buttonVariant: 'outline' })
    expect(getAIIndexActionPresentation('not_indexed')).toMatchObject({ action: 'index', buttonVariant: 'default' })
    expect(isAIIndexStatusActionable('indexed')).toBe(false)
    expect(isAIIndexStatusActionable('outdated')).toBe(true)
    const notes = [
      { id: '1', title: 'A', updatedAt: '', lastIndexedAt: null, status: 'indexed' as const },
      { id: '2', title: 'B', updatedAt: '', lastIndexedAt: null, status: 'outdated' as const },
      { id: '3', title: 'C', updatedAt: '', lastIndexedAt: null, status: 'not_indexed' as const },
    ]
    expect(getAIIndexActionableNotes(notes).map((note) => note.id)).toEqual(['2', '3'])
  })

  it('processes bulk index outcomes and counters', async () => {
    const applyMutationResult = jest.fn()
    const invoke = jest.fn()
    const note = { id: 'note-1', title: 'A', updatedAt: '', lastIndexedAt: null, status: 'outdated' as const }

    invoke.mockResolvedValueOnce({ data: { outcome: 'indexed', chunkCount: 1 }, error: null })
    await expect(processBulkIndexNote({ applyMutationResult, invoke, note })).resolves.toBe('indexed')
    expect(applyMutationResult).toHaveBeenCalledWith({
      noteId: 'note-1', previousStatus: 'outdated', nextStatus: 'indexed',
    })

    invoke.mockResolvedValueOnce({ data: { outcome: 'skipped', reason: 'too_short' }, error: null })
    await expect(processBulkIndexNote({ applyMutationResult, invoke, note })).resolves.toBe('skipped')
    expect(applyMutationResult).toHaveBeenCalledWith({
      noteId: 'note-1', previousStatus: 'outdated', nextStatus: 'not_indexed',
    })

    invoke.mockResolvedValueOnce({ data: { outcome: 'skipped', reason: 'other' }, error: null })
    await expect(processBulkIndexNote({ applyMutationResult, invoke, note })).resolves.toBe('skipped')
    invoke.mockResolvedValueOnce({ data: null, error: new Error('failed') })
    await expect(processBulkIndexNote({ applyMutationResult, invoke, note })).resolves.toBe('failed')

    let counters = { successCount: 0, skippedCount: 0, errorCount: 0 }
    counters = incrementBulkIndexCounters(counters, 'indexed')
    counters = incrementBulkIndexCounters(counters, 'skipped')
    counters = incrementBulkIndexCounters(counters, 'failed')
    expect(counters).toEqual({ successCount: 1, skippedCount: 1, errorCount: 1 })
    expect(formatBulkIndexSummary(1, 2, 3)).toBe('1 indexed • 2 skipped • 3 failed')
    expect(formatBulkIndexSummary(0, 0, 0)).toBe('')
  })
})
