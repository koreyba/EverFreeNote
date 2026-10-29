import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'

import { useNoteWorkspaceTabs } from '@ui/web/hooks/useNoteWorkspaceTabs'
import { NOTE_WORKSPACE_STORAGE_KEY, readNoteWorkspaceState, writeNoteWorkspaceState } from '@ui/web/lib/noteWorkspaceStorage'
import {
  addWorkspaceTab,
  closeWorkspaceTab,
  createNoteWorkspaceState,
  openNoteInWorkspace,
  updateWorkspaceTab,
} from '@core/services/noteWorkspaceTabs'
import type { NoteViewModel } from '@core/types/domain'

jest.mock('sonner', () => ({ toast: { warning: jest.fn() } }))

const note = (id: string): NoteViewModel => ({
  id,
  title: `Note ${id}`,
  description: `<p>${id}</p>`,
  tags: [],
  created_at: '2026-10-28T10:00:00Z',
  updated_at: '2026-10-28T10:00:00Z',
  user_id: 'user-1',
})

describe('workspace hydration with asynchronous authentication', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    jest.clearAllMocks()
  })

  afterEach(() => jest.restoreAllMocks())

  it('keeps saved and failed drafts intact until the account is known, then restores the open tabs', () => {
    let workspace = openNoteInWorkspace(createNoteWorkspaceState(() => 'first-tab', 'user-1'), note('first'))
    workspace = addWorkspaceTab(workspace, () => 'closed-tab')
    workspace = openNoteInWorkspace(workspace, note('closed'))
    workspace = closeWorkspaceTab(workspace, 'closed-tab')
    workspace = updateWorkspaceTab(workspace, 'first-tab', {
      mode: 'editing', draft: { title: 'Dirty first' }, saveState: 'dirty',
    })
    workspace = addWorkspaceTab(workspace, () => 'draft-tab')
    workspace = updateWorkspaceTab(workspace, 'draft-tab', {
      mode: 'editing',
      draft: { title: 'Unsaved draft', description: '<p>Keep this</p>', tags: 'draft' },
      saveState: 'error',
      saveError: 'Storage unavailable',
      view: { scrollTop: 81 },
    })
    expect(writeNoteWorkspaceState(workspace).persisted).toBe(true)
    const persisted = window.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY)
    const { result, rerender } = renderHook(({ userId }: { userId: string | null }) => useNoteWorkspaceTabs(userId), {
      initialProps: { userId: null as string | null },
    })

    expect(window.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY)).toBe(persisted)
    expect(result.current.hydrated).toBe(false)
    rerender({ userId: 'user-1' })

    expect(result.current.hydrated).toBe(true)
    expect(result.current.tabs.map(tab => tab.id)).toEqual(['first-tab', 'draft-tab'])
    expect(result.current.tabs[0].draft.title).toBe('Dirty first')
    expect(result.current.tabs[0].saveState).toBe('dirty')
    expect(result.current.activeTabId).toBe('draft-tab')
    expect(result.current.activeTab.draft).toEqual({ title: 'Unsaved draft', description: '<p>Keep this</p>', tags: 'draft' })
    expect(result.current.activeTab.saveState).toBe('error')
    expect(result.current.activeTab.view.scrollTop).toBe(81)
  })

  it('does not expose or persist the previous account when users change', () => {
    const workspace = openNoteInWorkspace(createNoteWorkspaceState(() => 'first-tab', 'user-1'), note('first'))
    writeNoteWorkspaceState(workspace)
    const { result, rerender } = renderHook(({ userId }: { userId: string | null }) => useNoteWorkspaceTabs(userId), {
      initialProps: { userId: 'user-1' as string | null },
    })
    expect(result.current.activeTab.noteId).toBe('first')

    rerender({ userId: null })
    expect(readNoteWorkspaceState({ userId: 'user-1' }).activeTabId).toBe('first-tab')
    expect(result.current.hydrated).toBe(false)
    expect(result.current.activeTab.note).toBeNull()

    rerender({ userId: 'user-2' })
    expect(result.current.hydrated).toBe(true)
    expect(result.current.userId).toBe('user-2')
    expect(result.current.activeTab.note).toBeNull()
    expect(window.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY)).not.toContain('Note first')
  })

  it('never renders the previous account while the next account is hydrating', () => {
    const workspace = openNoteInWorkspace(createNoteWorkspaceState(() => 'first-tab', 'user-1'), note('first'))
    writeNoteWorkspaceState(workspace)
    const rendered: Array<{ userId: string | null; titles: string[] }> = []
    const { rerender } = renderHook(({ userId }: { userId: string | null }) => {
      const current = useNoteWorkspaceTabs(userId)
      rendered.push({ userId, titles: current.tabs.map(tab => tab.note?.title ?? '') })
      return current
    }, { initialProps: { userId: 'user-1' as string | null } })

    rerender({ userId: 'user-2' })
    const newAccountRenders = rendered.filter(entry => entry.userId === 'user-2')
    expect(newAccountRenders.length).toBeGreaterThan(0)
    expect(newAccountRenders.every(entry => !entry.titles.includes('Note first'))).toBe(true)
  })

  it('keeps the in-memory editor usable and warns if session storage is unavailable', () => {
    jest.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => { throw new Error('Storage blocked') })
    const { result } = renderHook(() => useNoteWorkspaceTabs('user-1'))

    expect(result.current.hydrated).toBe(true)
    act(() => { result.current.updateTab(result.current.activeTabId, { mode: 'editing', draft: { title: 'Local only' } }) })
    expect(result.current.activeTab.draft.title).toBe('Local only')
    expect(toast.warning).toHaveBeenCalledWith('Open tabs could not be remembered', expect.anything())
  })

  it('does not overwrite a saved workspace when storage reads fail but writes remain available', () => {
    const workspace = openNoteInWorkspace(createNoteWorkspaceState(() => 'first-tab', 'user-1'), note('first'))
    writeNoteWorkspaceState(workspace)
    const original = window.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY)
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Read blocked') })
    const setItem = jest.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(() => useNoteWorkspaceTabs('user-1'))

    expect(toast.warning).toHaveBeenCalledWith('Open tabs could not be remembered', expect.objectContaining({
      description: expect.stringContaining('could not be restored'),
    }))
    act(() => { result.current.updateTab(result.current.activeTabId, { mode: 'editing', draft: { title: 'Local only' } }) })
    expect(result.current.activeTab.draft.title).toBe('Local only')
    expect(setItem).not.toHaveBeenCalled()
    expect(toast.warning).toHaveBeenCalledWith('Open tabs could not be remembered', expect.anything())
    getItem.mockRestore()
    expect(window.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY)).toBe(original)
  })

  it('does not resurrect a workspace cleared on sign-out when the same account returns', () => {
    const workspace = openNoteInWorkspace(createNoteWorkspaceState(() => 'first-tab', 'user-1'), note('first'))
    writeNoteWorkspaceState(workspace)
    const { result, rerender } = renderHook(({ userId }: { userId: string | null }) => useNoteWorkspaceTabs(userId), {
      initialProps: { userId: 'user-1' as string | null },
    })
    expect(result.current.activeTab.noteId).toBe('first')

    window.sessionStorage.removeItem(NOTE_WORKSPACE_STORAGE_KEY)
    rerender({ userId: null })
    rerender({ userId: 'user-1' })

    expect(result.current.hydrated).toBe(true)
    expect(result.current.activeTab.note).toBeNull()
    expect(window.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY)).not.toContain('Note first')
  })
})
