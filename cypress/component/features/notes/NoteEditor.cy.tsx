import React from 'react'
import { NoteEditor } from '@ui/web/components/features/notes/NoteEditor'

describe('NoteEditor Component', () => {
  const getDefaultProps = () => ({
    initialTitle: 'Test Title',
    initialDescription: '<p>Test Description</p>',
    initialTags: 'tag1, tag2',
    isSaving: false,
    onSave: (() => {
      const stub = cy.stub()
      cy.wrap(stub).as('onSave')
      return stub
    })(),
    onCancel: (() => {
      const stub = cy.stub()
      cy.wrap(stub).as('onCancel')
      return stub
    })(),
  })

  it('renders in edit mode', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} />)

    cy.contains('Editing').should('be.visible')
    cy.get('input[placeholder="Note title"]').should('have.value', 'Test Title')
    cy.get('input[placeholder="work, personal, ideas"]').should('have.value', 'tag1, tag2')
    cy.get('.ProseMirror').should('contain.text', 'Test Description')
  })

  it('handles input changes and save', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} />)

    cy.get('input[placeholder="Note title"]').clear().type('New Title')
    cy.get('input[placeholder="work, personal, ideas"]').clear().type('new tag')
    
    cy.contains('Save').click()
    
    cy.get('@onSave').should('have.been.calledWith', Cypress.sinon.match({
      title: 'New Title',
      tags: 'new tag'
    }))
  })

  it('handles save and cancel actions', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} />)

    cy.contains('Save').click()
    cy.get('@onSave').should('have.been.called')

    cy.contains('Read').click()
    cy.get('@onCancel').should('have.been.called')
  })

  it('shows saving state', () => {
    const props = { ...getDefaultProps(), isSaving: true }
    cy.mount(<NoteEditor {...props} />)

    cy.contains('Saving...').should('be.visible')
    cy.get('button').contains('Saving...').should('be.disabled')
  })

  it('debounces autosave and disables Save during autosave window', () => {
    cy.clock()
    const onAutoSave = (() => {
      const stub = cy.stub().resolves()
      cy.wrap(stub).as('onAutoSave')
      return stub
    })()
    const props = {
      ...getDefaultProps(),
      noteId: 'note-1',
      onAutoSave,
      autosaveDelayMs: 500, // shorter for test
    }

    cy.mount(<NoteEditor {...props} />)

    cy.get('input[placeholder="Note title"]').clear().type('New Title')
    cy.tick(400)
    cy.get('@onAutoSave').should('not.have.been.called')

    cy.tick(100) // total 500ms -> should trigger autosave once
    cy.get('@onAutoSave').should('have.been.calledOnce')
    cy.get('@onAutoSave').should('have.been.calledWith', Cypress.sinon.match({
      noteId: 'note-1',
      title: 'New Title',
    }))

    // During autosave, Save button is disabled
    cy.get('button').contains('Save').should('be.disabled')

    // After min status window (500ms) it re-enables
    cy.tick(500)
    cy.get('button').contains('Save').should('not.be.disabled')
  })
})
