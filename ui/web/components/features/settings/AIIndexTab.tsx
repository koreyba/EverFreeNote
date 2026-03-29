"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Database, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@ui/web/lib/utils"
import type { AIIndexFilter } from "@core/types/aiIndex"
import {
  getAIIndexNotesQueryPrefix,
  useAIIndexNotes,
  useFlattenedAIIndexNotes,
} from "@ui/web/hooks/useAIIndexNotes"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { AIIndexList } from "@/components/features/settings/AIIndexList"
import {
  settingsInsetPanelClassName,
  settingsSectionCardClassName,
} from "@/components/features/settings/settingsLayout"

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

export function AIIndexTab() {
  const queryClient = useQueryClient()
  const { user } = useSupabase()
  const [filter, setFilter] = React.useState<AIIndexFilter>("all")

  const query = useAIIndexNotes(filter)
  const notes = useFlattenedAIIndexNotes(query)
  const totalCount = query.data?.pages[0]?.totalCount ?? 0

  const handleMutated = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getAIIndexNotesQueryPrefix(user?.id) })
  }, [queryClient, user?.id])

  if (query.isError) {
    return (
      <div className="space-y-4">
        <div className={cn(settingsInsetPanelClassName, "border-destructive/30 bg-destructive/5")}>
          <h3 className="text-base font-semibold text-foreground">AI index status is unavailable</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {query.error instanceof Error ? query.error.message : "Failed to load AI index notes."}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className={cn(settingsSectionCardClassName, "rounded-2xl border p-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted/40">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">AI Index</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Review which notes are indexed for AI search, which were never indexed, and which became outdated after edits.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {query.isFetching && !query.isFetchingNextPage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              <span>
                {filter === "all" ? "Visible notes" : `Visible ${FILTER_OPTIONS.find((option) => option.value === filter)?.label.toLowerCase()}`}
              </span>
            </div>
            <div className="mt-1 text-xl font-semibold text-foreground">{totalCount}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => {
          const isActive = option.value === filter
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-foreground/20 bg-foreground text-background"
                  : "border-border/70 bg-background/70 text-foreground hover:bg-muted/50"
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/60">
        <div className="border-b border-border/60 px-4 py-3 text-sm text-muted-foreground">
          The list keeps the same large-dataset principles as the main notes list: virtualization, dynamic row heights, and lazy loading on scroll.
        </div>
        <div className="h-[min(65vh,720px)]">
          <AIIndexList
            notes={notes}
            isLoading={query.isLoading}
            hasMore={Boolean(query.hasNextPage)}
            isFetchingNextPage={query.isFetchingNextPage}
            onLoadMore={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) {
                void query.fetchNextPage()
              }
            }}
            onMutated={handleMutated}
            emptyMessage={FILTER_EMPTY_MESSAGES[filter]}
          />
        </div>
      </div>
    </div>
  )
}
