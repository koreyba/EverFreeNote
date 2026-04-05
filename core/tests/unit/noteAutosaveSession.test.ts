import {
  resolveExternalDraftHydration,
  resolveNoteAutosaveSessionChange,
} from '@core/utils/noteAutosaveSession'

describe('noteAutosaveSession', () => {
  describe('resolveNoteAutosaveSessionChange', () => {
    it('returns unchanged when the note id stays the same', () => {
      expect(resolveNoteAutosaveSessionChange({
        previousNoteId: 'note-1',
        nextNoteId: 'note-1',
        hasPendingCreateAssignment: false,
      })).toBe('unchanged')
    })

    it('returns assigned-id when a pending create receives a real note id', () => {
      expect(resolveNoteAutosaveSessionChange({
        previousNoteId: undefined,
        nextNoteId: 'note-1',
        hasPendingCreateAssignment: true,
      })).toBe('assigned-id')
    })

    it('returns switched when moving to another note', () => {
      expect(resolveNoteAutosaveSessionChange({
        previousNoteId: 'note-1',
        nextNoteId: 'note-2',
        hasPendingCreateAssignment: false,
      })).toBe('switched')
    })

    it('treats undefined to id without a pending create as a real switch', () => {
      expect(resolveNoteAutosaveSessionChange({
        previousNoteId: undefined,
        nextNoteId: 'note-1',
        hasPendingCreateAssignment: false,
      })).toBe('switched')
    })
  })

  describe('resolveExternalDraftHydration', () => {
    const isEqual = (left: { title: string }, right: { title: string }) => left.title === right.title

    it('replaces the draft when a different note is loaded', () => {
      expect(resolveExternalDraftHydration({
        currentNoteId: 'note-1',
        incomingNoteId: 'note-2',
        currentDraft: { title: 'Draft A' },
        incomingSnapshot: { title: 'Draft B' },
        isEqual,
      })).toBe('replace-draft')
    })

    it('acknowledges same-note refreshes that match the current draft', () => {
      expect(resolveExternalDraftHydration({
        currentNoteId: 'note-1',
        incomingNoteId: 'note-1',
        currentDraft: { title: 'Current draft' },
        incomingSnapshot: { title: 'Current draft' },
        isEqual,
      })).toBe('acknowledge-external')
    })

    it('preserves the current draft when the same-note refresh is stale', () => {
      expect(resolveExternalDraftHydration({
        currentNoteId: 'note-1',
        incomingNoteId: 'note-1',
        currentDraft: { title: 'Second title' },
        incomingSnapshot: { title: 'First title' },
        isEqual,
      })).toBe('preserve-draft')
    })
  })
})
