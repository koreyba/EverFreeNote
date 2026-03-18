import React from 'react'
import { NoteSearchItem } from '../../../../ui/web/components/features/search/NoteSearchItem'
import type { RagNoteGroup } from '../../../../core/types/ragSearch'

const baseGroup: RagNoteGroup = {
  noteId: 'note-1',
  noteTitle: 'Ontology Basics',
  noteTags: ['philosophy'],
  topScore: 0.87,
  hiddenCount: 0,
  chunks: [
    {
      noteId: 'note-1',
      noteTitle: 'Ontology Basics',
      noteTags: ['philosophy'],
      chunkIndex: 0,
      charOffset: 12,
      bodyContent: 'Top chunk snippet for selection tests.',
      overlapPrefix: '',
      content: 'Top chunk snippet for selection tests.',
      similarity: 0.87,
    },
  ],
}

const selectTextInElement = (selector: string) => {
  cy.get(selector).then(($el) => {
    const element = $el.get(0)
    const range = document.createRange()
    range.selectNodeContents(element)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  })
}

describe('NoteSearchItem', () => {
  it('opens context when text selection exists outside this item', () => {
    const onOpenInContext = cy.stub().as('onOpenInContext')

    cy.mount(
      <div>
        <p data-cy="outside-selection">Outside selectable text</p>
        <NoteSearchItem group={baseGroup} onOpenInContext={onOpenInContext} />
      </div>
    )

    selectTextInElement('[data-cy="outside-selection"]')
    cy.get('[aria-label^="Open top fragment"]').click()

    cy.get('@onOpenInContext').should(
      'have.been.calledOnceWith',
      'note-1',
      12,
      baseGroup.chunks[0].content.length
    )
  })

  it('does not open context when text selection is inside this item', () => {
    const onOpenInContext = cy.stub().as('onOpenInContext')

    cy.mount(<NoteSearchItem group={baseGroup} onOpenInContext={onOpenInContext} />)

    selectTextInElement('[aria-label^="Open top fragment"]')
    cy.get('[aria-label^="Open top fragment"]').click()

    cy.get('@onOpenInContext').should('not.have.been.called')
  })
})
