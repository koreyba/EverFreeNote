import {
  buildRagChunkText,
  buildRagEmbeddingTitle,
  getRagChunkBodyLength,
  getRagChunkBodyText,
} from '@core/rag/chunkTemplate'
import { parseRagIndexDebugChunks, parseRagIndexResult } from '@core/rag/indexResult'
import { readJsonErrorMessage, readJsonErrorPayload, readSettingsErrorMessage } from '@core/services/settingsErrorMessage'
import { getUpdatedAtMs, mergeNoteFields, pickLatestNote } from '@core/utils/noteSnapshot'

describe('core utility edge cases', () => {
  describe('RAG chunk template parsing', () => {
    it('preserves content when metadata is not separated by a blank line', () => {
      expect(getRagChunkBodyText('Body\nSection: Heading')).toBe('Body\nSection: Heading')
      expect(getRagChunkBodyText('Section: Heading\nTags: tag')).toBe('Section: Heading\nTags: tag')
      expect(getRagChunkBodyText('')).toBe('')
      expect(getRagChunkBodyLength('  Body  ')).toBe(4)
    })

    it('handles whitespace-only metadata inputs without creating metadata lines', () => {
      expect(buildRagChunkText({
        sectionHeading: '   ', tags: [' ', '\n'], chunkContent: 'Body',
        settings: { use_section_headings: true, use_tags: true },
      })).toBe('Body')
      expect(buildRagChunkText({
        sectionHeading: null, tags: [], chunkContent: '   ',
        settings: { use_section_headings: true, use_tags: true },
      })).toBe('')
      expect(buildRagEmbeddingTitle(null, { use_title: true })).toBeNull()
      expect(buildRagEmbeddingTitle('  ', { use_title: true })).toBeNull()
      expect(buildRagEmbeddingTitle('Title', { use_title: false })).toBeNull()
    })
  })

  describe('note snapshots', () => {
    it('handles invalid dates and all supported override fields', () => {
      expect(getUpdatedAtMs({ updated_at: null })).toBe(Number.NEGATIVE_INFINITY)
      expect(pickLatestNote([])).toBeUndefined()

      const base = {
        id: 'id', title: 'old', description: 'old body', tags: ['old'],
        created_at: '2026-01-01', updated_at: '2026-01-01', user_id: 'u',
      }
      const merged = mergeNoteFields(base as never, {
        title: 'new', description: 'new body', tags: ['new'], created_at: '2026-02-01',
        updated_at: '2026-02-02', user_id: 'v',
      })
      expect(merged).toMatchObject({ title: 'new', description: 'new body', tags: ['new'], created_at: '2026-02-01', updated_at: '2026-02-02', user_id: 'v' })
      expect(mergeNoteFields(base as never, null as never)).toBe(base)
    })
  })

  describe('settings error payloads', () => {
    it('returns null for unavailable or malformed JSON contexts', async () => {
      expect(await readJsonErrorPayload({})).toBeNull()
      expect(await readJsonErrorPayload({ json: jest.fn().mockResolvedValue(null) })).toBeNull()
      expect(await readJsonErrorPayload({ json: jest.fn().mockRejectedValue(new Error('bad json')) })).toBeNull()
      expect(await readJsonErrorMessage({ json: jest.fn().mockResolvedValue({ message: '  ' }) })).toBeNull()
    })

    it('maps network and service-unavailable errors while preserving ordinary errors', async () => {
      const unavailable = 'Settings service is unavailable. Make sure the local Supabase services are running, then try again.'
      await expect(readSettingsErrorMessage({ context: { json: jest.fn().mockResolvedValue({ message: 'Fetch failed' }) } }, 'fallback')).resolves.toBe(unavailable)
      await expect(readSettingsErrorMessage({ context: { json: jest.fn().mockResolvedValue({}), status: 503 } }, 'fallback')).resolves.toBe(unavailable)
      await expect(readSettingsErrorMessage({ context: { json: jest.fn().mockResolvedValue({ message: 'bad input' }) } }, 'fallback')).resolves.toBe('bad input')
      await expect(readSettingsErrorMessage(new Error('network request failed'), 'fallback')).resolves.toBe(unavailable)
      await expect(readSettingsErrorMessage(new Error('ordinary'), 'fallback')).resolves.toBe('ordinary')
      await expect(readSettingsErrorMessage({ context: {} }, 'fallback')).resolves.toBe('fallback')
    })
  })

  describe('RAG index result normalization', () => {
    it('normalizes malformed, skipped, indexed and empty results', () => {
      expect(parseRagIndexResult(null)).toMatchObject({ outcome: 'unknown', message: 'Indexing returned an empty response.' })
      expect(parseRagIndexResult({ deleted: true })).toEqual({ outcome: 'deleted', message: null, debugChunks: [] })
      expect(parseRagIndexResult({ reason: 'new_reason', message: '  skipped  ', debugChunks: [{ bad: true }] })).toMatchObject({ outcome: 'skipped', reason: null, message: 'skipped', debugChunks: [] })
      expect(parseRagIndexResult({ outcome: 'indexed', chunkCount: 2, droppedChunks: -1 })).toMatchObject({ outcome: 'indexed', chunkCount: 2, droppedChunks: 0 })
      expect(parseRagIndexResult({ chunkCount: 0, message: '' })).toMatchObject({ outcome: 'unknown', message: 'Indexing completed without creating any chunks.' })
      expect(parseRagIndexResult({ message: '' })).toMatchObject({ outcome: 'unknown', message: 'Indexing returned an unexpected response.' })
    })

    it('filters invalid debug chunks and accepts nullable metadata', () => {
      expect(parseRagIndexDebugChunks({ debugChunks: 'bad' })).toEqual([])
      const valid = { chunkIndex: 0, charOffset: 1, content: 'content', bodyContent: 'body', overlapPrefix: null, sectionHeading: null, title: null }
      expect(parseRagIndexDebugChunks({ debugChunks: [valid, { ...valid, title: 1 }] })).toEqual([valid])
    })
  })
})
