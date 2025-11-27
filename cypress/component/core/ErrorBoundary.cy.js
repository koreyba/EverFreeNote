// @ts-check
import React from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Component that throws an error
const ThrowError = ({ shouldThrow, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage)
  }
  return <div data-cy="child-component">Child rendered successfully</div>
}

// Component that throws async error
const ThrowAsyncError = ({ shouldThrow }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      throw new Error('Async error in useEffect')
    }
  }, [shouldThrow])
  
  return <div data-cy="async-component">Async component</div>
}

describe('ErrorBoundary Component', () => {
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
    // Suppress error console output for cleaner test logs
    cy.on('uncaught:exception', () => false)

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
    cy.on('uncaught:exception', () => false)

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
    cy.on('uncaught:exception', () => false)

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
    cy.on('uncaught:exception', () => false)

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
    cy.on('uncaught:exception', () => false)

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
    cy.on('uncaught:exception', () => false)

    cy.mount(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Detailed error for dev" />
      </ErrorBoundary>
    )

    // Verify error details are shown
    cy.contains('Detailed error for dev').should('be.visible')
  })
})

