import React, { useState } from 'react'
import { QueryClient, QueryClientProvider, useInfiniteQuery } from '@tanstack/react-query'
import { toast, Toaster } from 'sonner'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { NoteViewModel } from '@core/types/domain'
import { useNoteSync } from '@ui/web/hooks/useNoteSync'
import { OfflineSyncManager } from '@core/services/offlineSyncManager'
import { useNoteData } from '@ui/web/hooks/useNoteData'
import { useDeleteNote } from '@ui/web/hooks/useNotesMutations'
import { useNoteBulkActions } from '@ui/web/hooks/useNoteBulkActions'
import { useNoteSaveHandlers } from '@ui/web/hooks/useNoteSaveHandlers'
import { useBulkDeleteConfirm } from '@ui/web/hooks/useBulkDeleteConfirm'
import { BulkDeleteDialog } from '@ui/web/components/features/notes/BulkDeleteDialog'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter as storage } from '@ui/web/adapters/offlineStorage'
import '../../../../app/globals.css'

const note = (id: string): NoteViewModel => ({
  id, user_id: 'owner', title: id, description: '', tags: [],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
})

interface Scenario {
  queryClient: QueryClient
  getNotes: () => Promise<NoteViewModel[]>
  update: (args: { id: string }) => Promise<void>
}

function Harness({ queryClient, getNotes, update }: Scenario) {
  const [selectedIds, setSelectedIds] = useState(new Set(['target']))
  const [selected, setSelected] = useState(true)
  const [tabs, setTabs] = useState(['target', 'keep'])
  const [loading, setLoading] = useState(false)
  const query = useInfiniteQuery({
    queryKey: ['notes', 'owner', '', null],
    initialPageParam: 0,
    getNextPageParam: () => undefined,
    staleTime: Infinity,
    queryFn: async () => {
      const notes = await getNotes()
      return { notes, totalCount: notes.length, hasMore: false }
    },
  })
  const deleteMutation = useDeleteNote()
  const sync = useNoteSync({
    user: { id: 'owner' } as User,
    createNoteMutation: { mutateAsync: async () => {} },
    updateNoteMutation: { mutateAsync: update },
    deleteNoteMutation: deleteMutation,
  })
  const data = useNoteData({ notesQuery: query as never, offlineOverlay: sync.offlineOverlay, aggregatedFtsData: undefined, selectedNoteIds: selectedIds })
  const actions = useNoteBulkActions({
    userId: 'owner', selectedNoteIds: selectedIds, isOffline: sync.isOffline,
    enqueueBatchAndDrainIfOnline: sync.enqueueBatchAndDrainIfOnline,
    offlineQueueRef: sync.offlineQueueRef, offlineCache: sync.offlineCache,
    setOfflineOverlay: sync.setOfflineOverlay, setPendingCount: sync.setPendingCount,
    deleteNoteMutation: deleteMutation,
    exitSelectionMode: () => { setSelected(false); setSelectedIds(new Set()) },
    setBulkDeleting: setLoading,
    onNotesDeleted: ids => setTabs(current => current.filter(id => !ids.includes(id))),
    queryClient, notes: data.notes, selectAllVisibleCallback: () => {},
  })
  const confirm = useBulkDeleteConfirm(actions.deleteSelectedNotes)
  const target = note('target')
  const single = useNoteSaveHandlers({
    user: { id: 'owner' }, isOffline: sync.isOffline, offlineCache: sync.offlineCache,
    enqueueMutation: sync.enqueueMutation, offlineQueueRef: sync.offlineQueueRef,
    setOfflineOverlay: sync.setOfflineOverlay, setPendingCount: sync.setPendingCount,
    setFailedCount: sync.setFailedCount, setLastSavedAt: sync.setLastSavedAt,
    createNoteMutation: { mutateAsync: async () => {} }, updateNoteMutation: { mutateAsync: update },
    deleteNoteMutation: deleteMutation, removeTagMutation: { mutateAsync: async () => {} },
    selectedNote: target, selectedNoteRef: { current: target }, setSelectedNote: () => {},
    setIsEditing: () => {}, noteToDelete: target, setDeleteDialogOpen: () => {},
    setNoteToDelete: () => {}, notes: data.notes, notesRef: { current: data.notes },
  } as never)
  return <>
    <button data-cy="single" onClick={() => void single.confirmDeleteNote().then(success => {
      if (success) setTabs(current => current.filter(id => id !== 'target'))
    })}>Delete one</button>
    <button data-cy="open" onClick={confirm.requestDelete}>Delete selected</button>
    <output data-cy="ready">{query.isSuccess ? 'ready' : 'loading'}</output>
    <output data-cy="list">{data.notes.map(n => n.id).join(',')}</output>
    <output data-cy="total">{data.totalNotes}</output>
    <output data-cy="tabs">{tabs.join(',')}</output>
    <output data-cy="selected">{selected ? 'selected' : 'cleared'}</output>
    <output data-cy="pending">{sync.pendingCount}</output>
    <output data-cy="offline">{sync.isOffline ? 'offline' : 'online'}</output>
    <output data-cy="overlay">{sync.offlineOverlay.filter(n => n.deleted).map(n => `${n.id}:${n.status}`).join(',')}</output>
    <BulkDeleteDialog open={confirm.isDialogOpen} onOpenChange={confirm.setIsDialogOpen} count={1} loading={loading} onConfirm={() => void confirm.confirmDelete()} />
    <Toaster />
  </>
}

describe('Deletion completes independently from active list refetch', { retries: 0 }, () => {
  let idle: boolean
  let serverNotes: NoteViewModel[]
  let queries: number
  let getStarted: boolean
  let writeStarted: boolean
  let allowDelete: () => void
  let allowGet: () => void
  let deleteGate: Promise<void>
  let getGate: Promise<void>
  let queryClient: QueryClient
  let failGet: boolean

  beforeEach(() => {
    idle = false
    serverNotes = [note('target'), note('keep')]
    queries = 0
    getStarted = false
    writeStarted = false
    failGet = false
    deleteGate = new Promise(resolve => { allowDelete = resolve })
    getGate = new Promise(resolve => { allowGet = resolve })
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
    cy.then(() => storage.clearAll())
    const original = OfflineSyncManager.prototype.drainQueue
    cy.stub(OfflineSyncManager.prototype, 'drainQueue').callsFake(async function (this: OfflineSyncManager) {
      await original.call(this)
      idle = true
    })
    cy.spy(toast, 'success').as('success')
  })

  afterEach(() => { cy.then(() => { allowGet(); allowDelete() }) })

  const mount = () => {
    const getNotes = async () => {
      const snapshot = [...serverNotes]
      queries += 1
      if (queries > 1) {
        getStarted = true
        await getGate
        if (failGet) throw new Error('GET unavailable')
      }
      return snapshot
    }
    const supabase = {
      from: () => ({ delete: () => ({ eq: async (_key: string, id: string) => {
        writeStarted = true
        await deleteGate
        serverNotes = serverNotes.filter(item => item.id !== id)
        return { error: null }
      } }) }),
    } as unknown as SupabaseClient
    const update = async ({ id }: { id: string }) => {
      if (id === 'other') { writeStarted = true; await deleteGate }
    }
    cy.mount(<SupabaseTestProvider supabase={supabase} user={{ id: 'owner' } as User}>
      <QueryClientProvider client={queryClient}><Harness queryClient={queryClient} getNotes={getNotes} update={update} /></QueryClientProvider>
    </SupabaseTestProvider>)
    cy.get('[data-cy="ready"]').should('have.text', 'ready')
    cy.wrap(null).should(() => expect(idle).to.equal(true))
  }

  const openDialog = () => {
    cy.get('[data-cy="open"]').trigger('click')
    cy.get('[data-testid="bulk-delete-confirm-input"]').type('1')
  }

  const seedQueued = (withOther = true) => cy.then(async () => {
    const other = { id: 'other-pending', noteId: 'other', operation: 'update' as const, payload: { user_id: 'owner', title: 'other' }, status: 'failed' as const, clientUpdatedAt: '2026-01-01T00:00:00.000Z' }
    await storage.appendQueueItems!([...(withOther ? [other] : []), { id: 'target-pending', noteId: 'target', operation: 'update', payload: { user_id: 'owner', title: 'target' }, status: 'failed', clientUpdatedAt: '2026-01-01T00:00:01.000Z' }])
    await storage.saveNote({ ...note('target'), status: 'pending', updatedAt: '2026-01-01T00:00:01.000Z' })
  })

  it('closes the dialog, clears selection and tabs after durable queueing while GET and an unrelated write are still stalled', () => {
    mount()
    openDialog()
    seedQueued()
    cy.get('[data-testid="bulk-delete-confirm"]').trigger('click')
    cy.wrap(null).should(() => expect(getStarted && writeStarted).to.equal(true))
    cy.get('[data-testid="bulk-delete-dialog"]').should('not.exist')
    cy.get('[data-cy="selected"]').should('have.text', 'cleared')
    cy.get('[data-cy="tabs"]').should('have.text', 'keep')
    cy.get('[data-cy="list"]').should('have.text', 'keep')
    cy.get('[data-cy="overlay"]').should('contain', 'target:pending')
    cy.get('@success').should('have.been.calledWith', 'Deletion of 1 notes queued for sync')
    cy.then(async () => {
      expect((await storage.getQueue()).some(item => item.noteId === 'target' && item.operation === 'delete')).to.equal(true)
      expect((await storage.loadNotes()).find(item => item.id === 'target')?.deleted).to.equal(true)
    })
  })


  it('keeps a confirmed direct deletion out of the cached list while GET is delayed or fails', () => {
    failGet = true
    mount()
    openDialog()
    cy.then(() => allowDelete())
    cy.get('[data-testid="bulk-delete-confirm"]').trigger('click')
    cy.wrap(null).should(() => expect(getStarted && writeStarted).to.equal(true))
    cy.get('[data-testid="bulk-delete-dialog"]').should('not.exist')
    cy.get('[data-cy="selected"]').should('have.text', 'cleared')
    cy.get('[data-cy="tabs"]').should('have.text', 'keep')
    cy.get('[data-cy="list"]').should('have.text', 'keep')
    cy.get('[data-cy="total"]').should('have.text', '1')
    cy.then(() => allowGet())
    cy.get('[data-cy="list"]').should('have.text', 'keep')
    cy.get('@success').should('have.been.calledWith', 'Deleted 1 notes')
  })

  it('keeps a quickly synced queued deletion hidden when the notes GET has not finished', () => {
    mount()
    openDialog()
    seedQueued(false)
    cy.then(() => allowDelete())
    cy.get('[data-testid="bulk-delete-confirm"]').trigger('click')
    cy.get('[data-testid="bulk-delete-dialog"]').should('not.exist')
    cy.wrap(null).should(() => expect(writeStarted && serverNotes.every(n => n.id !== 'target')).to.equal(true))
    cy.get('[data-cy="pending"]').should('have.text', '0')
    cy.window().then(win => win.dispatchEvent(new Event('focus')))
    cy.get('[data-cy="overlay"]').should('have.text', '')
    cy.get('[data-cy="list"]').should('have.text', 'keep')
    cy.get('[data-cy="total"]').should('have.text', '1')
  })

  it('retains a queued tombstone and clears UI selection when the background GET fails', () => {
    failGet = true
    mount()
    cy.window().then(win => { cy.spy(win.console, 'warn').as('warn') })
    openDialog()
    seedQueued()
    cy.get('[data-testid="bulk-delete-confirm"]').trigger('click')
    cy.wrap(null).should(() => expect(getStarted && writeStarted).to.equal(true))
    cy.get('[data-testid="bulk-delete-dialog"]').should('not.exist')
    cy.then(() => allowGet())
    cy.get('@warn').should('have.been.calledWithMatch', 'Failed to refresh notes after deletion:')
    cy.get('[data-cy="selected"]').should('have.text', 'cleared')
    cy.get('[data-cy="tabs"]').should('have.text', 'keep')
    cy.get('[data-cy="list"]').should('have.text', 'keep')
    cy.get('[data-cy="overlay"]').should('contain', 'target:pending')
  })


  it('ignores an older GET after DELETE and later shows a restored note with the same ID', () => {
    mount()
    openDialog()
    seedQueued(false)
    cy.get('[data-testid="bulk-delete-confirm"]').trigger('click')
    cy.wrap(null).should(() => expect(getStarted && writeStarted).to.equal(true))
    cy.get('[data-testid="bulk-delete-dialog"]').should('not.exist')
    cy.then(() => allowDelete())
    cy.wrap(null).should(() => expect(serverNotes.every(n => n.id !== 'target')).to.equal(true))
    cy.get('[data-cy="pending"]').should('have.text', '0')
    cy.window().then(win => win.dispatchEvent(new Event('focus')))
    cy.get('[data-cy="overlay"]').should('have.text', '')
    cy.then(() => allowGet())
    cy.get('[data-cy="list"]').should('have.text', 'keep')
    cy.get('[data-cy="total"]').should('have.text', '1')
    cy.then(async () => {
      serverNotes = [note('target'), note('keep')]
      await queryClient.invalidateQueries({ queryKey: ['notes', 'owner'] })
    })
    cy.get('[data-cy="list"]').should('contain', 'target')
    cy.get('[data-cy="total"]').should('have.text', '2')
  })

  it('keeps a direct single deletion out of the list while GET fails', () => {
    failGet = true
    mount()
    cy.then(() => allowDelete())
    cy.get('[data-cy="single"]').trigger('click')
    cy.wrap(null).should(() => expect(getStarted && writeStarted).to.equal(true))
    cy.get('[data-cy="tabs"]').should('have.text', 'keep')
    cy.get('[data-cy="list"]').should('have.text', 'keep')
    cy.get('[data-cy="total"]').should('have.text', '1')
    cy.then(() => allowGet())
    cy.get('[data-cy="list"]').should('have.text', 'keep')
  })

  it('finishes locally while offline without claiming a server deletion', () => {
    mount()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { value: false, configurable: true })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-cy="offline"]').should('have.text', 'offline')
    openDialog()
    seedQueued(false)
    cy.get('[data-testid="bulk-delete-confirm"]').trigger('click')
    cy.get('[data-testid="bulk-delete-dialog"]').should('not.exist')
    cy.get('[data-cy="selected"]').should('have.text', 'cleared')
    cy.get('[data-cy="tabs"]').should('have.text', 'keep')
    cy.get('[data-cy="list"]').should('have.text', 'keep')
    cy.get('[data-cy="overlay"]').should('contain', 'target:pending')
    cy.get('@success').should('have.been.calledWith', 'Queued deletion of 1 notes (offline)')
    cy.then(async () => {
      expect(writeStarted).to.equal(false)
      expect(serverNotes.some(n => n.id === 'target')).to.equal(true)
      expect((await storage.getQueue()).some(item => item.noteId === 'target' && item.operation === 'delete' && item.payload.user_id === 'owner')).to.equal(true)
    })
  })
})
