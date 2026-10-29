import React from 'react'
import { flushSync } from 'react-dom'
import '../../../../app/globals.css'
import { NoteView } from '@ui/web/components/features/notes/NoteView'
import { SplitNotePreview } from '@ui/web/components/features/notes/SplitNotePreview'

describe('Initial reader scroll when layout changes before next frame', { retries: 0 }, () => {
  let restoreFrame: (() => void) | undefined
  afterEach(() => { restoreFrame?.(); restoreFrame = undefined })

  it('uses the saved position if content grows before the first frame', () => {
    const frames: FrameRequestCallback[] = []
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      restoreFrame = () => { win.requestAnimationFrame = originalFrame }
      win.requestAnimationFrame = callback => { frames.push(callback); return 2147483647 }
    })
    const note = {
      id: 'layout-change', title: 'Loading content', description: '<p>Image placeholder</p>',
      tags: [], created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    cy.mount(<div style={{ height: 500, display: 'flex', flexDirection: 'column' }}><NoteView note={note} initialScrollTop={600} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} /></div>)
    cy.get('[data-cy="pull-to-refresh"] > div').then(($reader) => {
      const content = $reader[0].querySelector<HTMLElement>('.note-content')
      if (!content) throw new Error('Missing content')
      content.style.height = '2400px'
      const now = $reader[0].ownerDocument.defaultView?.performance.now() ?? 0
      restoreFrame?.()
      restoreFrame = undefined
      frames.forEach(callback => callback(now))
    })
    cy.get('[data-cy="pull-to-refresh"] > div').should(($reader) => {
      expect($reader[0].scrollHeight - $reader[0].clientHeight, 'content grew').to.be.greaterThan(600)
      expect($reader[0].scrollTop, 'saved position after early layout change').to.be.greaterThan(500)
    })
  })

  it('retries a partly clamped offset after its own initial scroll event', () => {
    const frames: FrameRequestCallback[] = []
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      restoreFrame = () => { win.requestAnimationFrame = originalFrame }
      win.requestAnimationFrame = callback => { frames.push(callback); return 2147483647 }
    })
    const note = {
      id: 'partial-layout', title: 'Loading content', description: '<div style="height: 600px">Loading image</div>',
      tags: [], created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    cy.mount(<div style={{ height: 500, display: 'flex', flexDirection: 'column' }}><NoteView note={note} initialScrollTop={600} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} /></div>)
    cy.get('[data-cy="pull-to-refresh"] > div').then(($reader) => {
      const reader = $reader[0]
      expect(reader.scrollTop, 'partly clamped position').to.be.greaterThan(0).and.lessThan(600)
      reader.dispatchEvent(new Event('scroll'))
      const content = reader.querySelector<HTMLElement>('.note-content')
      if (!content) throw new Error('Missing content')
      content.style.height = '2400px'
      const now = reader.ownerDocument.defaultView?.performance.now() ?? 0
      restoreFrame?.()
      restoreFrame = undefined
      frames.forEach(callback => callback(now))
    })
    cy.get('[data-cy="pull-to-refresh"] > div').should(($reader) => {
      expect($reader[0].scrollTop, 'saved position after its own scroll event').to.be.greaterThan(500)
    })
  })

  it('does not overwrite a newer scroll before its retry', () => {
    const frames: FrameRequestCallback[] = []
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      restoreFrame = () => { win.requestAnimationFrame = originalFrame }
      win.requestAnimationFrame = callback => { frames.push(callback); return 2147483647 }
    })
    const note = {
      id: 'layout-change', title: 'Loading content', description: '<p>Image placeholder</p>',
      tags: [], created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    cy.mount(<div style={{ height: 500, display: 'flex', flexDirection: 'column' }}><NoteView note={note} initialScrollTop={600} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} /></div>)
    cy.get('[data-cy="pull-to-refresh"] > div').then(($reader) => {
      const content = $reader[0].querySelector<HTMLElement>('.note-content')
      if (!content) throw new Error('Missing content')
      content.style.height = '2400px'
    }).scrollTo(0, 300)
    cy.get('[data-cy="pull-to-refresh"] > div').should(($reader) => {
      expect($reader[0].scrollTop, 'new position before retry').to.equal(300)
    }).then(($reader) => {
      const now = $reader[0].ownerDocument.defaultView?.performance.now() ?? 0
      restoreFrame?.()
      restoreFrame = undefined
      frames.forEach(callback => callback(now))
    })
    cy.get('[data-cy="pull-to-refresh"] > div').should(($reader) => {
      expect($reader[0].scrollTop, 'newer position after retry').to.equal(300)
    })
  })

  it('preserves a wheel interaction when scroll moves away and back before its retry', () => {
    const frames: FrameRequestCallback[] = []
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      restoreFrame = () => { win.requestAnimationFrame = originalFrame }
      win.requestAnimationFrame = callback => { frames.push(callback); return 2147483647 }
    })
    const note = {
      id: 'layout-change', title: 'Loading content', description: '<p>Image placeholder</p>',
      tags: [], created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    cy.mount(<div style={{ height: 500, display: 'flex', flexDirection: 'column' }}><NoteView note={note} initialScrollTop={600} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} /></div>)
    cy.get('[data-cy="pull-to-refresh"] > div').then(($reader) => {
      const content = $reader[0].querySelector<HTMLElement>('.note-content')
      if (!content) throw new Error('Missing content')
      content.style.height = '2400px'
      $reader[0].dispatchEvent(new WheelEvent('wheel', { deltaY: 300, bubbles: true }))
    }).scrollTo(0, 300)
    cy.get('[data-cy="pull-to-refresh"] > div').should(($reader) => {
      expect($reader[0].scrollTop, 'new position before retry').to.equal(300)
    }).then(($reader) => {
      const reader = $reader[0]
      reader.scrollTop = 0
      reader.dispatchEvent(new Event('scroll'))
      const now = reader.ownerDocument.defaultView?.performance.now() ?? 0
      restoreFrame?.()
      restoreFrame = undefined
      frames.forEach(callback => callback(now))
    })
    cy.get('[data-cy="pull-to-refresh"] > div').should(($reader) => {
      expect($reader[0].scrollTop, 'position after scrolling back and retry').to.equal(0)
    })
  })

  it('does not overwrite scroll after a native navigation key', () => {
    const frames: FrameRequestCallback[] = []
    const keys: Array<{ key: string; trusted: boolean }> = []
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      const captureKey = (event: KeyboardEvent) => { keys.push({ key: event.key, trusted: event.isTrusted }) }
      win.document.addEventListener('keydown', captureKey)
      restoreFrame = () => { win.requestAnimationFrame = originalFrame; win.document.removeEventListener('keydown', captureKey) }
      win.requestAnimationFrame = callback => { frames.push(callback); return 2147483647 }
    })
    const note = {
      id: 'keyboard-scroll', title: 'Loading content', description: '<p>Image placeholder</p>',
      tags: [], created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    cy.mount(<div style={{ height: 500, display: 'flex', flexDirection: 'column' }}><NoteView note={note} initialScrollTop={600} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} /></div>)
    cy.get('[data-cy="pull-to-refresh"] > div').then(($reader) => {
      const reader = $reader[0]
      const content = reader.querySelector<HTMLElement>('.note-content')
      if (!content) throw new Error('Missing content')
      content.style.height = '2400px'
      reader.tabIndex = 0
      reader.focus({ preventScroll: true })
    }).should('have.focus')
    cy.press(Cypress.Keyboard.Keys.END)
    cy.then(() => { expect(keys, 'trusted native End key').to.deep.include({ key: 'End', trusted: true }) })
    cy.get('[data-cy="pull-to-refresh"] > div').then(($reader) => {
      const reader = $reader[0]
      reader.scrollTop = 300
      reader.scrollTop = 0
      const now = reader.ownerDocument.defaultView?.performance.now() ?? 0
      restoreFrame?.()
      restoreFrame = undefined
      frames.forEach(callback => callback(now))
    })
    cy.get('[data-cy="pull-to-refresh"] > div').should(($reader) => {
      expect($reader[0].scrollTop, 'position after native key and retry').to.equal(0)
    })
  })

  it('cancels a pending retry when the reader unmounts', () => {
    const requested: number[] = []
    const cancelled: number[] = []
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      const originalCancel = win.cancelAnimationFrame
      restoreFrame = () => { win.requestAnimationFrame = originalFrame; win.cancelAnimationFrame = originalCancel }
      win.requestAnimationFrame = () => { requested.push(2147483647); return 2147483647 }
      win.cancelAnimationFrame = id => { cancelled.push(id) }
    })
    const note = {
      id: 'layout-change', title: 'Loading content', description: '<p>Image placeholder</p>',
      tags: [], created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    cy.mount(<div style={{ height: 500, display: 'flex', flexDirection: 'column' }}><NoteView note={note} initialScrollTop={600} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} /></div>)
    cy.get('[data-cy="pull-to-refresh"] > div').should('exist')
    cy.then(() => { expect(requested, 'requested frame').to.include(2147483647) })
    cy.mount(<></>)
    cy.then(() => { expect(cancelled, 'cancelled frame').to.include(2147483647) })
  })


  it('restores and registers a preview when its note arrives for the same tab', () => {
    const longBody = Array.from({ length: 40 }, (_, index) => `<p>Paragraph ${index + 1} of a loaded note.</p>`).join('')
    const note = {
      id: 'loaded', title: 'Loaded note', description: longBody, tags: [],
      created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    const register = cy.stub().returns(() => undefined)
    const Preview = () => {
      const [loaded, setLoaded] = React.useState(false)
      const tab = {
        id: 'stable-tab', noteId: note.id, note: loaded ? note : null, mode: 'reading' as const,
        draft: { title: '', description: '', tags: '' }, view: { scrollTop: 600 },
        saveState: 'saved' as const, saveError: null,
      }
      return <div style={{ height: 500, display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => setLoaded(true)}>Load note</button>
        <SplitNotePreview tab={tab} onViewSessionChange={cy.stub()} onViewScrollCapture={cy.stub()} registerViewScrollSurface={register} />
      </div>
    }
    cy.mount(<Preview />)
    cy.contains('Choose a note').should('be.visible')
    cy.contains('Load note').click()
    cy.get('[data-cy="split-note-preview"]').should(($preview) => {
      expect($preview[0].scrollTop, 'loaded note uses its saved position').to.be.greaterThan(500)
    })
    cy.then(() => { expect(register).to.have.been.calledOnce })
  })

  it('retries a clamped preview position when hidden before the first frame', () => {
    const frames = new Map<number, FrameRequestCallback>()
    let nextId = 1
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      const originalCancel = win.cancelAnimationFrame
      restoreFrame = () => { win.requestAnimationFrame = originalFrame; win.cancelAnimationFrame = originalCancel }
      win.requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id }
      win.cancelAnimationFrame = id => { frames.delete(id) }
    })
    const note = {
      id: 'hidden-note', title: 'Loading content', description: '<p>Image placeholder</p>', tags: [],
      created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    const tab = {
      id: 'hidden-tab', noteId: note.id, note, mode: 'reading' as const,
      draft: { title: '', description: '', tags: '' }, view: { scrollTop: 600 },
      saveState: 'saved' as const, saveError: null,
    }
    const Preview = () => {
      const [visible, setVisible] = React.useState(true)
      return <>
        <button onClick={() => setVisible(value => !value)}>Toggle preview</button>
        <div style={{ height: 500, display: visible ? 'flex' : 'none', flexDirection: 'column' }}>
          <SplitNotePreview tab={tab} visible={visible} onViewSessionChange={cy.stub()} onViewScrollCapture={cy.stub()} />
        </div>
      </>
    }
    cy.mount(<Preview />)
    cy.get('[data-cy="split-note-preview"]').should('be.visible')
    cy.then(() => { expect(frames.size, 'pending restoration frame').to.be.greaterThan(0) })
    cy.contains('Toggle preview').click()
    cy.get('[data-cy="split-note-preview"]').should('not.be.visible').then(($preview) => {
      const content = $preview[0].querySelector<HTMLElement>('.note-content')
      if (!content) throw new Error('Missing content')
      content.style.height = '2400px'
    })
    cy.contains('Toggle preview').click()
    cy.get('[data-cy="split-note-preview"]').should(($preview) => {
      expect($preview[0].scrollTop, 'saved position after showing the pane').to.be.greaterThan(500)
    })
  })

  it('preserves a newer preview scroll when hidden before the first frame', () => {
    const frames = new Map<number, FrameRequestCallback>()
    let nextId = 1
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      const originalCancel = win.cancelAnimationFrame
      restoreFrame = () => { win.requestAnimationFrame = originalFrame; win.cancelAnimationFrame = originalCancel }
      win.requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id }
      win.cancelAnimationFrame = id => { frames.delete(id) }
    })
    const note = {
      id: 'hidden-note', title: 'Loading content', description: '<p>Image placeholder</p>', tags: [],
      created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    const tab = {
      id: 'hidden-tab', noteId: note.id, note, mode: 'reading' as const,
      draft: { title: '', description: '', tags: '' }, view: { scrollTop: 600 },
      saveState: 'saved' as const, saveError: null,
    }
    const Preview = () => {
      const [visible, setVisible] = React.useState(true)
      return <>
        <button onClick={() => setVisible(value => !value)}>Toggle preview</button>
        <div style={{ height: 500, display: visible ? 'flex' : 'none', flexDirection: 'column' }}>
          <SplitNotePreview tab={tab} visible={visible} onViewSessionChange={cy.stub()} onViewScrollCapture={cy.stub()} />
        </div>
      </>
    }
    cy.mount(<Preview />)
    cy.get('[data-cy="split-note-preview"]').should('be.visible')
    cy.then(() => { expect(frames.size, 'pending restoration frame').to.be.greaterThan(0) })
    cy.get('[data-cy="split-note-preview"]').then(($preview) => {
      const content = $preview[0].querySelector<HTMLElement>('.note-content')
      if (!content) throw new Error('Missing content')
      content.style.height = '2400px'
    }).scrollTo(0, 300)
    cy.get('[data-cy="split-note-preview"]').should(($preview) => {
      expect($preview[0].scrollTop, 'new position before hiding').to.equal(300)
    })
    cy.contains('Toggle preview').click()
    cy.get('[data-cy="split-note-preview"]').should('not.be.visible')
    cy.contains('Toggle preview').click()
    cy.get('[data-cy="split-note-preview"]').should(($preview) => {
      expect($preview[0].scrollTop, 'new position after showing').to.equal(300)
    })
  })

  it('retains a changed preview position when it is hidden before the scroll event', () => {
    const frames = new Map<number, FrameRequestCallback>()
    let nextId = 1
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      const originalCancel = win.cancelAnimationFrame
      restoreFrame = () => { win.requestAnimationFrame = originalFrame; win.cancelAnimationFrame = originalCancel }
      win.requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id }
      win.cancelAnimationFrame = id => { frames.delete(id) }
    })
    const note = {
      id: 'hidden-note', title: 'Loading content', description: '<p>Image placeholder</p>', tags: [],
      created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    const tab = {
      id: 'hidden-tab', noteId: note.id, note, mode: 'reading' as const,
      draft: { title: '', description: '', tags: '' }, view: { scrollTop: 600 },
      saveState: 'saved' as const, saveError: null,
    }
    const Preview = () => {
      const [visible, setVisible] = React.useState(true)
      return <>
        <button onClick={() => setVisible(value => !value)}>Toggle preview</button>
        <div style={{ height: 500, display: visible ? 'flex' : 'none', flexDirection: 'column' }}>
          <SplitNotePreview tab={tab} visible={visible} onViewSessionChange={cy.stub()} onViewScrollCapture={cy.stub()} />
        </div>
      </>
    }
    cy.mount(<Preview />)
    cy.get('[data-cy="split-note-preview"]').then(($preview) => {
      const preview = $preview[0]
      const content = preview.querySelector<HTMLElement>('.note-content')
      const toggle = preview.ownerDocument.querySelector<HTMLButtonElement>('button')
      if (!content || !toggle) throw new Error('Missing preview content or toggle')
      expect(frames.size, 'pending restore').to.be.greaterThan(0)
      content.style.height = '2400px'
      preview.scrollTop = 300
      expect(preview.scrollTop, 'before hiding').to.equal(300)
      flushSync(() => toggle.click())
      expect(preview.getClientRects().length, 'hidden').to.equal(0)
      flushSync(() => toggle.click())
      expect(preview.scrollTop, 'after showing, before any scroll event').to.equal(300)
    })
  })

  it('uses an updated session position when a hidden preview is shown', () => {
    const frames = new Map<number, FrameRequestCallback>()
    let nextId = 1
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      const originalCancel = win.cancelAnimationFrame
      restoreFrame = () => { win.requestAnimationFrame = originalFrame; win.cancelAnimationFrame = originalCancel }
      win.requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id }
      win.cancelAnimationFrame = id => { frames.delete(id) }
    })
    const note = {
      id: 'hidden-session', title: 'Loading content', description: '<p>Image placeholder</p>', tags: [],
      created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    const Preview = () => {
      const [visible, setVisible] = React.useState(true)
      const [savedScroll, setSavedScroll] = React.useState(600)
      const tab = {
        id: 'hidden-tab', noteId: note.id, note, mode: 'reading' as const,
        draft: { title: '', description: '', tags: '' }, view: { scrollTop: savedScroll },
        saveState: 'saved' as const, saveError: null,
      }
      return <>
        <button data-cy="toggle-preview" onClick={() => setVisible(value => !value)}>Toggle preview</button>
        <button data-cy="update-session" onClick={() => setSavedScroll(800)}>Update session</button>
        <div style={{ height: 500, display: visible ? 'flex' : 'none', flexDirection: 'column' }}>
          <SplitNotePreview tab={tab} visible={visible} onViewSessionChange={cy.stub()} onViewScrollCapture={cy.stub()} />
        </div>
      </>
    }
    cy.mount(<Preview />)
    cy.get('[data-cy="split-note-preview"]').then(($preview) => {
      const preview = $preview[0]
      const content = preview.querySelector<HTMLElement>('.note-content')
      const toggle = preview.ownerDocument.querySelector<HTMLButtonElement>('[data-cy="toggle-preview"]')
      const update = preview.ownerDocument.querySelector<HTMLButtonElement>('[data-cy="update-session"]')
      if (!content || !toggle || !update) throw new Error('Missing preview controls')
      expect(frames.size, 'pending restore').to.be.greaterThan(0)
      content.style.height = '2400px'
      preview.scrollTop = 300
      expect(preview.scrollTop, 'live position before hiding').to.equal(300)
      flushSync(() => toggle.click())
      flushSync(() => update.click())
      flushSync(() => toggle.click())
      expect(preview.scrollTop, 'new session position takes precedence').to.equal(800)
    })
  })

  it('retains a changed draft preview position before its scroll event', () => {
    const frames = new Map<number, FrameRequestCallback>()
    let nextId = 1
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      const originalCancel = win.cancelAnimationFrame
      restoreFrame = () => { win.requestAnimationFrame = originalFrame; win.cancelAnimationFrame = originalCancel }
      win.requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id }
      win.cancelAnimationFrame = id => { frames.delete(id) }
    })
    const tab = {
      id: 'draft-tab', noteId: null, note: null, mode: 'editing' as const,
      draft: { title: 'Unsaved draft', description: '<p>Draft text</p>', tags: '' }, view: { scrollTop: 600 },
      saveState: 'dirty' as const, saveError: null,
    }
    const Preview = () => {
      const [visible, setVisible] = React.useState(true)
      return <>
        <button onClick={() => setVisible(value => !value)}>Toggle preview</button>
        <div style={{ height: 500, display: visible ? 'flex' : 'none', flexDirection: 'column' }}>
          <SplitNotePreview tab={tab} visible={visible} onViewSessionChange={cy.stub()} onViewScrollCapture={cy.stub()} />
        </div>
      </>
    }
    cy.mount(<Preview />)
    cy.get('[data-cy="split-note-preview"]').should('contain', 'Unsaved draft').then(($preview) => {
      const preview = $preview[0]
      const content = preview.querySelector<HTMLElement>('.note-content')
      const toggle = preview.ownerDocument.querySelector<HTMLButtonElement>('button')
      if (!content || !toggle) throw new Error('Missing draft content or toggle')
      expect(frames.size, 'pending restore').to.be.greaterThan(0)
      content.style.height = '2400px'
      preview.scrollTop = 300
      expect(preview.scrollTop, 'draft position before hiding').to.equal(300)
      flushSync(() => toggle.click())
      flushSync(() => toggle.click())
      expect(preview.scrollTop, 'draft position after showing').to.equal(300)
    })
  })

  it('restores the untouched pane while keeping the other pane’s newer position', () => {
    const frames = new Map<number, FrameRequestCallback>()
    let nextId = 1
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      const originalCancel = win.cancelAnimationFrame
      restoreFrame = () => { win.requestAnimationFrame = originalFrame; win.cancelAnimationFrame = originalCancel }
      win.requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id }
      win.cancelAnimationFrame = id => { frames.delete(id) }
    })
    const note = {
      id: 'pane-note', title: 'Loading content', description: '<p>Image placeholder</p>', tags: [],
      created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    const leftTab = {
      id: 'left-tab', noteId: note.id, note, mode: 'reading' as const,
      draft: { title: '', description: '', tags: '' }, view: { scrollTop: 600 },
      saveState: 'saved' as const, saveError: null,
    }
    const rightTab = { ...leftTab, id: 'right-tab', view: { scrollTop: 900 } }
    const Preview = () => {
      const [visible, setVisible] = React.useState(true)
      return <>
        <button onClick={() => setVisible(value => !value)}>Toggle previews</button>
        <div style={{ height: 500, display: visible ? 'flex' : 'none' }}>
          <div data-cy="left-preview" style={{ display: 'flex', width: '50%' }}>
            <SplitNotePreview tab={leftTab} visible={visible} onViewSessionChange={cy.stub()} onViewScrollCapture={cy.stub()} />
          </div>
          <div data-cy="right-preview" style={{ display: 'flex', width: '50%' }}>
            <SplitNotePreview tab={rightTab} visible={visible} onViewSessionChange={cy.stub()} onViewScrollCapture={cy.stub()} />
          </div>
        </div>
      </>
    }
    cy.mount(<Preview />)
    cy.get('[data-cy="left-preview"] [data-cy="split-note-preview"]').then(($left) => {
      const left = $left[0]
      const right = left.ownerDocument.querySelector<HTMLElement>('[data-cy="right-preview"] [data-cy="split-note-preview"]')
      const toggle = left.ownerDocument.querySelector<HTMLButtonElement>('button')
      const leftContent = left.querySelector<HTMLElement>('.note-content')
      const rightContent = right?.querySelector<HTMLElement>('.note-content')
      if (!right || !toggle || !leftContent || !rightContent) throw new Error('Missing pane content or toggle')
      expect(frames.size, 'both panes have pending restores').to.be.at.least(2)
      expect(left.scrollTop, 'left position is initially clamped').to.equal(0)
      expect(right.scrollTop, 'right position is initially clamped').to.equal(0)
      leftContent.style.height = '2400px'
      rightContent.style.height = '2400px'
      left.scrollTop = 300
      expect(left.scrollTop, 'left position before hiding').to.equal(300)
      flushSync(() => toggle.click())
      flushSync(() => toggle.click())
      expect(left.scrollTop, 'left keeps its newer position').to.equal(300)
      expect(right.scrollTop, 'right restores its own position').to.equal(900)
    })
  })

  it('preserves a native wheel position when a preview is hidden and shown', () => {
    const frames = new Map<number, FrameRequestCallback>()
    const wheels: boolean[] = []
    let nextId = 1
    let userPosition = 0
    cy.window().then(win => {
      const originalFrame = win.requestAnimationFrame
      const originalCancel = win.cancelAnimationFrame
      restoreFrame = () => { win.requestAnimationFrame = originalFrame; win.cancelAnimationFrame = originalCancel }
      win.requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id }
      win.cancelAnimationFrame = id => { frames.delete(id) }
    })
    const note = {
      id: 'native-wheel', title: 'Loading content', description: '<p>Image placeholder</p>', tags: [],
      created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', user_id: 'synthetic-user',
    }
    const tab = {
      id: 'native-wheel-tab', noteId: note.id, note, mode: 'reading' as const,
      draft: { title: '', description: '', tags: '' }, view: { scrollTop: 600 },
      saveState: 'saved' as const, saveError: null,
    }
    const Preview = () => {
      const [visible, setVisible] = React.useState(true)
      return <>
        <button onClick={() => setVisible(value => !value)}>Toggle preview</button>
        <div style={{ height: 500, display: visible ? 'flex' : 'none', flexDirection: 'column' }}>
          <SplitNotePreview tab={tab} visible={visible} onViewSessionChange={cy.stub()} onViewScrollCapture={cy.stub()} />
        </div>
      </>
    }
    cy.mount(<Preview />)
    cy.get('[data-cy="split-note-preview"]').then(($preview) => {
      const preview = $preview[0]
      const content = preview.querySelector<HTMLElement>('.note-content')
      if (!content) throw new Error('Missing preview content')
      content.style.height = '2400px'
      preview.addEventListener('wheel', event => { wheels.push(event.isTrusted) })
      expect(frames.size, 'pending restore').to.be.greaterThan(0)
      const rect = preview.getBoundingClientRect()
      return Cypress.automation('remote:debugger:protocol', {
        command: 'Input.dispatchMouseEvent',
        params: { type: 'mouseWheel', x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, deltaX: 0, deltaY: 300 },
      })
    })
    cy.get('[data-cy="split-note-preview"]').should(($preview) => {
      expect(wheels, 'trusted wheel input').to.include(true)
      expect($preview[0].scrollTop, 'wheel moves the preview').to.be.greaterThan(0)
    }).then(($preview) => { userPosition = $preview[0].scrollTop })
    cy.contains('Toggle preview').click()
    cy.get('[data-cy="split-note-preview"]').should('not.be.visible')
    cy.contains('Toggle preview').click()
    cy.get('[data-cy="split-note-preview"]').should(($preview) => {
      expect($preview[0].scrollTop, 'wheel position after showing').to.equal(userPosition)
    })
  })

})
