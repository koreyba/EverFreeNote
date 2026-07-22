import { act, renderHook } from '@testing-library/react'
import type { NoteViewModel, SearchResult } from '@core/types/domain'
import { useNoteSelection } from '@ui/web/hooks/useNoteSelection'

const note = (id: string): NoteViewModel => ({
  id,
  title: `Note ${id}`,
  description: 'Description',
  tags: ['tag'],
  user_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
})

describe('useNoteSelection', () => {
  it('handles viewing, editing, creating, and deleting notes', () => {
    const selected = note('one')
    const { result } = renderHook(() => useNoteSelection())

    act(() => result.current.handleSelectNote(selected))
    expect(result.current.selectedNote).toBe(selected)
    expect(result.current.isEditing).toBe(false)

    act(() => result.current.handleEditNote(selected))
    expect(result.current.selectedNote).toBe(selected)
    expect(result.current.isEditing).toBe(true)

    act(() => result.current.handleCreateNote())
    expect(result.current.selectedNote).toBeNull()
    expect(result.current.isEditing).toBe(true)

    const searchResult = { ...selected, headline: '<b>match</b>', rank: 0.9 } as SearchResult
    act(() => result.current.handleSearchResultClick(searchResult))
    expect(result.current.selectedNote).toBe(searchResult)
    expect(result.current.isEditing).toBe(false)

    act(() => result.current.handleDeleteNote(selected))
    expect(result.current.noteToDelete).toBe(selected)
    expect(result.current.deleteDialogOpen).toBe(true)
  })

  it('enters selection mode, toggles ids, selects visible notes, and clears them', () => {
    const { result } = renderHook(() => useNoteSelection())
    const first = note('one')
    const second = note('two')

    act(() => {
      result.current.handleEditNote(first)
      result.current.enterSelectionMode()
    })
    expect(result.current.selectionMode).toBe(true)
    expect(result.current.selectedNote).toBeNull()
    expect(result.current.isEditing).toBe(false)
    expect(result.current.selectedNoteIds).toEqual(new Set())

    act(() => result.current.toggleNoteSelection(first.id))
    expect(result.current.selectedNoteIds).toEqual(new Set(['one']))
    expect(result.current.selectionMode).toBe(true)

    act(() => result.current.toggleNoteSelection(first.id))
    expect(result.current.selectedNoteIds).toEqual(new Set())
    expect(result.current.selectionMode).toBe(false)

    act(() => result.current.selectAllVisible([first, second]))
    expect(result.current.selectedNoteIds).toEqual(new Set(['one', 'two']))
    expect(result.current.selectionMode).toBe(true)

    act(() => result.current.clearSelection())
    expect(result.current.selectedNoteIds).toEqual(new Set())
    expect(result.current.selectionMode).toBe(false)
  })

  it('exits selection mode and resets ids while preserving the bulk deleting flag', () => {
    const { result } = renderHook(() => useNoteSelection())

    act(() => {
      result.current.setBulkDeleting(true)
      result.current.setSelectedNoteIds(new Set(['one']))
      result.current.setSelectionMode(true)
      result.current.exitSelectionMode()
    })

    expect(result.current.selectionMode).toBe(false)
    expect(result.current.selectedNoteIds).toEqual(new Set())
    expect(result.current.bulkDeleting).toBe(true)
  })
})
