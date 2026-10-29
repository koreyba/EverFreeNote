import React from 'react'
import '../../../app/globals.css'
import { NoteEditor, type NoteEditorHandle } from '@ui/web/components/features/notes/NoteEditor'
import { toast } from 'sonner'

describe('Failed older autosave and later manual save', { retries: 0 }, () => {
  it('does not retry an older failed payload after a newer manual save succeeds', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let rejectOld!: (error: Error) => void
    let finishManual!: (saved: boolean) => void
    const oldSave = new Promise<void>((_resolve, reject) => { rejectOld = reject })
    const onAutoSave = cy.stub().resolves()
    onAutoSave.onFirstCall().returns(oldSave)
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.stub(toast, 'error').as('autoError')
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.tick(10000)
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Manual newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => rejectOld(new Error('old write failed')))
    cy.get('@autoError').should('have.been.calledWith', 'Auto-save failed. Your changes will retry.')
    cy.then(() => finishManual(true))
    cy.then(() => onSave.getCall(0).returnValue)
    cy.tick(10000)
    cy.then(() => expect(onAutoSave, 'older payload must not be retried').to.have.been.calledOnce)
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

  it('keeps a genuinely newer edit after the older autosave fails and manual save succeeds', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let rejectOld!: (error: Error) => void
    let finishManual!: (saved: boolean) => void
    const oldSave = new Promise<void>((_resolve, reject) => { rejectOld = reject })
    const onAutoSave = cy.stub().resolves()
    onAutoSave.onFirstCall().returns(oldSave)
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.stub(toast, 'error').as('autoError')
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.tick(10000)
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Manual newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Latest')
    cy.then(() => rejectOld(new Error('old write failed')))
    cy.get('@autoError').should('have.been.calledWith', 'Auto-save failed. Your changes will retry.')
    cy.then(() => finishManual(true))
    cy.then(() => onSave.getCall(0).returnValue)
    cy.tick(10000)
    cy.wrap(onAutoSave).should('have.been.calledTwice')
    cy.then(() => expect(onAutoSave.getCall(1).args[0]).to.include({ title: 'Latest' }))
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })
  it('does not retry an older autosave which fails after the newer manual save', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let rejectOld!: (error: Error) => void
    let finishManual!: (saved: boolean) => void
    const oldSave = new Promise<void>((_resolve, reject) => { rejectOld = reject })
    const onAutoSave = cy.stub().resolves()
    onAutoSave.onFirstCall().returns(oldSave)
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.stub(toast, 'error').as('autoError')
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.tick(10000)
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Manual newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => finishManual(true))
    cy.then(() => onSave.getCall(0).returnValue)
    cy.then(() => rejectOld(new Error('old write failed')))
    cy.get('@autoError').should('have.been.calledWith', 'Auto-save failed. Your changes will retry.')
    cy.tick(10000)
    cy.then(() => expect(onAutoSave, 'older failed payload must not be retried').to.have.been.calledOnce)
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

  it('preserves an intentional return to the old value after the manual snapshot', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let rejectOld!: (error: Error) => void
    let finishManual!: (saved: boolean) => void
    const oldSave = new Promise<void>((_resolve, reject) => { rejectOld = reject })
    const onAutoSave = cy.stub().resolves()
    onAutoSave.onFirstCall().returns(oldSave)
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.stub(toast, 'error').as('autoError')
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.tick(10000)
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Manual newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.then(() => rejectOld(new Error('old write failed')))
    cy.get('@autoError').should('have.been.calledWith', 'Auto-save failed. Your changes will retry.')
    cy.then(() => finishManual(true))
    cy.then(() => onSave.getCall(0).returnValue)
    cy.tick(10000)
    cy.wrap(onAutoSave).should('have.been.calledTwice')
    cy.then(() => expect(onAutoSave.getCall(1).args[0]).to.include({ title: 'Older' }))
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

  it('keeps a later tag when an older autosave failure is superseded', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let rejectOld!: (error: Error) => void
    let finishManual!: (saved: boolean) => void
    const oldSave = new Promise<void>((_resolve, reject) => { rejectOld = reject })
    const onAutoSave = cy.stub().resolves()
    onAutoSave.onFirstCall().returns(oldSave)
    const onSave = cy.stub().callsFake(() => new Promise<boolean>(resolve => { finishManual = resolve }))
    cy.stub(toast, 'error').as('autoError')
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Older')
    cy.tick(10000)
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Manual newer')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Add tag"]').click()
    cy.get('[aria-label="Add tags"]').type('late{enter}')
    cy.then(() => rejectOld(new Error('old write failed')))
    cy.get('@autoError').should('have.been.calledWith', 'Auto-save failed. Your changes will retry.')
    cy.then(() => finishManual(true))
    cy.then(() => onSave.getCall(0).returnValue)
    cy.tick(10000)
    cy.wrap(onAutoSave).should('have.been.calledTwice')
    cy.then(() => expect(onAutoSave.getCall(1).args[0]).to.include({ title: 'Manual newer', tags: 'late' }))
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })
})
