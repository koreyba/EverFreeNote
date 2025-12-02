"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSupabase } from "@/lib/providers/SupabaseProvider"
import { NoteService } from "@/lib/services/notes"
import type { Note } from "@/types/domain"

const PAGE_SIZE = 50

type ExportSelectionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (selection: {
    selectAll: boolean
    selectedIds: string[]
    deselectedIds: string[]
    totalCount: number
  }) => void
}

export function ExportSelectionDialog({ open, onOpenChange, onExport }: ExportSelectionDialogProps) {
  const { supabase } = useSupabase()
  const noteService = React.useMemo(() => new NoteService(supabase), [supabase])

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [deselectedIds, setDeselectedIds] = React.useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = React.useState(false)

  const [search, setSearch] = React.useState("")
  const [notes, setNotes] = React.useState<Note[]>([])
  const [loading, setLoading] = React.useState(false)
  const [initialLoading, setInitialLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(false)
  const [page, setPage] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)

  const scrollRef = React.useRef<HTMLDivElement | null>(null)

  const toggleNote = (noteId: string) => {
    setSelectedIds((prev) => {
      if (selectAll) {
        setDeselectedIds((prevD) => {
          const nextD = new Set(prevD)
          if (nextD.has(noteId)) {
            nextD.delete(noteId)
          } else {
            nextD.add(noteId)
          }
          return nextD
        })
        return prev
      } else {
        const next = new Set(prev)
        if (next.has(noteId)) {
          next.delete(noteId)
        } else {
          next.add(noteId)
        }
        return next
      }
    })
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectAll(false)
      setDeselectedIds(new Set())
      setSelectedIds(new Set())
    } else {
      setSelectAll(true)
      setDeselectedIds(new Set())
      setSelectedIds(new Set())
    }
  }

  const handleExport = () => {
    const selection = {
      selectAll,
      selectedIds: Array.from(selectedIds),
      deselectedIds: Array.from(deselectedIds),
      totalCount,
    }
    if (!selectAll && selection.selectedIds.length === 0) return
    onExport(selection)
    onOpenChange(false)
  }

  const selectedCount = selectAll ? Math.max(totalCount - deselectedIds.size, 0) : selectedIds.size
  const allSelected = selectAll && totalCount > 0

  const filteredNotes = React.useMemo(() => {
    if (!search.trim()) return notes
    const q = search.toLowerCase()
    return notes.filter((note) =>
      (note.title || "").toLowerCase().includes(q) ||
      (note.description || "").toLowerCase().includes(q)
    )
  }, [notes, search])

  const loadPage = React.useCallback(async (pageToLoad: number) => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { notes: fetchedNotes, totalCount: count, hasMore: more, nextCursor } = await noteService.getNotes(user.id, {
        page: pageToLoad,
        pageSize: PAGE_SIZE,
      })

      setNotes((prev) => [...prev, ...fetchedNotes])
      setTotalCount(count)
      setHasMore(Boolean(more))
      if (typeof nextCursor === 'number') {
        setPage(nextCursor)
      } else {
        setPage(pageToLoad + 1)
      }
    } catch (error) {
      console.error('Failed to load notes for export:', error)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [noteService, supabase])

  React.useEffect(() => {
    if (open) {
      setNotes([])
      setSelectedIds(new Set())
      setDeselectedIds(new Set())
      setSelectAll(false)
      setPage(0)
      setInitialLoading(true)
      loadPage(0)
    }
  }, [open, loadPage])

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 200
    if (nearBottom && hasMore && !loading) {
      loadPage(page)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Экспорт заметок в .enex</DialogTitle>
          <DialogDescription>
            Выберите заметки для экспорта. Можно выбрать все сразу или отмечать по одной.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Выбрано:{" "}
                <span className="font-medium text-foreground">{selectedCount}</span> из {totalCount}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={totalCount === 0}
              >
                {allSelected ? "Снять выделение" : "Выбрать все"}
              </Button>
            </div>
            <div className="w-full md:w-72">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по заголовку или тексту"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
            </div>
          </div>

          {initialLoading ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Загрузка заметок...
            </div>
          ) : totalCount === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              У вас пока нет заметок для экспорта
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Ничего не найдено по запросу “{search}”
            </div>
          ) : (
            <div className="h-[520px] rounded-md border p-2">
              <div onScroll={handleScroll} className="h-[520px] overflow-y-auto pr-1 space-y-2">
                {filteredNotes.map((note) => {
                  const isSelected = selectAll ? !deselectedIds.has(note.id) : selectedIds.has(note.id)
                  return (
                    <div
                      key={note.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? "border-primary/60 bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleNote(note.id)}
                        className="mt-1"
                        aria-label={`Выбрать заметку ${note.title}`}
                      />
                      <div className="flex-1 space-y-1" onClick={() => toggleNote(note.id)}>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold leading-snug line-clamp-2">{note.title || "Без названия"}</h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(note.updated_at).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                        {note.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {note.description.replace(/<[^>]*>/g, "")}
                          </p>
                        )}
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {note.tags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 4 && (
                              <span className="text-xs text-muted-foreground">+{note.tags.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {hasMore && (
                  <div className="py-3 text-center text-sm text-muted-foreground">
                    {loading ? "Загружаем ещё..." : "Прокрутите ниже, чтобы загрузить ещё"}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleExport} disabled={selectedCount === 0}>
              Экспортировать{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
