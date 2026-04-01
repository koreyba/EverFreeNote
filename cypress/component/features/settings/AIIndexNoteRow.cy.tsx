import React from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import { AIIndexNoteRow } from '../../../../ui/web/components/features/settings/AIIndexNoteRow'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'

describe('features/settings/AIIndexNoteRow', () => {
  function mountRow({
    note,
    invokeImpl,
    onMutated = cy.stub().as('onMutated'),
  }: {
    note: Parameters<typeof AIIndexNoteRow>[0]['note']
    invokeImpl?: (name: string, params: unknown) => Promise<unknown>
    onMutated?: Cypress.Agent<sinon.SinonStub>
  }) {
    const invoke = cy.stub().callsFake((name: string, params: unknown) => {
      if (invokeImpl) return invokeImpl(name, params)
      return Promise.resolve({ data: { deleted: true }, error: null })
    }).as('invoke')

    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    cy.mount(
      <SupabaseTestProvider supabase={supabase}>
        <AIIndexNoteRow note={note} onMutated={onMutated} onOpenNote={cy.stub()} />
      </SupabaseTestProvider>
    )

    return { invoke, onMutated }
  }

  it('removes an indexed note immediately without a confirmation dialog', () => {
    mountRow({
      note: {
        id: 'note-1',
        title: 'Indexed note',
        updatedAt: '2026-03-29T10:00:00Z',
        lastIndexedAt: '2026-03-29T10:05:00Z',
        status: 'indexed',
      },
      invokeImpl: async (name: string, params: unknown) => {
        expect(name).to.eq('rag-index')
        expect(params).to.deep.eq({
          body: {
            noteId: 'note-1',
            action: 'delete',
          },
        })
        return { data: { deleted: true }, error: null }
      },
    })

    cy.contains('button', 'Remove index').click()

    cy.contains('Remove note from AI index?').should('not.exist')
    cy.get('@onMutated').should('have.been.calledWith', {
      noteId: 'note-1',
      previousStatus: 'indexed',
      nextStatus: 'not_indexed',
    })
  })

  it('shows the status-driven primary action for outdated notes', () => {
    mountRow({
      note: {
        id: 'note-outdated',
        title: 'Outdated note',
        updatedAt: '2026-03-29T10:00:00Z',
        lastIndexedAt: '2026-03-29T09:00:00Z',
        status: 'outdated',
      },
    })

    cy.contains('button', 'Update index').should('be.visible')
    cy.contains('Changed after the last successful index.').should('be.visible')
  })

  it('maps too-short index responses back to not indexed instead of pretending success', () => {
    mountRow({
      note: {
        id: 'note-short',
        title: 'Too short note',
        updatedAt: '2026-03-29T10:00:00Z',
        lastIndexedAt: '2026-03-29T09:00:00Z',
        status: 'outdated',
      },
      invokeImpl: async (name: string, params: unknown) => {
        expect(name).to.eq('rag-index')
        expect(params).to.deep.eq({
          body: {
            noteId: 'note-short',
            action: 'reindex',
          },
        })
        return {
          data: {
            outcome: 'skipped',
            reason: 'too_short',
            chunkCount: 0,
            message: 'Note is too short for indexing (minimum: 250 characters)',
          },
          error: null,
        }
      },
    })

    cy.contains('button', 'Update index').click()

    cy.get('@onMutated').should('have.been.calledWith', {
      noteId: 'note-short',
      previousStatus: 'outdated',
      nextStatus: 'not_indexed',
    })
  })
})
