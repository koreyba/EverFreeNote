import React from 'react'
import { NoteEditor } from '@/components/features/notes/NoteEditor'

describe('NoteEditor', () => {
  const getDefaultProps = () => ({
    title: 'Test Title',
    description: '<p>Test Description</p>',
    tags: 'tag1, tag2',
    isSaving: false,
    isNew: false,
    onTitleChange: cy.spy().as('onTitleChange'),
    onDescriptionChange: cy.spy().as('onDescriptionChange'),
    onTagsChange: cy.spy().as('onTagsChange'),
    onSave: cy.spy().as('onSave'),
    onCancel: cy.spy().as('onCancel')
  })

  it('renders correctly', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} />)
    cy.get('input[placeholder="Note title"]').should('have.value', 'Test Title')
    cy.get('input[placeholder="work, personal, ideas"]').should('have.value', 'tag1, tag2')
    cy.contains('Edit Note').should('be.visible')
    cy.contains('Test Description').should('be.visible')
  })

  it('renders new note state', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} isNew={true} />)
    cy.contains('New Note').should('be.visible')
  })

  it('handles title change', () => {
    const props = getDefaultProps()
    cy.mount(<NoteEditor {...props} />)
    cy.get('input[placeholder="Note title"]').clear().type('New Title')
    cy.get('@onTitleChange').should('have.been.called')
  })

  it('handles tags change', () => {
    const props = getDefaultProps()
    cy.mount(<NoteEditor {...props} />)
    cy.get('input[placeholder="work, personal, ideas"]').clear().type('tag3')
    cy.get('@onTagsChange').should('have.been.called')
  })

  it('handles save', () => {
    const props = getDefaultProps()
    cy.mount(<NoteEditor {...props} />)
    cy.contains('button', 'Save').click()
    cy.get('@onSave').should('have.been.called')
  })

  it('shows saving state', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} isSaving={true} />)
    cy.contains('button', 'Saving...').should('be.disabled')
  })

  it('handles cancel', () => {
    const props = getDefaultProps()
    cy.mount(<NoteEditor {...props} />)
    cy.contains('button', 'Cancel').click()
    cy.get('@onCancel').should('have.been.called')
  })
})
