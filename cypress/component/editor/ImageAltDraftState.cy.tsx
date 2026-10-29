import React from 'react'
import '../../../app/globals.css'
import { NoteEditor, type NoteEditorHandle } from '../../../ui/web/components/features/notes/NoteEditor'

const image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
const original = `<p>before <img src="${image}"> between <img src="${image}" alt="Original" width="96" height="64"> after</p>`

describe('Image description and saved draft state', { retries: 0 }, () => {
  it('stays clean after saving an image description while a different image has a view-only name', () => {
    const ref = React.createRef<NoteEditorHandle>()
    const saves: Array<{ title: string; description: string; tags: string }> = []
    function Wrapper() {
      const [, rerender] = React.useState(0)
      return <><button data-cy="rerender" onClick={() => rerender((value) => value + 1)}>Rerender</button><NoteEditor ref={ref} noteId="synthetic" initialTitle="Images" initialDescription={original} initialTags="qa" isSaving={false}
        onRead={cy.stub()} onAutoSave={async () => undefined} autosaveDelayMs={10000}
        onSave={async (data) => { saves.push(data); return true }} /></>
    }
    cy.viewport(390, 800)
    cy.mount(<Wrapper />)
    cy.get('.tiptap img').first().should('have.attr', 'alt', 'Image without description')
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"] select').select('1')
    cy.get('[role="dialog"] textarea').clear().type('Updated description')
    cy.contains('[role="dialog"] button', 'Save').click()
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.get('[data-cy="note-save-button"]').click()
    cy.wrap(null).should(() => {
      expect(saves).to.have.length(1)
      expect(saves[0].description).to.contain('alt="Updated description"')
      expect(saves[0].description).not.to.contain('Image without description')
      expect(ref.current?.hasUnconfirmedChanges?.(), JSON.stringify(ref.current?.captureSession?.().draft)).to.equal(false)
    })
    cy.then(() => {
      const draft = ref.current?.captureSession?.().draft.description ?? ''
      expect(draft).not.to.contain('Image without description')
      const doc = new DOMParser().parseFromString(draft, 'text/html')
      const images = doc.querySelectorAll('img')
      expect(images).to.have.length(2)
      expect(images[0].hasAttribute('alt')).to.equal(false)
      expect(images[1].getAttribute('alt')).to.equal('Updated description')
      expect(images[1].getAttribute('width')).to.equal('96')
      expect(images[1].getAttribute('height')).to.equal('64')
    })
    cy.get('[data-cy="rerender"]').click()
    cy.get('.tiptap img').eq(1).should('have.attr', 'alt', 'Updated description')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
    cy.get('.tiptap').focus().type('{selectall}', { force: true }).then(($editor) => {
      const data = new DataTransfer()
      const event = new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true })
      $editor[0].dispatchEvent(event)
      const copied = data.getData('text/html')
      expect(copied).not.to.contain('Image without description')
      const images = new DOMParser().parseFromString(copied, 'text/html').querySelectorAll('img')
      expect(images).to.have.length(2)
      expect(images[0].hasAttribute('alt')).to.equal(false)
      expect(images[1].getAttribute('alt')).to.equal('Updated description')
      expect(images[1].getAttribute('width')).to.equal('96')
      expect(images[1].getAttribute('height')).to.equal('64')
    })
    cy.get('[data-cy="undo-button"]').click({ force: true })
    cy.get('.tiptap img').eq(1).should('have.attr', 'alt', 'Original')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.get('[data-cy="redo-button"]').click({ force: true })
    cy.get('.tiptap img').eq(1).should('have.attr', 'alt', 'Updated description')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
    cy.get('[aria-label="Note title"]').type(' unsaved')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
  })

  it('clears the warning for a saved title even when the session props stay frozen', () => {
    const ref = React.createRef<NoteEditorHandle>()
    const onSave = cy.stub().resolves(true)
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Before" initialDescription="<p>Body</p>" initialTags="" isSaving={false}
      onRead={cy.stub()} onAutoSave={async () => undefined} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('After')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.get('[data-cy="note-save-button"]').click()
    cy.wrap(onSave).should('have.been.calledOnce')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

  it('keeps new input dirty while an older save is in flight and saves the latest draft', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finish!: (saved: boolean) => void
    const onSave = cy.stub().callsFake(() => new Promise<boolean>((resolve) => { finish = resolve }))
    const onAutoSave = cy.stub().resolves()
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Before" initialDescription="<p>Body</p>" initialTags="" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('First')
    cy.get('[data-cy="note-save-button"]').click()
    cy.wrap(onSave).should('have.been.calledOnce')
    cy.get('[aria-label="Note title"]').clear().type('Second')
    cy.then(() => finish(true))
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.then(() => ref.current?.flushPendingSave())
    cy.wrap(onAutoSave).should('have.been.calledWithMatch', { title: 'Second', description: '<p>Body</p>' })
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
    cy.get('[aria-label="Note title"]').should('have.value', 'Second')
  })

  it('keeps a failed manual save dirty and retries the same draft', () => {
    const ref = React.createRef<NoteEditorHandle>()
    const onAutoSave = cy.stub().resolves()
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Before" initialDescription="<p>Body</p>" initialTags="" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={async () => false} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Unsaved')
    cy.get('[data-cy="note-save-button"]').click()
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.then(() => ref.current?.flushPendingSave())
    cy.wrap(onAutoSave).should('have.been.calledWithMatch', { title: 'Unsaved' })
  })

  it('does not confirm an old note after switching to another note', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finish!: (saved: boolean) => void
    function Wrapper() {
      const [note, setNote] = React.useState('A')
      return <>
        <button data-cy="switch-note" onClick={() => setNote('B')}>Switch</button>
        <NoteEditor ref={ref} noteId={note} initialTitle={note} initialDescription={`<p>${note} body</p>`} isSaving={false}
          onRead={cy.stub()} onAutoSave={async () => undefined} onSave={() => new Promise<boolean>((resolve) => { finish = resolve })} autosaveDelayMs={10000} />
      </>
    }
    cy.mount(<Wrapper />)
    cy.get('[aria-label="Note title"]').clear().type('A changed')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[data-cy="switch-note"]').click()
    cy.get('[aria-label="Note title"]').should('have.value', 'B').clear().type('B unsaved')
    cy.then(() => finish(true))
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.get('[aria-label="Note title"]').should('have.value', 'B unsaved')
  })

  it('does not confirm a save after the account session changes', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let session = { userId: 'A', epoch: 1 }
    let finish!: (saved: boolean) => void
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Before" initialDescription="<p>Body</p>" isSaving={false}
      getSessionSnapshot={() => session} onRead={cy.stub()} onAutoSave={async () => undefined}
      onSave={() => new Promise<boolean>((resolve) => { finish = resolve })} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Unsaved')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => { session = { userId: 'B', epoch: 2 }; finish(true) })
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
  })

  for (const olderAutosaveFinishesFirst of [true, false]) {
    it(`keeps the newer manual save confirmed when an older autosave finishes ${olderAutosaveFinishesFirst ? 'before' : 'after'} it`, () => {
      const ref = React.createRef<NoteEditorHandle>()
      let finishAuto!: () => void
      let finishManual!: (saved: boolean) => void
      const onAutoSave = cy.stub().callsFake(() => new Promise<void>((resolve) => { finishAuto = resolve }))
      const onSave = cy.stub().callsFake(() => new Promise<boolean>((resolve) => { finishManual = resolve }))
      cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
        onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
      cy.get('[aria-label="Note title"]').clear().type('Older')
      cy.then(() => { void ref.current?.flushPendingSave() })
      cy.wrap(onAutoSave).should('have.been.calledOnce')
      cy.get('[aria-label="Note title"]').clear().type('Newer')
      cy.get('[data-cy="note-save-button"]').click()
      cy.wrap(onSave).should('have.been.calledOnce')
      if (olderAutosaveFinishesFirst) {
        cy.then(() => finishAuto())
        cy.wait(20)
        cy.then(() => finishManual(true))
      } else {
        cy.then(() => finishManual(true))
        cy.wait(20)
        cy.then(() => finishAuto())
      }
      cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
      cy.get('[aria-label="Note title"]').should('have.value', 'Newer')
    })
  }

  it('keeps a newer in-flight autosave dirty until it succeeds', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finishAuto!: () => void
    let finishManual!: (saved: boolean) => void
    const onAutoSave = cy.stub().callsFake(() => new Promise<void>((resolve) => { finishAuto = resolve }))
    const onSave = cy.stub().callsFake(() => new Promise<boolean>((resolve) => { finishManual = resolve }))
    cy.mount(<NoteEditor ref={ref} noteId="synthetic" initialTitle="Original" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} onSave={onSave} autosaveDelayMs={10000} />)
    cy.get('[aria-label="Note title"]').clear().type('Manual')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('New autosave')
    cy.then(() => { void ref.current?.flushPendingSave() })
    cy.wrap(onAutoSave).should('have.been.calledOnce')
    cy.then(() => finishManual(true))
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.then(() => finishAuto())
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
    cy.get('[aria-label="Note title"]').should('have.value', 'New autosave')
  })

  it('keeps new input when a manual save assigns an ID to a new note', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finish!: () => void
    const onAutoSave = cy.stub().resolves()
    function Wrapper() {
      const [state, setState] = React.useState({ id: undefined as string | undefined, title: '', description: '<p>Body</p>' })
      return <NoteEditor ref={ref} noteId={state.id} initialTitle={state.title} initialDescription={state.description} isSaving={false}
        onRead={cy.stub()} onAutoSave={onAutoSave} autosaveDelayMs={10000}
        onSave={(data) => new Promise<{ noteId: string }>((resolve) => { finish = () => { setState({ id: 'created', title: data.title, description: data.description }); resolve({ noteId: 'created' }) } })} />
    }
    cy.mount(<Wrapper />)
    cy.get('[aria-label="Note title"]').type('Created')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').type(' newer')
    cy.then(() => finish())
    cy.wait(100)
    cy.get('[aria-label="Note title"]').should('have.value', 'Created newer')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.then(() => ref.current?.flushPendingSave())
    cy.wrap(onAutoSave).should('have.been.calledWithMatch', { noteId: 'created', title: 'Created newer' })
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })

  it('keeps newer input when a manual create fails', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finish!: (saved: boolean) => void
    const onAutoSave = cy.stub().resolves()
    cy.mount(<NoteEditor ref={ref} initialTitle="" initialDescription="<p>Body</p>" isSaving={false}
      onRead={cy.stub()} onAutoSave={onAutoSave} autosaveDelayMs={10000}
      onSave={() => new Promise<boolean>((resolve) => { finish = resolve })} />)
    cy.get('[aria-label="Note title"]').type('Created')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').type(' newer')
    cy.then(() => finish(false))
    cy.wait(100)
    cy.get('[aria-label="Note title"]').should('have.value', 'Created newer')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(true))
    cy.then(() => ref.current?.flushPendingSave())
    cy.wrap(onAutoSave).should('have.been.calledWithMatch', { title: 'Created newer' })
  })

  it('does not let an older automatic create replace a later manual create draft', () => {
    const ref = React.createRef<NoteEditorHandle>()
    let finishAuto!: () => void
    let finishManual!: () => void
    function Wrapper() {
      const [state, setState] = React.useState({ id: undefined as string | undefined, title: '', description: '<p>Body</p>' })
      return <NoteEditor ref={ref} noteId={state.id} initialTitle={state.title} initialDescription={state.description} isSaving={false}
        onRead={cy.stub()} autosaveDelayMs={10000}
        onAutoSave={(data) => new Promise<{ noteId: string }>((resolve) => { finishAuto = () => { setState({ id: 'created', title: data.title, description: data.description }); resolve({ noteId: 'created' }) } })}
        onSave={(data) => new Promise<{ noteId: string }>((resolve) => { finishManual = () => { setState({ id: 'created', title: data.title, description: data.description }); resolve({ noteId: 'created' }) } })} />
    }
    cy.mount(<Wrapper />)
    cy.get('[aria-label="Note title"]').type('Earlier')
    cy.then(() => { void ref.current?.flushPendingSave() })
    cy.wrap(null).should(() => expect(finishAuto).to.be.a('function'))
    cy.get('[aria-label="Note title"]').clear().type('Later')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => finishAuto())
    cy.wait(100)
    cy.get('[aria-label="Note title"]').should('have.value', 'Later')
    cy.then(() => finishManual())
    cy.wait(100)
    cy.get('[aria-label="Note title"]').should('have.value', 'Later')
    cy.wrap(null).should(() => expect(ref.current?.hasUnconfirmedChanges?.()).to.equal(false))
  })
})
