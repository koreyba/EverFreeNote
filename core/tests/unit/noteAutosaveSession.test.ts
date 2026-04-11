import {
  reconcileExternalNoteSnapshot,
  resolveNoteAutosaveSessionChange,
} from '@core/utils/noteAutosaveSession'

type DraftSnapshot = {
  title: string
  description: string
  tags: string[]
}

const fields = ['title', 'description', 'tags'] as const

const comparators = {
  tags: (left: DraftSnapshot['tags'], right: DraftSnapshot['tags']) => left.join('|') === right.join('|'),
}

describe('noteAutosaveSession', () => {
  describe('resolveNoteAutosaveSessionChange', () => {
    it('returns unchanged when the note id stays the same', () => {
      expect(resolveNoteAutosaveSessionChange({
        previousNoteId: 'note-1',
        nextNoteId: 'note-1',
        pendingCreateAssignedNoteId: null,
      })).toBe('unchanged')
    })

    it('returns assigned-id when a pending create receives its assigned note id', () => {
      expect(resolveNoteAutosaveSessionChange({
        previousNoteId: undefined,
        nextNoteId: 'note-1',
        pendingCreateAssignedNoteId: 'note-1',
      })).toBe('assigned-id')
    })

    it('returns switched when moving to another note', () => {
      expect(resolveNoteAutosaveSessionChange({
        previousNoteId: 'note-1',
        nextNoteId: 'note-2',
        pendingCreateAssignedNoteId: null,
      })).toBe('switched')
    })

    it('treats undefined to id without a matching create assignment as a real switch', () => {
      expect(resolveNoteAutosaveSessionChange({
        previousNoteId: undefined,
        nextNoteId: 'note-1',
        pendingCreateAssignedNoteId: null,
      })).toBe('switched')
    })

    it('treats a different assigned note id as a real switch', () => {
      expect(resolveNoteAutosaveSessionChange({
        previousNoteId: undefined,
        nextNoteId: 'note-2',
        pendingCreateAssignedNoteId: 'note-1',
      })).toBe('switched')
    })
  })

  describe('reconcileExternalNoteSnapshot', () => {
    const draft = (overrides: Partial<DraftSnapshot> = {}): DraftSnapshot => ({
      title: 'Baseline title',
      description: '<p>Baseline body</p>',
      tags: ['baseline'],
      ...overrides,
    })

    it('fully replaces draft and baseline when a different note is loaded', () => {
      const incoming = draft({
        title: 'Incoming title',
        description: '<p>Incoming body</p>',
        tags: ['incoming'],
      })

      expect(reconcileExternalNoteSnapshot({
        currentNoteId: 'note-1',
        incomingNoteId: 'note-2',
        currentDraft: draft({ title: 'Local title' }),
        currentBaseline: draft(),
        incomingSnapshot: incoming,
        fields,
        comparators,
      })).toEqual({
        mode: 'replace-draft',
        draft: incoming,
        baseline: incoming,
        dirtyFields: [],
        fieldDecisions: {
          title: 'accept-external',
          description: 'accept-external',
          tags: 'accept-external',
        },
      })
    })

    it('accepts external updates for clean fields', () => {
      const result = reconcileExternalNoteSnapshot({
        currentNoteId: 'note-1',
        incomingNoteId: 'note-1',
        currentDraft: draft(),
        currentBaseline: draft(),
        incomingSnapshot: draft({
          title: 'Remote title',
          description: '<p>Remote body</p>',
          tags: ['remote'],
        }),
        fields,
        comparators,
      })

      expect(result.draft).toEqual({
        title: 'Remote title',
        description: '<p>Remote body</p>',
        tags: ['remote'],
      })
      expect(result.baseline).toEqual(result.draft)
      expect(result.dirtyFields).toEqual([])
      expect(result.fieldDecisions).toEqual({
        title: 'accept-external',
        description: 'accept-external',
        tags: 'accept-external',
      })
    })

    it('acknowledges dirty fields when the incoming snapshot matches the local draft', () => {
      const result = reconcileExternalNoteSnapshot({
        currentNoteId: 'note-1',
        incomingNoteId: 'note-1',
        currentDraft: draft({ title: 'Saved title' }),
        currentBaseline: draft(),
        incomingSnapshot: draft({ title: 'Saved title' }),
        fields,
        comparators,
      })

      expect(result.draft.title).toBe('Saved title')
      expect(result.baseline.title).toBe('Saved title')
      expect(result.dirtyFields).toEqual([])
      expect(result.fieldDecisions.title).toBe('acknowledge-local')
    })

    it('preserves dirty local fields while advancing the baseline to a concurrent remote change', () => {
      const result = reconcileExternalNoteSnapshot({
        currentNoteId: 'note-1',
        incomingNoteId: 'note-1',
        currentDraft: draft({ title: 'Local title' }),
        currentBaseline: draft(),
        incomingSnapshot: draft({ title: 'Remote title' }),
        fields,
        comparators,
      })

      expect(result.draft.title).toBe('Local title')
      expect(result.baseline.title).toBe('Remote title')
      expect(result.dirtyFields).toEqual(['title'])
      expect(result.fieldDecisions.title).toBe('preserve-local')
    })

    it('reconciles mixed same-note refreshes field-by-field', () => {
      const result = reconcileExternalNoteSnapshot({
        currentNoteId: 'note-1',
        incomingNoteId: 'note-1',
        currentDraft: draft({
          title: 'Local title',
          description: '<p>Saved body</p>',
          tags: ['saved', 'local'],
        }),
        currentBaseline: draft({
          title: 'Saved title',
          description: '<p>Saved body</p>',
          tags: ['saved'],
        }),
        incomingSnapshot: draft({
          title: 'Remote title',
          description: '<p>Remote body</p>',
          tags: ['saved', 'local'],
        }),
        fields,
        comparators,
      })

      expect(result.draft).toEqual({
        title: 'Local title',
        description: '<p>Remote body</p>',
        tags: ['saved', 'local'],
      })
      expect(result.baseline).toEqual({
        title: 'Remote title',
        description: '<p>Remote body</p>',
        tags: ['saved', 'local'],
      })
      expect(result.dirtyFields).toEqual(['title'])
      expect(result.fieldDecisions).toEqual({
        title: 'preserve-local',
        description: 'accept-external',
        tags: 'acknowledge-local',
      })
    })
  })
})
