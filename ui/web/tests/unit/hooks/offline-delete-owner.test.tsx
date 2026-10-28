import { act, renderHook } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { useNoteSaveHandlers } from '@ui/web/hooks/useNoteSaveHandlers'
import { useNoteBulkActions } from '@ui/web/hooks/useNoteBulkActions'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }))

const note = { id: 'note-1', user_id: 'owner-a', title: 'Note', description: '', tags: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }

describe('owner-scoped offline deletion', () => {
  it('stores the owner and the same revision in the queued delete and tombstone', async () => {
    const enqueueMutation = jest.fn()
    const saveNote = jest.fn()
    const props = {
      user: { id: 'owner-a' }, isOffline: true, offlineCache: { saveNote }, enqueueMutation,
      offlineQueueRef: { current: { getQueue: jest.fn().mockResolvedValue([]) } },
      setOfflineOverlay: jest.fn(), setPendingCount: jest.fn(), setFailedCount: jest.fn(), setLastSavedAt: jest.fn(),
      createNoteMutation: { mutateAsync: jest.fn() }, updateNoteMutation: { mutateAsync: jest.fn() },
      deleteNoteMutation: { mutateAsync: jest.fn() }, removeTagMutation: { mutateAsync: jest.fn() },
      selectedNote: note, selectedNoteRef: { current: note }, setSelectedNote: jest.fn(), setIsEditing: jest.fn(),
      noteToDelete: note, setDeleteDialogOpen: jest.fn(), setNoteToDelete: jest.fn(), notes: [note], notesRef: { current: [note] },
    }
    const { result } = renderHook(() => useNoteSaveHandlers(props as never))
    await act(async () => { expect(await result.current.confirmDeleteNote()).toBe(true) })

    expect(enqueueMutation).toHaveBeenCalledWith(expect.objectContaining({ noteId: note.id, operation: 'delete', payload: { user_id: 'owner-a' } }))
    expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ id: note.id, deleted: true, user_id: 'owner-a', updatedAt: enqueueMutation.mock.calls[0][0].clientUpdatedAt }))
  })

  it('does not enqueue an unowned deletion when authentication is unavailable', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    const enqueueMutation = jest.fn()
    const saveNote = jest.fn()
    const props = {
      user: null, isOffline: true, offlineCache: { saveNote }, enqueueMutation,
      offlineQueueRef: { current: { getQueue: jest.fn().mockResolvedValue([]) } },
      setOfflineOverlay: jest.fn(), setPendingCount: jest.fn(), setFailedCount: jest.fn(), setLastSavedAt: jest.fn(),
      createNoteMutation: { mutateAsync: jest.fn() }, updateNoteMutation: { mutateAsync: jest.fn() },
      deleteNoteMutation: { mutateAsync: jest.fn() }, removeTagMutation: { mutateAsync: jest.fn() },
      selectedNote: note, selectedNoteRef: { current: note }, setSelectedNote: jest.fn(), setIsEditing: jest.fn(),
      noteToDelete: note, setDeleteDialogOpen: jest.fn(), setNoteToDelete: jest.fn(), notes: [note], notesRef: { current: [note] },
    }
    const { result } = renderHook(() => useNoteSaveHandlers(props as never))
    await act(async () => { expect(await result.current.confirmDeleteNote()).toBe(false) })
    expect(enqueueMutation).not.toHaveBeenCalled()
    expect(saveNote).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('scopes every bulk deletion and tombstone to the signed-in account', async () => {
    const enqueueBatchAndDrainIfOnline = jest.fn()
    const saveNote = jest.fn()
    const props = {
      userId: 'owner-a', selectedNoteIds: new Set<string>(), isOffline: true, enqueueBatchAndDrainIfOnline,
      offlineQueueRef: { current: { getQueue: jest.fn().mockResolvedValue([]) } }, offlineCache: { saveNote }, setOfflineOverlay: jest.fn(), setPendingCount: jest.fn(),
      deleteNoteMutation: { mutateAsync: jest.fn() }, exitSelectionMode: jest.fn(), setBulkDeleting: jest.fn(),
      onNotesDeleted: jest.fn(), queryClient: new QueryClient(), notes: [note], selectAllVisibleCallback: jest.fn(),
    }
    const { result } = renderHook(() => useNoteBulkActions(props as never))
    await act(async () => { await result.current.deleteNotesByIds(['note-1', 'note-2']) })
    const queued = enqueueBatchAndDrainIfOnline.mock.calls[0][0]
    expect(queued).toEqual(expect.arrayContaining([
      expect.objectContaining({ noteId: 'note-1', operation: 'delete', payload: { user_id: 'owner-a' } }),
      expect.objectContaining({ noteId: 'note-2', operation: 'delete', payload: { user_id: 'owner-a' } }),
    ]))
    expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ id: 'note-1', user_id: 'owner-a', updatedAt: queued[0].clientUpdatedAt }))
    expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ id: 'note-2', user_id: 'owner-a', updatedAt: queued[1].clientUpdatedAt }))
  })

  it('queues online deletion behind unsynced writes instead of deleting directly', async () => {
    const enqueueMutation = jest.fn()
    const saveNote = jest.fn()
    const deleteNote = jest.fn()
    const queuedAt = new Date(Date.now() + 500).toISOString()
    const getQueue = jest.fn().mockResolvedValue([{ id: 'old', noteId: note.id, operation: 'create', payload: { user_id: 'owner-a' }, status: 'failed', clientUpdatedAt: queuedAt }])
    const props = {
      user: { id: 'owner-a' }, isOffline: false, offlineCache: { saveNote, deleteNote: jest.fn() }, enqueueMutation,
      offlineQueueRef: { current: { getQueue } }, setOfflineOverlay: jest.fn(), setPendingCount: jest.fn(),
      setFailedCount: jest.fn(), setLastSavedAt: jest.fn(), createNoteMutation: { mutateAsync: jest.fn() },
      updateNoteMutation: { mutateAsync: jest.fn() }, deleteNoteMutation: { mutateAsync: deleteNote },
      removeTagMutation: { mutateAsync: jest.fn() }, selectedNote: note, selectedNoteRef: { current: note },
      setSelectedNote: jest.fn(), setIsEditing: jest.fn(), noteToDelete: note, setDeleteDialogOpen: jest.fn(),
      setNoteToDelete: jest.fn(), notes: [note], notesRef: { current: [note] },
    }
    const { result } = renderHook(() => useNoteSaveHandlers(props as never))
    await act(async () => { expect(await result.current.confirmDeleteNote()).toBe(true) })

    expect(deleteNote).not.toHaveBeenCalled()
    expect(enqueueMutation).toHaveBeenCalledWith(expect.objectContaining({ noteId: note.id, operation: 'delete', payload: { user_id: 'owner-a' } }))
    const deletion = enqueueMutation.mock.calls[0][0]
    expect(Date.parse(deletion.clientUpdatedAt)).toBeGreaterThan(Date.parse(queuedAt))
    expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ id: note.id, deleted: true, user_id: 'owner-a', updatedAt: deletion.clientUpdatedAt }))
  })


  it('queues only the online bulk deletion with pending writes and deletes unrelated notes directly', async () => {
    const enqueueBatchAndDrainIfOnline = jest.fn()
    const saveNote = jest.fn()
    const directDelete = jest.fn()
    const queuedAt = new Date(Date.now() + 500).toISOString()
    const getQueue = jest.fn().mockResolvedValue([{ id: 'old', noteId: 'note-1', operation: 'create', payload: { user_id: 'owner-a' }, status: 'failed', clientUpdatedAt: queuedAt }])
    const props = {
      userId: 'owner-a', selectedNoteIds: new Set<string>(), isOffline: false, enqueueBatchAndDrainIfOnline,
      offlineQueueRef: { current: { getQueue } }, offlineCache: { saveNote, deleteNote: jest.fn() },
      setOfflineOverlay: jest.fn(), setPendingCount: jest.fn(), deleteNoteMutation: { mutateAsync: directDelete },
      exitSelectionMode: jest.fn(), setBulkDeleting: jest.fn(), onNotesDeleted: jest.fn(), queryClient: new QueryClient(),
      notes: [note], selectAllVisibleCallback: jest.fn(),
    }
    const { result } = renderHook(() => useNoteBulkActions(props as never))
    await act(async () => { await result.current.deleteNotesByIds(['note-1', 'note-2']) })
    expect(directDelete).toHaveBeenCalledTimes(1)
    expect(directDelete).toHaveBeenCalledWith({ id: 'note-2', silent: true })
    const queued = enqueueBatchAndDrainIfOnline.mock.calls[0][0]
    expect(queued).toHaveLength(1)
    expect(queued[0]).toEqual(expect.objectContaining({ noteId: 'note-1', operation: 'delete', payload: { user_id: 'owner-a' } }))
    expect(Date.parse(queued[0].clientUpdatedAt)).toBeGreaterThan(Date.parse(queuedAt))
    expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ id: 'note-1', user_id: 'owner-a', updatedAt: queued[0].clientUpdatedAt }))
    expect(props.onNotesDeleted).toHaveBeenCalledWith(expect.arrayContaining(['note-1', 'note-2']))
  })


  it('does not hide an online note locally if queueing its deletion fails', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    const enqueueMutation = jest.fn().mockRejectedValue(new Error('storage unavailable'))
    const saveNote = jest.fn()
    const props = {
      user: { id: 'owner-a' }, isOffline: false, offlineCache: { saveNote, deleteNote: jest.fn() }, enqueueMutation,
      offlineQueueRef: { current: { getQueue: jest.fn().mockResolvedValue([{ id: 'old', noteId: note.id, operation: 'create', payload: { user_id: 'owner-a' }, status: 'failed', clientUpdatedAt: '2026-01-01T00:00:00.000Z' }]) } },
      setOfflineOverlay: jest.fn(), setPendingCount: jest.fn(), setFailedCount: jest.fn(), setLastSavedAt: jest.fn(),
      createNoteMutation: { mutateAsync: jest.fn() }, updateNoteMutation: { mutateAsync: jest.fn() },
      deleteNoteMutation: { mutateAsync: jest.fn() }, removeTagMutation: { mutateAsync: jest.fn() },
      selectedNote: note, selectedNoteRef: { current: note }, setSelectedNote: jest.fn(), setIsEditing: jest.fn(),
      noteToDelete: note, setDeleteDialogOpen: jest.fn(), setNoteToDelete: jest.fn(), notes: [note], notesRef: { current: [note] },
    }
    const { result } = renderHook(() => useNoteSaveHandlers(props as never))
    await act(async () => { expect(await result.current.confirmDeleteNote()).toBe(false) })
    expect(saveNote).not.toHaveBeenCalled()
    expect(props.setOfflineOverlay).not.toHaveBeenCalled()
    error.mockRestore()
  })


  it('removes a temporary tombstone and pending indicator if online sync finishes immediately', async () => {
    const saveNote = jest.fn()
    const deleteCache = jest.fn()
    const getQueue = jest.fn()
      .mockResolvedValueOnce([{ id: 'old', noteId: note.id, operation: 'create', payload: { user_id: 'owner-a' }, status: 'failed', clientUpdatedAt: '2026-01-01T00:00:00.000Z' }])
      .mockResolvedValueOnce([])
    const props = {
      user: { id: 'owner-a' }, isOffline: false, offlineCache: { saveNote, deleteNote: deleteCache }, enqueueMutation: jest.fn(),
      offlineQueueRef: { current: { getQueue } }, setOfflineOverlay: jest.fn(), setPendingCount: jest.fn(),
      setFailedCount: jest.fn(), setLastSavedAt: jest.fn(), createNoteMutation: { mutateAsync: jest.fn() },
      updateNoteMutation: { mutateAsync: jest.fn() }, deleteNoteMutation: { mutateAsync: jest.fn() },
      removeTagMutation: { mutateAsync: jest.fn() }, selectedNote: note, selectedNoteRef: { current: note },
      setSelectedNote: jest.fn(), setIsEditing: jest.fn(), noteToDelete: note, setDeleteDialogOpen: jest.fn(),
      setNoteToDelete: jest.fn(), notes: [note], notesRef: { current: [note] },
    }
    const { result } = renderHook(() => useNoteSaveHandlers(props as never))
    await act(async () => { expect(await result.current.confirmDeleteNote()).toBe(true) })
    expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ id: note.id, deleted: true }))
    expect(deleteCache).toHaveBeenCalledWith(note.id)
    expect(props.setPendingCount).toHaveBeenCalledWith(0)
    const update = props.setOfflineOverlay.mock.calls[0][0] as (items: Array<{ id: string }>) => Array<{ id: string }>
    expect(update([{ id: note.id }, { id: 'another' }])).toEqual([{ id: 'another' }])
  })

})
