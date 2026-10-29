import React from 'react'
import '../../../../app/globals.css'
import { TagInput } from '@ui/web/components/TagInput'
import { NoteView } from '@ui/web/components/features/notes/NoteView'

const tags = ['работа', 'идеи', 'планы', 'дом', 'поездки', 'чтение', 'дизайн', 'web', 'mobile', 'заметки', 'черновик', 'позже']
const visibleTags = '[data-note-tag-item]:not([aria-hidden="true"])'

function EditableTags() {
  const [value, setValue] = React.useState(tags)
  return <div className="p-5"><TagInput tags={value} onAddTags={added => setValue([...new Set([...value, ...added])])} onRemoveTag={tag => setValue(value.filter(item => item !== tag))} /></div>
}

describe('Adaptive note tags', { retries: 0 }, () => {
  it('fits tags to the available row and keeps input independent from disclosure', () => {
    cy.viewport(320, 700)
    cy.mount(<EditableTags />)
    cy.get(visibleTags).should('have.length', 1)
    cy.contains('button', '+11 more').should('be.visible')
    cy.get('[aria-label="Add tag"]').click()
    cy.get('[aria-label="Add tags"]').should('be.focused')
    cy.get(visibleTags).should('have.length', 1)
    cy.get('[aria-label="Add tags"]').type('cancelled{esc}')
    cy.get('[aria-label="Add tag"]').should('be.focused').and('have.attr', 'aria-expanded', 'false')
    cy.get('[data-note-tag-item]').should('have.length', 12)
    cy.get('[aria-label="Add tag"]').click()
    cy.get('[aria-label="Add tags"]').type('новый{enter}')
    cy.get('[data-note-tag-item]').should('have.length', 13)
    cy.get('[aria-label="Show all 13 tags"]').should('have.attr', 'aria-expanded', 'false').click()
    cy.get(visibleTags).should('have.length', 13)
    cy.get('[aria-label]').filter((_, el) => el.getAttribute('aria-label') === 'Remove tag "новый"').click()
    cy.get('[data-note-tag-item]').should('have.length', 12)
    cy.get('[aria-label="Add tag"]').click()
    cy.get('[aria-label="Add tags"]').should('not.be.visible')
    cy.get(visibleTags).should('have.length', 12)
    cy.get('[aria-label="Show fewer tags"]').click()
    cy.get(visibleTags).should('have.length', 1)
    cy.viewport(1600, 900)
    cy.get(visibleTags).should('have.length', 12)
    cy.contains('button', /more/).should('not.exist')
    cy.viewport(280, 700)
    cy.get('[aria-label="Show all 12 tags"]').should('be.visible')
    cy.get('[data-testid="tag-input-container"]').should($row => {
      expect($row[0].scrollWidth).to.be.at.most($row[0].clientWidth)
    })
    cy.get('[aria-label="Add tag"]').click()
    cy.get('[aria-label="Add tags"]').type('оченьдлинныйтегбезпробелов'.repeat(8) + '{enter}')
    cy.get('[aria-label="Show all 13 tags"]').click()
    cy.get('[data-testid="tag-input-container"]').should($row => {
      expect($row[0].scrollWidth).to.be.at.most($row[0].clientWidth)
    })
    cy.screenshot('tags-narrow-expanded')
  })

  it('recalculates reading tags on resize and exposes all filtering/removal controls', () => {
    cy.viewport(390, 844)
    cy.mount(<div className="flex h-screen flex-col"><NoteView note={{ id: 'tags', title: 'Synthetic tags', description: '<p>Body</p>', tags, user_id: 'synthetic', created_at: '2026-10-29', updated_at: '2026-10-29' }} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub().as('filter')} onRemoveTag={cy.stub().as('remove')} /></div>)
    cy.get(visibleTags).should('have.length', 2)
    cy.get('[aria-label="Show all 12 tags"]').click()
    cy.contains('button', 'позже').click()
    cy.get('@filter').should('have.been.calledWith', 'позже')
    cy.get('[aria-label]').filter((_, el) => el.getAttribute('aria-label') === 'Remove tag "позже"').click()
    cy.get('@remove').should('have.been.calledWith', 'позже')
    cy.get('[aria-label="Show fewer tags"]').click()
    cy.viewport(1280, 900)
    cy.get(visibleTags).its('length').should('be.greaterThan', 3)
    cy.get('html').invoke('addClass', 'dark')
    cy.screenshot('tags-reader-desktop-dark')
    cy.viewport(320, 700)
    cy.document().then(doc => doc.fonts.dispatchEvent(new Event('loadingdone')))
    cy.get('[data-cy="note-tag-list"]').should($row => {
      expect($row[0].scrollWidth).to.be.at.most($row[0].clientWidth)
    })
  })
})
