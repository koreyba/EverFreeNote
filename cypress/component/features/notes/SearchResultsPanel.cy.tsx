import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'
import { SearchResultsPanel } from '../../../../ui/web/components/features/notes/SearchResultsPanel'
import type { NoteViewModel, SearchResult } from '../../../../core/types/domain'
import type { NoteAppController } from '../../../../ui/web/hooks/useNoteAppController'

const createFtsResult = (id: string, title: string): SearchResult => ({
  id,
  title,
  description: 'Description',
  content: 'Content',
  tags: ['tag'],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  user_id: 'user-1',
  rank: 0.73,
  headline: 'headline',
})

const createTagOnlyNote = (id: string, title: string): NoteViewModel => ({
  id,
  title,
  description: 'Tag-only description',
  tags: ['tag-only'],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  user_id: 'user-1',
})

const createController = (overrides: Partial<NoteAppController> = {}): NoteAppController => {
  const controller = {
    searchQuery: 'query',
    filterByTag: null,
    ftsSearchResult: { isLoading: false, refetch: cy.stub() },
    showFTSResults: true,
    ftsData: {
      total: 2,
      executionTime: 10,
      results: [
        createFtsResult('note-1', 'Result One'),
        createFtsResult('note-2', 'Result Two'),
      ],
    },
    ftsHasMore: false,
    ftsLoadingMore: false,
    showTagOnlyResults: false,
    tagOnlyResults: [],
    tagOnlyTotal: 0,
    tagOnlyLoading: false,
    tagOnlyHasMore: false,
    tagOnlyLoadingMore: false,
    selectedNote: null,
    handleSelectNote: cy.stub(),
    handleTagClick: cy.stub(),
    handleSearchResultClick: cy.stub(),
    loadMoreFts: cy.stub(),
    loadMoreTagOnly: cy.stub(),
    handleSearch: cy.stub(),
    handleClearTagFilter: cy.stub(),
    deleteNotesByIds: cy.stub().resolves({ total: 1, failed: 0, queuedOffline: false }),
    resetFtsResults: cy.stub(),
    resetAIResults: cy.stub(),
    registerAIPaginationControls: cy.stub(),
    loadMoreAI: cy.stub(),
  }

  return { ...controller, ...overrides } as unknown as NoteAppController
}

const mountPanel = (
  controller: NoteAppController,
  options: {
    hasGeminiApiKey?: boolean
    supabase?: SupabaseClient
  } = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  const defaultSupabase = {
    auth: {
      getUser: cy.stub().resolves({ data: { user: { id: 'user-1' } }, error: null }),
    },
    functions: {
      invoke: cy.stub().resolves({ data: { chunks: [] }, error: null }),
    },
  } as unknown as SupabaseClient

  cy.mount(
    <SupabaseTestProvider supabase={(options.supabase ?? defaultSupabase) as SupabaseClient}>
      <QueryClientProvider client={queryClient}>
        <div className="h-[680px] w-[680px]">
          <SearchResultsPanel
            controller={controller}
            hasGeminiApiKey={options.hasGeminiApiKey ?? false}
            onOpenInContext={() => undefined}
            onClose={() => undefined}
          />
        </div>
      </QueryClientProvider>
    </SupabaseTestProvider>
  )
}

describe('SearchResultsPanel', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.removeItem('everfreenote:aiSearchMode')
    })
  })

  it('opens confirmation before delete and resets FTS results on confirmed delete', () => {
    const controller = createController()

    mountPanel(controller)

    cy.contains('Result One')
      .closest('[data-testid="note-card"]')
      .find('[role="checkbox"]')
      .click({ force: true })

    cy.contains('button', 'Delete (1)').click({ force: true })
    cy.wrap(controller.deleteNotesByIds).should('not.have.been.called')

    cy.contains('Delete selected notes').should('be.visible')
    cy.get('input[placeholder="1"]').clear().type('1')
    cy.get('[role="alertdialog"]')
      .contains('button', /^Delete$/)
      .click({ force: true })

    cy.wrap(controller.deleteNotesByIds).should('have.been.calledWithMatch', ['note-1'])
    cy.wrap(controller.resetFtsResults).should('have.been.calledOnce')
    cy.wrap(controller.resetAIResults).should('not.have.been.called')
  })

  it('resets AI results after confirmed delete in AI notes mode', () => {
    cy.window().then((win) => {
      win.localStorage.setItem(
        'everfreenote:aiSearchMode',
        JSON.stringify({ isAIEnabled: true, preset: 'strict', viewMode: 'note' })
      )
    })

    const controller = createController({
      showFTSResults: false,
      ftsData: undefined,
      searchQuery: 'ontology',
    })

    const invoke = cy.stub().resolves({
      data: {
        chunks: [
          {
            noteId: 'ai-note-1',
            noteTitle: 'AI Result One',
            noteTags: ['ontology'],
            chunkIndex: 0,
            charOffset: 0,
            content: 'Ontology explanation',
            similarity: 0.84,
          },
          {
            noteId: 'ai-note-2',
            noteTitle: 'AI Result Two',
            noteTags: ['philosophy'],
            chunkIndex: 0,
            charOffset: 0,
            content: 'Second chunk',
            similarity: 0.78,
          },
        ],
      },
      error: null,
    })

    const supabase = {
      auth: {
        getUser: cy.stub().resolves({ data: { user: { id: 'user-1' } }, error: null }),
      },
      functions: { invoke },
    } as unknown as SupabaseClient

    mountPanel(controller, { hasGeminiApiKey: true, supabase })

    cy.contains('AI Result One')
      .closest('article')
      .find('[role="checkbox"]')
      .click({ force: true })

    cy.contains('button', 'Delete (1)').click({ force: true })
    cy.get('input[placeholder="1"]').clear().type('1')
    cy.get('[role="alertdialog"]')
      .contains('button', /^Delete$/)
      .click({ force: true })

    cy.wrap(controller.deleteNotesByIds).should('have.been.calledWithMatch', ['ai-note-1'])
    cy.wrap(controller.resetAIResults).should('have.been.calledOnce')
    cy.wrap(controller.resetFtsResults).should('not.have.been.called')
  })

  it('select all in FTS mode selects all visible ids for deletion', () => {
    const controller = createController()

    mountPanel(controller)

    cy.contains('Result One')
      .closest('[data-testid="note-card"]')
      .find('[role="checkbox"]')
      .click({ force: true })
    cy.get('[data-testid="selection-mode-select-all"]').click({ force: true })
    cy.get('[data-testid="selection-mode-delete"]').should('contain', 'Delete (2)')
    cy.get('[data-testid="selection-mode-delete"]').click({ force: true })
    cy.get('input[placeholder="2"]').clear().type('2')
    cy.get('[role="alertdialog"]').contains('button', /^Delete$/).click({ force: true })

    cy.wrap(controller.deleteNotesByIds).should('have.been.calledWithMatch', ['note-1', 'note-2'])
  })

  it('select all in AI notes mode selects all visible AI note ids', () => {
    cy.window().then((win) => {
      win.localStorage.setItem(
        'everfreenote:aiSearchMode',
        JSON.stringify({ isAIEnabled: true, preset: 'strict', viewMode: 'note' })
      )
    })

    const controller = createController({
      showFTSResults: false,
      ftsData: undefined,
      searchQuery: 'ontology',
    })

    const invoke = cy.stub().resolves({
      data: {
        chunks: [
          {
            noteId: 'ai-note-1',
            noteTitle: 'AI Result One',
            noteTags: ['ontology'],
            chunkIndex: 0,
            charOffset: 0,
            content: 'Ontology explanation',
            similarity: 0.84,
          },
          {
            noteId: 'ai-note-2',
            noteTitle: 'AI Result Two',
            noteTags: ['philosophy'],
            chunkIndex: 0,
            charOffset: 0,
            content: 'Second chunk',
            similarity: 0.78,
          },
        ],
      },
      error: null,
    })

    const supabase = {
      auth: {
        getUser: cy.stub().resolves({ data: { user: { id: 'user-1' } }, error: null }),
      },
      functions: { invoke },
    } as unknown as SupabaseClient

    mountPanel(controller, { hasGeminiApiKey: true, supabase })

    cy.contains('AI Result One')
      .closest('article')
      .find('[role="checkbox"]')
      .click({ force: true })
    cy.get('[data-testid="selection-mode-select-all"]').click({ force: true })
    cy.get('[data-testid="selection-mode-delete"]').click({ force: true })
    cy.get('input[placeholder="2"]').clear().type('2')
    cy.get('[role="alertdialog"]').contains('button', /^Delete$/).click({ force: true })

    cy.wrap(controller.deleteNotesByIds).should('have.been.calledWithMatch', ['ai-note-1', 'ai-note-2'])
    cy.wrap(controller.resetAIResults).should('have.been.calledOnce')
  })

  it('deletes tag-only results and resets FTS path', () => {
    const controller = createController({
      showFTSResults: false,
      ftsData: undefined,
      showTagOnlyResults: true,
      tagOnlyResults: [
        createTagOnlyNote('tag-note-1', 'Tag Note One'),
        createTagOnlyNote('tag-note-2', 'Tag Note Two'),
      ],
      tagOnlyTotal: 2,
    })

    mountPanel(controller)

    cy.contains('Tag Note One')
      .closest('[data-testid="note-card"]')
      .find('[role="checkbox"]')
      .click({ force: true })
    cy.get('[data-testid="selection-mode-select-all"]').click({ force: true })
    cy.get('[data-testid="selection-mode-delete"]').click({ force: true })
    cy.get('input[placeholder="2"]').clear().type('2')
    cy.get('[role="alertdialog"]').contains('button', /^Delete$/).click({ force: true })

    cy.wrap(controller.deleteNotesByIds).should('have.been.calledWithMatch', ['tag-note-1', 'tag-note-2'])
    cy.wrap(controller.resetFtsResults).should('have.been.calledOnce')
  })
})
