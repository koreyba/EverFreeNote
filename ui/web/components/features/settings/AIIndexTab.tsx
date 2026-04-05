"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Database, Loader2, Search, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAIIndexActionPresentation, getAIIndexActionableNotes } from "@core/constants/aiIndex"
import { SEARCH_CONFIG } from "@core/constants/search"
import { parseRagIndexResult } from "@core/rag/indexResult"
import { NoteService } from "@core/services/notes"
import type {
  AIIndexFilter,
  AIIndexMutationResult,
  AIIndexNoteRow as AIIndexNoteRowData,
} from "@core/types/aiIndex"
import { cn } from "@ui/web/lib/utils"
import {
  getAIIndexNotesQueryPrefix,
  useAIIndexNotes,
  useFlattenedAIIndexNotes,
} from "@ui/web/hooks/useAIIndexNotes"
import { useDebouncedCallback } from "@ui/web/hooks/useDebouncedCallback"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { AIIndexList } from "@/components/features/settings/AIIndexList"
import {
  clearActiveSettingsNoteReturnPath,
  consumeAIIndexViewState,
  saveAIIndexPendingNoteState,
  saveAIIndexViewState,
  type AIIndexViewStateSnapshot,
} from "@ui/web/lib/aiIndexNavigationState"
import { settingsInsetPanelClassName } from "@/components/features/settings/settingsLayout"

const FILTER_OPTIONS: Array<{ value: AIIndexFilter; label: string }> = [
  { value: "all", label: "All notes" },
  { value: "indexed", label: "Indexed" },
  { value: "not_indexed", label: "Not indexed" },
  { value: "outdated", label: "Outdated" },
]

const FILTER_EMPTY_MESSAGES: Record<AIIndexFilter, string> = {
  all: "No notes found yet.",
  indexed: "No indexed notes match this filter.",
  not_indexed: "Every visible note is already indexed.",
  outdated: "No outdated notes right now.",
}

const FILTER_LABELS: Record<AIIndexFilter, string> = {
  all: "All notes",
  indexed: "Indexed",
  not_indexed: "Not indexed",
  outdated: "Outdated",
}

const FILTER_SEARCH_LABELS: Record<AIIndexFilter, string> = {
  all: "notes",
  indexed: "indexed notes",
  not_indexed: "not indexed notes",
  outdated: "outdated notes",
}

const ROW_EXIT_DURATION_MS = 300

type OptimisticMutationState = AIIndexMutationResult & {
  createdAt: number
  phase: "stable" | "leaving" | "hidden"
  noteSnapshot: AIIndexNoteRowData
  sourceIndex: number
}

type BulkIndexOutcome = "indexed" | "skipped" | "failed"

type BulkIndexCounters = {
  successCount: number
  skippedCount: number
  errorCount: number
}

type BulkIndexInvoke = (
  name: string,
  options: { body: { noteId: string; action: "index" | "reindex" } }
) => Promise<{ data: unknown; error: unknown }>

function runBackgroundTask(task: Promise<unknown>) {
  task.catch(() => {
    // Best-effort background work should not break the settings UI.
  })
}

function incrementBulkIndexCounters(
  counters: BulkIndexCounters,
  outcome: BulkIndexOutcome
): BulkIndexCounters {
  if (outcome === "indexed") {
    return { ...counters, successCount: counters.successCount + 1 }
  }
  if (outcome === "skipped") {
    return { ...counters, skippedCount: counters.skippedCount + 1 }
  }
  return { ...counters, errorCount: counters.errorCount + 1 }
}

function formatBulkIndexSummary(successCount: number, skippedCount: number, errorCount: number) {
  const parts = [
    successCount > 0 ? `${successCount} indexed` : null,
    skippedCount > 0 ? `${skippedCount} skipped` : null,
    errorCount > 0 ? `${errorCount} failed` : null,
  ].filter(Boolean)

  return parts.join(" • ")
}

async function processBulkIndexNote({
  applyMutationResult,
  invoke,
  note,
}: Readonly<{
  applyMutationResult: (mutationResult: AIIndexMutationResult, options?: { invalidate?: boolean }) => void
  invoke: BulkIndexInvoke
  note: AIIndexNoteRowData
}>): Promise<BulkIndexOutcome> {
  const actionPresentation = getAIIndexActionPresentation(note.status)

  try {
    const { data, error } = await invoke("rag-index", {
      body: {
        noteId: note.id,
        action: actionPresentation.action,
      },
    })
    if (error) throw error

    const result = parseRagIndexResult(data)
    if (result.outcome === "indexed") {
      applyMutationResult({
        noteId: note.id,
        previousStatus: note.status,
        nextStatus: actionPresentation.successStatus,
      }, { invalidate: false })
      return "indexed"
    }

    if (result.outcome === "skipped") {
      if (result.reason === "too_short") {
        applyMutationResult({
          noteId: note.id,
          previousStatus: note.status,
          nextStatus: "not_indexed",
        }, { invalidate: false })
      }
      return "skipped"
    }

    return "failed"
  } catch {
    return "failed"
  }
}

function matchesAIIndexFilter(filter: AIIndexFilter, status: AIIndexNoteRowData["status"]) {
  return filter === "all" || filter === status
}

function getPersistedSearchQuery(searchDraft: string) {
  return searchDraft.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH ? searchDraft : ""
}

function getAIIndexEmptyMessage(filter: AIIndexFilter, activeSearchQuery: string) {
  if (activeSearchQuery.length > 0) {
    return `No ${FILTER_SEARCH_LABELS[filter]} match "${activeSearchQuery}".`
  }

  return FILTER_EMPTY_MESSAGES[filter]
}

function getResultsSummaryText(loadedCount: number, totalCount: number) {
  if (loadedCount < totalCount) {
    return `Showing ${loadedCount} loaded notes out of ${totalCount}`
  }

  return `Showing ${totalCount} ${totalCount === 1 ? "note" : "notes"}`
}

function shouldExitInCurrentFilter(
  filter: AIIndexFilter,
  optimisticMutation: OptimisticMutationState
) {
  // Exit animations only make sense while the note is leaving the *current*
  // bucket. If the user switches into the destination filter, show the note
  // normally instead of keeping it visually hidden.
  return optimisticMutation.phase === "leaving"
    && !matchesAIIndexFilter(filter, optimisticMutation.nextStatus)
}

function mergeOptimisticNotes(
  notes: AIIndexNoteRowData[],
  filter: AIIndexFilter,
  optimisticMutations: Record<string, OptimisticMutationState>
) {
  const visibleEntries = notes.map((note, index) => {
    const optimisticMutation = optimisticMutations[note.id]
    if (!optimisticMutation) {
      return {
        note,
        isExiting: false,
        order: index,
      }
    }

    const projectedNote: AIIndexNoteRowData = {
      ...note,
      status: optimisticMutation.nextStatus,
      lastIndexedAt: optimisticMutation.nextStatus === "not_indexed" ? null : note.lastIndexedAt,
    }
    const matchesFilter = matchesAIIndexFilter(filter, optimisticMutation.nextStatus)
    const isExiting = shouldExitInCurrentFilter(filter, optimisticMutation)

    if (!matchesFilter) {
      if (isExiting) {
        return {
          note: projectedNote,
          isExiting: true,
          order: optimisticMutation.sourceIndex,
        }
      }

      return null
    }

    return {
      note: projectedNote,
      isExiting,
      order: optimisticMutation.sourceIndex,
    }
  }).filter((entry): entry is { note: AIIndexNoteRowData; isExiting: boolean; order: number } => entry !== null)

  const visibleIds = new Set(visibleEntries.map((entry) => entry.note.id))
  const exitingEntries = Object.values(optimisticMutations)
    .filter((mutation) => shouldExitInCurrentFilter(filter, mutation) && !visibleIds.has(mutation.noteId))
    .map((mutation) => ({
      note: {
        ...mutation.noteSnapshot,
        status: mutation.nextStatus,
        lastIndexedAt: mutation.nextStatus === "not_indexed" ? null : mutation.noteSnapshot.lastIndexedAt,
      },
      isExiting: true,
      order: mutation.sourceIndex + 0.5,
    }))

  return [...visibleEntries, ...exitingEntries]
    .sort((left, right) => left.order - right.order)
}

function getOptimisticTotalCount(
  filter: AIIndexFilter,
  totalCount: number,
  optimisticMutations: Record<string, OptimisticMutationState>,
  lastServerSyncAt: number
) {
  const delta = Object.values(optimisticMutations).reduce((sum, mutation) => {
    if (mutation.createdAt < lastServerSyncAt) return sum

    const matchedBefore = matchesAIIndexFilter(filter, mutation.previousStatus)
    const matchedAfter = matchesAIIndexFilter(filter, mutation.nextStatus)

    if (matchedBefore === matchedAfter) return sum
    return sum + (matchedAfter ? 1 : -1)
  }, 0)

  return Math.max(0, totalCount + delta)
}

function AIIndexResetActions({
  hasActiveFilter,
  hasActiveSearch,
  onClearSearch,
  onResetFilter,
  searchButtonLabel,
  filterButtonLabel,
}: Readonly<{
  hasActiveFilter: boolean
  hasActiveSearch: boolean
  onClearSearch: () => void
  onResetFilter: () => void
  searchButtonLabel: string
  filterButtonLabel: string
}>) {
  if (!hasActiveFilter && !hasActiveSearch) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasActiveSearch ? (
        <Button variant="ghost" size="sm" className="h-8 px-2.5 text-muted-foreground hover:text-foreground" onClick={onClearSearch}>
          {searchButtonLabel}
        </Button>
      ) : null}
      {hasActiveFilter ? (
        <Button variant="ghost" size="sm" className="h-8 px-2.5 text-muted-foreground hover:text-foreground" onClick={onResetFilter}>
          {filterButtonLabel}
        </Button>
      ) : null}
    </div>
  )
}

function AIIndexEmptyState({
  emptyMessage,
  hasActiveFilter,
  hasActiveSearch,
  onClearSearch,
  onResetFilter,
}: Readonly<{
  emptyMessage: string
  hasActiveFilter: boolean
  hasActiveSearch: boolean
  onClearSearch: () => void
  onResetFilter: () => void
}>) {
  return (
    <div className="max-w-md space-y-4">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/40">
        <Database className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h4 className="text-base font-semibold text-foreground">Nothing to review here yet</h4>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <AIIndexResetActions
          hasActiveFilter={hasActiveFilter}
          hasActiveSearch={hasActiveSearch}
          onClearSearch={onClearSearch}
          onResetFilter={onResetFilter}
          searchButtonLabel="Clear search"
          filterButtonLabel="Show all notes"
        />
      </div>
    </div>
  )
}

function AIIndexToolbar({
  filter,
  filterOptions,
  isSearchHintVisible,
  onClearSearch,
  onFilterChange,
  onSearchChange,
  onSearchKeyDown,
  searchDraft,
}: Readonly<{
  filter: AIIndexFilter
  filterOptions: Array<{ value: AIIndexFilter; label: string }>
  isSearchHintVisible: boolean
  onClearSearch: () => void
  onFilterChange: (filter: AIIndexFilter) => void
  onSearchChange: (value: string) => void
  onSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  searchDraft: string
}>) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-3 sm:p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div
            className="flex gap-4 overflow-x-auto pb-1 sm:gap-2 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {filterOptions.map((option) => {
              const isActive = option.value === filter
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onFilterChange(option.value)}
                  className={cn(
                    "shrink-0 text-sm transition-colors",
                    // Mobile: compact text labels (no border/bg)
                    "rounded-none border-none bg-transparent px-0 py-1",
                    // Desktop: pill buttons with border/bg
                    "sm:rounded-xl sm:border sm:px-4 sm:py-2",
                    isActive
                      ? "font-semibold text-foreground sm:border-primary/60 sm:bg-accent"
                      : "font-medium text-muted-foreground sm:border-transparent hover:text-foreground sm:hover:bg-muted/50"
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-2xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              aria-label="Search AI index notes"
              data-testid="ai-index-search-input"
              type="text"
              placeholder="Search notes..."
              value={searchDraft}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={onSearchKeyDown}
              className="h-10 bg-background pl-9 pr-10"
            />
            {searchDraft ? (
              <button
                type="button"
                aria-label="Clear AI index search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
                onClick={onClearSearch}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {isSearchHintVisible ? (
            <p className="text-xs text-muted-foreground">
              Search starts after {SEARCH_CONFIG.MIN_QUERY_LENGTH} characters.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function AIIndexResultsHeader({
  activeSearchQuery,
  bulkAction,
  filter,
  hasActiveSearch,
  isFetching,
  isFetchingNextPage,
  summaryText,
}: Readonly<{
  activeSearchQuery: string
  bulkAction?: React.ReactNode
  filter: AIIndexFilter
  hasActiveSearch: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  summaryText: string
}>) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-semibold text-foreground">{summaryText}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="bg-background/70">{FILTER_LABELS[filter]}</Badge>
          {hasActiveSearch ? (
            <Badge variant="outline" className="max-w-full bg-background/70">
              <span className="truncate">Search: {activeSearchQuery}</span>
            </Badge>
          ) : null}
          {isFetching && !isFetchingNextPage ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing…
            </span>
          ) : null}
          {isFetchingNextPage ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading more
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex w-full shrink-0 items-center justify-end xl:w-[168px]">
        {bulkAction}
      </div>
    </div>
  )
}

function AIIndexErrorState({
  errorMessage,
  onRetry,
}: Readonly<{
  errorMessage: string
  onRetry: () => void
}>) {
  return (
    <div className="space-y-4">
      <div className={cn(settingsInsetPanelClassName, "border-destructive/30 bg-destructive/5")}>
        <h3 className="text-base font-semibold text-foreground">AI index status is unavailable</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{errorMessage}</p>
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}

export function AIIndexTab() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, supabase } = useSupabase()
  const noteService = React.useMemo(() => new NoteService(supabase), [supabase])
  const [filter, setFilter] = React.useState<AIIndexFilter>("all")
  const [searchDraft, setSearchDraft] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [initialScrollOffset, setInitialScrollOffset] = React.useState(0)
  const [scrollOffset, setScrollOffset] = React.useState(0)
  const [bulkIndexProgress, setBulkIndexProgress] = React.useState<{ completed: number; total: number } | null>(null)
  const [optimisticMutations, setOptimisticMutations] = React.useState<Record<string, OptimisticMutationState>>({})
  const restoredStateRef = React.useRef(false)
  const exitTimeoutsRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const normalizedSearchDraft = searchDraft.trim()
  const persistedSearchQuery = getPersistedSearchQuery(normalizedSearchDraft)
  const isSearchHintVisible =
    normalizedSearchDraft.length > 0 && normalizedSearchDraft.length < SEARCH_CONFIG.MIN_QUERY_LENGTH
  const activeSearchQuery =
    searchQuery.trim().length >= SEARCH_CONFIG.MIN_QUERY_LENGTH ? searchQuery.trim() : ""
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearchQuery(value.trim())
  }, SEARCH_CONFIG.DEBOUNCE_MS)

  const query = useAIIndexNotes(filter, activeSearchQuery)
  const notes = useFlattenedAIIndexNotes(query)
  const totalCount = query.data?.pages[0]?.totalCount ?? 0
  const lastServerSyncAt = query.dataUpdatedAt ?? 0

  React.useEffect(() => () => {
    Object.values(exitTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId))
  }, [])

  React.useEffect(() => {
    setOptimisticMutations((previousState) => {
      let hasChanges = false
      const nextState = { ...previousState }

      for (const [noteId, optimisticMutation] of Object.entries(previousState)) {
        const liveNote = notes.find((note) => note.id === noteId)

        if (liveNote && liveNote.status === optimisticMutation.nextStatus) {
          delete nextState[noteId]
          hasChanges = true
          continue
        }

        if (!liveNote && optimisticMutation.phase !== "leaving" && !matchesAIIndexFilter(filter, optimisticMutation.nextStatus)) {
          delete nextState[noteId]
          hasChanges = true
        }
      }

      return hasChanges ? nextState : previousState
    })
  }, [filter, notes])

  React.useEffect(() => {
    if (restoredStateRef.current) return

    const restoredState = consumeAIIndexViewState()
    clearActiveSettingsNoteReturnPath()
    restoredStateRef.current = true

    if (!restoredState) return

    setFilter(restoredState.filter)
    setSearchDraft(restoredState.searchDraft)
    setSearchQuery(restoredState.searchQuery)
    setInitialScrollOffset(restoredState.scrollOffset)
    setScrollOffset(restoredState.scrollOffset)
  }, [])

  React.useEffect(() => {
    if (!user?.id) return

    router.prefetch("/")

    runBackgroundTask(queryClient.prefetchInfiniteQuery({
      queryKey: ["notes", user.id, "", null],
      queryFn: ({ pageParam = 0 }) => noteService.getNotes(user.id, {
        page: pageParam as number,
        pageSize: SEARCH_CONFIG.PAGE_SIZE,
        tag: null,
        searchQuery: "",
      }),
      getNextPageParam: (lastPage: { nextCursor?: number }) => lastPage.nextCursor,
      initialPageParam: 0,
      staleTime: 1000 * 60 * 10,
    }))
  }, [noteService, queryClient, router, user?.id])

  const applyMutationResult = React.useCallback((
    mutationResult: AIIndexMutationResult,
    options?: { invalidate?: boolean }
  ) => {
    const sourceIndex = notes.findIndex((note) => note.id === mutationResult.noteId)
    const sourceNote = sourceIndex >= 0 ? notes[sourceIndex] : null
    const shouldExit =
      sourceNote !== null &&
      filter !== "all" &&
      !matchesAIIndexFilter(filter, mutationResult.nextStatus)

    if (sourceNote) {
      setOptimisticMutations((previousState) => ({
        ...previousState,
        [mutationResult.noteId]: {
          ...mutationResult,
          createdAt: Date.now(),
          phase: shouldExit ? "leaving" : "stable",
          noteSnapshot: sourceNote,
          sourceIndex,
        },
      }))
    }

    if (shouldExit) {
      const existingTimeout = exitTimeoutsRef.current[mutationResult.noteId]
      if (existingTimeout) clearTimeout(existingTimeout)

      exitTimeoutsRef.current[mutationResult.noteId] = setTimeout(() => {
        setOptimisticMutations((previousState) => {
          const currentMutation = previousState[mutationResult.noteId]
          if (!currentMutation) return previousState

          return {
            ...previousState,
            [mutationResult.noteId]: {
              ...currentMutation,
              phase: "hidden",
            },
          }
        })
        delete exitTimeoutsRef.current[mutationResult.noteId]
      }, ROW_EXIT_DURATION_MS)
    }

    if (options?.invalidate !== false) {
      runBackgroundTask(queryClient.invalidateQueries({ queryKey: getAIIndexNotesQueryPrefix(user?.id) }))
    }
  }, [filter, notes, queryClient, user?.id])

  const handleMutated = React.useCallback((mutationResult: AIIndexMutationResult) => {
    applyMutationResult(mutationResult)
  }, [applyMutationResult])

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchDraft(value)

    if (value.trim().length === 0) {
      debouncedSearch.cancel()
      setSearchQuery("")
      return
    }

    debouncedSearch.call(value)
  }, [debouncedSearch])

  const handleSearchKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return

    debouncedSearch.cancel()
    setSearchQuery(searchDraft.trim())
  }, [debouncedSearch, searchDraft])

  const handleClearSearch = React.useCallback(() => {
    debouncedSearch.cancel()
    setSearchDraft("")
    setSearchQuery("")
  }, [debouncedSearch])

  const currentViewState = React.useMemo<AIIndexViewStateSnapshot>(() => ({
    filter,
    searchDraft,
    searchQuery: persistedSearchQuery,
    scrollOffset,
  }), [filter, persistedSearchQuery, scrollOffset, searchDraft])

  const handleOpenNote = React.useCallback((noteId: string) => {
    saveAIIndexViewState(currentViewState)
    saveAIIndexPendingNoteState({
      noteId,
      returnPath: "/settings?tab=ai-index",
    })
    router.push("/")
  }, [currentViewState, router])

  const mergedNotes = React.useMemo(() => mergeOptimisticNotes(notes, filter, optimisticMutations), [filter, notes, optimisticMutations])
  const displayedNotes = React.useMemo(() => mergedNotes.map((entry) => entry.note), [mergedNotes])
  const exitingNoteIds = React.useMemo(
    () => mergedNotes.filter((entry) => entry.isExiting).map((entry) => entry.note.id),
    [mergedNotes]
  )
  const visibleLoadedNotes = React.useMemo(
    () => mergedNotes.filter((entry) => !entry.isExiting).map((entry) => entry.note),
    [mergedNotes]
  )
  const actionableLoadedNotes = React.useMemo(
    () => getAIIndexActionableNotes(visibleLoadedNotes),
    [visibleLoadedNotes]
  )
  const optimisticTotalCount = React.useMemo(
    () => getOptimisticTotalCount(filter, totalCount, optimisticMutations, lastServerSyncAt),
    [filter, lastServerSyncAt, optimisticMutations, totalCount]
  )
  const loadedCount = displayedNotes.length
  const hasActiveSearch = activeSearchQuery.length > 0
  const hasActiveFilter = filter !== "all"
  const emptyMessage = getAIIndexEmptyMessage(filter, activeSearchQuery)
  const summaryText = getResultsSummaryText(loadedCount, optimisticTotalCount)
  const handleResetFilter = React.useCallback(() => {
    setFilter("all")
  }, [])
  const handleRefetch = React.useCallback(() => {
    runBackgroundTask(query.refetch())
  }, [query])
  const handleLoadMore = React.useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return

    runBackgroundTask(query.fetchNextPage())
  }, [query])
  const invokeBulkIndex = React.useCallback<BulkIndexInvoke>((name, options) => {
    return supabase.functions.invoke(name, options)
  }, [supabase.functions])
  const handleBulkIndexLoaded = React.useCallback(async () => {
    if (bulkIndexProgress || actionableLoadedNotes.length === 0) return

    let counters: BulkIndexCounters = {
      successCount: 0,
      skippedCount: 0,
      errorCount: 0,
    }

    setBulkIndexProgress({ completed: 0, total: actionableLoadedNotes.length })

    try {
      for (const [index, note] of actionableLoadedNotes.entries()) {
        const outcome = await processBulkIndexNote({
          applyMutationResult,
          invoke: invokeBulkIndex,
          note,
        })
        counters = incrementBulkIndexCounters(counters, outcome)
        setBulkIndexProgress({
          completed: index + 1,
          total: actionableLoadedNotes.length,
        })
      }

      const summary = formatBulkIndexSummary(counters.successCount, counters.skippedCount, counters.errorCount)
      if (counters.successCount > 0 && counters.errorCount === 0) {
        toast.success(summary || "Loaded notes indexed")
      } else if (counters.successCount > 0 || counters.skippedCount > 0 || counters.errorCount > 0) {
        toast.message(summary || "Bulk indexing finished")
      }
    } finally {
      setBulkIndexProgress(null)
      runBackgroundTask(queryClient.invalidateQueries({ queryKey: getAIIndexNotesQueryPrefix(user?.id) }))
    }
  }, [actionableLoadedNotes, applyMutationResult, bulkIndexProgress, invokeBulkIndex, queryClient, user?.id])
  const handleBulkIndexClick = React.useCallback(() => {
    handleBulkIndexLoaded().catch(() => {
      toast.error("Bulk indexing failed")
    })
  }, [handleBulkIndexLoaded])
  const emptyState = (
    <AIIndexEmptyState
      emptyMessage={emptyMessage}
      hasActiveFilter={hasActiveFilter}
      hasActiveSearch={hasActiveSearch}
      onClearSearch={handleClearSearch}
      onResetFilter={handleResetFilter}
    />
  )

  if (query.isError) {
    return (
      <AIIndexErrorState
        errorMessage={query.error instanceof Error ? query.error.message : "Failed to load AI index notes."}
        onRetry={handleRefetch}
      />
    )
  }

  const bulkAction = actionableLoadedNotes.length > 0 || bulkIndexProgress ? (
    <Button
      type="button"
      size="sm"
      aria-label={bulkIndexProgress ? "Indexing loaded notes" : "Index loaded notes"}
      aria-busy={bulkIndexProgress !== null}
      onClick={handleBulkIndexClick}
      disabled={bulkIndexProgress !== null}
      className={cn(
        "w-full justify-center whitespace-nowrap border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
        bulkIndexProgress
          ? "cursor-default border-primary/20 bg-primary/10 text-primary/75"
          : "font-medium"
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {bulkIndexProgress ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Database className="h-3.5 w-3.5" />
        )}
        <span>
          {bulkIndexProgress
            ? `${bulkIndexProgress.completed}/${bulkIndexProgress.total}`
            : "Index loaded"}
        </span>
      </span>
    </Button>
  ) : null

  return (
    <div className="space-y-4">
      <AIIndexToolbar
        filter={filter}
        filterOptions={FILTER_OPTIONS}
        isSearchHintVisible={isSearchHintVisible}
        onClearSearch={handleClearSearch}
        onFilterChange={setFilter}
        onSearchChange={handleSearchChange}
        onSearchKeyDown={handleSearchKeyDown}
        searchDraft={searchDraft}
      />

      <div className="rounded-2xl border border-border/60 bg-background/60">
        <AIIndexResultsHeader
          activeSearchQuery={activeSearchQuery}
          bulkAction={bulkAction}
          filter={filter}
          hasActiveSearch={hasActiveSearch}
          isFetching={query.isFetching}
          isFetchingNextPage={query.isFetchingNextPage}
          summaryText={summaryText}
        />
        <div className="h-[min(72vh,760px)]">
          <AIIndexList
            notes={displayedNotes}
            exitingNoteIds={exitingNoteIds}
            isLoading={query.isLoading}
            hasMore={Boolean(query.hasNextPage)}
            isFetchingNextPage={query.isFetchingNextPage}
            onLoadMore={handleLoadMore}
            onMutated={handleMutated}
            onOpenNote={handleOpenNote}
            emptyState={emptyState}
            initialScrollOffset={initialScrollOffset}
            onScrollOffsetChange={setScrollOffset}
          />
        </div>
      </div>
    </div>
  )
}
