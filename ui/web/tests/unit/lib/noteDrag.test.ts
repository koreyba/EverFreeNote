import { isNoteDrag, NOTE_DRAG_TYPE, readNoteDrag } from '@ui/web/lib/noteDrag'

describe('note drag payloads', () => {
  it('accepts a note or an unsaved tab for its original owner', () => {
    expect(readNoteDrag({ getData: () => '{"version":1,"ownerId":"owner","noteId":"note"}' }, 'owner'))
      .toEqual({ version: 1, ownerId: 'owner', noteId: 'note' })
    expect(readNoteDrag({ getData: () => '{"version":1,"ownerId":"owner","tabId":"tab"}' }, 'owner')?.tabId).toBe('tab')
  })

  it.each([
    'not JSON', 'null', '{"version":2,"ownerId":"owner","noteId":"note"}',
    '{"version":1,"ownerId":"other","noteId":"note"}',
    '{"version":1,"ownerId":"owner"}', '{"version":1,"ownerId":"owner","tabId":3}',
  ])('rejects malformed, foreign, or incomplete payload %s', raw => {
    expect(readNoteDrag({ getData: () => raw }, 'owner')).toBeNull()
  })

  it('does not treat ordinary text or image drops as workspace navigation', () => {
    expect(isNoteDrag({ types: ['text/plain', 'Files'] })).toBe(false)
    expect(isNoteDrag({ types: [NOTE_DRAG_TYPE] })).toBe(true)
    expect(readNoteDrag({ getData: () => 'x'.repeat(2049) }, 'owner')).toBeNull()
  })
})
