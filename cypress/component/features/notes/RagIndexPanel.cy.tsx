import React from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { RagIndexPanel } from '../../../../ui/web/components/features/notes/RagIndexPanel'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../../../ui/web/components/ui/dropdown-menu'

type EmbeddingRow = {
  chunk_index: number
  indexed_at: string
}

function createSupabaseForRag(rows: EmbeddingRow[], invokeImpl?: (name: string, params: unknown) => Promise<unknown>) {
  const invoke = cy.stub().callsFake((name: string, params: unknown) => {
    if (invokeImpl) return invokeImpl(name, params)
    if (name === 'rag-index') {
      return Promise.resolve({ data: { chunkCount: rows.length }, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  })

  const eqUser = cy.stub().callsFake((field: string, value: string) => {
    expect(field).to.eq('user_id')
    expect(value).to.eq('user-1')
    return Promise.resolve({ data: rows, error: null })
  })

  const eqNote = cy.stub().callsFake((field: string, value: string) => {
    expect(field).to.eq('note_id')
    expect(value).to.eq('note-1')
    return { eq: eqUser }
  })

  const select = cy.stub().returns({ eq: eqNote })
  const from = cy.stub().callsFake((table: string) => {
    expect(table).to.eq('note_embeddings')
    return { select }
  })

  const supabase = {
    functions: { invoke },
    from,
    auth: {
      getUser: cy.stub().resolves({ data: { user: { id: 'user-1' } }, error: null }),
      getSession: cy.stub().resolves({ data: { session: { user: { id: 'user-1' } } }, error: null }),
      onAuthStateChange: cy.stub().returns({ data: { subscription: { unsubscribe: cy.stub() } } }),
      signOut: cy.stub().resolves({ error: null }),
      signInWithOAuth: cy.stub().resolves({ data: null, error: null }),
    },
  } as unknown as SupabaseClient

  return { supabase, invoke, from, select, eqNote, eqUser }
}

describe('RagIndexPanel Component', () => {
  const testUser = { id: 'user-1' } as User

  it('renders unindexed state', () => {
    const { supabase, from, select, eqNote, eqUser } = createSupabaseForRag([])

    cy.mount(
      <SupabaseTestProvider supabase={supabase} user={testUser}>
        <RagIndexPanel noteId="note-1" />
      </SupabaseTestProvider>
    )

    cy.contains('button', 'RAG Index').should('be.visible')
    cy.get('[data-cy="note-delete-index-button"]').should('be.disabled')
    cy.contains('Not indexed').should('be.visible')
    cy.wrap(from).should('have.been.calledWith', 'note_embeddings')
    cy.wrap(select).should('have.been.calledWith', 'chunk_index, indexed_at')
    cy.wrap(eqNote).should('have.been.calledWith', 'note_id', 'note-1')
    cy.wrap(eqUser).should('have.been.calledWith', 'user_id', 'user-1')
  })

  it('renders indexed state and enables delete-index', () => {
    const rows: EmbeddingRow[] = [
      { chunk_index: 0, indexed_at: '2026-03-02T20:00:00.000Z' },
      { chunk_index: 1, indexed_at: '2026-03-02T20:00:00.000Z' },
    ]
    const { supabase } = createSupabaseForRag(rows)

    cy.mount(
      <SupabaseTestProvider supabase={supabase} user={testUser}>
        <RagIndexPanel noteId="note-1" />
      </SupabaseTestProvider>
    )

    cy.contains('button', 'Re-index').should('be.visible')
    cy.get('[data-cy="note-delete-index-button"]').should('not.be.disabled')
    cy.contains('2 chunks').should('be.visible')
  })

  it('invokes rag-index with action=index', () => {
    const { supabase, invoke } = createSupabaseForRag([], async (name: string, params: unknown) => {
      expect(name).to.eq('rag-index')
      expect(params).to.deep.eq({ body: { noteId: 'note-1', action: 'index' } })
      return { data: { chunkCount: 3 }, error: null }
    })

    cy.mount(
      <SupabaseTestProvider supabase={supabase} user={testUser}>
        <RagIndexPanel noteId="note-1" />
      </SupabaseTestProvider>
    )

    cy.contains('button', 'RAG Index').click()
    cy.wrap(invoke).should('have.been.calledWith', 'rag-index', {
      body: { noteId: 'note-1', action: 'index' },
    })
  })

  it('invokes rag-index with action=reindex when already indexed', () => {
    const rows: EmbeddingRow[] = [{ chunk_index: 0, indexed_at: '2026-03-02T20:00:00.000Z' }]
    const { supabase, invoke } = createSupabaseForRag(rows, async (name: string, params: unknown) => {
      expect(name).to.eq('rag-index')
      expect(params).to.deep.eq({ body: { noteId: 'note-1', action: 'reindex' } })
      return { data: { chunkCount: 1 }, error: null }
    })

    cy.mount(
      <SupabaseTestProvider supabase={supabase} user={testUser}>
        <RagIndexPanel noteId="note-1" />
      </SupabaseTestProvider>
    )

    cy.contains('button', 'Re-index').click()
    cy.wrap(invoke).should('have.been.calledWith', 'rag-index', {
      body: { noteId: 'note-1', action: 'reindex' },
    })
  })

  it('shows confirmation dialog before deleting index', () => {
    const rows: EmbeddingRow[] = [{ chunk_index: 0, indexed_at: '2026-03-02T20:00:00.000Z' }]
    const { supabase, invoke } = createSupabaseForRag(rows)

    cy.mount(
      <SupabaseTestProvider supabase={supabase} user={testUser}>
        <RagIndexPanel noteId="note-1" />
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="note-delete-index-button"]').should('not.be.disabled').click()
    cy.contains('Remove from AI index?').should('be.visible')
    // cancelling should not invoke the function
    cy.contains('button', 'Cancel').click()
    cy.wrap(invoke).should('not.have.been.called')
  })

  it('invokes rag-index with action=delete after confirming', () => {
    const rows: EmbeddingRow[] = [{ chunk_index: 0, indexed_at: '2026-03-02T20:00:00.000Z' }]
    const { supabase, invoke } = createSupabaseForRag(rows, async (name: string, params: unknown) => {
      expect(name).to.eq('rag-index')
      expect(params).to.deep.eq({ body: { noteId: 'note-1', action: 'delete' } })
      return { data: { deleted: true }, error: null }
    })

    cy.mount(
      <SupabaseTestProvider supabase={supabase} user={testUser}>
        <RagIndexPanel noteId="note-1" />
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="note-delete-index-button"]').should('not.be.disabled').click()
    cy.contains('Remove from AI index?').should('be.visible')
    cy.get('[data-cy="note-delete-index-confirm"]').click()
    cy.wrap(invoke).should('have.been.calledWith', 'rag-index', {
      body: { noteId: 'note-1', action: 'delete' },
    })
  })
})

describe('RagIndexPanel (variant=menu)', () => {
  const testUser = { id: 'user-1' } as User

  function mountMenuVariant({
    rows = [] as EmbeddingRow[],
    onMenuClose = cy.stub() as Cypress.Agent<sinon.SinonStub>,
    invokeImpl,
  }: {
    rows?: EmbeddingRow[]
    onMenuClose?: Cypress.Agent<sinon.SinonStub>
    invokeImpl?: (name: string, params: unknown) => Promise<unknown>
  } = {}) {
    const { supabase } = createSupabaseForRag(rows, invokeImpl)
    cy.mount(
      <SupabaseTestProvider supabase={supabase} user={testUser}>
        {/* defaultOpen keeps DropdownMenuContent mounted for the duration of the test */}
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger asChild>
            <button type="button">Open</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <RagIndexPanel noteId="note-1" variant="menu" onMenuClose={onMenuClose} />
          </DropdownMenuContent>
        </DropdownMenu>
      </SupabaseTestProvider>
    )
    return { supabase }
  }

  it('renders status label and action items when not indexed', () => {
    mountMenuVariant({ rows: [] })
    cy.contains('AI index: Not indexed').should('be.visible')
    cy.contains('[role="menuitem"]', 'Index note').should('be.visible')
    cy.get('[data-cy="note-delete-index-button"]').should('be.disabled')
  })

  it('renders indexed state with chunk count', () => {
    const rows: EmbeddingRow[] = [
      { chunk_index: 0, indexed_at: '2026-03-02T20:00:00.000Z' },
      { chunk_index: 1, indexed_at: '2026-03-02T20:00:00.000Z' },
    ]
    mountMenuVariant({ rows })
    cy.contains('2 chunks').should('be.visible')
    cy.contains('[role="menuitem"]', 'Re-index').should('be.visible')
    cy.get('[data-cy="note-delete-index-button"]').should('not.be.disabled')
  })

  it('keeps dropdown mounted while AlertDialog is shown (onSelect preventDefault)', () => {
    // This is the core regression test for the bug where the confirm dialog
    // would flash and disappear because DropdownMenuContent was unmounting before
    // the AlertDialog could render.
    const rows: EmbeddingRow[] = [{ chunk_index: 0, indexed_at: '2026-03-02T20:00:00.000Z' }]
    const onMenuClose = cy.stub().as('onMenuClose')
    mountMenuVariant({ rows, onMenuClose })

    cy.get('[data-cy="note-delete-index-button"]').click()

    // Dropdown must still be mounted — the item still exists in the DOM
    cy.get('[data-cy="note-delete-index-button"]').should('exist')
    // AlertDialog must be visible
    cy.contains('Remove from AI index?').should('be.visible')
    // onMenuClose must NOT have fired yet
    cy.get('@onMenuClose').should('not.have.been.called')
  })

  it('calls onMenuClose when confirmation dialog is cancelled', () => {
    const rows: EmbeddingRow[] = [{ chunk_index: 0, indexed_at: '2026-03-02T20:00:00.000Z' }]
    const onMenuClose = cy.stub().as('onMenuClose')
    mountMenuVariant({ rows, onMenuClose })

    cy.get('[data-cy="note-delete-index-button"]').click()
    cy.contains('Remove from AI index?').should('be.visible')
    cy.contains('button', 'Cancel').click()

    cy.get('@onMenuClose').should('have.been.calledOnce')
  })

  it('calls onMenuClose after confirmed delete', () => {
    const rows: EmbeddingRow[] = [{ chunk_index: 0, indexed_at: '2026-03-02T20:00:00.000Z' }]
    const onMenuClose = cy.stub().as('onMenuClose')
    mountMenuVariant({
      rows,
      onMenuClose,
      invokeImpl: async () => ({ data: { deleted: true }, error: null }),
    })

    cy.get('[data-cy="note-delete-index-button"]').click()
    cy.get('[data-cy="note-delete-index-confirm"]').click()

    cy.get('@onMenuClose').should('have.been.calledOnce')
  })

  it('invokes rag-index with action=index from menu item', () => {
    const { supabase } = createSupabaseForRag([], async (name, params) => {
      expect(name).to.eq('rag-index')
      expect(params).to.deep.eq({ body: { noteId: 'note-1', action: 'index' } })
      return { data: { chunkCount: 2 }, error: null }
    })
    const onMenuClose = cy.stub().as('onMenuClose')
    cy.mount(
      <SupabaseTestProvider supabase={supabase} user={testUser}>
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger asChild><button type="button">Open</button></DropdownMenuTrigger>
          <DropdownMenuContent>
            <RagIndexPanel noteId="note-1" variant="menu" onMenuClose={onMenuClose} />
          </DropdownMenuContent>
        </DropdownMenu>
      </SupabaseTestProvider>
    )
    cy.contains('[role="menuitem"]', 'Index note').click()
    cy.wrap(supabase.functions.invoke).should('have.been.calledWith', 'rag-index', {
      body: { noteId: 'note-1', action: 'index' },
    })
    // onMenuClose called after operation settles — dropdown closes only then
    cy.get('@onMenuClose').should('have.been.calledOnce')
  })
})

