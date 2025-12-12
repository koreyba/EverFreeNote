import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { useNotesQuery, useFlattenedNotes, useSearchNotes } from './useNotesQuery'
import { useCreateNote, useUpdateNote, useDeleteNote, useRemoveTag } from './useNotesMutations'
import { useInfiniteScroll } from './useInfiniteScroll'
import type { NoteViewModel, SearchResult, NoteInsert, NoteUpdate } from '@core/types/domain'
import { AuthService } from '@core/services/auth'
import { computeFtsHasMore, computeFtsTotal } from '@core/services/ftsPagination'
import { clearSelection as clearSelectionSet, selectAll as selectAllSet, toggleSelection } from '@core/services/selection'
import { webStorageAdapter } from '@ui/web/adapters/storage'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { webOAuthRedirectUri } from '@ui/web/config'
import { featureFlags } from '@ui/web/featureFlags'
import { OfflineQueueService } from '@core/services/offlineQueue'
import { OfflineSyncManager } from '@core/services/offlineSyncManager'
import { webNetworkStatus } from '@ui/web/adapters/networkStatus'
import type { MutationQueueItemInput, CachedNote } from '@core/types/offline'
import { OfflineCacheService } from '@core/services/offlineCache'
import { v4 as uuidv4 } from 'uuid'
import { applyNoteOverlay } from '@core/utils/overlay'

export type EditFormState = {
  title: string
  description: string
  tags: string
}

type NotePayload = (Partial<NoteInsert> & { userId?: string }) | Partial<NoteUpdate>

export function useNoteAppController() {
  // -- State --
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false) // Local loading state for auth operations
  const [selectedNote, setSelectedNote] = useState<NoteViewModel | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [ftsSearchQuery, setFtsSearchQuery] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditFormState>({
    title: "",
    description: "",
    tags: "",
  })
  const [saving, setSaving] = useState(false)
  const [filterByTag, setFilterByTag] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<NoteViewModel | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)
  const [ftsOffset, setFtsOffset] = useState(0)
  const [ftsAccumulatedResults, setFtsAccumulatedResults] = useState<SearchResult[]>([])
  const ftsLimit = 50
  // Offline queue state placeholders (будут подключены к offline storage/queue)
  const [pendingCount, setPendingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [isOffline, setIsOffline] = useState<boolean>(typeof window !== 'undefined' ? !navigator.onLine : false)

  // -- Dependencies --
  const { supabase, loading: providerLoading } = useSupabase()
  const queryClient = useQueryClient()
  const authService = new AuthService(supabase)

  // -- Mutations (needed for sync manager) --
  const createNoteMutation = useCreateNote()
  const updateNoteMutation = useUpdateNote()
  const deleteNoteMutation = useDeleteNote()
  const removeTagMutation = useRemoveTag()

  const offlineQueue = useMemo(() => new OfflineQueueService(webOfflineStorageAdapter), [])
  const offlineCache = useMemo(() => new OfflineCacheService(webOfflineStorageAdapter), [])

  // Refs for sync callbacks - stable references that delegate to current values
  const userRef = useRef(user)
  const createMutationRef = useRef(createNoteMutation)
  const updateMutationRef = useRef(updateNoteMutation)
  const deleteMutationRef = useRef(deleteNoteMutation)
  const offlineCacheRef = useRef(offlineCache)
  const offlineQueueRef = useRef(offlineQueue)

  // Update refs when values change (not on every keystroke)
  useEffect(() => {
    userRef.current = user
    createMutationRef.current = createNoteMutation
    updateMutationRef.current = updateNoteMutation
    deleteMutationRef.current = deleteNoteMutation
    offlineCacheRef.current = offlineCache
    offlineQueueRef.current = offlineQueue
  }, [user, createNoteMutation, updateNoteMutation, deleteNoteMutation, offlineCache, offlineQueue])

  // Stable callback refs - created once, always use current values via refs
  const syncCallbacksRef = useRef({
    performSync: async (item: MutationQueueItemInput) => {
      const currentUser = userRef.current
      if (!currentUser) {
        throw new Error('User not authenticated - sync skipped')
      }
      if (item.operation === 'create') {
        const payload = item.payload as Partial<NoteInsert> & { userId?: string }
        await createMutationRef.current.mutateAsync({
          title: payload.title ?? 'Untitled',
          description: payload.description ?? '',
          tags: payload.tags ?? [],
          userId: payload.userId ?? currentUser.id,
        })
      } else if (item.operation === 'update') {
        const payload = item.payload as Partial<NoteUpdate>
        await updateMutationRef.current.mutateAsync({
          id: item.noteId,
          title: payload.title ?? 'Untitled',
          description: payload.description ?? '',
          tags: payload.tags ?? [],
        })
      } else if (item.operation === 'delete') {
        await deleteMutationRef.current.mutateAsync({ id: item.noteId, silent: true })
      }
    },
    onSuccess: async (item: MutationQueueItemInput) => {
      await offlineCacheRef.current.deleteNote(item.noteId)
      const cached = await offlineCacheRef.current.loadNotes()
      setOfflineOverlay(cached)
      const queue = await offlineQueueRef.current.getQueue()
      setPendingCount(queue.filter((q) => q.status === 'pending').length)
      setFailedCount(queue.filter((q) => q.status === 'failed').length)
    },
  })

  // Create syncManager only ONCE using useRef (not useMemo with unstable deps)
  const syncManagerRef = useRef<OfflineSyncManager | null>(null)
  if (!syncManagerRef.current) {
    syncManagerRef.current = new OfflineSyncManager(
      webOfflineStorageAdapter,
      // Wrapper delegates to ref - always uses current callback
      (item) => syncCallbacksRef.current!.performSync(item),
      webNetworkStatus,
      (item) => syncCallbacksRef.current!.onSuccess(item)
    )
  }

  // Combine provider loading with local auth loading
  const combinedLoading = loading || providerLoading || authLoading

  // -- Queries --
  const notesQuery = useNotesQuery({
    userId: user?.id,
    searchQuery,
    selectedTag: filterByTag,
    enabled: !!user,
  })

  const baseNotes: NoteViewModel[] = useFlattenedNotes(notesQuery)
  const [offlineOverlay, setOfflineOverlay] = useState<CachedNote[]>([])

  const notes: NoteViewModel[] = useMemo(() => {
    if (!offlineOverlay.length) return baseNotes
    return applyNoteOverlay(baseNotes, offlineOverlay) as NoteViewModel[]
  }, [baseNotes, offlineOverlay])

  const ftsSearchResult = useSearchNotes(ftsSearchQuery, user?.id, {
    enabled: !!user && ftsSearchQuery.length >= 3,
    selectedTag: filterByTag,
    offset: ftsOffset,
    limit: ftsLimit
  })

  const ftsData = ftsSearchResult.data
  // Server now handles tag filtering via filter_tag RPC parameter
  const ftsResultsRaw: SearchResult[] = useMemo(() => ftsData?.results ?? [], [ftsData?.results])

  // Accumulate FTS pages for "load more"
  useEffect(() => {
    // reset on query/tag change
    setFtsOffset(0)
    setFtsAccumulatedResults([])
  }, [ftsSearchQuery, filterByTag])

  useEffect(() => {
    if (!ftsSearchResult.data) return
    setFtsAccumulatedResults((prev) => {
      if (ftsOffset === 0) {
        if (prev.length === ftsResultsRaw.length) {
          const prevIds = new Set(prev.map((n) => n.id))
          const same = ftsResultsRaw.every((n) => prevIds.has(n.id))
          if (same) return prev
        }
        return ftsResultsRaw
      }
      const next = [...prev]
      const seen = new Set(prev.map((item) => item.id))
      ftsResultsRaw.forEach((item) => {
        if (!seen.has(item.id)) {
          next.push(item)
        }
      })
      return next
    })
  }, [ftsSearchResult.data, ftsOffset, ftsResultsRaw, ftsSearchQuery, filterByTag])

  // Server now returns tag-filtered total, so we can use it directly
  const ftsTotalKnown = typeof ftsData?.total === 'number' && ftsData.total >= 0 ? ftsData.total : undefined
  const lastFtsPageSize = ftsResultsRaw.length
  // Simple hasMore: use server-provided total (now tag-aware) or fallback to page size check
  const ftsHasMore = !!ftsData && lastFtsPageSize > 0 &&
    computeFtsHasMore(ftsTotalKnown, ftsAccumulatedResults.length, lastFtsPageSize, ftsLimit)
  const ftsTotal = computeFtsTotal(ftsTotalKnown, ftsAccumulatedResults.length, ftsHasMore)
  const ftsLoadingMore = ftsSearchResult.isFetching && ftsOffset > 0

  // Total count of notes (from first page, falls back to loaded count)
  const totalNotes = useMemo(() => {
    const pages = notesQuery.data?.pages
    if (pages?.length) {
      const total = pages[0]?.totalCount
      if (typeof total === 'number') return total
    }
    return notes.length
  }, [notesQuery.data?.pages, notes.length]) ?? 0

  const showFTSResults = ftsSearchQuery.length >= 3 &&
    !!ftsData &&
    !ftsData.error

  const aggregatedFtsData = showFTSResults ? {
    ...ftsData,
    results: ftsAccumulatedResults,
    total: ftsTotal
  } : undefined

  const notesDisplayed = showFTSResults && aggregatedFtsData ? aggregatedFtsData.results.length : notes.length
  const baseTotal = showFTSResults && aggregatedFtsData ? aggregatedFtsData.total : totalNotes
  const notesTotal = baseTotal
  const selectedCount = selectedNoteIds.size

  // -- Infinite Scroll --
  const observerTarget = useInfiniteScroll(
    notesQuery.fetchNextPage,
    notesQuery.hasNextPage,
    notesQuery.isFetchingNextPage,
    { threshold: 0.8, rootMargin: '200px' }
  )

  // FTS Infinite Scroll
  const loadMoreFtsCallback = useCallback(() => {
    setFtsOffset((prev) => prev + ftsLimit)
  }, [ftsLimit])

  const ftsObserverTarget = useInfiniteScroll(
    loadMoreFtsCallback,
    ftsHasMore,
    ftsLoadingMore,
    { threshold: 0.8, rootMargin: '200px' }
  )

  // -- Auth Effects --
  useEffect(() => {
    const checkAuth = async () => {
      await webStorageAdapter.removeItem('testUser')
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  // -- Offline queue counts (persisted) --
  useEffect(() => {
    const loadQueueState = async () => {
      const queue = await offlineQueue.getQueue()
      let cached = await offlineCache.loadNotes()
      if (!queue.length && cached.length) {
        // Очистка временных заметок, если очередь пуста (например, compaction выкинул create+delete)
        const idsToRemove = cached.filter((c) => c.status !== 'synced' || c.deleted).map((c) => c.id)
        if (idsToRemove.length) {
          for (const id of idsToRemove) {
            await offlineCache.deleteNote(id)
          }
          cached = await offlineCache.loadNotes()
        }
      }
      setOfflineOverlay(cached)
      setPendingCount(queue.filter((q) => q.status === 'pending').length)
      setFailedCount(queue.filter((q) => q.status === 'failed').length)
    }
    void loadQueueState()
  }, [offlineQueue, offlineCache])

  // Dispose syncManager only on unmount (it's now a singleton)
  useEffect(() => {
    return () => {
      syncManagerRef.current?.dispose()
    }
  }, [])

  // Handle online/offline state changes (sync is triggered by syncManager internally)
  useEffect(() => {
    let updateInterval: ReturnType<typeof setInterval> | null = null

    const updateQueueState = async () => {
      const queue = await offlineQueue.getQueue()
      let cached = await offlineCache.loadNotes()
      if (!queue.length && cached.length) {
        const idsToRemove = cached.filter((c) => c.status !== 'synced' || c.deleted).map((c) => c.id)
        if (idsToRemove.length) {
          for (const id of idsToRemove) {
            await offlineCache.deleteNote(id)
          }
          cached = await offlineCache.loadNotes()
        }
      }
      setOfflineOverlay(cached)
      const pending = queue.filter((q) => q.status === 'pending').length
      const failed = queue.filter((q) => q.status === 'failed').length
      setPendingCount(pending)
      setFailedCount(failed)
      // Stop polling when queue is empty
      if (pending === 0 && updateInterval) {
        clearInterval(updateInterval)
        updateInterval = null
      }
    }

    const handleOnline = () => {
      setIsOffline(false)
      // Poll for updates while sync is in progress
      updateInterval = setInterval(updateQueueState, 1000)
      // Also update immediately and after a delay
      void updateQueueState()
      setTimeout(() => void updateQueueState(), 2000)
    }
    const handleOffline = () => {
      setIsOffline(true)
      if (updateInterval) {
        clearInterval(updateInterval)
        updateInterval = null
      }
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (updateInterval) clearInterval(updateInterval)
    }
  }, [offlineQueue, offlineCache])

  // -- Handlers --

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setFtsSearchQuery(query)
  }

  const handleTagClick = (tag: string) => {
    setFilterByTag(tag)
    // Don't reset search - preserve search state when clicking tags
    setSelectedNote(null)
    setIsEditing(false)
  }

  const handleClearTagFilter = () => {
    setFilterByTag(null)
  }

  const handleSignInWithGoogle = async () => {
    try {
      const { error } = await authService.signInWithGoogle(webOAuthRedirectUri)
      if (error) console.error('Error signing in:', error)
    } catch (error) {
      console.error('Error signing in:', error)
    }
  }

  const handleTestLogin = async () => {
    if (!featureFlags.testAuth) {
      toast.error('Test authentication is disabled in this environment')
      return
    }

    try {
      setAuthLoading(true) // Show loading indicator immediately
      const { data, error } = await authService.signInWithPassword(
        'test@example.com',
        'testpassword123'
      )

      if (error) {
        toast.error('Failed to login as test user: ' + error.message)
        setAuthLoading(false)
        return
      }

      if (data?.user) {
        setUser(data.user)
        toast.success('Logged in as test user!')
        // loading from SupabaseProvider will be updated via onAuthStateChange
      }
    } catch {
      toast.error('Failed to login as test user')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSkipAuth = async () => {
    if (!featureFlags.testAuth) {
      toast.error('Test authentication is disabled in this environment')
      return
    }

    try {
      setAuthLoading(true) // Show loading indicator immediately
      const { data, error } = await authService.signInWithPassword(
        'skip-auth@example.com',
        'testpassword123'
      )

      if (error) {
        toast.error('Failed to login as skip-auth user: ' + error.message)
        setAuthLoading(false)
        return
      }

      if (data?.user) {
        setUser(data.user)
        toast.success('Logged in as skip-auth user!')
        // loading from SupabaseProvider will be updated via onAuthStateChange
      }
    } catch {
      toast.error('Failed to login as skip-auth user')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await authService.signOut()
      await webStorageAdapter.removeItem('testUser')
      setUser(null)
      queryClient.removeQueries({ queryKey: ['notes'] })
      setSelectedNote(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeleteAccountLoading(true)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Unable to get session token for deletion")
      }
      const token = sessionData.session.access_token
      const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!functionsUrl) {
        throw new Error("Functions URL is not configured (set NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL)")
      }

      const response = await fetch(`${functionsUrl}/functions/v1/delete-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deleteNotes: true }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = payload?.error || `Delete function error (${response.status})`
        throw new Error(message)
      }

      toast.success("Account deleted")
      await handleSignOut()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete account"
      toast.error(message)
    } finally {
      setDeleteAccountLoading(false)
    }
  }

  const handleCreateNote = () => {
    setSelectedNote(null)
    setIsEditing(true)
    setEditForm({ title: '', description: '', tags: '' })
  }

  const handleEditNote = (note: NoteViewModel) => {
    setSelectedNote(note)
    setIsEditing(true)
    setEditForm({
      title: note.title,
      description: note.description ?? note.content ?? '',
      tags: note.tags?.join(', ') ?? '',
    })
  }

  const handleSaveNote = async () => {
    if (!user) return

    const offlineMutation = async (
      operation: MutationQueueItemInput['operation'],
      noteId: string,
      payload: NotePayload,
      baseNote?: NoteViewModel | null
    ) => {
      const item: MutationQueueItemInput = {
        noteId,
        operation,
        payload,
        clientUpdatedAt: new Date().toISOString(),
      }
      await offlineQueue.enqueue(item)
      // Сохраняем локальный кеш для overlay (офлайн отображение)
      const nowIso = new Date().toISOString()
      const createdIso =
        (baseNote as { created_at?: string } | undefined)?.created_at ??
        (baseNote as { createdAt?: string } | undefined)?.createdAt ??
        nowIso
      const cached: CachedNote = {
        id: noteId,
        title: payload.title ?? 'Untitled',
        description: 'description' in payload ? payload.description : undefined,
        tags: 'tags' in payload ? payload.tags : undefined,
        content: 'description' in payload ? payload.description : undefined,
        status: 'pending',
        updatedAt: nowIso,
        // created_at/updated_at нужны для корректных дат в офлайн-UI
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        created_at: createdIso,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        updated_at: nowIso,
      }
      await offlineCache.saveNote(cached)
      setOfflineOverlay(await offlineCache.loadNotes())
      const queue = await offlineQueue.getQueue()
      setPendingCount(queue.filter((q) => q.status === 'pending').length)
      setFailedCount(queue.filter((q) => q.status === 'failed').length)
    }

    setSaving(true)
    try {
      let savedNote: NoteViewModel | null = null
      const tags = editForm.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const noteData = {
        title: editForm.title.trim() || 'Untitled',
        description: editForm.description.trim(),
        tags,
      }

      if (selectedNote) {
        if (isOffline) {
          await offlineMutation('update', selectedNote.id, noteData, selectedNote)
          // Оптимистичное обновление выбранной заметки
          setSelectedNote({
            ...selectedNote,
            title: noteData.title,
            description: noteData.description,
            tags: noteData.tags,
          })
          toast.success('Saved offline (will sync when online)')
        } else {
          const updated = await updateNoteMutation.mutateAsync({
            id: selectedNote.id,
            ...noteData,
          })
          savedNote = { ...selectedNote, ...updated }
        }
      } else {
        const tempId = uuidv4()
        if (isOffline) {
          await offlineMutation('create', tempId, { ...noteData, userId: user.id }, null)
          setSelectedNote({
            id: tempId,
            title: noteData.title,
            description: noteData.description,
            tags: noteData.tags,
          } as NoteViewModel)
          toast.success('Saved offline (will sync when online)')
        } else {
          const created = await createNoteMutation.mutateAsync({
            ...noteData,
            userId: user.id,
          })
          savedNote = created as NoteViewModel
        }
      }

      setIsEditing(false)
      if (savedNote) {
        setSelectedNote(savedNote)
      }
      setEditForm({ title: '', description: '', tags: '' })
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = (note: NoteViewModel) => {
    setNoteToDelete(note)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return

    try {
      if (isOffline) {
        await offlineQueue.enqueue({
          noteId: noteToDelete.id,
          operation: 'delete',
          payload: {},
          clientUpdatedAt: new Date().toISOString(),
        })
        // Удаляем из кеша, чтобы карточка не дублировалась офлайн
        await offlineCache.saveNote({
          id: noteToDelete.id,
          status: 'pending',
          deleted: true,
          updatedAt: new Date().toISOString(),
        })
        setOfflineOverlay(await offlineCache.loadNotes())
        const queue = await offlineQueue.getQueue()
        setPendingCount(queue.filter((q) => q.status === 'pending').length)
        setFailedCount(queue.filter((q) => q.status === 'failed').length)
        toast.success('Deletion queued offline')
      } else {
        await deleteNoteMutation.mutateAsync({ id: noteToDelete.id })
      }

      if (selectedNote?.id === noteToDelete.id) {
        setSelectedNote(null)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    } finally {
      setDeleteDialogOpen(false)
      setNoteToDelete(null)
    }
  }

  const handleRemoveTagFromNote = async (noteId: string, tagToRemove: string) => {
    try {
      const noteToUpdate = notes.find(note => note.id === noteId)
      if (!noteToUpdate || !noteToUpdate.tags) return

      const updatedTags = noteToUpdate.tags.filter(tag => tag !== tagToRemove)
      await removeTagMutation.mutateAsync({ noteId, updatedTags })

      if (selectedNote?.id === noteId) {
        setSelectedNote({
          ...selectedNote,
          tags: updatedTags,
          updated_at: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

  const handleSelectNote = (note: NoteViewModel | null) => {
    setSelectedNote(note)
    setIsEditing(false)
  }

  const handleSearchResultClick = (note: SearchResult) => {
    // Don't reset search - keep search results visible when viewing a note
    setSelectedNote(note)
    setIsEditing(false)
  }

  const enterSelectionMode = () => {
    setSelectionMode(true)
    setSelectedNoteIds(new Set())
    setIsEditing(false)
    setSelectedNote(null)
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedNoteIds(new Set())
  }

  const toggleNoteSelection = (noteId: string) => {
    setSelectionMode(true)
    setSelectedNoteIds(prev => toggleSelection(prev, noteId))
  }

  const selectAllVisible = () => {
    const source = showFTSResults && aggregatedFtsData
      ? aggregatedFtsData.results
      : notes
    setSelectionMode(true)
    setSelectedNoteIds(selectAllSet(source.map((n) => n.id)))
  }

  const clearSelection = () => {
    setSelectedNoteIds(clearSelectionSet())
  }

  const loadMoreFts = () => {
    if (ftsLoadingMore || !ftsHasMore) return
    setFtsOffset((prev) => prev + ftsLimit)
  }

  const deleteSelectedNotes = async () => {
    if (!selectedNoteIds.size) return
    setBulkDeleting(true)
    try {
      const ids = Array.from(selectedNoteIds)
      if (isOffline) {
        await offlineQueue.enqueueMany(
          ids.map((id) => ({
            noteId: id,
            operation: 'delete',
            payload: {},
            clientUpdatedAt: new Date().toISOString(),
          }))
        )
        // Mark all as deleted for optimistic UI
        for (const id of ids) {
          await offlineCache.saveNote({
            id,
            status: 'pending',
            deleted: true,
            updatedAt: new Date().toISOString(),
          })
        }
        setOfflineOverlay(await offlineCache.loadNotes())
        const queue = await offlineQueue.getQueue()
        setPendingCount(queue.filter((q) => q.status === 'pending').length)
        setFailedCount(queue.filter((q) => q.status === 'failed').length)
        toast.success(`Queued deletion of ${ids.length} notes (offline)`)
      } else {
        const results = await Promise.allSettled(ids.map(id => deleteNoteMutation.mutateAsync({ id, silent: true })))
        const failed = results.filter(r => r.status === 'rejected').length
        if (failed > 0) {
          toast.error(`Failed to delete ${failed} notes`)
        } else {
          toast.success(`Deleted ${ids.length} notes`)
        }
      }
      exitSelectionMode()
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
      setSelectedNote(null)
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete selected notes')
    } finally {
      setBulkDeleting(false)
    }
  }

  return {
    // State
    user,
    loading: combinedLoading,
    selectedNote,
    searchQuery,
    isEditing,
    editForm,
    setEditForm,
    saving,
    filterByTag,
    deleteDialogOpen,
    setDeleteDialogOpen,
    noteToDelete,
    selectionMode,
    selectedNoteIds,
    selectedCount,
    bulkDeleting,
    deleteAccountLoading,
    isOffline,

    // Data
    notes,
    notesQuery,
    ftsSearchResult,
    ftsData: aggregatedFtsData,
    ftsResults: ftsAccumulatedResults,
    ftsHasMore,
    ftsLoadingMore,
    showFTSResults,
    observerTarget,
    ftsObserverTarget,
    totalNotes: notesTotal,
    notesDisplayed,
    notesTotal,
    pendingCount,
    failedCount,

    // Handlers
    handleSearch,
    handleTagClick,
    handleClearTagFilter,
    handleSignInWithGoogle,
    handleTestLogin,
    handleSkipAuth,
    handleSignOut,
    handleDeleteAccount,
    handleCreateNote,
    handleEditNote,
    handleSaveNote,
    handleDeleteNote,
    confirmDeleteNote,
    handleRemoveTagFromNote,
    handleSelectNote,
    handleSearchResultClick,
    enterSelectionMode,
    exitSelectionMode,
    toggleNoteSelection,
    selectAllVisible,
    clearSelection,
    loadMoreFts,
    deleteSelectedNotes,

    // Helpers
    invalidateNotes: () => queryClient.invalidateQueries({ queryKey: ['notes'] })
  }
}

export type NoteAppController = ReturnType<typeof useNoteAppController>


