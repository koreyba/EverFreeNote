import React from 'react'
import { NoteEditor } from '@ui/web/components/features/notes/NoteEditor'

describe('NoteEditor Component', () => {
  const getDefaultProps = () => ({
    initialTitle: 'Test Title',
    initialDescription: '<p>Test Description</p>',
    initialTags: 'tag1, tag2',
    isSaving: false,
    onSave: cy.stub().as('onSave'),
    onCancel: cy.stub().as('onCancel')
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
})
