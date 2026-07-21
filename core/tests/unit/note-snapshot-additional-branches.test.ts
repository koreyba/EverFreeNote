import { getUpdatedAtMs, mergeNoteFields, pickLatestNote } from '../../utils/noteSnapshot'
import type { NoteFields } from '../../utils/noteSnapshot'

const baseNote = (): NoteFields => ({
  id: 'note-1',
  title: 'Original title',
  description: 'Original body',
  tags: ['original'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  user_id: 'user-1',
})

describe('note snapshot additional branches', () => {
  it('treats missing, empty, null and invalid dates as older than every valid date', () => {
    const missingDate = {}
    const emptyDate = { updated_at: '' }
    const nullDate = { updated_at: null }
    const invalidDate = { updated_at: 'not-a-date' }

    expect(getUpdatedAtMs()).toBe(Number.NEGATIVE_INFINITY)
    for (const candidate of [missingDate, emptyDate, nullDate, invalidDate]) {
      expect(getUpdatedAtMs(candidate)).toBe(Number.NEGATIVE_INFINITY)
    }

    const valid = { updated_at: '2026-01-01T00:00:00Z' }
    expect(getUpdatedAtMs(valid)).toBeGreaterThan(getUpdatedAtMs(invalidDate))
  })

  it('selects the latest sparse candidate while preserving identity and stable ties', () => {
    const invalid = { id: 'invalid', updated_at: 'bad' }
    const missing = { id: 'missing' }
    const latest = { id: 'latest', updated_at: '2026-02-01T00:00:00Z' }
    const sparseCandidates = [null, undefined, invalid, missing, latest]

    expect(pickLatestNote(sparseCandidates)).toBe(latest)
    expect(pickLatestNote([null, invalid, missing])).toBe(invalid)

    const firstAtTie = { id: 'first', updated_at: '2026-03-01T00:00:00Z' }
    const secondAtTie = { id: 'second', updated_at: '2026-03-01T00:00:00Z' }
    expect(pickLatestNote([firstAtTie, secondAtTie])).toBe(firstAtTie)
  })

  it('overrides explicitly present nullable fields but preserves undefined fields and identity fields', () => {
    const base = baseNote()
    const merged = mergeNoteFields(base, {
      id: 'must-not-change',
      title: undefined,
      description: null,
      tags: [],
      created_at: null,
      updated_at: null,
      user_id: null,
    } as never)

    expect(merged).not.toBe(base)
    expect(merged).toEqual({
      id: 'note-1',
      title: 'Original title',
      description: null,
      tags: [],
      created_at: null,
      updated_at: null,
      user_id: null,
    })
    expect(base).toEqual(baseNote())
  })

  it('creates a shallow copy for an empty override but returns the base for absent override', () => {
    const base = baseNote()
    const emptyOverride = mergeNoteFields(base, {})

    expect(emptyOverride).not.toBe(base)
    expect(emptyOverride).toEqual(base)
    expect(mergeNoteFields(base, undefined)).toBe(base)
    expect(mergeNoteFields(base, null as never)).toBe(base)
  })
})
