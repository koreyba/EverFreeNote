import React from 'react'
import '../../../../app/globals.css'
import { NoteEditor } from '@ui/web/components/features/notes/NoteEditor'

describe('Note tag entry', { retries: 0 }, () => {
  for (const [width, height] of [[320, 667], [1280, 900]]) {
    it(`opens an empty note's tag entry on the first click at ${width}px`, () => {
      cy.viewport(width, height)
      const onSave = cy.stub().as('onSave')
      cy.mount(<NoteEditor initialTitle="Empty tags" initialDescription="<p>Body</p>" initialTags=""
        availableTags={[]} isSaving={false} onSave={onSave} onRead={cy.stub()} />)

      cy.get('[data-note-tag-item]').should('have.length', 0)
      cy.get('[aria-label="Add tag"]').click()
      cy.get('[aria-label="Add tags"]').should('be.visible').and('be.focused').type('first{enter}')
      cy.get('[aria-label="Add tags"]').should('not.be.visible')
      cy.get('[data-note-tag-item]').first().should('contain.text', 'first')

      cy.get('[aria-label="Add tag"]').click()
      cy.get('[aria-label="Add tags"]').type('second{enter}')
      cy.get('[aria-label="Add tags"]').should('not.be.visible')
      cy.get('[data-note-tag-item]').eq(0).should('contain.text', 'second')
      cy.get('[data-note-tag-item]').eq(1).should('contain.text', 'first')
      cy.get('[data-cy="note-save-button"]').click()
      cy.get('@onSave').should('have.been.calledWith', Cypress.sinon.match({ tags: 'second, first' }))
    })

    it(`opens an empty note with a touch pointer and closes after a second tap at ${width}px`, () => {
      cy.viewport(width, height)
      cy.mount(<NoteEditor initialTitle="Empty tags" initialDescription="<p>Body</p>" initialTags=""
        availableTags={[]} isSaving={false} onSave={cy.stub()} onRead={cy.stub()} />)
      cy.get('[aria-label="Add tags"]').should('not.be.visible')
      cy.get('[aria-label="Add tag"]').trigger('pointerdown', { eventConstructor: 'PointerEvent', button: 0, isPrimary: true, pointerType: 'touch' })
      cy.get('[aria-label="Add tag"]').trigger('click', { detail: 1 })
      cy.get('[aria-label="Add tags"]').should('be.visible').and('be.focused').type('touch first')

      // A real tap may blur the input before dispatching the click.
      cy.get('[aria-label="Add tag"]').trigger('pointerdown', { eventConstructor: 'PointerEvent', button: 0, isPrimary: true, pointerType: 'touch' })
      cy.get('[aria-label="Add tag"]').focus()
      cy.get('[aria-label="Add tag"]').trigger('click', { detail: 1 })
      cy.get('[aria-label="Add tags"]').should('not.be.visible')
      cy.get('[data-note-tag-item]').first().should('contain.text', 'touch first')
    })
  }

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
    cy.get('[data-note-tag-item]').first().should('contain.text', 'alpha').and('not.be.visible')
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

// Geometry assertions protect against opening a second row and moving the body.
describe('Inline tag row geometry', { retries: 0 }, () => {
  for (const [width, height] of [[320, 667], [1280, 900]]) {
    it(`replaces the empty row with entry without moving the document at ${width}px`, () => {
      cy.viewport(width, height)
      cy.mount(<NoteEditor initialTitle="Inline entry" initialDescription="<p>Body anchor</p>" initialTags=""
        availableTags={[]} isSaving={false} onSave={cy.stub()} onRead={cy.stub()} />)
      cy.get('.ProseMirror').then($body => {
        const bodyTop = $body[0].getBoundingClientRect().top
        cy.get('[aria-label="Add tag"]').click()
        cy.get('[aria-label="Add tags"]').should('be.focused').then($input => {
          cy.get('[aria-label="Add tag"]').then($button => {
            const input = $input[0].getBoundingClientRect()
            const button = $button[0].getBoundingClientRect()
            expect(input.top).to.equal(button.top)
            expect(input.right).to.be.at.most(button.left)
            expect(input.width).to.be.greaterThan(150)
          })
        })
        cy.get('.ProseMirror').should($current => {
          expect($current[0].getBoundingClientRect().top).to.equal(bodyTop)
        })
        cy.screenshot(`inline-tag-row-open-${width}`)
        cy.get('[aria-label="Add tags"]').type('inline{enter}')
        cy.get('[data-note-tag-item]').first().should('contain.text', 'inline').and('be.visible')
        cy.get('.ProseMirror').should($current => {
          expect($current[0].getBoundingClientRect().top).to.equal(bodyTop)
        })
      })
      cy.screenshot(`inline-tag-row-${width}`)
    })
  }

  it('preserves expanded long tags and document position through cancellation', () => {
    cy.viewport(320, 700)
    cy.mount(<NoteEditor initialTitle="Expanded tags" initialDescription="<p>Body anchor</p>"
      initialTags="long-tag-with-many-characters-that-must-wrap-safely, second, third, fourth, fifth"
      availableTags={[]} isSaving={false} onSave={cy.stub()} onRead={cy.stub()} />)
    cy.get('[aria-label="Show all 5 tags"]').click()
    cy.get('.ProseMirror').then($body => {
      const bodyTop = $body[0].getBoundingClientRect().top
      cy.get('[aria-label="Add tag"]').click()
      cy.get('[data-note-tag-item]').first().should('not.be.visible')
      cy.get('[aria-label="Add tags"]').should('be.focused').type('discard me')
      cy.get('.ProseMirror').should($current => expect($current[0].getBoundingClientRect().top).to.equal(bodyTop))
      cy.get('[aria-label="Add tags"]').type('{esc}')
      cy.get('[aria-label="Show fewer tags"]').should('have.attr', 'aria-expanded', 'true')
      cy.get('[data-note-tag-item]').should('have.length', 5)
      cy.get('.ProseMirror').should($current => expect($current[0].getBoundingClientRect().top).to.equal(bodyTop))
    })
  })
})
