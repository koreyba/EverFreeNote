import React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { useNoteBulkActions } from '../../../../../ui/web/hooks/useNoteBulkActions'
import type { NoteViewModel } from '../../../../../core/types/domain'

type HarnessProps = {
  selectedIds: string[]
  isOffline?: boolean
  deleteShouldRejectIds?: string[]
}

const sampleNotes: NoteViewModel[] = [
  {
    id: 'note-1',
    title: 'Note 1',
    description: '',
    tags: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    user_id: 'user-1',
  },
]

const Harness = ({ selectedIds, isOffline = false, deleteShouldRejectIds = [] }: HarnessProps) => {
  const [result, setResult] = React.useState('')
  const [error, setError] = React.useState('')
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds])

  const queryClient = React.useMemo(
    () =>
      ({
        invalidateQueries: cy.stub().as('invalidateQueries').resolves(),
      } as unknown as QueryClient),
    []
  )

  const deleteNoteMutation = React.useMemo(
    () => ({
      mutateAsync: cy.stub().as('mutateAsync').callsFake(({ id }: { id: string }) => {
        if (deleteShouldRejectIds.includes(id)) {
          return Promise.reject(new Error('Delete failed'))
        }
        return Promise.resolve(undefined)
      }),
    }),
    [deleteShouldRejectIds]
  )

  const enqueueBatchAndDrainIfOnline = React.useMemo(
    () => cy.stub().as('enqueueBatchAndDrainIfOnline').resolves(),
    []
  )
  const offlineCache = React.useMemo(
    () => ({
      saveNote: cy.stub().as('offlineSaveNote').resolves(),
    }),
    []
  )
  const setOfflineOverlay = React.useMemo(() => cy.stub().as('setOfflineOverlay'), [])
  const setPendingCount = React.useMemo(() => cy.stub().as('setPendingCount'), [])
  const exitSelectionMode = React.useMemo(() => cy.stub().as('exitSelectionMode'), [])
  const setBulkDeleting = React.useMemo(() => cy.stub().as('setBulkDeleting'), [])
  const setSelectedNote = React.useMemo(() => cy.stub().as('setSelectedNote'), [])
  const selectAllVisibleCallback = React.useMemo(() => cy.stub().as('selectAllVisibleCallback'), [])

  const actions = useNoteBulkActions({
    selectedNoteIds: selectedSet,
    isOffline,
    enqueueBatchAndDrainIfOnline,
    offlineCache: offlineCache as never,
    setOfflineOverlay: setOfflineOverlay as never,
    setPendingCount: setPendingCount as never,
    deleteNoteMutation: deleteNoteMutation as never,
    exitSelectionMode: exitSelectionMode as never,
    setBulkDeleting: setBulkDeleting as never,
    setSelectedNote: setSelectedNote as never,
    queryClient,
    notes: sampleNotes,
    selectAllVisibleCallback,
  })

  return (
    <div>
      <div data-cy="result">{result}</div>
      <div data-cy="error">{error}</div>
      <button
        type="button"
        data-cy="delete-empty"
        onClick={() => {
          void actions.deleteNotesByIds([]).then((res) => setResult(JSON.stringify(res)))
        }}
      >
        Delete Empty
      </button>
      <button
        type="button"
        data-cy="delete-two"
        onClick={() => {
          setError('')
          void actions
            .deleteNotesByIds(['note-1', 'note-2'])
            .then((res) => setResult(JSON.stringify(res)))
            .catch((e: unknown) => setError(String(e)))
        }}
      >
        Delete Two
      </button>
      <button
        type="button"
        data-cy="delete-selected"
        onClick={() => {
          void actions.deleteSelectedNotes()
        }}
      >
        Delete Selected
      </button>
    </div>
  )
}

describe('useNoteBulkActions direct', () => {
  it('returns zeroed result and performs no mutation for empty delete ids', () => {
    cy.mount(<Harness selectedIds={[]} />)

    cy.get('[data-cy="delete-empty"]').click()
    cy.get('[data-cy="result"]').should('contain', '"total":0')
    cy.get('@mutateAsync').should('not.have.been.called')
  })

  it('reports partial failures and still invalidates notes and aiSearch', () => {
    cy.mount(<Harness selectedIds={['note-1', 'note-2']} deleteShouldRejectIds={['note-2']} />)

    cy.get('[data-cy="delete-two"]').click()
    cy.get('[data-cy="result"]').should('contain', '"failed":1')

    cy.get('@mutateAsync').should('have.callCount', 2)
    cy.get('@invalidateQueries').should('have.been.calledWithMatch', { queryKey: ['notes'] })
    cy.get('@invalidateQueries').should('have.been.calledWithMatch', { queryKey: ['aiSearch'] })
    cy.get('@setSelectedNote').should('have.been.calledWith', null)
  })

  it('queues offline delete path and marks pending count', () => {
    cy.mount(<Harness selectedIds={['note-1', 'note-2']} isOffline />)

    cy.get('[data-cy="delete-two"]').click()
    cy.get('[data-cy="result"]').should('contain', '"queuedOffline":true')

    cy.get('@enqueueBatchAndDrainIfOnline').should('have.been.calledOnce')
    cy.get('@offlineSaveNote').should('have.callCount', 2)
    cy.get('@setOfflineOverlay').should('have.been.called')
    cy.get('@setPendingCount').should('have.been.called')
  })
})
