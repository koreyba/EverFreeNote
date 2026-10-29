import React from 'react'
import { render, screen } from '@testing-library/react'
import type { NoteWorkspaceTab } from '@core/services/noteWorkspaceTabs'
import { SplitNotePreview } from '@ui/web/components/features/notes/SplitNotePreview'

describe('SplitNotePreview', () => {
  it('names an undescribed image in the inactive reading pane', () => {
    const body = '<p><img src="https://example.com/photo.png"><img src="https://example.com/decorative.png" alt=""></p>'
    const tab: NoteWorkspaceTab = {
      id: 'tab-1',
      noteId: 'note-1',
      note: { id: 'note-1', user_id: 'user-1', created_at: '2026-01-01', updated_at: '2026-01-01', title: 'A note', description: body, tags: [] },
      mode: 'reading',
      draft: { title: 'A note', description: body, tags: '' },
      view: { scrollTop: 0 },
      saveState: 'saved',
      saveError: null,
    }

    const { container } = render(<SplitNotePreview tab={tab} onViewSessionChange={jest.fn()} onViewScrollCapture={jest.fn()} />)
    expect(screen.getByRole('img', { name: 'Image without description' })).toBeTruthy()
    expect(container.querySelectorAll('img')[1].getAttribute('alt')).toBe('')
    expect(tab.note?.description).toBe(body)
  })
})
