import { getUpdatedAtMs, mergeNoteFields, pickLatestNote, type NoteFields } from '@core/utils/noteSnapshot'

describe('core/utils/noteSnapshot', () => {
  it('returns negative infinity for missing or invalid updated_at', () => {
    expect(getUpdatedAtMs()).to.equal(Number.NEGATIVE_INFINITY)
    expect(getUpdatedAtMs({ updated_at: null })).to.equal(Number.NEGATIVE_INFINITY)
    expect(getUpdatedAtMs({ updated_at: 'not-a-date' })).to.equal(Number.NEGATIVE_INFINITY)
  })

  it('parses valid updated_at values', () => {
    const timestamp = getUpdatedAtMs({ updated_at: '2024-01-02T10:00:00Z' })
    expect(Number.isNaN(timestamp)).to.equal(false)
    expect(timestamp).to.be.greaterThan(0)
  })

  it('picks the latest updated note from candidates', () => {
    const older = { updated_at: '2024-01-01T00:00:00Z', value: 'old' }
    const newer = { updated_at: '2024-01-02T00:00:00Z', value: 'new' }

    const result = pickLatestNote([older, newer])

    expect(result).to.equal(newer)
  })

  it('ignores empty candidates when picking latest note', () => {
    const newer = { updated_at: '2024-01-02T00:00:00Z', value: 'new' }
    const result = pickLatestNote([undefined, null, newer])
    expect(result).to.equal(newer)
  })

  it('returns undefined when no candidates exist', () => {
    expect(pickLatestNote([])).to.equal(undefined)
    expect(pickLatestNote([undefined, null])).to.equal(undefined)
  })

  it('merges only defined note fields', () => {
    const base = {
      id: 'note-1',
      title: 'Base title',
      description: 'Base description',
      tags: ['alpha'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_id: 'user-1',
    } satisfies NoteFields

    const merged = mergeNoteFields(base, {
      title: 'Updated title',
      tags: ['beta'],
      updated_at: '2024-01-02T00:00:00Z',
    })

    expect(merged.title).to.equal('Updated title')
    expect(merged.tags).to.deep.equal(['beta'])
    expect(merged.updated_at).to.equal('2024-01-02T00:00:00Z')
    expect(merged.description).to.equal('Base description')
    expect(merged.created_at).to.equal('2024-01-01T00:00:00Z')
    expect(merged.user_id).to.equal('user-1')
  })

  it('does not override fields with undefined', () => {
    const base = {
      id: 'note-1',
      title: 'Base title',
      description: 'Base description',
      tags: ['alpha'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_id: 'user-1',
    } satisfies NoteFields

    const merged = mergeNoteFields(base, {
      title: undefined,
      description: undefined,
    })

    expect(merged.title).to.equal('Base title')
    expect(merged.description).to.equal('Base description')
  })
})
