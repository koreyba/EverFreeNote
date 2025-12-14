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

    // "Saving..." text is now in a separate div, not in the button
    cy.contains('Saving...').should('be.visible')
    // Button should be disabled during manual save, but text remains "Save"
    cy.get('button').contains('Save').should('be.disabled')
  })

  it('shows auto-saving state without disabling button', () => {
    const props = { ...getDefaultProps(), isAutoSaving: true }
    cy.mount(<NoteEditor {...props} />)

    cy.contains('Saving...').should('be.visible')
    // Button should NOT be disabled during auto-save
    cy.get('button').contains('Save').should('not.be.disabled')
  })

  it('shows last saved timestamp', () => {
    const lastSavedAt = new Date('2023-01-01T12:00:00').toISOString()
    const props = { ...getDefaultProps(), lastSavedAt }
    cy.mount(<NoteEditor {...props} />)

    cy.contains(`Saved at ${new Date(lastSavedAt).toLocaleTimeString()}`).should('be.visible')
  })

  it('debounces autosave', () => {
    // Using real timers to avoid issues with cy.clock and React state updates
    const onAutoSave = (() => {
      const stub = cy.stub().resolves()
      cy.wrap(stub).as('onAutoSave')
      return stub
    })()
    const props = {
      ...getDefaultProps(),
      noteId: 'note-1',
      onAutoSave,
      autosaveDelayMs: 200, // short delay
    }

    cy.mount(<NoteEditor {...props} />)

    cy.get('input[placeholder="Note title"]').clear().type('New Title')
    
    // INPUT_DEBOUNCE_MS (250) + autosaveDelayMs (200) = 450ms
    
    // Wait a bit less
   // cy.wait(300)
    cy.get('@onAutoSave').should('not.have.been.called', {timeout: 500})

    // Wait enough
    //cy.wait(1000)
    cy.get('@onAutoSave').should('have.been.calledOnce', {timeout: 1500})
    cy.get('@onAutoSave').should('have.been.calledWith', Cypress.sinon.match({
      noteId: 'note-1',
      title: 'New Title',
    }))
  })
})
