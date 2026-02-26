import React from 'react'
import { useNoteData } from '../../../../../ui/web/hooks/useNoteData'
import { QueryProvider } from '../../../../../ui/web/components/providers/QueryProvider'
import { SupabaseTestProvider } from '../../../../../ui/web/providers/SupabaseProvider'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CachedNote } from '../../../../../core/types/offline'
import { useNotesQuery } from '../../../../../ui/web/hooks/useNotesQuery'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SinonStub = any

interface TestComponentProps {
  offlineOverlay?: CachedNote[]
  selectedNoteIds?: Set<string>
  showFTSResults?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aggregatedFtsData?: any
}

const TestComponent = ({
  offlineOverlay = [],
  selectedNoteIds = new Set(),
  showFTSResults = false,
  aggregatedFtsData = undefined,
}: TestComponentProps) => {
  const notesQuery = useNotesQuery({ userId: 'test-user', searchQuery: '', selectedTag: null, enabled: true })

  const data = useNoteData({
    notesQuery,
    offlineOverlay,
    aggregatedFtsData,
    selectedNoteIds,
    showFTSResults,
  })

  return (
    <div>
      <div data-cy="notes-count">{data.notes.length}</div>
      <div data-cy="notes-by-id-size">{data.notesById.size}</div>
      <div data-cy="selected-count">{data.selectedCount}</div>
      <div data-cy="notes-displayed">{data.notesDisplayed}</div>
      <div data-cy="notes-total">{data.notesTotal}</div>
      <div data-cy="merged-fts-count">{data.mergedFtsData?.results.length ?? 'none'}</div>
      <div data-cy="note-0-title">{data.notes[0]?.title ?? 'none'}</div>
    </div>
  )
}

describe('useNoteData', () => {
  let mockSupabase: SupabaseClient
  let mockQueryBuilder: Record<string, SinonStub> & {
    then: (resolve: (res: { data: unknown[]; error: null; count: number }) => void) => void
  }

  const makeQueryBuilder = (notes: unknown[] = []) => ({
    select: cy.stub().returnsThis(),
    order: cy.stub().returnsThis(),
    range: cy.stub().returnsThis(),
    contains: cy.stub().returnsThis(),
    or: cy.stub().returnsThis(),
    insert: cy.stub().returnsThis(),
    update: cy.stub().returnsThis(),
    delete: cy.stub().returnsThis(),
    eq: cy.stub().returnsThis(),
    single: cy.stub().resolves({ data: null, error: null }),
    then: (resolve: (res: { data: unknown[]; error: null; count: number }) => void) =>
      resolve({ data: notes, error: null, count: notes.length }),
  })

  const makeSupabase = (notes: unknown[] = []): SupabaseClient => {
    mockQueryBuilder = makeQueryBuilder(notes)
    return {
      auth: {
        getSession: cy.stub().resolves({ data: { session: { user: { id: 'test-user' } } }, error: null }),
        onAuthStateChange: cy.stub().returns({ data: { subscription: { unsubscribe: cy.stub() } } }),
      },
      from: cy.stub().returns(mockQueryBuilder),
      rpc: cy.stub().resolves({ data: [], error: null }),
    } as unknown as SupabaseClient
  }

  beforeEach(() => {
    mockSupabase = makeSupabase([])
  })

  it('returns empty notes when query returns no data', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="notes-count"]').should('contain', '0')
    cy.get('[data-cy="notes-by-id-size"]').should('contain', '0')
    cy.get('[data-cy="selected-count"]').should('contain', '0')
  })

  it('applies offlineOverlay on top of server notes', () => {
    const serverNotes = [
      { id: 'note-1', title: 'Original Title', description: '', tags: [], user_id: 'test-user', created_at: '2024-01-01', updated_at: '2024-01-01' }
    ]
    mockSupabase = makeSupabase(serverNotes)

    const overlay: CachedNote[] = [{
      id: 'note-1',
      title: 'Updated Title',
      status: 'pending',
      updatedAt: new Date().toISOString(),
    }]

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent offlineOverlay={overlay} />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="note-0-title"]').should('contain', 'Updated Title')
  })

  it('builds notesById map from resolved notes', () => {
    const serverNotes = [
      { id: 'note-1', title: 'Note 1', description: '', tags: [], user_id: 'test-user', created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: 'note-2', title: 'Note 2', description: '', tags: [], user_id: 'test-user', created_at: '2024-01-01', updated_at: '2024-01-01' },
    ]
    mockSupabase = makeSupabase(serverNotes)

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="notes-by-id-size"]').should('contain', '2')
    cy.get('[data-cy="notes-count"]').should('contain', '2')
  })

  it('computes selectedCount from selectedNoteIds', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent selectedNoteIds={new Set(['a', 'b', 'c'])} />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="selected-count"]').should('contain', '3')
  })

  it('uses notes.length for notesDisplayed when showFTSResults is false', () => {
    const serverNotes = [
      { id: 'note-1', title: 'Note 1', description: '', tags: [], user_id: 'test-user', created_at: '2024-01-01', updated_at: '2024-01-01' },
    ]
    mockSupabase = makeSupabase(serverNotes)

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent showFTSResults={false} />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="notes-displayed"]').should('contain', '1')
  })

  it('uses FTS result count for notesDisplayed when showFTSResults is true', () => {
    const ftsData = {
      results: [
        { id: 'note-1', title: 'Note 1', description: '', tags: [], user_id: 'test-user', created_at: '2024-01-01', updated_at: '2024-01-01', rank: 1, headline: '' },
        { id: 'note-2', title: 'Note 2', description: '', tags: [], user_id: 'test-user', created_at: '2024-01-01', updated_at: '2024-01-01', rank: 2, headline: '' },
      ],
      total: 2,
      method: 'fts' as const,
      executionTime: 10,
      query: 'test'
    }

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent showFTSResults aggregatedFtsData={ftsData} />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="notes-displayed"]').should('contain', '2')
    cy.get('[data-cy="merged-fts-count"]').should('contain', '2')
  })

  it('returns undefined mergedFtsData when aggregatedFtsData is undefined', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent showFTSResults={false} aggregatedFtsData={undefined} />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="merged-fts-count"]').should('contain', 'none')
  })

  it('merges FTS results with offline overlay data', () => {
    const serverNotes = [
      { id: 'note-1', title: 'Server Title', description: '', tags: [], user_id: 'test-user', created_at: '2024-01-01', updated_at: '2024-01-01' },
    ]
    mockSupabase = makeSupabase(serverNotes)

    const overlay: CachedNote[] = [{
      id: 'note-1',
      title: 'Offline Title',
      status: 'pending',
      updatedAt: new Date().toISOString(),
    }]

    const ftsData = {
      results: [
        { id: 'note-1', title: 'FTS Title', description: '', tags: [], user_id: 'test-user', created_at: '2024-01-01', updated_at: '2024-01-01', rank: 1, headline: '' },
      ],
      total: 1,
      method: 'fts' as const,
      executionTime: 5,
      query: 'test'
    }

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent showFTSResults offlineOverlay={overlay} aggregatedFtsData={ftsData} />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    // FTS result should be merged with the offline overlay version (which has the latest updatedAt)
    cy.get('[data-cy="merged-fts-count"]').should('contain', '1')
  })
})
