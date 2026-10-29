import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createNoteWorkspaceState, updateWorkspaceTab } from '@core/services/noteWorkspaceTabs'
import type { NoteViewModel } from '@core/types/domain'
import { WorkspaceMemoryProvider, useWorkspaceMemory } from '@ui/web/providers/WorkspaceMemoryProvider'
import { useNoteWorkspaceTabs } from '@ui/web/hooks/useNoteWorkspaceTabs'

const note = (id: string, owner: string): NoteViewModel => ({
  id, user_id: owner, title: 'First save', description: '', tags: [],
  created_at: '2026-10-29T00:00:00.000Z', updated_at: '2026-10-29T00:00:00.000Z',
}) as NoteViewModel

const draft = (owner: string, tabId: string) => {
  const workspace = createNoteWorkspaceState(() => tabId, owner)
  return updateWorkspaceTab(workspace, tabId, {
    mode: 'editing', draft: { title: 'Latest typed text' }, saveState: 'dirty',
  })
}

describe('in-flight create identity in the navigation fallback', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <WorkspaceMemoryProvider>{children}</WorkspaceMemoryProvider>

  it('keeps the first ID with the owner and tab without overwriting newer input', () => {
    const { result } = renderHook(() => useWorkspaceMemory(), { wrapper })
    result.current.rememberCreate('A', 'tab-1', note('first-id', 'A'))
    result.current.remember(draft('A', 'tab-1'))
    const restored = result.current.read('A')!
    expect(restored.tabs[0]).toMatchObject({ noteId: 'first-id', draft: { title: 'Latest typed text' }, saveState: 'dirty' })
    expect(result.current.read('B')).toBeNull()
  })

  it('forgets only the closed tab and never reattaches it when that slot is reused', () => {
    const { result } = renderHook(() => useWorkspaceMemory(), { wrapper })
    result.current.rememberCreate('A', 'tab-1', note('first-id', 'A'))
    result.current.rememberCreate('A', 'tab-2', note('second-id', 'A'))
    result.current.forgetCreate('A', 'tab-1')
    result.current.remember(draft('A', 'tab-1'))
    expect(result.current.read('A')!.tabs[0].noteId).toBeNull()
    result.current.remember(draft('A', 'tab-2'))
    expect(result.current.read('A')!.tabs[0].noteId).toBe('second-id')
  })

  it('clears identity on explicit sign-out while retaining other owners', () => {
    const { result } = renderHook(() => useWorkspaceMemory(), { wrapper })
    result.current.rememberCreate('A', 'tab-1', note('first-id', 'A'))
    result.current.rememberCreate('B', 'tab-1', note('second-id', 'B'))
    result.current.discardOwner('A')
    result.current.remember(draft('A', 'tab-1'))
    expect(result.current.read('A')!.tabs[0].noteId).toBeNull()
    result.current.remember(draft('B', 'tab-1'))
    expect(result.current.read('B')!.tabs[0].noteId).toBe('second-id')
  })

  it('rejects late teardown from a discarded epoch without blocking a new session', () => {
    const { result } = renderHook(() => useWorkspaceMemory(), { wrapper })
    result.current.remember(draft('A', 'tab-1'), 1)
    result.current.discardOwner('A', 1)
    result.current.rememberCreate('A', 'tab-1', note('old-id', 'A'), 1)
    result.current.remember(draft('A', 'tab-1'), 1)
    expect(result.current.read('A')).toBeNull()
    result.current.remember(draft('A', 'tab-2'), 3)
    result.current.remember(draft('A', 'tab-1'), 1)
    expect(result.current.read('A')!.activeTabId).toBe('tab-2')
  })

  it('does not let an older owner epoch overwrite or clear the newer returning session', () => {
    const { result } = renderHook(() => useWorkspaceMemory(), { wrapper })
    result.current.activateOwner('A', 1)
    result.current.remember(draft('A', 'old-tab'), 1)
    result.current.activateOwner('A', 3)
    result.current.remember(draft('A', 'new-tab'), 3)
    result.current.remember(draft('A', 'old-tab'), 1)
    result.current.clear('A', 1)
    result.current.discardOwner('A', 1)
    expect(result.current.read('A')!.activeTabId).toBe('new-tab')
  })

  it('keeps the other dirty tab when only one tab is discarded', async () => {
    const { result } = renderHook(() => ({ memory: useWorkspaceMemory(), workspace: useNoteWorkspaceTabs('A', 1) }), { wrapper })
    await waitFor(() => expect(result.current.workspace.hydrated).toBe(true))
    const first = result.current.workspace.activeTabId
    let second = ''
    act(() => { second = result.current.workspace.addTab() })
    act(() => {
      result.current.workspace.updateTab(first, { mode: 'editing', draft: { title: 'discarded' }, saveState: 'error' })
      result.current.workspace.updateTab(second, { mode: 'editing', draft: { title: 'retained' }, saveState: 'error' })
      result.current.memory.rememberCreate('A', first, note('first-id', 'A'), 1)
      result.current.memory.rememberCreate('A', second, note('second-id', 'A'), 1)
    })
    act(() => { result.current.workspace.closeTab(first) })
    await waitFor(() => expect(result.current.memory.read('A')?.tabs).toHaveLength(1))
    expect(result.current.memory.read('A')!.tabs[0]).toMatchObject({ id: second, noteId: 'second-id', draft: { title: 'retained' } })
  })

  it('cancels writes only for the discarded owner and tab, and tracks them until settled', () => {
    const { result } = renderHook(() => useWorkspaceMemory(), { wrapper })
    result.current.activateOwner('A', 1)
    result.current.activateOwner('B', 2)
    const first = result.current.beginWrite('A', 'tab-1', 1)!
    const otherTab = result.current.beginWrite('A', 'tab-2', 1)!
    const otherOwner = result.current.beginWrite('B', 'tab-1', 2)!
    result.current.cancelTabWrites('A', 'tab-1', 1)
    expect(first.signal.aborted).toBe(true)
    expect(otherTab.signal.aborted).toBe(false)
    expect(otherOwner.signal.aborted).toBe(false)
    expect(result.current.hasPendingWrites('A', 'tab-1')).toBe(true)
    const retry = result.current.beginWrite('A', 'tab-1', 1)!
    expect(retry.signal.aborted).toBe(false)
    first.finish()
    retry.finish()
    expect(result.current.hasPendingWrites('A', 'tab-1')).toBe(false)
    expect(result.current.hasPendingWrites('A', 'tab-2')).toBe(true)
    otherTab.finish()
    otherOwner.finish()
  })

  it('aborts all of the discarded owner without touching another owner', () => {
    const { result } = renderHook(() => useWorkspaceMemory(), { wrapper })
    const first = result.current.beginWrite('A', 'tab-1', 1)!
    const second = result.current.beginWrite('A', 'tab-2', 1)!
    const other = result.current.beginWrite('B', 'tab-1', 2)!
    result.current.cancelOwnerWrites('A', 1)
    expect(first.signal.aborted).toBe(true)
    expect(second.signal.aborted).toBe(true)
    expect(other.signal.aborted).toBe(false)
    first.finish(); second.finish(); other.finish()
  })

  it('requests a generic unload warning for an earlier owner without exposing their draft', () => {
    const { result } = renderHook(() => useWorkspaceMemory(), { wrapper })
    result.current.remember(draft('A', 'tab-a'), 1)
    expect(result.current.read('B')).toBeNull()
    const beforeUnload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(beforeUnload)
    expect(beforeUnload.defaultPrevented).toBe(true)
    result.current.discardOwner('A', 1)
    const cleanUnload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(cleanUnload)
    expect(cleanUnload.defaultPrevented).toBe(false)
  })
})
