import React from 'react'
import { NotesTabStrip } from '@ui/web/components/features/notes/NotesTabStrip'
import type { NoteWorkspaceTab } from '@core/services/noteWorkspaceTabs'

describe('Desktop notes tab strip', () => {
  it('keeps Add visible on the left, scrolls excess tabs, and preserves tab actions at capacity', () => {
    cy.viewport(1024, 600)
    const baseTab: NoteWorkspaceTab = {
      id: 'tab-0',
      noteId: null,
      note: null,
      mode: 'reading',
      draft: { title: 'Note 1', description: '', tags: '' },
      view: { scrollTop: 0 },
      saveState: 'saved',
      saveError: null,
    }
    const tabs = Array.from({ length: 12 }, (_, index) => ({
      ...baseTab,
      id: `tab-${index}`,
      draft: { ...baseTab.draft, title: `Note ${index + 1}` },
    }))
    const onActivateTab = cy.stub().as('activateTab')
    const onCloseTab = cy.stub().as('closeTab')

    cy.mount(
      <NotesTabStrip
        tabs={tabs}
        activeTabId={tabs[0].id}
        onAddTab={cy.stub()}
        onActivateTab={onActivateTab}
        onCloseTab={onCloseTab}
        maximumTabCount={32}
      />
    )

    // Overflowing the strip must not block opening more notes: the excess
    // scrolls and Add stays available until the shared 32-tab maximum.
    // (The scroll arrows depend on measured overflow, which this component
    // harness does not reproduce faithfully — they are covered in the jsdom
    // unit test where the viewport size is controlled directly.)
    cy.get('button[aria-label="Add note tab"]')
      .should('be.visible')
      .and('not.be.disabled')
      .parent()
      .children()
      .first()
      .should('have.attr', 'aria-label')
    cy.get('[aria-label="Open notes"]').should('have.class', 'overflow-x-auto')
    cy.get('button[title="Note 8"]').click()
    cy.get('button[title="Close Note 1"]').click()
    cy.get('@activateTab').should('have.been.calledWith', 'tab-7')
    cy.get('@closeTab').should('have.been.calledWith', 'tab-0')
  })
})
