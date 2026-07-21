import {
  formatBulkIndexSummary,
  incrementBulkIndexCounters,
  processBulkIndexNote,
} from '../../bulkIndex'
import type { AIIndexNoteRow } from '../../types/aiIndex'

const note = (id: string, status: AIIndexNoteRow['status']): AIIndexNoteRow => ({
  id,
  title: id,
  updatedAt: '2026-07-21T00:00:00.000Z',
  lastIndexedAt: null,
  status,
})

describe('bulk index additional branches', () => {
  it('formats zero counters as an empty summary', () => {
    expect(formatBulkIndexSummary(0, 0, 0)).toBe('')
  })

  it('uses the exact index/reindex payload and applies successful status mutations', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { outcome: 'indexed', chunkCount: 1 }, error: null })
    const applyMutationResult = jest.fn()

    await expect(processBulkIndexNote({
      applyMutationResult,
      invoke,
      note: note('already-indexed', 'indexed'),
    })).resolves.toBe('indexed')
    expect(invoke).toHaveBeenNthCalledWith(1, 'rag-index', {
      body: { noteId: 'already-indexed', action: 'reindex' },
    })

    await expect(processBulkIndexNote({
      applyMutationResult,
      invoke,
      note: note('new-note', 'not_indexed'),
    })).resolves.toBe('indexed')
    expect(invoke).toHaveBeenNthCalledWith(2, 'rag-index', {
      body: { noteId: 'new-note', action: 'index' },
    })
    expect(applyMutationResult).toHaveBeenNthCalledWith(1, {
      noteId: 'already-indexed', previousStatus: 'indexed', nextStatus: 'indexed',
    })
    expect(applyMutationResult).toHaveBeenNthCalledWith(2, {
      noteId: 'new-note', previousStatus: 'not_indexed', nextStatus: 'indexed',
    })
  })

  it('aggregates successful, skipped and failed results with only intended side effects', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: { outcome: 'indexed', chunkCount: 2 }, error: null })
      .mockResolvedValueOnce({ data: { outcome: 'skipped', reason: 'too_short' }, error: null })
      .mockResolvedValueOnce({ data: { outcome: 'skipped', reason: 'other' }, error: null })
      .mockResolvedValueOnce({ data: { outcome: 'deleted' }, error: null })
      .mockResolvedValueOnce({ data: { outcome: 'unknown', message: 'unexpected' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'backend failed' } })
    const applyMutationResult = jest.fn()
    const batch = [
      note('indexed', 'outdated'),
      note('too-short', 'not_indexed'),
      note('skipped', 'indexed'),
      note('deleted', 'outdated'),
      note('unknown', 'not_indexed'),
      note('failed', 'outdated'),
    ]
    let counters = { successCount: 0, skippedCount: 0, errorCount: 0 }

    const outcomes = []
    for (const currentNote of batch) {
      const outcome = await processBulkIndexNote({ applyMutationResult, invoke, note: currentNote })
      outcomes.push(outcome)
      counters = incrementBulkIndexCounters(counters, outcome)
    }

    expect(outcomes).toEqual(['indexed', 'skipped', 'skipped', 'failed', 'failed', 'failed'])
    expect(counters).toEqual({ successCount: 1, skippedCount: 2, errorCount: 3 })
    expect(formatBulkIndexSummary(counters.successCount, counters.skippedCount, counters.errorCount))
      .toBe(`1 indexed ${String.fromCodePoint(0x2022)} 2 skipped ${String.fromCodePoint(0x2022)} 3 failed`)
    expect(applyMutationResult).toHaveBeenCalledTimes(2)
    expect(applyMutationResult).toHaveBeenNthCalledWith(1, {
      noteId: 'indexed', previousStatus: 'outdated', nextStatus: 'indexed',
    })
    expect(applyMutationResult).toHaveBeenNthCalledWith(2, {
      noteId: 'too-short', previousStatus: 'not_indexed', nextStatus: 'not_indexed',
    })
  })

  it('turns thrown invocations and truthy backend errors into failed outcomes without mutation', async () => {
    const invoke = jest.fn()
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValueOnce({ data: { outcome: 'indexed', chunkCount: 1 }, error: { message: 'rejected' } })
    const applyMutationResult = jest.fn()
    const currentNote = note('failed-note', 'outdated')

    await expect(processBulkIndexNote({ applyMutationResult, invoke, note: currentNote })).resolves.toBe('failed')
    await expect(processBulkIndexNote({ applyMutationResult, invoke, note: currentNote })).resolves.toBe('failed')
    expect(applyMutationResult).not.toHaveBeenCalled()
  })
})
