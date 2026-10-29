import React from 'react'
import { NoteEditor, type NoteEditorHandle } from '../../../../ui/web/components/features/notes/NoteEditor'

type Payload = { noteId?: string; title: string; description: string; tags: string }

function EditorHarness({ description, onAutoSave, onRead }: {
  description: string
  onAutoSave: (payload: Payload) => Promise<void>
  onRead: (payload: Payload) => void
}) {
  const editorRef = React.useRef<NoteEditorHandle>(null)
  const [noteId, setNoteId] = React.useState('note-1')
  const [initialDescription, setInitialDescription] = React.useState(description)
  const [flushed, setFlushed] = React.useState(false)
  const [captured, setCaptured] = React.useState('')
  return (
    <>
      <NoteEditor ref={editorRef} noteId={noteId} initialTitle="Original title"
        initialDescription={initialDescription} initialTags="ideas" isSaving={false}
        onSave={() => {}} onRead={onRead} onAutoSave={onAutoSave} autosaveDelayMs={30000} />
      <button data-cy="flush" onClick={() => { void editorRef.current?.flushPendingSave().then(() => setFlushed(true)) }}>Flush</button>
      <button data-cy="capture" onClick={() => setCaptured(editorRef.current?.captureSession?.().draft.description ?? '')}>Capture</button>
      <button data-cy="refresh-as-html" onClick={() => setInitialDescription('<p>Original plain body</p>')}>Refresh</button>
      <button data-cy="switch-note" onClick={() => { setNoteId('note-2'); setInitialDescription('Another plain body') }}>Switch note</button>
      <div data-cy="flushed">{flushed ? 'done' : 'waiting'}</div>
      <div data-cy="captured">{captured}</div>
    </>
  )
}

function mountNote(description: string) {
  const onAutoSave = cy.stub().resolves()
  const onRead = cy.stub()
  cy.wrap(onAutoSave).as('autosave')
  cy.wrap(onRead).as('read')
  cy.mount(<EditorHarness description={description} onAutoSave={onAutoSave} onRead={onRead} />)
  cy.get('.ProseMirror').should('exist')
}

describe('unchanged note content during editor transitions', () => {
  it('does not autosave plain text merely because the editor serializes it as HTML', () => {
    mountNote('Original plain body')
    cy.get('.ProseMirror').should('contain.text', 'Original plain body')
    cy.get('[data-cy="flush"]').click()
    cy.get('[data-cy="flushed"]').should('have.text', 'done')
    cy.get('@autosave').should('not.have.been.called')
    cy.get('[data-cy="capture"]').click()
    cy.get('[data-cy="captured"]').should('have.text', 'Original plain body')
  })

  it('does not create a blank note from the editor empty paragraph', () => {
    mountNote('')
    cy.get('[data-cy="flush"]').click()
    cy.get('[data-cy="flushed"]').should('have.text', 'done')
    cy.get('@autosave').should('not.have.been.called')
  })

  it('retains plain text line breaks, symbols and Unicode through editing and reopening', () => {
    const original = 'Первая 😀  < 2 & 7 > 3\r\n\r\n\r\nПоследняя'
    const displayed = original.replaceAll('\r\n', '\n')
    mountNote(original)
    cy.get('.ProseMirror').should(($editor) => expect($editor[0].innerText).to.equal(displayed))
    cy.get('[data-cy="flush"]').click()
    cy.get('[data-cy="flushed"]').should('have.text', 'done')
    cy.get('@autosave').should('not.have.been.called')

    cy.get('.ProseMirror').click().type('{selectall}{rightarrow}!')
    cy.get('[data-cy="flush"]').click()
    cy.get('@autosave').should('have.been.calledOnce')
    cy.get('@autosave').then((spy) => {
      const saved = (spy as unknown as { firstCall: { args: [{ description: string }] } }).firstCall.args[0].description
      expect(saved).to.contain('<br><br><br>')
      mountNote(saved)
    })
    cy.get('.ProseMirror').should(($editor) => expect($editor[0].innerText).to.equal(`${displayed}!`))
    cy.get('[data-cy="flush"]').click()
    cy.get('[data-cy="flushed"]').should('have.text', 'done')
    cy.get('@autosave').should('not.have.been.called')
  })

  it('keeps the existing interpretation of ambiguous HTML entities', () => {
    mountNote('Original &amp; body')
    cy.get('.ProseMirror').should('have.text', 'Original & body')
    cy.get('[data-cy="flush"]').click()
    cy.get('[data-cy="flushed"]').should('have.text', 'done')
    cy.get('@autosave').should('not.have.been.called')
  })

  it('retains rich text and significant spaces after editing and reopening', () => {
    const original = '<p>  Before  <strong>bold</strong>  after  </p>'
    const displayed = '  Before  bold  after  '
    mountNote(original)
    cy.get('.ProseMirror').should(($editor) => expect($editor[0].innerText).to.equal(displayed))
    cy.get('.ProseMirror strong').should('have.text', 'bold')
    cy.get('.ProseMirror').click().type('{selectall}{rightarrow}!')
    cy.get('[data-cy="flush"]').click()
    cy.get('@autosave').should('have.been.calledOnce')
    cy.get('@autosave').then((spy) => {
      const saved = (spy as unknown as { firstCall: { args: [{ description: string }] } }).firstCall.args[0].description
      expect(saved).to.contain('<strong>bold</strong>')
      mountNote(saved)
    })
    cy.get('.ProseMirror').should(($editor) => expect($editor[0].innerText).to.equal(`${displayed}!`))
    cy.get('.ProseMirror strong').should('have.text', 'bold')
  })

  it('preserves unedited body bytes when only the title changes', () => {
    const original = '  Original plain body  '
    mountNote(original)
    cy.get('[aria-label="Note title"]').clear().type('Changed title')
    cy.get('[data-cy="flush"]').click()
    cy.get('[data-cy="flushed"]').should('have.text', 'done')
    cy.get('@autosave').should('have.been.calledOnce')
    cy.get('@autosave').should('have.been.calledWith', Cypress.sinon.match({
      noteId: 'note-1', title: 'Changed title', description: original, tags: 'ideas',
    }))
  })

  it('preserves source markup if only a tag changes', () => {
    const original = '<p><b>Original bold text</b></p>'
    mountNote(original)
    cy.get('button[title="Add tag"]').click()
    cy.get('input[placeholder="work, personal, ideas"]').type('work{enter}')
    cy.get('[data-cy="flush"]').click()
    cy.get('[data-cy="flushed"]').should('have.text', 'done')
    cy.get('@autosave').should('have.been.calledOnce')
    cy.get('@autosave').should('have.been.calledWith', Cypress.sinon.match({
      description: original, tags: 'work, ideas',
    }))
  })

  it('saves actual text edits as HTML', () => {
    mountNote('Original plain body')
    cy.get('.ProseMirror').click().type('{end} changed')
    cy.get('[data-cy="flush"]').click()
    cy.get('[data-cy="flushed"]').should('have.text', 'done')
    cy.get('@autosave').should('have.been.calledOnce')
    cy.get('@autosave').should('have.been.calledWith', Cypress.sinon.match({
      description: '<p>Original plain body changed</p>',
    }))
  })

  it('saves intentional formatting changes', () => {
    mountNote('Original plain body')
    cy.get('.ProseMirror').click().type('{selectall}')
    cy.get('[data-cy="bold-button"]').click()
    cy.get('[data-cy="flush"]').click()
    cy.get('[data-cy="flushed"]').should('have.text', 'done')
    cy.get('@autosave').should('have.been.calledOnce')
    cy.get('@autosave').should('have.been.calledWith', Cypress.sinon.match({
      description: '<p><strong>Original plain body</strong></p>',
    }))
  })

  it('keeps undo and redo meaningful against the original body', () => {
    mountNote('Original plain body')
    cy.get('.ProseMirror').click().type('{selectall}')
    cy.get('[data-cy="bold-button"]').click()
    cy.get('.ProseMirror strong').should('exist')
    cy.get('[data-cy="undo-button"]').click()
    cy.get('.ProseMirror strong').should('not.exist')
    cy.get('[data-cy="flush"]').click()
    cy.get('[data-cy="flushed"]').should('have.text', 'done')
    cy.get('@autosave').should('not.have.been.called')
    cy.get('[data-cy="redo-button"]').click()
    cy.get('.ProseMirror strong').should('exist')
    cy.get('[data-cy="flush"]').click()
    cy.get('@autosave').should('have.been.calledOnce')
    cy.get('@autosave').should('have.been.calledWith', Cypress.sinon.match({
      description: '<p><strong>Original plain body</strong></p>',
    }))
  })

  it('passes the unchanged body to the read transition', () => {
    mountNote('Original plain body')
    cy.get('[data-cy="note-read-button"]').click()
    cy.get('@read').should('have.been.calledOnce')
    cy.get('@read').should('have.been.calledWith', Cypress.sinon.match({
      description: 'Original plain body',
    }))
  })

  it('resets the source serialization when switching to another note', () => {
    mountNote('Original plain body')
    cy.get('[data-cy="switch-note"]').click()
    cy.get('.ProseMirror').should('contain.text', 'Another plain body')
    cy.get('[data-cy="capture"]').click()
    cy.get('[data-cy="captured"]').should('have.text', 'Another plain body')
    cy.get('[data-cy="flush"]').click()
    cy.get('[data-cy="flushed"]').should('have.text', 'done')
    cy.get('@autosave').should('not.have.been.called')
  })

  it('adopts an equivalent external HTML representation without a phantom revert', () => {
    mountNote('Original plain body')
    cy.get('[data-cy="refresh-as-html"]').click()
    cy.get('[data-cy="capture"]').click()
    cy.get('[data-cy="captured"]').should('have.text', '<p>Original plain body</p>')
    cy.get('[data-cy="flush"]').click()
    cy.get('[data-cy="flushed"]').should('have.text', 'done')
    cy.get('@autosave').should('not.have.been.called')
  })
})
