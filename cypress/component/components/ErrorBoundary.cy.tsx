import React from 'react'
import { ErrorBoundary } from '@ui/web/components/ErrorBoundary'
import { browser } from '@ui/web/adapters/browser'

const ThrowingComponent = () => {
  throw new Error('Test Error')
  return <div>Should not render</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    cy.mount(
      <ErrorBoundary>
        <div>Safe Content</div>
      </ErrorBoundary>
    )
    cy.contains('Safe Content').should('be.visible')
  })

  it('catches error and shows fallback UI', () => {
    // Prevent React from logging the error to console during test
    cy.on('uncaught:exception', () => false)

    cy.mount(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    cy.contains('Something went wrong').should('be.visible')
    cy.contains('Reload Application').should('be.visible')
  })

  it('reloads page on button click', () => {
    cy.on('uncaught:exception', () => false)
    
    // Mock browser.location.reload
    // Since browser.location is a getter returning window.location, we need to be careful.
    // We can try to override the getter on the browser object itself.
    const reloadSpy = cy.spy().as('reload')
    
    // We need to override the property on the instance to shadow the class getter
    Object.defineProperty(browser, 'location', {
      value: {
        reload: reloadSpy,
        origin: 'http://localhost:3000',
        search: ''
      },
      writable: true,
      configurable: true
    })

    cy.mount(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    cy.contains('Reload Application').click()
    cy.get('@reload').should('have.been.called')
  })
})
