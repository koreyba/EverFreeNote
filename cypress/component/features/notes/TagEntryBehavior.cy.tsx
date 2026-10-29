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
      cy.get('[aria-label="Add tag"]').should('contain.text', 'Add tag').then($button => {
        cy.get('[data-testid="tag-input-container"]').then($row => {
          expect($button[0].getBoundingClientRect().left - $row[0].getBoundingClientRect().left).to.be.lessThan(2)
        })
      })
      cy.screenshot(`empty-tag-prompt-${width}`)
      cy.get('[aria-label="Add tag"]').click()
      cy.get('[aria-label="Add tags"]').should('be.visible').and('be.focused').type('first{enter}')
      cy.get('[aria-label="Add tags"]').should('not.be.visible')
      cy.get('[data-note-tag-item]').first().should('contain.text', 'first')
      cy.get('[aria-label="Add tag"]').should('not.contain.text', 'Add tag')

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

  it('keeps the empty action legible and usable in dark mode', () => {
    cy.viewport(320, 700)
    cy.document().then(document => document.documentElement.classList.add('dark'))
    cy.mount(<NoteEditor initialTitle="Empty tags" initialDescription="<p>Body</p>" initialTags=""
      availableTags={[]} isSaving={false} onSave={cy.stub()} onRead={cy.stub()} />)
    cy.get('[aria-label="Add tag"]').should('be.visible').and('contain.text', 'Add tag').focus().should('be.focused')
    cy.screenshot('empty-tag-prompt-dark')
    cy.get('[aria-label="Add tag"]').click()
    cy.get('[aria-label="Add tags"]').should('be.visible').and('be.focused').type('{esc}')
    cy.get('[aria-label="Add tag"]').should('be.focused')
    cy.document().then(document => document.documentElement.classList.remove('dark'))
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

  it('compacts expanded long tags during entry and restores their position on cancellation', () => {
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
      cy.get('[data-testid="tag-input-container"]').should($row => expect($row[0].getBoundingClientRect().height).to.equal(44))
      cy.get('.ProseMirror').should($current => expect($current[0].getBoundingClientRect().top).to.be.lessThan(bodyTop))
      cy.get('[aria-label="Add tags"]').type('{esc}')
      cy.get('[aria-label="Show fewer tags"]').should('have.attr', 'aria-expanded', 'true')
      cy.get('[data-note-tag-item]').should('have.length', 5)
      cy.get('.ProseMirror').should($current => expect($current[0].getBoundingClientRect().top).to.equal(bodyTop))
    })
  })

  for (const [width, height] of [[320, 667], [1280, 900]]) {
    it(`keeps entry to one row with 17 expanded tags and restores them after confirmation at ${width}px`, () => {
      cy.viewport(width, height)
      const tags = Array.from({ length: 17 }, (_, index) => `existing-tag-${index}`)
      const onSave = cy.stub().as('onSave')
      cy.mount(<NoteEditor initialTitle="Many tags" initialDescription="<p>Body anchor</p>"
        initialTags={tags.join(', ')} availableTags={[]} isSaving={false} onSave={onSave} onRead={cy.stub()} />)
      cy.get('[aria-label="Show all 17 tags"]').click()
      cy.get('[data-testid="tag-input-container"]').should($row => expect($row[0].getBoundingClientRect().height).to.be.greaterThan(44))
      cy.get('[aria-label="Add tag"]').click()
      cy.get('[aria-label="Add tags"]').should('be.focused').type('new first,')
      cy.get('[data-testid="tag-input-container"]').should($row => {
        expect($row[0].getBoundingClientRect().height).to.equal(44)
        expect($row[0].scrollWidth).to.be.at.most($row[0].clientWidth)
      })
      cy.get('.ProseMirror').should($body => expect($body[0].getBoundingClientRect().top).to.be.lessThan(height))
      cy.screenshot(`expanded-tags-compact-entry-${width}`)
      cy.get('[aria-label="Add tags"]').type('new second{enter}')
      cy.get('[aria-label="Add tags"]').should('not.be.visible')
      cy.get('[aria-label="Show fewer tags"]').should('have.attr', 'aria-expanded', 'true')
      cy.get('[data-note-tag-item]').should('have.length', 19)
      cy.get('[data-note-tag-item]').first().should('contain.text', 'new second')
      cy.get('[aria-label="Add tag"]').should('be.focused')
      cy.get('[data-cy="note-save-button"]').click()
      cy.get('@onSave').should('have.been.calledWith', Cypress.sinon.match({ tags: `new second, new first, ${tags.join(', ')}` }))
    })
  }

})
