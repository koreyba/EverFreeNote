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
    <div data-cy="scroll-container" style={{ height: '200px', overflow: 'auto' }}>
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

    cy.get('[data-cy="sentinel"]').should('not.be.visible')
    
    // Scroll the container
    cy.get('[data-cy="scroll-container"]').scrollTo('bottom')
    
    // Wait for observer to trigger
    cy.wait(200)
    
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

    cy.get('[data-cy="scroll-container"]').scrollTo('bottom')
    cy.wait(200)
    
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

    cy.get('[data-cy="scroll-container"]').scrollTo('bottom')
    cy.wait(200)
    
    cy.get('@fetchNextPage').should('not.have.been.called')
  })

  it('respects custom options', () => {
    const fetchNextPage = cy.stub().as('fetchNextPage')
    
    // Spy on IntersectionObserver
    cy.window().then((win) => {
      cy.spy(win, 'IntersectionObserver').as('intersectionObserver')
    })

    cy.mount(
      <TestComponent 
        fetchNextPage={fetchNextPage} 
        hasNextPage={true} 
        isFetchingNextPage={false}
        options={{ rootMargin: '500px', threshold: 0.5 }}
      />
    )

    cy.get('@intersectionObserver').should('have.been.calledWith', Cypress.sinon.match.any, {
      root: null,
      rootMargin: '500px',
      threshold: 0.5
    })
  })
})
