import React from 'react'
import '../../../../app/globals.css'
import { NoteView } from '@ui/web/components/features/notes/NoteView'
import { NoteEditor } from '@ui/web/components/features/notes/NoteEditor'

const body = '<p>First needle and nee<strong>dle</strong>.</p><p>Third NEEDLE.</p>'
const note = {
  id: 'find-note', title: 'Needle title', description: body, tags: [],
  created_at: '2026-10-28T00:00:00Z', updated_at: '2026-10-28T00:00:00Z', user_id: 'test-user',
}

describe('Find inside a mobile note', () => {
  let highlightDescriptor: PropertyDescriptor | undefined
  beforeEach(() => cy.viewport(390, 844))
  afterEach(() => {
    if (highlightDescriptor) {
      const descriptor = highlightDescriptor
      highlightDescriptor = undefined
      cy.window().then((win) => { Object.defineProperty(win.CSS, 'highlights', descriptor) })
    }
  })

  it('finds title and formatted text in reading mode and navigates through matches', () => {
    cy.mount(<div style={{ height: 800, display: 'flex' }}>
      <NoteView note={note} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} onBack={cy.stub()} />
    </div>)
    cy.get('[data-cy="note-find-button"]').click()
    cy.get('[data-cy="note-find-input"]').type('needle')
    cy.get('[data-cy="note-find-count"]').should('contain.text', '1 / 4')
    cy.get('[aria-label="Next match"]').click()
    cy.get('[data-cy="note-find-count"]').should('contain.text', '2 / 4')
    cy.get('[aria-label="Previous match"]').click().click()
    cy.get('[data-cy="note-find-count"]').should('contain.text', '4 / 4')
    cy.get('[data-cy="note-find-input"]').clear().type('.')
    cy.get('[data-cy="note-find-count"]').should('contain.text', '1 / 2')
    cy.get('[data-cy="note-find-input"]').clear().type('no such text')
    cy.get('[data-cy="note-find-count"]').should('contain.text', '0 / 0')
    cy.get('[aria-label="Next match"]').should('be.disabled')
    cy.get('[data-cy="note-find-close"]').click()
    cy.get('[data-cy="note-find-input"]').should('not.exist')
    cy.contains('First needle and needle.').should('exist')
  })

  it('handles Enter in the search field without blocking keyboard activation of its buttons', () => {
    cy.mount(<div style={{ height: 800, display: 'flex' }}>
      <NoteView note={note} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} />
    </div>)
    cy.get('[data-cy="note-find-button"]').click()
    cy.get('[data-cy="note-find-input"]').type('needle{enter}')
    cy.get('[data-cy="note-find-count"]').should('contain.text', '2 / 4')
    cy.get('[aria-label="Previous match"]').focus().then(($button) => {
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      expect($button[0].dispatchEvent(event), 'Enter is not blocked on Previous').to.equal(true)
    }).click()
    cy.get('[data-cy="note-find-count"]').should('contain.text', '1 / 4')
    cy.get('[data-cy="note-find-close"]').focus().then(($button) => {
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      expect($button[0].dispatchEvent(event), 'Enter is not blocked on Close').to.equal(true)
    }).click()
    cy.get('[data-cy="note-find-input"]').should('not.exist')
  })

  it('finds text while editing without changing the draft and updates after typing', () => {
    const onSave = cy.stub().as('onSave')
    const onAutoSave = cy.stub().resolves()
    cy.wrap(onAutoSave).as('onAutoSave')
    cy.mount(<div style={{ height: 800, display: 'flex' }}>
      <NoteEditor noteId='find-note' initialTitle={note.title} initialDescription={body} isSaving={false}
        onSave={onSave} onRead={cy.stub()} onAutoSave={onAutoSave} onBack={cy.stub()} />
    </div>)
    cy.get('.ProseMirror').should('contain.text', 'Third NEEDLE').invoke('html').as('originalHtml')
    cy.get('[data-cy="note-find-button"]').click()
    cy.get('[data-cy="note-find-input"]').type('needle')
    cy.get('[data-cy="note-find-count"]').should('contain.text', '1 / 4')
    cy.get('[aria-label="Next match"]').click()
    cy.get('[data-cy="note-find-count"]').should('contain.text', '2 / 4')
    cy.get('@originalHtml').then((html) => cy.get('.ProseMirror').invoke('html').should('eq', html))
    cy.get('@onAutoSave').should('not.have.been.called')
    cy.get('.ProseMirror p').last().click().type(' needle')
    cy.get('[data-cy="note-find-count"]').should('contain.text', '/ 5')
    cy.get('[placeholder="Note title"]').clear().type('Other title')
    cy.get('[data-cy="note-find-count"]').should('contain.text', '/ 4')
    cy.get('[data-cy="note-find-close"]').click()
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('@onSave').should('have.been.calledOnce')
    cy.get('@onSave').its('firstCall.args.0.description').should('not.contain', 'note-find')
  })

  it('still highlights the active match when custom highlights are unavailable', () => {
    cy.window().then((win) => {
      highlightDescriptor = Object.getOwnPropertyDescriptor(win.CSS, 'highlights')
      Object.defineProperty(win.CSS, 'highlights', { configurable: true, value: undefined })
    })
    cy.mount(<div style={{ height: 800, display: 'flex' }}>
      <NoteView note={note} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} />
    </div>)
    cy.get('[data-cy="note-find-button"]').click()
    cy.get('[data-cy="note-find-input"]').type('needle')
    cy.get('[data-cy="note-find-count"]').should('contain.text', '1 / 4')
    cy.get('[data-testid="note-find-fallback"] span').should('have.length.at.least', 3)
    cy.get('[aria-label="Next match"]').click()
    cy.get('[data-testid="note-find-fallback"] span').filter('.bg-orange-400\\/50').should('have.length', 1)
  })
})
