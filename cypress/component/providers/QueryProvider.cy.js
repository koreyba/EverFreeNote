import React from 'react'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { useQuery } from '@tanstack/react-query'

describe('QueryProvider Component', () => {
  it('renders children correctly', () => {
    cy.mount(
      <QueryProvider>
        <div data-cy="test-child">Test Content</div>
      </QueryProvider>
    )

    cy.get('[data-cy="test-child"]').should('be.visible').and('contain', 'Test Content')
  })

  it('provides QueryClient to children', () => {
    const TestComponent = () => {
      const { data, isLoading } = useQuery({
        queryKey: ['test'],
        queryFn: () => Promise.resolve('test data'),
      })

      if (isLoading) return <div>Loading...</div>
      return <div data-cy="query-result">{data}</div>
    }

    cy.mount(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    )

    cy.contains('Loading...').should('be.visible')
    cy.get('[data-cy="query-result"]').should('be.visible').and('contain', 'test data')
  })

  it('handles query errors gracefully', () => {
    const TestComponent = () => {
      const { error, isError } = useQuery({
        queryKey: ['error-test'],
        queryFn: () => Promise.reject(new Error('Test error')),
        retry: false,
      })

      if (isError) return <div data-cy="error-message">{error.message}</div>
      return <div>Success</div>
    }

    cy.mount(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    )

    cy.get('[data-cy="error-message"]').should('be.visible').and('contain', 'Test error')
  })

  it('supports multiple children', () => {
    cy.mount(
      <QueryProvider>
        <div data-cy="child-1">Child 1</div>
        <div data-cy="child-2">Child 2</div>
      </QueryProvider>
    )

    cy.get('[data-cy="child-1"]').should('be.visible')
    cy.get('[data-cy="child-2"]').should('be.visible')
  })
})

