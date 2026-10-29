import React from 'react'
import '../../../../app/globals.css'
import { NoteEditor } from '@ui/web/components/features/notes/NoteEditor'

describe('Note tag entry', { retries: 0 }, () => {
  it('closes confirmed entry and shows new tags first without expanding the list', () => {
    cy.viewport(320, 700)
    const manyTags = Array.from({ length: 12 }, (_, index) => `tag-${index}`).join(', ')
    const onSave = cy.stub().as('onSave')
    cy.mount(<NoteEditor initialTitle="A note" initialDescription="<p>Body</p>" initialTags={manyTags}
      availableTags={[]} isSaving={false} onSave={onSave} onRead={cy.stub()} />)

    cy.get('[aria-label="Show all 12 tags"]').should('have.attr', 'aria-expanded', 'false')
    cy.get('[aria-label="Add tag"]').click()
    cy.get('[aria-label="Add tags"]').type('alpha,')
    cy.get('[aria-label="Add tags"]').should('be.visible')
    cy.get('[data-note-tag-item]').first().should('contain.text', 'alpha').and('be.visible')
    cy.get('[aria-label="Add tags"]').type('beta{enter}')
    cy.get('[aria-label="Add tags"]').should('not.be.visible')
    cy.get('[aria-label="Add tag"]').should('have.attr', 'aria-expanded', 'false').and('be.focused')
    cy.get('[data-note-tag-item]').eq(0).should('contain.text', 'beta').and('be.visible')
    cy.get('[data-note-tag-item]').eq(1).should('contain.text', 'alpha')
    cy.get('[aria-label="Show all 14 tags"]').should('have.attr', 'aria-expanded', 'false')

    cy.get('[data-cy="note-save-button"]').click()
    cy.get('@onSave').should('have.been.calledWith', Cypress.sinon.match({ tags: `beta, alpha, ${manyTags}` }))
    cy.screenshot('new-tags-first-collapsed-mobile')

    cy.get('[aria-label="Add tag"]').click()
    cy.get('[aria-label="Add tags"]').type('gamma{enter}')
    cy.get('[data-note-tag-item]').eq(0).should('contain.text', 'gamma').and('be.visible')
    cy.get('[data-note-tag-item]').eq(1).should('contain.text', 'beta')
    cy.get('[aria-label="Add tag"]').click()
    cy.get('[aria-label="Add tags"]').type('ALPHA{enter}')
    cy.get('[aria-label="Add tags"]').should('not.be.visible')
    cy.get('[data-note-tag-item]').should('have.length', 15)
    cy.get('[data-note-tag-item]').eq(0).should('contain.text', 'gamma')
    cy.get('[data-note-tag-item]').eq(1).should('contain.text', 'beta')
  })
})
