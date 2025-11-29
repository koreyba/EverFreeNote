import React from 'react'
import { useInfiniteScroll } from '../../../../../ui/web/hooks/useInfiniteScroll'

interface TestComponentProps {
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  options?: { threshold?: number; rootMargin?: string }
}

const TestComponent = ({ fetchNextPage, hasNextPage, isFetchingNextPage, options }: TestComponentProps) => {
  const ref = useInfiniteScroll(fetchNextPage, hasNextPage, isFetchingNextPage, options)

  return (
    <div style={{ height: '200px', overflow: 'auto' }}>
      <div style={{ height: '500px' }}>Content</div>
      <div ref={ref} data-cy="sentinel" style={{ height: '20px', background: 'red' }}>Sentinel</div>
    </div>
  )
}

describe('useInfiniteScroll', () => {
  it('fetches next page when sentinel is visible', () => {
    const fetchNextPage = cy.stub().as('fetchNextPage')
    
    cy.mount(
      <TestComponent 
        fetchNextPage={fetchNextPage} 
        hasNextPage={true} 
        isFetchingNextPage={false} 
      />
    )

    // Scroll to bottom to make sentinel visible
    // Since we are using IntersectionObserver, we need to make sure the environment supports it.
    // Cypress browser (Chrome/Electron) supports it.
    // However, in component testing, the viewport might be large enough to show it immediately?
    // The container is 200px, content is 500px. So it should be hidden.
    
    cy.get('[data-cy="sentinel"]').should('not.be.visible')
    
    // Scroll the container
    cy.get('div').first().scrollTo('bottom')
    
    // Wait for observer to trigger
    cy.wait(100)
    
    cy.get('@fetchNextPage').should('have.been.called')
  })

  it('does not fetch if hasNextPage is false', () => {
    const fetchNextPage = cy.stub().as('fetchNextPage')
    
    cy.mount(
      <TestComponent 
        fetchNextPage={fetchNextPage} 
        hasNextPage={false} 
        isFetchingNextPage={false} 
      />
    )

    cy.get('div').first().scrollTo('bottom')
    cy.wait(100)
    
    cy.get('@fetchNextPage').should('not.have.been.called')
  })

  it('does not fetch if isFetchingNextPage is true', () => {
    const fetchNextPage = cy.stub().as('fetchNextPage')
    
    cy.mount(
      <TestComponent 
        fetchNextPage={fetchNextPage} 
        hasNextPage={true} 
        isFetchingNextPage={true} 
      />
    )

    cy.get('div').first().scrollTo('bottom')
    cy.wait(100)
    
    cy.get('@fetchNextPage').should('not.have.been.called')
  })

  it('respects custom options', () => {
    const fetchNextPage = cy.stub().as('fetchNextPage')
    
    // Use a large rootMargin to trigger early
    cy.mount(
      <TestComponent 
        fetchNextPage={fetchNextPage} 
        hasNextPage={true} 
        isFetchingNextPage={false}
        options={{ rootMargin: '500px' }}
      />
    )

    // Should trigger immediately because rootMargin is huge
    cy.wait(100)
    cy.get('@fetchNextPage').should('have.been.called')
  })
})
