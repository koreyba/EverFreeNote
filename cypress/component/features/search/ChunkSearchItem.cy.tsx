import React from 'react'
import { ChunkSearchItem } from '../../../../ui/web/components/features/search/ChunkSearchItem'
import type { RagChunk } from '../../../../core/types/ragSearch'

const chunk: RagChunk = {
  noteId: 'note-2',
  noteTitle: 'Chunk body length',
  noteTags: ['testing'],
  chunkIndex: 0,
  charOffset: 41,
  bodyContent: 'Chunk body that should define the open-in-context range.',
  overlapPrefix: '',
  content: 'Chunk body that should define the open-in-context range.\n\nSection: Appendix\nTags: testing',
  similarity: 0.91,
}

describe('ChunkSearchItem', () => {
  it('opens context using body-only length', () => {
    const onOpenInContext = cy.stub().as('onOpenInContext')

    cy.mount(<ChunkSearchItem chunk={chunk} onOpenInContext={onOpenInContext} />)

    cy.get('[aria-label^="Open fragment from"]').click()

    cy.get('@onOpenInContext').should(
      'have.been.calledOnceWith',
      'note-2',
      41,
      chunk.bodyContent.length
    )
  })
})
