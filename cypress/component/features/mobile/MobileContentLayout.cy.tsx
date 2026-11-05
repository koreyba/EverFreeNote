import React from 'react'
import '../../../../app/globals.css'
import { NoteList } from '@ui/web/components/features/notes/NoteList'
import { TagsPage } from '@ui/web/components/features/tags/TagsPage'

const notes = Array.from({ length: 6 }, (_, index) => ({
  id: `layout-note-${index}`,
  user_id: 'layout-user',
  title: `Note ${index + 1}: A long title that needs more than two lines on a phone`,
  description: '<p>A detailed preview with enough content to fill every available line in a narrow tile. The date and tags must remain readable.</p>',
  tags: ['a-long-project-tag', 'another-long-tag', 'ideas', 'mobile'],
  created_at: '2026-11-05T10:00:00Z',
  updated_at: '2026-11-05T10:00:00Z',
}))

describe('Mobile content layout', { retries: 0 }, () => {
  beforeEach(() => {
    cy.document().then((doc) => {
      doc.documentElement.style.removeProperty('font-size')
      doc.documentElement.classList.remove('dark')
    })
  })

  for (const { width, fontSize, selectionMode } of [
    { width: 320, fontSize: 16, selectionMode: false },
    { width: 390, fontSize: 16, selectionMode: false },
    { width: 320, fontSize: 20, selectionMode: false },
    { width: 320, fontSize: 20, selectionMode: true },
  ]) {
    it(`keeps tile rows separate and dates readable at ${width}px with ${fontSize}px text and selection ${selectionMode}`, () => {
      cy.viewport(width, 844)
      cy.document().then((doc) => { doc.documentElement.style.fontSize = `${fontSize}px` })
      cy.mount(
        <div style={{ height: 650, width }}>
          <NoteList notes={notes} layout="grid" selectionMode={selectionMode} isLoading={false} height={650} width={width}
            onSelectNote={cy.stub()} onToggleSelect={cy.stub()} onDeleteNote={cy.stub()}
            onTagClick={cy.stub()} onLoadMore={cy.stub()} hasMore={false} isFetchingNextPage={false} />
        </div>
      )
      cy.get('[data-testid="note-card"]').should('have.length', 6).should(($cards) => {
        const first = $cards[0].getBoundingClientRect()
        const second = $cards[1].getBoundingClientRect()
        const nextRow = $cards[2].getBoundingClientRect()
        expect(second.left, 'gap between columns').to.be.greaterThan(first.right)
        expect(nextRow.top, 'gap between rows').to.be.greaterThan(first.bottom)
      })
      cy.get('[data-testid="note-card"]').each(($card) => {
        cy.wrap($card).contains('p', '05.11.2026').should('be.visible').should(($date) => {
          const card = $card[0].getBoundingClientRect()
          const date = $date[0].getBoundingClientRect()
          const range = $date[0].ownerDocument.createRange()
          range.selectNodeContents($date[0])
          const text = range.getBoundingClientRect()
          const tags = $card.find('[data-cy="interactive-tag"]').last()[0].getBoundingClientRect()
          expect(date.top, 'date below tags').to.be.greaterThan(tags.bottom)
          expect(text.bottom, 'entire date inside card').to.be.at.most(card.bottom - 8)
          expect(text.top, 'date text inside its line box').to.be.at.least(date.top - 1)
          expect(text.bottom, 'date text fits its line box').to.be.at.most(date.bottom + 1)
        })
      })
      cy.screenshot(`notes-grid-${width}-${fontSize}-selection-${selectionMode}`)
    })
  }

  it('gives tag coverage actions separate touch targets on a narrow phone', () => {
    cy.viewport(320, 844)
    cy.mount(
      <div style={{ height: 844, width: 320 }}>
        <TagsPage notes={notes} onSelectTag={cy.stub()} onRenameTag={cy.stub()} onDeleteTag={cy.stub()}
          managementBlockReason="Loaded 6 of 51 notes. Load more notes and check again."
          onLoadMoreNotes={cy.stub().as('loadMore')} onCheckNotes={cy.stub().as('checkNotes')} />
      </div>
    )
    cy.get('[data-testid="tag-coverage-status"]').within(() => {
      cy.contains('Counts are based on loaded and cached notes and may be incomplete.').should('be.visible')
      cy.get('[role="status"]').should('contain.text', 'Loaded 6 of 51 notes')
      cy.contains('button', 'Load more notes').should(($button) => {
        expect($button[0].getBoundingClientRect().height, 'load touch target').to.be.at.least(44)
      }).click()
      cy.contains('button', 'Check loaded notes').should(($button) => {
        expect($button[0].getBoundingClientRect().height, 'check touch target').to.be.at.least(44)
      }).click()
      cy.root().should(($panel) => {
        expect($panel[0].scrollWidth, 'no horizontal overflow').to.be.at.most($panel[0].clientWidth)
      })
    })
    cy.get('@loadMore').should('have.been.calledOnce')
    cy.get('@checkNotes').should('have.been.calledOnce')
    cy.get('[data-testid="tags-page"]').scrollTo('top')
    cy.screenshot('tags-coverage-320')
  })

  it('keeps busy tag coverage actions disabled and local-cache notices readable', () => {
    cy.viewport(390, 844)
    cy.document().then((doc) => { doc.documentElement.classList.add('dark') })
    cy.mount(
      <div style={{ height: 844, width: 390 }}>
        <TagsPage notes={notes} onSelectTag={cy.stub()} onRenameTag={cy.stub()} onDeleteTag={cy.stub()}
          managementNotice="Some cached notes have an unknown account and are kept locally."
          onLoadMoreNotes={cy.stub()} onCheckNotes={cy.stub()} loadingMoreNotes checkingNotes />
      </div>
    )
    cy.get('[data-testid="tag-coverage-status"]').within(() => {
      cy.contains('Some cached notes have an unknown account and are kept locally.').should('be.visible')
      cy.contains('button', 'Loading notes…').should('be.disabled').and('have.attr', 'aria-busy', 'true')
      cy.contains('button', 'Checking notes…').should('be.disabled').and('have.attr', 'aria-busy', 'true')
    })
    cy.screenshot('tags-coverage-busy-dark-390')
  })
})
