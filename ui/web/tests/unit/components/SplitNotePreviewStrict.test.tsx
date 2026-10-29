import React from 'react'
import { act, render } from '@testing-library/react'
import { SplitNotePreview } from '@ui/web/components/features/notes/SplitNotePreview'

describe('SplitNotePreview under StrictMode', () => {
  it('restores a clamped position after the initial effect cleanup', () => {
    let hasLayout = false
    let scrollTop = 0
    let nextFrame = 1
    const frames = new Map<number, FrameRequestCallback>()
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop')
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => { scrollTop = hasLayout ? value : 0 },
    })
    const request = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      const id = nextFrame++
      frames.set(id, callback)
      return id
    })
    const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    const register = jest.fn(() => () => undefined)
    const note = {
      id: 'strict-note', title: 'Note', description: '<p>Loading content</p>', tags: [],
      created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    const tab = {
      id: 'strict-tab', noteId: note.id, note, mode: 'reading' as const,
      draft: { title: '', description: '', tags: '' }, view: { scrollTop: 600 },
      saveState: 'saved' as const, saveError: null,
    }

    try {
      const { unmount } = render(<React.StrictMode>
        <SplitNotePreview tab={tab} onViewSessionChange={() => undefined} onViewScrollCapture={() => undefined} registerViewScrollSurface={register} />
      </React.StrictMode>)
      expect(register).toHaveBeenCalledTimes(2)
      expect(frames.size).toBe(1)
      hasLayout = true
      act(() => { for (const callback of frames.values()) callback(0) })
      expect(scrollTop).toBe(600)
      unmount()
    } finally {
      request.mockRestore()
      cancel.mockRestore()
      if (originalDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollTop', originalDescriptor)
      else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTop')
    }
  })
})
