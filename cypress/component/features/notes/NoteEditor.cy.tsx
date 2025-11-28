import React from 'react'
import { NoteEditor } from '@/components/features/notes/NoteEditor'

describe('NoteEditor Component', () => {
  const getDefaultProps = () => ({
    title: 'Test Title',
    description: '<p>Test Description</p>',
    tags: 'tag1, tag2',
    isSaving: false,
    isNew: false,
    onTitleChange: cy.stub(),
    onDescriptionChange: cy.stub(),
    onTagsChange: cy.stub(),
    onSave: cy.stub(),
    onCancel: cy.stub()
  })

  it('renders in edit mode', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} />)

    cy.contains('Edit Note').should('be.visible')
    cy.get('input[placeholder="Note title"]').should('have.value', 'Test Title')
    cy.get('input[placeholder="work, personal, ideas"]').should('have.value', 'tag1, tag2')
    // RichTextEditor content check might be complex, but we can check if it renders
    cy.get('.ProseMirror').should('contain.text', 'Test Description')
  })

  it('renders in new note mode', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} isNew={true} />)

    cy.contains('New Note').should('be.visible')
  })

  it('handles input changes', () => {
    const props = getDefaultProps()
    const onTitleChange = cy.spy().as('onTitleChange')
    const onTagsChange = cy.spy().as('onTagsChange')

    cy.mount(
      <NoteEditor
        {...props}
        onTitleChange={onTitleChange}
        onTagsChange={onTagsChange}
      />
    )

    cy.get('input[placeholder="Note title"]').clear().type('New Title')
    cy.get('@onTitleChange').should('have.been.called')

    cy.get('input[placeholder="work, personal, ideas"]').clear().type('new tag')
    cy.get('@onTagsChange').should('have.been.called')
  })

  it('handles save and cancel actions', () => {
    const props = getDefaultProps()
    const onSave = cy.spy().as('onSave')
    const onCancel = cy.spy().as('onCancel')

    cy.mount(
      <NoteEditor
        {...props}
        onSave={onSave}
        onCancel={onCancel}
      />
    )

    cy.contains('Save').click()
    cy.get('@onSave').should('have.been.called')

    cy.contains('Cancel').click()
    cy.get('@onCancel').should('have.been.called')
  })

  it('shows saving state', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} isSaving={true} />)

    cy.contains('Saving...').should('be.visible')
    cy.get('button').contains('Saving...').should('be.disabled')
  })
})
