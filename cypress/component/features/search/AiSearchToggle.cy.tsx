import React from 'react'
import { AiSearchToggle } from '../../../../ui/web/components/features/search/AiSearchToggle'

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

describe('AiSearchToggle', () => {
  it('is disabled without API key and does not toggle state', () => {
    mockMatchMedia(true)

    const onChange = cy.stub().as('onChange')

    cy.mount(
      <AiSearchToggle
        enabled={false}
        hasApiKey={false}
        onChange={onChange}
      />
    )

    cy.get('[aria-label="Toggle AI RAG Search"]').should('be.disabled')
    cy.get('[aria-label="Toggle AI RAG Search"]').click({ force: true })
    cy.get('@onChange').should('not.have.been.called')
  })

  it('blocks switching when disabled by active selection', () => {
    mockMatchMedia(true)

    const onChange = cy.stub().as('onChange')

    cy.mount(
      <AiSearchToggle
        enabled
        hasApiKey
        onChange={onChange}
        disabled
        disabledTitle="Remove selection to switch"
      />
    )

    cy.get('[aria-label="Toggle AI RAG Search"]').should('be.disabled')
    cy.get('[aria-label="Toggle AI RAG Search"]').click({ force: true })
    cy.get('@onChange').should('not.have.been.called')
  })

  it('toggles blocked-switch hint on mobile tap and closes on outside tap', () => {
    mockMatchMedia(false)

    cy.mount(
      <div>
        <AiSearchToggle
          enabled
          hasApiKey
          onChange={() => undefined}
          disabled
          disabledTitle="Remove selection to switch"
        />
        <button type="button">Outside</button>
      </div>
    )

    cy.get('[data-testid="ai-search-toggle-trigger"]').click({ force: true })
    cy.contains('Remove selection to switch').should('exist')

    cy.contains('Outside').click()
    cy.contains('Remove selection to switch').should('not.exist')
  })

  it('keeps info tooltip open on first mobile tap', () => {
    mockMatchMedia(false)

    cy.mount(<AiSearchToggle enabled={false} hasApiKey onChange={() => undefined} />)

    cy.get('[aria-label="About AI RAG Search"]').click({ force: true })
    cy.contains('semantic (vector) similarity').should('exist')
    cy.get('[aria-label="About AI RAG Search"]').click({ force: true })
    // "Press Enter..." is a mobile secondary hint inside the info tooltip.
    cy.get('[data-testid="ai-search-toggle-info-hint"]').should('not.exist')
  })
})
