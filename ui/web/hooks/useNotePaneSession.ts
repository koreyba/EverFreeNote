import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { NoteViewModel } from '@core/types/domain'
import type { NoteDraftSnapshot, NoteViewSession, NoteWorkspaceTab, NoteWorkspaceTabPatch } from '@core/services/noteWorkspaceTabs'
import type { NoteAppController } from './useNoteAppController'
import { useNoteSaveHandlers } from './useNoteSaveHandlers'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'

/** Each mounted pane owns its save lifecycle and note identity, regardless of focus. */
export function useNotePaneSession(tab: NoteWorkspaceTab, controller: NoteAppController): NoteAppController {
  const { getSessionSnapshot } = useSupabase()
  const { updatePaneTab, rememberPaneCreate, beginPaneWrite } = controller
  const owner = useRef(getSessionSnapshot?.())
  const noteRef = useRef(tab.note)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  useLayoutEffect(() => { noteRef.current = tab.note }, [tab.note])

  const isCurrent = useCallback(() => {
    if (!owner.current || !getSessionSnapshot) return true
    const current = getSessionSnapshot()
    return current.userId === owner.current.userId && current.epoch === owner.current.epoch
  }, [getSessionSnapshot])
  const update = useCallback((patch: NoteWorkspaceTabPatch) => {
    if (isCurrent()) updatePaneTab(tab.id, patch)
  }, [updatePaneTab, isCurrent, tab.id])
  const setSelectedNote = useCallback((value: NoteViewModel | null | ((previous: NoteViewModel | null) => NoteViewModel | null)) => {
    if (!isCurrent()) return
    const note = typeof value === 'function' ? value(noteRef.current) : value
    noteRef.current = note
    update({ note, noteId: note?.id ?? null })
  }, [isCurrent, update])
  const setIsEditing = useCallback((value: boolean | ((previous: boolean) => boolean)) => {
    const editing = typeof value === 'function' ? value(tab.mode === 'editing') : value
    update({ mode: editing ? 'editing' : 'reading' })
  }, [tab.mode, update])
  const rememberPendingCreate = useCallback((note: NoteViewModel) => rememberPaneCreate(tab.id, note), [rememberPaneCreate, tab.id])
  const beginWorkspaceWrite = useCallback(() => beginPaneWrite(tab.id), [beginPaneWrite, tab.id])
  const saves = useNoteSaveHandlers({
    ...controller.paneSaveServices!,
    selectedNote: tab.note,
    selectedNoteRef: noteRef,
    setSelectedNote,
    setIsEditing,
    setLastSavedAt,
    rememberPendingCreate,
    beginWorkspaceWrite,
  })

  const save = async <T,>(draft: NoteDraftSnapshot, write: () => Promise<T>): Promise<T> => {
    update({ draft, saveState: 'saving', saveError: null })
    try {
      controller.assertPaneSaveAllowed()
      const result = await write()
      if (isCurrent()) {
        controller.markTabSaved(tab.id)
        update({ saveState: 'saved', saveError: null })
      }
      return result
    } catch (error) {
      update({ saveState: 'error', saveError: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  return {
    ...controller,
    activeTab: tab,
    activeTabId: tab.id,
    selectedNote: tab.note,
    isEditing: tab.mode === 'editing',
    saving: saves.saving,
    autoSaving: saves.autoSaving,
    lastSavedAt,
    handleDraftChange: draft => update({ draft, saveState: 'dirty', saveError: null }),
    handleViewSessionChange: (view: Partial<NoteViewSession>) => update({ view }),
    handleAutoSave: data => save(data, () => saves.handleAutoSave(data)),
    handleSaveNote: async data => {
      try {
        await save(data, () => saves.handleSaveNote(data))
        return isCurrent() ? { noteId: noteRef.current?.id } : false
      } catch { return false }
    },
    handleReadNote: async data => {
      try { await save(data, () => saves.handleReadNote(data)) } catch { /* Keep this pane in editing mode for retry. */ }
    },
    handleRemoveTagFromNote: saves.handleRemoveTagFromNote,
  }
}
