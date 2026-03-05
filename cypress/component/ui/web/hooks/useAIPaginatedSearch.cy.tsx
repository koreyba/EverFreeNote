import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SupabaseTestProvider } from '../../../../../ui/web/providers/SupabaseProvider'
import { useAIPaginatedSearch } from '../../../../../ui/web/hooks/useAIPaginatedSearch'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SearchPreset } from '../../../../../core/constants/aiSearch'
import type { RagChunk } from '../../../../../core/types/ragSearch'

type HookHarnessProps = {
  query: string
  preset: SearchPreset
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
  content,
  similarity,
})

const HookHarness = ({ query, preset, filterTag, isEnabled }: HookHarnessProps) => {
  const result = useAIPaginatedSearch({ query, preset, filterTag, isEnabled })

  return (
    <div>
      <div data-cy="is-loading">{String(result.isLoading)}</div>
      <div data-cy="groups-count">{result.noteGroups.length}</div>
      <div data-cy="ai-offset">{result.aiOffset}</div>
      <div data-cy="has-more">{String(result.aiHasMore)}</div>
      <div data-cy="first-score">{result.noteGroups[0]?.topScore?.toFixed(2) ?? 'none'}</div>
      <div data-cy="ids">{result.noteGroups.map((group) => group.noteId).join(',')}</div>
      <button type="button" data-cy="load-more" onClick={result.loadMoreAI}>
        Load More
      </button>
      <button type="button" data-cy="reset" onClick={result.resetAIResults}>
        Reset
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
    const invoke = cy.stub().as('invoke').resolves({ data: { chunks: [] }, error: null })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    mountHarness(
      <HookHarness
        query="hi"
        preset="strict"
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
            createChunk('note-8', 0.60, 0, 0, 'seventh snippet'),
          ],
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
        preset="strict"
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
        data: { chunks: [createChunk('note-1', 0.75, 0, 0, 'snippet')] },
        error: null,
      })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    mountHarness(
      <HookHarness
        query="knowledge"
        preset="strict"
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
})
