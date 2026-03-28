import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SupabaseTestProvider } from '../../../../../ui/web/providers/SupabaseProvider'
import { useAIPaginatedSearch } from '../../../../../ui/web/hooks/useAIPaginatedSearch'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RagChunk } from '../../../../../core/types/ragSearch'

type HookHarnessProps = {
  query: string
  topK: number
  threshold: number
  filterTag: string | null
  isEnabled: boolean
}

const createChunk = (
  noteId: string,
  similarity: number,
  chunkIndex: number,
  charOffset: number,
  content: string
): RagChunk => ({
  noteId,
  noteTitle: `Title ${noteId}`,
  noteTags: ['tag'],
  chunkIndex,
  charOffset,
  bodyContent: content,
  overlapPrefix: '',
  content,
  similarity,
})

const HookHarness = ({ query, topK, threshold, filterTag, isEnabled }: HookHarnessProps) => {
  const result = useAIPaginatedSearch({ query, topK, threshold, filterTag, isEnabled })

  return (
    <div>
      <div data-cy="is-loading">{String(result.isLoading)}</div>
      <div data-cy="groups-count">{result.noteGroups.length}</div>
      <div data-cy="ai-offset">{result.aiOffset}</div>
      <div data-cy="has-more">{String(result.aiHasMore)}</div>
      <div data-cy="first-score">{result.noteGroups[0]?.topScore?.toFixed(2) ?? 'none'}</div>
      <div data-cy="first-title">{result.noteGroups[0]?.noteTitle ?? 'none'}</div>
      <div data-cy="first-tags">{result.noteGroups[0]?.noteTags?.join(',') ?? 'none'}</div>
      <div data-cy="first-snippet">{result.noteGroups[0]?.chunks[0]?.content ?? 'none'}</div>
      <div data-cy="ids">{result.noteGroups.map((group) => group.noteId).join(',')}</div>
      <button type="button" data-cy="load-more" onClick={result.loadMoreAI}>
        Load More
      </button>
      <button type="button" data-cy="refetch" onClick={result.refetch}>
        Refetch
      </button>
      <button type="button" data-cy="reset" onClick={result.resetAIResults}>
        Reset
      </button>
    </div>
  )
}

const IdentityResetHarness = ({
  initialQuery,
  topK,
  threshold,
  filterTag,
  isEnabled,
}: {
  initialQuery: string
  topK: number
  threshold: number
  filterTag: string | null
  isEnabled: boolean
}) => {
  const [query, setQuery] = React.useState(initialQuery)
  const result = useAIPaginatedSearch({ query, topK, threshold, filterTag, isEnabled })

  return (
    <div>
      <div data-cy="identity-query">{query}</div>
      <div data-cy="identity-offset">{result.aiOffset}</div>
      <button type="button" data-cy="identity-load-more" onClick={result.loadMoreAI}>
        Load More
      </button>
      <button type="button" data-cy="identity-switch-query" onClick={() => setQuery('ethics')}>
        Switch Query
      </button>
    </div>
  )
}

const mountHarness = (node: React.ReactNode, supabase: SupabaseClient) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  cy.mount(
    <SupabaseTestProvider supabase={supabase}>
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    </SupabaseTestProvider>
  )
}

describe('useAIPaginatedSearch', () => {
  it('does not request AI search when query is shorter than minimum length', () => {
    const invoke = cy.stub().as('invoke').resolves({ data: { chunks: [], hasMore: false }, error: null })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    mountHarness(
      <HookHarness
        query="hi"
        topK={5}
        threshold={0.75}
        filterTag={null}
        isEnabled
      />,
      supabase
    )

    cy.get('[data-cy="groups-count"]').should('contain', '0')
    cy.get('@invoke').should('not.have.been.called')
  })

  it('refreshes existing groups on cumulative load-more results and updates score/snippet', () => {
    const invoke = cy.stub().as('invoke').callsFake((_fn: string, { body }: { body: { topK: number } }) => {
      if (body.topK === 5) {
        return Promise.resolve({
          data: {
            chunks: [
              createChunk('note-1', 0.70, 0, 0, 'first snippet'),
              createChunk('note-1', 0.69, 1, 700, 'second snippet'),
              createChunk('note-2', 0.66, 0, 0, 'other snippet'),
              createChunk('note-3', 0.64, 0, 0, 'third snippet'),
              createChunk('note-4', 0.63, 0, 0, 'fourth snippet'),
            ],
            hasMore: true,
          },
          error: null,
        })
      }

      return Promise.resolve({
        data: {
          chunks: [
            createChunk('note-1', 0.92, 0, 0, 'updated best snippet'),
            createChunk('note-5', 0.85, 0, 0, 'new note snippet'),
            createChunk('note-2', 0.66, 0, 0, 'other snippet'),
            createChunk('note-3', 0.64, 0, 0, 'third snippet'),
            createChunk('note-4', 0.63, 0, 0, 'fourth snippet'),
            createChunk('note-6', 0.62, 0, 0, 'fifth snippet'),
            createChunk('note-7', 0.61, 0, 0, 'sixth snippet'),
          ],
          hasMore: false,
        },
        error: null,
      })
    })

    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    mountHarness(
      <HookHarness
        query="ontology"
        topK={5}
        threshold={0.75}
        filterTag="philosophy"
        isEnabled
      />,
      supabase
    )

    cy.get('[data-cy="first-score"]').should('contain', '0.70')
    cy.get('[data-cy="has-more"]').should('contain', 'true')

    cy.get('[data-cy="load-more"]').click()

    cy.get('[data-cy="ai-offset"]').should('contain', '5')
    cy.get('[data-cy="first-score"]').should('contain', '0.92')
    cy.get('[data-cy="ids"]').should('contain', 'note-1')
    cy.get('[data-cy="ids"]').should('contain', 'note-5')
    cy.get('[data-cy="has-more"]').should('contain', 'false')

    cy.get('@invoke').should('have.been.calledWithMatch', 'rag-search', {
      body: {
        query: 'ontology',
        filterTag: 'philosophy',
      },
    })
    cy.get('@invoke').its('callCount').should('eq', 2)
  })

  it('resetAIResults clears offset and accumulated results', () => {
    const invoke = cy
      .stub()
      .as('invoke')
      .resolves({
        data: { chunks: [createChunk('note-1', 0.75, 0, 0, 'snippet')], hasMore: false },
        error: null,
      })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    mountHarness(
      <HookHarness
        query="knowledge"
        topK={5}
        threshold={0.75}
        filterTag={null}
        isEnabled
      />,
      supabase
    )

    cy.get('[data-cy="groups-count"]').should('contain', '1')
    cy.get('[data-cy="reset"]').click()
    cy.get('[data-cy="groups-count"]').should('contain', '0')
    cy.get('[data-cy="ai-offset"]').should('contain', '0')
  })

  it('updates displayed metadata when refetch returns same chunks with changed title/tags', () => {
    let requestCount = 0
    const invoke = cy.stub().as('invoke').callsFake(() => {
      requestCount += 1
      return Promise.resolve({
        data: {
          chunks: [
            {
              noteId: 'note-1',
              noteTitle: requestCount === 1 ? 'Old title' : 'Updated title',
              noteTags: requestCount === 1 ? ['legacy'] : ['fresh', 'tag'],
              chunkIndex: 0,
              charOffset: 0,
              bodyContent: 'same snippet',
              overlapPrefix: '',
              content: 'same snippet',
              similarity: 0.81,
            } satisfies RagChunk,
          ],
          hasMore: false,
        },
        error: null,
      })
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    mountHarness(
      <HookHarness
        query="ontology"
        topK={5}
        threshold={0.75}
        filterTag={null}
        isEnabled
      />,
      supabase
    )

    cy.get('[data-cy="first-title"]').should('contain', 'Old title')
    cy.get('[data-cy="first-tags"]').should('contain', 'legacy')

    cy.get('[data-cy="refetch"]').click()

    cy.get('[data-cy="first-title"]').should('contain', 'Updated title')
    cy.get('[data-cy="first-tags"]').should('contain', 'fresh,tag')
    cy.get('@invoke').its('callCount').should('eq', 2)
  })

  it('updates displayed snippet when refetch keeps same ids but chunk content changes', () => {
    let requestCount = 0
    const invoke = cy.stub().as('invoke').callsFake(() => {
      requestCount += 1
      return Promise.resolve({
        data: {
          chunks: [
            {
              noteId: 'note-1',
              noteTitle: 'Stable title',
              noteTags: ['stable'],
              chunkIndex: 0,
              charOffset: 0,
              bodyContent: requestCount === 1 ? 'old snippet text' : 'new snippet text',
              overlapPrefix: '',
              content: requestCount === 1 ? 'old snippet text' : 'new snippet text',
              similarity: 0.81,
            } satisfies RagChunk,
          ],
          hasMore: false,
        },
        error: null,
      })
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    mountHarness(
      <HookHarness
        query="ontology"
        topK={5}
        threshold={0.75}
        filterTag={null}
        isEnabled
      />,
      supabase
    )

    cy.get('[data-cy="first-snippet"]').should('contain', 'old snippet text')
    cy.get('[data-cy="refetch"]').click()
    cy.get('[data-cy="first-snippet"]').should('contain', 'new snippet text')
    cy.get('@invoke').its('callCount').should('eq', 2)
  })

  it('does not over-fetch with stale offset after search identity changes', () => {
    const invoke = cy.stub().as('invoke').callsFake(
      (_fn: string, { body }: { body: { query: string; topK: number } }) => {
        const chunks = Array.from({ length: body.topK }, (_, idx) => ({
          noteId: `${body.query}-note-${idx + 1}`,
          noteTitle: `Title ${body.query}-${idx + 1}`,
          noteTags: ['tag'],
          chunkIndex: 0,
          charOffset: idx * 100,
          bodyContent: `${body.query} snippet ${idx + 1}`,
          overlapPrefix: '',
          content: `${body.query} snippet ${idx + 1}`,
          similarity: 0.9 - idx * 0.001,
        })) satisfies RagChunk[]

        return Promise.resolve({
          data: { chunks, hasMore: body.query === 'ontology' && body.topK === 5 },
          error: null,
        })
      }
    )
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    mountHarness(
      <IdentityResetHarness
        initialQuery="ontology"
        topK={5}
        threshold={0.75}
        filterTag={null}
        isEnabled
      />,
      supabase
    )

    cy.get('@invoke').should('have.been.calledWithMatch', 'rag-search', {
      body: { query: 'ontology', topK: 5 },
    })

    cy.get('[data-cy="identity-load-more"]').click()
    cy.get('[data-cy="identity-offset"]').should('contain', '5')
    cy.get('@invoke').should('have.been.calledWithMatch', 'rag-search', {
      body: { query: 'ontology', topK: 10 },
    })

    cy.get('[data-cy="identity-switch-query"]').click()
    cy.get('[data-cy="identity-query"]').should('contain', 'ethics')
    cy.get('@invoke').should('have.been.calledWithMatch', 'rag-search', {
      body: { query: 'ethics', topK: 5 },
    })
    cy.get('@invoke').should('not.have.been.calledWithMatch', 'rag-search', {
      body: { query: 'ethics', topK: 10 },
    })
  })
})
