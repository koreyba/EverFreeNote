import React from 'react'
import '../../../app/globals.css'
import { NoteEditor, type NoteEditorHandle } from '@ui/web/components/features/notes/NoteEditor'

describe('Manual save during a transition flush', { retries: 0 }, () => {
  it('waits for the newer manual save without starting a duplicate autosave', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finishOld!: () => void
    let finishManual!: (saved: boolean) => void
    let flush!: Promise<void>
    const oldSave = new Promise<void>(resolve => { finishOld = resolve })
    const onAutoSave = cy.stub().resolves()
    onAutoSave.onFirstCall().returns(oldSave)
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => { flush = ref.current!.flushPendingSave() })
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.wrap(onSave).should('have.been.calledOnce')
    cy.then(() => finishOld())
    // Let all microtasks from the older write run before completing manual Save.
    cy.window().then(win => new Cypress.Promise<void>(resolve => win.setTimeout(resolve, 0)))
    cy.then(() => expect(onAutoSave, 'no duplicate write for the pending manual snapshot').to.have.been.calledOnce)
    cy.then(() => finishManual(true))
    cy.then(() => flush)
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
    cy.get('[aria-label="Note title"]').should('have.value', 'Newer')
  })

  it('blocks the transition after a failed manual save and accepts an explicit retry', () => {
    const ref = React.createRef<NoteEditorHandle>()
    const releases: Array<() => void> = []
    let finishManual!: (saved: boolean) => void
    let flushResult!: Promise<string>
    const onAutoSave = cy.stub().callsFake(() => new Promise<void>(resolve => { releases.push(resolve) }))
    const onSave = cy.stub().resolves(true)
    onSave.onFirstCall().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => { flushResult = ref.current!.flushPendingSave().then(() => 'completed', (error: Error) => error.message) })
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => releases[0]())
    cy.then(() => finishManual(false))
    cy.then(() => flushResult).should('equal', 'Manual save failed')
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.get('[data-cy="note-save-button"]').click()
    cy.wrap(onSave).should('have.been.calledTwice')
    cy.then(() => ref.current!.flushPendingSave())
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

  it('keeps the draft dirty and rejects a transition when both manual save and retry fail', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finishOld!: () => void
    let finishManual!: (saved: boolean) => void
    let flushResult!: Promise<string>
    const oldSave = new Promise<void>(resolve => { finishOld = resolve })
    const onAutoSave = cy.stub().resolves()
    onAutoSave.onFirstCall().returns(oldSave)
    onAutoSave.onSecondCall().rejects(new Error('Queue unavailable'))
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => { flushResult = ref.current!.flushPendingSave().then(() => 'completed', (error: Error) => error.message) })
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => finishOld())
    cy.then(() => finishManual(false))
    cy.then(() => flushResult).should('equal', 'Manual save failed')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.get('[aria-label="Note title"]').should('have.value', 'Newer')
    cy.get('[aria-label="Note title"]').clear().type('Newest')
    cy.then(() => ref.current!.flushPendingSave().then(() => 'completed', (error: Error) => error.message)).should('equal', 'Queue unavailable')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.then(() => ref.current!.flushPendingSave())
    cy.wrap(onAutoSave).should('have.been.calledThrice')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

  it('does not treat a reverted draft as saved after an overlapping manual save fails', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finishOld!: () => void
    let finishManual!: (saved: boolean) => void
    let flushResult!: Promise<string>
    const oldSave = new Promise<void>(resolve => { finishOld = resolve })
    const onAutoSave = cy.stub().resolves()
    onAutoSave.onFirstCall().returns(oldSave)
    const onSave = cy.stub().resolves(true)
    onSave.onFirstCall().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => { flushResult = ref.current!.flushPendingSave().then(() => 'completed', () => 'failed') })
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => finishManual(false))
    cy.then(() => finishOld())
    cy.then(() => flushResult).should('equal', 'failed')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.get('[aria-label="Note title"]').should('have.value', 'Older')
    cy.get('[data-cy="note-save-button"]').click()
    cy.wrap(onSave).should('have.been.calledTwice')
    cy.then(() => ref.current!.flushPendingSave())
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

  it('rewrites a reverted draft on the next transition after a partial manual failure', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finishOld!: () => void
    let finishManual!: (saved: boolean) => void
    let flushResult!: Promise<string>
    const oldSave = new Promise<void>(resolve => { finishOld = resolve })
    const onAutoSave = cy.stub().resolves()
    onAutoSave.onFirstCall().returns(oldSave)
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => { flushResult = ref.current!.flushPendingSave().then(() => 'completed', () => 'failed') })
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => finishManual(false))
    cy.then(() => finishOld())
    cy.then(() => flushResult).should('equal', 'failed')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.then(() => ref.current!.flushPendingSave())
    cy.wrap(onAutoSave).should('have.been.calledTwice')
    cy.then(() => expect(onAutoSave.getCall(1).args[0]).to.include({ title: 'Older' }))
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

  it('keeps a failed manual create dirty when the older autosave assigns its note ID', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finishOld!: () => void
    let finishManual!: (saved: boolean) => void
    let flushResult!: Promise<string>
    let titleElement: HTMLElement
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    function Wrapper() {
      const [note, setNote] = React.useState({ id: undefined as string | undefined, title: '' })
      return <><span data-cy="assigned-note-id">{note.id ?? 'none'}</span><NoteEditor ref={ref} noteId={note.id} initialTitle={note.title} initialDescription="<p>Body</p>" isSaving={false}
        onRead={cy.stub()} onSave={onSave} autosaveDelayMs={10000}
        onAutoSave={data => new Promise<{ noteId: string }>(resolve => {
          finishOld = () => { setNote({ id: 'created', title: data.title }); resolve({ noteId: 'created' }) }
        })} /></>
    }
    cy.mount(<Wrapper />)
    cy.get('[aria-label="Note title"]').type('Older')
    cy.get('[aria-label="Note title"]').then($title => { titleElement = $title[0] })
    cy.then(() => { flushResult = ref.current!.flushPendingSave().then(() => 'completed', (error: Error) => error.message) })
    cy.wrap(null).should(() => expect(finishOld).to.be.a('function'))
    cy.get('[aria-label="Note title"]').clear().type('Newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => finishOld())
    cy.window().then(win => new Cypress.Promise<void>(resolve => win.setTimeout(resolve, 0)))
    cy.get('[data-cy="assigned-note-id"]').should('have.text', 'created')
    cy.get('[aria-label="Note title"]').should($title => expect($title[0], 'the assigned ID keeps the same editor').to.equal(titleElement))
    cy.then(() => finishManual(false))
    cy.then(() => flushResult).should('equal', 'Manual save failed')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.get('[aria-label="Note title"]').should('have.value', 'Older')
  })

  it('saves later text after the manual snapshot rather than confirming it early', () => {
    const ref = React.createRef<NoteEditorHandle>()
    const releases: Array<() => void> = []
    let finishManual!: (saved: boolean) => void
    let flush!: Promise<void>
    const onAutoSave = cy.stub().callsFake(() => new Promise<void>(resolve => { releases.push(resolve) }))
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => { flush = ref.current!.flushPendingSave() })
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Manual')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Latest')
    cy.then(() => releases[0]())
    cy.wrap(onAutoSave).should('have.been.calledTwice')
    cy.then(() => expect(onAutoSave.getCall(1).args[0]).to.include({ title: 'Latest' }))
    cy.then(() => finishManual(true))
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.then(() => releases[1]())
    cy.then(() => flush)
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

  it('starts a newer text autosave immediately even while an earlier manual save is pending', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finishManual!: (saved: boolean) => void
    let finishAuto!: () => void
    let flush!: Promise<void>
    const onAutoSave = cy.stub().callsFake(() => new Promise<void>(resolve => { finishAuto = resolve }))
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={60000} />)
    cy.get('[aria-label="Note title"]').clear().type('Manual')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Newer')
    cy.then(() => { flush = ref.current!.flushPendingSave() })
    cy.wrap(onAutoSave, { timeout: 2000 }).should('have.been.calledOnce')
    cy.then(() => expect(onAutoSave.getCall(0).args[0]).to.include({ title: 'Newer' }))
    cy.then(() => finishManual(true))
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.then(() => finishAuto())
    cy.then(() => flush)
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

  it('saves a tag added after the manual snapshot before finishing the transition', () => {
    const ref = React.createRef<NoteEditorHandle>()
    const releases: Array<() => void> = []
    let finishManual!: (saved: boolean) => void
    let flush!: Promise<void>
    const onAutoSave = cy.stub().callsFake(() => new Promise<void>(resolve => { releases.push(resolve) }))
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => { flush = ref.current!.flushPendingSave() })
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Manual')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Add tag"]').click()
    cy.get('[aria-label="Add tags"]').type('late{enter}')
    cy.then(() => releases[0]())
    cy.window().then(win => new Cypress.Promise<void>(resolve => win.setTimeout(resolve, 0)))
    cy.then(() => expect(onAutoSave).to.have.been.calledOnce)
    cy.then(() => finishManual(true))
    cy.wrap(onAutoSave).should('have.been.calledTwice')
    cy.then(() => expect(onAutoSave.getCall(1).args[0]).to.include({ title: 'Manual', tags: 'late' }))
    cy.then(() => releases[1]())
    cy.then(() => flush)
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

  it('releases an awaiting transition without saving into a later unmounted session', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finishOld!: () => void
    let finishManual!: (saved: boolean) => void
    let flushResult!: Promise<string>
    const oldSave = new Promise<void>(resolve => { finishOld = resolve })
    const onAutoSave = cy.stub().resolves()
    onAutoSave.onFirstCall().returns(oldSave)
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => { flushResult = ref.current!.flushPendingSave().then(() => 'completed', () => 'cancelled') })
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => finishOld())
    cy.window().then(win => new Cypress.Promise<void>(resolve => win.setTimeout(resolve, 0)))
    cy.then(() => expect(onAutoSave).to.have.been.calledOnce)
    cy.mount(<></>)
    cy.then(() => flushResult).should('equal', 'cancelled')
    cy.then(() => finishManual(true))
    cy.then(() => expect(onAutoSave).to.have.been.calledOnce)
  })

  it('does not replay a pending manual snapshot into a different account', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finishOld!: () => void
    let finishManual!: (saved: boolean) => void
    let flushResult!: Promise<string>
    let owner = 'first'
    const oldSave = new Promise<void>(resolve => { finishOld = resolve })
    const onAutoSave = cy.stub().resolves()
    onAutoSave.onFirstCall().returns(oldSave)
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      getSessionSnapshot={() => ({ userId: owner, epoch: owner === 'first' ? 1 : 2 })}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => { flushResult = ref.current!.flushPendingSave().then(() => 'completed', () => 'cancelled') })
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => finishOld())
    cy.window().then(win => new Cypress.Promise<void>(resolve => win.setTimeout(resolve, 0)))
    cy.then(() => { owner = 'second'; finishManual(true) })
    cy.then(() => flushResult).should('equal', 'cancelled')
    cy.then(() => expect(onAutoSave).to.have.been.calledOnce)
  })

  it('waits for a manual save before Read when autosave is not configured', () => {
    let finishManual!: (saved: boolean) => void
    const onRead = cy.stub()
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.mount(<NoteEditor noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={onRead} onSave={onSave} />)
    cy.get('[aria-label="Note title"]').clear().type('Manual')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[data-cy="note-read-button"]').click()
    cy.window().then(win => new Cypress.Promise<void>(resolve => win.setTimeout(resolve, 0)))
    cy.then(() => expect(onRead).not.to.have.been.called)
    cy.then(() => finishManual(true))
    cy.wrap(onRead).should('have.been.calledOnce')
    cy.wrap(onRead).should('have.been.calledWithMatch', { title: 'Manual' })
  })

  it('does not enter Read after a failed manual save without autosave until retry succeeds', () => {
    const onRead = cy.stub()
    const onSave = cy.stub().resolves(true)
    onSave.onFirstCall().resolves(false)
    cy.mount(<NoteEditor noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={onRead} onSave={onSave} />)
    cy.get('[aria-label="Note title"]').clear().type('Manual')
    cy.get('[data-cy="note-save-button"]').click()
    cy.wrap(onSave).should('have.been.calledOnce')
    cy.window().then(win => new Cypress.Promise<void>(resolve => win.setTimeout(resolve, 0)))
    cy.get('[data-cy="note-read-button"]').click()
    cy.window().then(win => new Cypress.Promise<void>(resolve => win.setTimeout(resolve, 0)))
    cy.then(() => expect(onRead).not.to.have.been.called)
    cy.get('[data-cy="note-save-button"]').should('be.enabled').click()
    cy.wrap(onSave).should('have.been.calledTwice')
    cy.get('[data-cy="note-read-button"]').click()
    cy.wrap(onRead).should('have.been.calledOnce')
    cy.wrap(onRead).should('have.been.calledWithMatch', { title: 'Manual' })
  })

  it('keeps the synchronous void-save contract without autosave', () => {
    const onRead = cy.stub()
    cy.mount(<NoteEditor noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={onRead} onSave={() => undefined} />)
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[data-cy="note-read-button"]').click()
    cy.wrap(onRead).should('have.been.calledOnce')
    cy.wrap(onRead).should('have.been.calledWithMatch', { title: 'Original' })
  })
  it('accepts a newer durable autosave after the overlapping manual save fails', () => {
    const ref = React.createRef<NoteEditorHandle>()
    const releases: Array<() => void> = []
    let finishManual!: (saved: boolean) => void
    let flush!: Promise<void>
    const onAutoSave = cy.stub().callsFake(() => new Promise<void>(resolve => { releases.push(resolve) }))
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={60000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => { flush = ref.current!.flushPendingSave() })
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Manual')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Latest')
    cy.then(() => releases[0]())
    cy.wrap(onAutoSave).should('have.been.calledTwice')
    cy.then(() => expect(onAutoSave.getCall(1).args[0]).to.include({ title: 'Latest' }))
    cy.then(() => finishManual(false))
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.then(() => releases[1]())
    cy.then(() => flush)
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

})
