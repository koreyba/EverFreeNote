import React from 'react'
import { AiSearchViewTabs } from '../../../../ui/web/components/features/search/AiSearchViewTabs'

const mockMatchMedia = (supportsHover: boolean) => {
  cy.window().then((win) => {
    const existing = win.matchMedia as unknown as { restore?: () => void }
    existing.restore?.()
    cy.stub(win, 'matchMedia').callsFake(() => ({
      matches: supportsHover,
      media: '(hover: hover) and (pointer: fine)',
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }))
  })
}

describe('AiSearchViewTabs', () => {
  it('switches between Notes and Chunks when enabled', () => {
    mockMatchMedia(true)

    const onChange = cy.stub().as('onChange')

    cy.mount(
      <AiSearchViewTabs
        value="note"
        onChange={onChange}
      />
    )

    cy.contains('button', 'Chunks').click()
    cy.get('@onChange').should('have.been.calledWith', 'chunk')
  })

  it('prevents switching when tabs are disabled', () => {
    mockMatchMedia(true)

    const onChange = cy.stub().as('onChange')

    cy.mount(
      <AiSearchViewTabs
        value="note"
        onChange={onChange}
        disabled
        disabledTitle="Remove selection to switch"
      />
    )

    cy.contains('button', 'Notes').should('be.disabled')
    cy.contains('button', 'Chunks').should('be.disabled')
    cy.contains('button', 'Chunks').click({ force: true })
    cy.get('@onChange').should('not.have.been.called')
  })

  it('toggles disabled hint on mobile tap and closes on outside tap', () => {
    mockMatchMedia(false)

    cy.mount(
      <div>
        <AiSearchViewTabs
          value="note"
          onChange={() => undefined}
          disabled
          disabledTitle="Remove selection to switch"
        />
        <button type="button">Outside</button>
      </div>
    )

    cy.get('[data-testid="ai-search-view-tabs-trigger"]')
      .trigger('pointerdown', { force: true, pointerType: 'touch' })
    cy.contains('Remove selection to switch').should('exist')
    cy.contains('Outside').click()
    cy.contains('Remove selection to switch').should('not.exist')
  })
})
