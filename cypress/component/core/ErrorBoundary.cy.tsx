import React from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { browser } from '@ui/web/adapters/browser'

// Component that throws an error
const ThrowError = ({ shouldThrow, errorMessage = 'Test error' }: { shouldThrow: boolean, errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage)
  }
  return <div data-cy="child-component">Child rendered successfully</div>
}

// Component that throws async error
const ThrowAsyncError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      throw new Error('Async error in useEffect')
    }
  }, [shouldThrow])
  
  return <div data-cy="async-component">Async component</div>
}

describe('ErrorBoundary Component', () => {
  const suppress = () => cy.on('uncaught:exception', () => false)

  it('renders children normally when no error occurs', () => {
    cy.mount(
      <ErrorBoundary>
        <div data-cy="test-child">Test Content</div>
      </ErrorBoundary>
    )

    // Verify child component renders
    cy.get('[data-cy="test-child"]').should('be.visible')
    cy.get('[data-cy="test-child"]').should('contain', 'Test Content')
  })

  it('catches render errors and displays fallback UI', () => {
    suppress()

    cy.mount(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Verify fallback UI is displayed
    cy.contains('Something went wrong').should('be.visible')
    cy.contains('Test error').should('be.visible')
  })

  it('displays error message in fallback UI', () => {
    suppress()

    const customError = 'Custom error message for testing'
    
    cy.mount(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage={customError} />
      </ErrorBoundary>
    )

    // Verify custom error message is shown
    cy.contains(customError).should('be.visible')
  })

  it('catches async errors from useEffect', () => {
    suppress()

    cy.mount(
      <ErrorBoundary>
        <ThrowAsyncError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Verify fallback UI is displayed for async errors
    cy.contains('Something went wrong').should('be.visible')
    cy.contains('Async error in useEffect').should('be.visible')
  })

  it('renders error boundary with fallback UI structure', () => {
    suppress()

    cy.mount(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Verify error boundary fallback structure
    cy.contains('Something went wrong').should('be.visible')
    cy.contains('Reload Application').should('be.visible')
    cy.contains('Go Back').should('be.visible')
  })

  it('does not affect sibling components outside error boundary', () => {
    suppress()

    cy.mount(
      <div>
        <div data-cy="sibling-before">Before ErrorBoundary</div>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
        <div data-cy="sibling-after">After ErrorBoundary</div>
      </div>
    )

    // Verify siblings still render
    cy.get('[data-cy="sibling-before"]').should('be.visible')
    cy.get('[data-cy="sibling-after"]').should('be.visible')
    
    // Verify error is caught
    cy.contains('Something went wrong').should('be.visible')
  })

  it('handles multiple children correctly', () => {
    cy.mount(
      <ErrorBoundary>
        <div data-cy="child-1">Child 1</div>
        <div data-cy="child-2">Child 2</div>
        <div data-cy="child-3">Child 3</div>
      </ErrorBoundary>
    )

    // Verify all children render
    cy.get('[data-cy="child-1"]').should('be.visible')
    cy.get('[data-cy="child-2"]').should('be.visible')
    cy.get('[data-cy="child-3"]').should('be.visible')
  })

  it('shows error details in development mode', () => {
    suppress()

    cy.mount(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Detailed error for dev" />
      </ErrorBoundary>
    )

    // Verify error details are shown
    cy.contains('Detailed error for dev').should('be.visible')
  })

  it('reloads page when clicking Reload Application', () => {
    suppress()

    const reload = cy.stub().as('reload')
    Object.defineProperty(browser, 'location', {
      configurable: true,
      value: { reload, origin: '', search: '' }
    })

    cy.mount(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    cy.contains('Reload Application').click()
    cy.get('@reload').should('have.been.called')
  })

  it('navigates back when clicking Go Back', () => {
    suppress()

    cy.window().then((win) => {
      cy.stub(win.history, 'back').as('back')
    })

    cy.mount(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    cy.contains('Go Back').click()
    cy.get('@back').should('have.been.called')
  })
})

