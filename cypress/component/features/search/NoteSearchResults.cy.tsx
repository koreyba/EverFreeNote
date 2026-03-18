import React from 'react'
import { NoteSearchResults } from '../../../../ui/web/components/features/search/NoteSearchResults'
import type { RagNoteGroup } from '../../../../core/types/ragSearch'

const noteGroups: RagNoteGroup[] = [
  {
    noteId: 'note-1',
    noteTitle: 'First note',
    noteTags: ['tag-1'],
    topScore: 0.82,
    hiddenCount: 0,
    chunks: [
      {
        noteId: 'note-1',
        noteTitle: 'First note',
        noteTags: ['tag-1'],
        chunkIndex: 0,
        charOffset: 0,
        bodyContent: 'First snippet',
        overlapPrefix: '',
        content: 'First snippet',
        similarity: 0.82,
      },
    ],
  },
]

describe('NoteSearchResults', () => {
  it('does not render load-more button when callback is missing', () => {
    cy.mount(
      <NoteSearchResults
        noteGroups={noteGroups}
        onOpenInContext={() => undefined}
        hasMore
        loadingMore={false}
      />
    )

    cy.contains('button', 'Load more...').should('not.exist')
  })

  it('renders load-more button and calls callback when provided', () => {
    const onLoadMore = cy.stub().as('onLoadMore')

    cy.mount(
      <NoteSearchResults
        noteGroups={noteGroups}
        onOpenInContext={() => undefined}
        hasMore
        loadingMore={false}
        onLoadMore={onLoadMore}
      />
    )

    cy.contains('button', 'Load more...').click()
    cy.get('@onLoadMore').should('have.been.calledOnce')
  })
})

