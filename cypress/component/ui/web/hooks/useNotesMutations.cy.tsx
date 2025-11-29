import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SupabaseTestProvider } from '@/lib/providers/SupabaseProvider'
import { useCreateNote, useUpdateNote, useDeleteNote, useRemoveTag } from '../../../../../ui/web/hooks/useNotesMutations'
import type { SupabaseClient } from '@supabase/supabase-js'

const TestComponent = () => {
  const createMutation = useCreateNote()
  const updateMutation = useUpdateNote()
  const deleteMutation = useDeleteNote()
  const removeTagMutation = useRemoveTag()

  return (
    <div>
      <button data-cy="create-btn" onClick={() => createMutation.mutate({ title: 'New', description: 'Desc', tags: [], userId: 'user-1' })}>Create</button>
      <button data-cy="update-btn" onClick={() => updateMutation.mutate({ id: '1', title: 'Updated', description: 'Desc', tags: [] })}>Update</button>
      <button data-cy="delete-btn" onClick={() => deleteMutation.mutate('1')}>Delete</button>
      <button data-cy="remove-tag-btn" onClick={() => removeTagMutation.mutate({ noteId: '1', updatedTags: [] })}>Remove Tag</button>
    </div>
  )
}

describe('useNotesMutations', () => {
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

    // Spy on query client methods
    cy.spy(queryClient, 'cancelQueries').as('cancelQueries')
    cy.spy(queryClient, 'getQueryData').as('getQueryData')
    cy.spy(queryClient, 'setQueryData').as('setQueryData')
    cy.spy(queryClient, 'invalidateQueries').as('invalidateQueries')

    // Mock Supabase
    mockSupabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: cy.stub().resolves({ data: { id: 'temp-1', title: 'New' }, error: null })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: cy.stub().resolves({ data: { id: '1', title: 'Updated' }, error: null })
            })
          })
        }),
        delete: () => ({
          eq: cy.stub().resolves({ error: null })
        })
      })
    } as unknown as SupabaseClient
  })

  it('optimistically updates cache on create', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="create-btn"]').click()
    
    cy.get('@cancelQueries').should('have.been.calledWith', { queryKey: ['notes'] })
    cy.get('@setQueryData').should('have.been.calledWith', ['notes'])
    // Eventually invalidates
    cy.get('@invalidateQueries').should('have.been.calledWith', { queryKey: ['notes'] })
  })

  it('optimistically updates cache on update', () => {
    // Seed cache
    queryClient.setQueryData(['notes'], {
      pages: [{ notes: [{ id: '1', title: 'Original' }] }]
    })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="update-btn"]').click()
    
    cy.get('@setQueryData').should('have.been.called')
    cy.get('@invalidateQueries').should('have.been.called')
  })

  it('optimistically updates cache on delete', () => {
    // Seed cache
    queryClient.setQueryData(['notes'], {
      pages: [{ notes: [{ id: '1', title: 'Original' }] }]
    })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="delete-btn"]').click()
    
    cy.get('@setQueryData').should('have.been.called')
    cy.get('@invalidateQueries').should('have.been.called')
  })

  it('optimistically updates cache on remove tag', () => {
    // Seed cache
    queryClient.setQueryData(['notes'], {
      pages: [{ notes: [{ id: '1', title: 'Original', tags: ['tag1'] }] }]
    })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="remove-tag-btn"]').click()
    
    cy.get('@setQueryData').should('have.been.called')
    cy.get('@invalidateQueries').should('have.been.called')
  })

  it('rolls back on error', () => {
    // Seed cache so we have something to rollback to
    queryClient.setQueryData(['notes'], {
      pages: [{ notes: [] }]
    })

    // Mock error
    mockSupabase.from = () => ({
      insert: () => ({
        select: () => ({
          single: cy.stub().rejects(new Error('Failed'))
        })
      })
    })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="create-btn"]').click()
    
    // Should set data 3 times: 
    // 1. Initial seed (in test setup) - actually this is synchronous before spy? No, spy is set up in beforeEach.
    // Wait, setQueryData is called in test setup, but spy is set up in beforeEach.
    // So the spy will catch the seed call?
    // beforeEach runs before the test body.
    // So yes, the seed call will be recorded.
    // Then optimistic update (2nd call).
    // Then rollback (3rd call).
    // So we expect 3 calls.
    
    cy.get('@setQueryData').should('have.callCount', 3)
  })

  it('rolls back on update error', () => {
    // Seed cache
    queryClient.setQueryData(['notes'], {
      pages: [{ notes: [{ id: '1', title: 'Original' }] }]
    })

    // Mock error
    mockSupabase.from = () => ({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: cy.stub().rejects(new Error('Failed'))
          })
        })
      })
    })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="update-btn"]').click()
    
    // 1. Seed (in test)
    // 2. Optimistic update
    // 3. Rollback
    cy.get('@setQueryData').should('have.callCount', 3)
  })

  it('rolls back on delete error', () => {
    // Seed cache
    queryClient.setQueryData(['notes'], {
      pages: [{ notes: [{ id: '1', title: 'Original' }] }]
    })

    // Mock error
    mockSupabase.from = () => ({
      delete: () => ({
        eq: cy.stub().rejects(new Error('Failed'))
      })
    })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="delete-btn"]').click()
    
    cy.get('@setQueryData').should('have.callCount', 3)
  })

  it('rolls back on remove tag error', () => {
    // Seed cache
    queryClient.setQueryData(['notes'], {
      pages: [{ notes: [{ id: '1', title: 'Original', tags: ['tag1'] }] }]
    })

    // Mock error
    mockSupabase.from = () => ({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: cy.stub().rejects(new Error('Failed'))
          })
        })
      })
    })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="remove-tag-btn"]').click()
    
    cy.get('@setQueryData').should('have.callCount', 3)
  })

  it('handles empty cache on update', () => {
    // No seed
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="update-btn"]').click()
    
    // Should call setQueryData but return early or handle it gracefully
    // In implementation: if (!old?.pages) return old
    // So setQueryData is called, but the updater function returns old (undefined)
    cy.get('@setQueryData').should('have.been.called')
  })

  it('handles empty cache on delete', () => {
    // No seed
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="delete-btn"]').click()
    
    cy.get('@setQueryData').should('have.been.called')
  })
})
