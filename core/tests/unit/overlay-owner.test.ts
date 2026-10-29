import { applyNoteOverlay } from '@core/utils/overlay'

describe('offline overlay ownership', () => {
  it('keeps the owner of a local note without a server counterpart', () => {
    const [note] = applyNoteOverlay([], [{
      id: 'local-only', user_id: 'account-a', title: 'Offline draft',
      status: 'pending', updatedAt: '2026-01-01T00:00:00.000Z',
    }])
    expect(note.user_id).toBe('account-a')
  })
})
