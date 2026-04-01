import React from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import { AIIndexList } from '../../../../ui/web/components/features/settings/AIIndexList'
import type { AIIndexMutationResult, AIIndexNoteRow } from '../../../../core/types/aiIndex'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'

const notes: AIIndexNoteRow[] = [
  {
    id: 'note-1',
    title: 'Outdated note',
    updatedAt: '2026-03-29T10:00:00Z',
    lastIndexedAt: '2026-03-29T09:00:00Z',
    status: 'outdated',
  },
  {
    id: 'note-2',
    title: 'Indexed note',
    updatedAt: '2026-03-29T11:00:00Z',
    lastIndexedAt: '2026-03-29T11:05:00Z',
    status: 'indexed',
  },
]

describe('features/settings/AIIndexList', () => {
  function mountList({
    exitingNoteIds = [],
    onMutated = cy.stub().as('onMutated'),
  }: {
    exitingNoteIds?: string[]
    onMutated?: Cypress.Agent<sinon.SinonStub>
  } = {}) {
    const invoke = cy.stub().callsFake((name: string) => {
      if (name === 'rag-index') {
        return Promise.resolve({ data: { deleted: true }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    }).as('invoke')

    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    cy.mount(
      <div style={{ height: '480px', width: '720px' }}>
        <SupabaseTestProvider supabase={supabase}>
          <AIIndexList
            notes={notes}
            exitingNoteIds={exitingNoteIds}
            isLoading={false}
            hasMore={false}
            isFetchingNextPage={false}
            onLoadMore={cy.stub()}
            onMutated={onMutated}
            onOpenNote={cy.stub()}
            emptyState={<div>Nothing to review here yet</div>}
            height={480}
            width={720}
          />
        </SupabaseTestProvider>
      </div>
    )

    return { invoke, onMutated }
  }

  it('passes row mutations through the list without extra confirmation UI', () => {
    mountList()

    cy.contains('Indexed note').should('be.visible')
    cy.contains('Indexed note')
      .parents('article')
      .first()
      .within(() => {
        cy.contains('button', 'Remove index').click()
      })

    cy.get('@invoke').should('have.been.calledWith', 'rag-index', {
      body: {
        noteId: 'note-2',
        action: 'delete',
      },
    })
    cy.get('@onMutated').should('have.been.calledWith', {
      noteId: 'note-2',
      previousStatus: 'indexed',
      nextStatus: 'not_indexed',
    } satisfies AIIndexMutationResult)
  })

  it('marks exiting rows as hidden so filtered removals can animate out', () => {
    mountList({ exitingNoteIds: ['note-1'] })

    cy.contains('Outdated note')
      .parents('article')
      .first()
      .should('have.attr', 'aria-hidden', 'true')
  })
})
