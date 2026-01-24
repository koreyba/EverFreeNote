import React from 'react'
import { useNoteAppController } from '../../../ui/web/hooks/useNoteAppController'
import { QueryProvider } from '../../../ui/web/components/providers/QueryProvider'
import { SupabaseTestProvider } from '../../../ui/web/providers/SupabaseProvider'
import type { SupabaseClient } from '@supabase/supabase-js'

const TestComponent = () => {
  const controller = useNoteAppController()
  
  return (
    <div>
      <div data-cy="searchQuery">{controller.searchQuery}</div>
      <div data-cy="ftsResults-count">{controller.ftsResults?.length ?? 0}</div>
      <div data-cy="error">{controller.ftsData?.error || 'no-error'}</div>
      
      <button data-cy="search-special-btn" onClick={() => controller.handleSearch('test) query')}>Search Special</button>
      <button data-cy="search-code-btn" onClick={() => controller.handleSearch('function()')}>Search Code</button>
      <button data-cy="search-empty-sanitized-btn" onClick={() => controller.handleSearch(')))')}>Search Empty Sanitized</button>
      <button data-cy="search-simple-btn" onClick={() => controller.handleSearch('simple search')}>Search Simple</button>
      <button data-cy="search-comma-btn" onClick={() => controller.handleSearch('foo, bar')}>Search Comma</button>
    </div>
  )
}

describe('Search Robustness', () => {
  let mockSupabase: SupabaseClient

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getSession: cy.stub().resolves({ data: { session: { user: { id: 'test-user' } } }, error: null }),
        onAuthStateChange: cy.stub().returns({ data: { subscription: { unsubscribe: cy.stub() } } }),
      },
      from: cy.stub().returns({
        select: cy.stub().returnsThis(),
        order: cy.stub().returnsThis(),
        range: cy.stub().returnsThis(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        then: (resolve: any) => resolve({ data: [], error: null })
      }),
      rpc: cy.stub().resolves({ data: [], error: null })
    } as unknown as SupabaseClient
  })

  it('should handle simple text queries', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="search-simple-btn"]').click()
    cy.get('[data-cy="searchQuery"]').should('contain', 'simple search')
    cy.get('[data-cy="error"]').should('contain', 'no-error')
  })

  it('should handle special characters without crashing', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="search-special-btn"]').click()
    cy.get('[data-cy="searchQuery"]').should('contain', 'test) query')
    // If it crashes, the test will fail or the component will unmount
    cy.get('[data-cy="error"]').should('contain', 'no-error')
  })

  it('should handle code snippets', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="search-code-btn"]').click()
    cy.get('[data-cy="searchQuery"]').should('contain', 'function()')
    cy.get('[data-cy="error"]').should('contain', 'no-error')
  })

  it('should handle queries that become empty after sanitization', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="search-empty-sanitized-btn"]').click()
    // This is where we expect it to potentially crash currently
    cy.get('[data-cy="searchQuery"]').should('contain', ')))')
    cy.get('[data-cy="error"]').should('contain', 'no-error')
  })

  it('should handle comma in search query correctly', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="search-comma-btn"]').click()
    cy.get('[data-cy="searchQuery"]').should('contain', 'foo, bar')
    cy.get('[data-cy="error"]').should('contain', 'no-error')
  })
})
