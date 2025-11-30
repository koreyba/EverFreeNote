import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SupabaseTestProvider } from '@/lib/providers/SupabaseProvider'
import { useNotesQuery, useFlattenedNotes, useSearchNotes } from '../../../../../ui/web/hooks/useNotesQuery'
import type { SupabaseClient } from '@supabase/supabase-js'

interface TestComponentProps {
  userId?: string
  searchQuery?: string
  selectedTag?: string | null
}

const TestComponent = ({ userId, searchQuery, selectedTag }: TestComponentProps) => {
  const query = useNotesQuery({ userId, searchQuery, selectedTag })
  const notes = useFlattenedNotes(query)
  
  if (query.isLoading) return <div>Loading...</div>
  if (query.isError) return <div>Error: {query.error.message}</div>

  return (
    <div>
      <div data-cy="notes-count">{notes.length}</div>
      <ul>
        {notes.map((note) => (
          <li key={note.id} data-cy={`note-${note.id}`}>{note.title}</li>
        ))}
      </ul>
    </div>
  )
}

interface SearchTestComponentProps {
  query: string
  userId?: string
  options?: {
    language?: 'ru' | 'en' | 'uk'
    minRank?: number
    limit?: number
    offset?: number
    selectedTag?: string | null
    enabled?: boolean
  }
}

const SearchTestComponent = ({ query, userId, options }: SearchTestComponentProps) => {
  const searchQuery = useSearchNotes(query, userId, options)

  if (searchQuery.isLoading) return <div>Searching...</div>
  if (searchQuery.isError) return <div>Search Error: {searchQuery.error.message}</div>
  if (!searchQuery.data) return <div>No Data</div>

  return (
    <div>
      <div data-cy="search-count">{searchQuery.data.results.length}</div>
      <ul>
        {searchQuery.data.results.map((note) => (
          <li key={note.id} data-cy={`search-note-${note.id}`}>{note.title}</li>
        ))}
      </ul>
    </div>
  )
}

describe('useNotesQuery', () => {
  let mockSupabase: SupabaseClient
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    // Helper to create a chainable mock
    const createChain = (finalResult: { data: unknown[]; error: unknown; count?: number }) => {
      const chain = {
        select: cy.stub().returnsThis(),
        order: cy.stub().returnsThis(),
        range: cy.stub().resolves(finalResult),
        eq: cy.stub().returnsThis(),
        contains: cy.stub().returnsThis(),
        or: cy.stub().returnsThis(),
        then: (cb: (res: typeof finalResult) => void) => cb(finalResult) // For await
      }
      // Make methods return the chain itself
      chain.select.returns(chain)
      chain.order.returns(chain)
      chain.eq.returns(chain)
      chain.contains.returns(chain)
      chain.or.returns(chain)
      return chain
    }

    mockSupabase = {
      from: cy.stub().returns(createChain({ data: [{ id: '1', title: 'Note 1' }], error: null, count: 1 })),
      rpc: cy.stub().resolves({ data: [{ id: '2', title: 'Search Result', rank: 0.5 }], error: null })
    } as unknown as SupabaseClient
  })

  it('fetches notes successfully', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <TestComponent userId="user-1" />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="notes-count"]').should('contain', '1')
    cy.get('[data-cy="note-1"]').should('contain', 'Note 1')
  })

  it('handles empty data in useFlattenedNotes', () => {
    const createChain = (finalResult: { data: unknown[]; error: unknown; count?: number }) => {
      const chain = {
        select: cy.stub().returnsThis(),
        order: cy.stub().returnsThis(),
        range: cy.stub().resolves(finalResult),
        eq: cy.stub().returnsThis(),
        contains: cy.stub().returnsThis(),
        or: cy.stub().returnsThis(),
        then: (cb: (res: typeof finalResult) => void) => cb(finalResult)
      }
      chain.select.returns(chain)
      chain.order.returns(chain)
      chain.eq.returns(chain)
      chain.contains.returns(chain)
      chain.or.returns(chain)
      return chain
    }

    mockSupabase.from = cy.stub().returns(createChain({ data: [], error: null, count: 0 }))

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <TestComponent userId="user-1" />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="notes-count"]').should('contain', '0')
  })

  it('searches notes successfully', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <SearchTestComponent query="test" userId="user-1" />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="search-count"]').should('contain', '1')
    cy.get('[data-cy="search-note-2"]').should('contain', 'Search Result')
  })

  it('does not search if query is too short', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <SearchTestComponent query="te" userId="user-1" />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    // Should be in "No Data" state because query is disabled
    cy.contains('No Data').should('be.visible')
    // RPC should not be called
    expect(mockSupabase.rpc).to.not.be.called
  })

  it('throws error if userId is missing for search', () => {
    // We need to suppress the error boundary or catch it
    // But useQuery throws in the queryFn. React Query handles this by setting isError.
    // However, we need to enable the query first.
    // If userId is missing, isValidQuery is false, so enabled is false.
    // So it won't run.
    
    // Let's force enable it to test the error?
    // The hook logic: enabled: !!(enabled && isValidQuery)
    // isValidQuery checks userId.
    // So we can't easily force it to run without userId unless we bypass the hook logic.
    // But we can test that it DOESN'T run.
    
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <SearchTestComponent query="test" userId={undefined} />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.contains('No Data').should('be.visible')
    expect(mockSupabase.rpc).to.not.be.called
  })

  it('detects browser language correctly', () => {
    // Mock navigator.language
    Object.defineProperty(window.navigator, 'language', {
      value: 'en-US',
      configurable: true
    })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <SearchTestComponent query="test" userId="user-1" />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    // Check if rpc was called with 'english'
    // We need to wait for the debounce and query
    // Actually, we can just check the spy call arguments
    // But we need to ensure the query ran.
    cy.get('[data-cy="search-count"]').should('exist')
    
    // Check the spy
    // rpc(method, args)
    // args: { search_language: 'english', ... }
    // 'en' -> 'english'
    cy.wrap(mockSupabase.rpc).should('have.been.calledWithMatch', 'search_notes_fts', {
      search_language: 'english'
    })
  })
})
