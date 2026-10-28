import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'

import { useNoteWorkspaceTabs } from '@ui/web/hooks/useNoteWorkspaceTabs'
import { createNoteWorkspaceState } from '@core/services/noteWorkspaceTabs'
import { readNoteWorkspaceState, writeNoteWorkspaceState } from '@ui/web/lib/noteWorkspaceStorage'

jest.mock('sonner', () => ({ toast: { warning: jest.fn() } }))
jest.mock('@ui/web/lib/noteWorkspaceStorage', () => ({
  readNoteWorkspaceState: jest.fn(),
  writeNoteWorkspaceState: jest.fn(),
}))

const mockRead = readNoteWorkspaceState as jest.MockedFunction<typeof readNoteWorkspaceState>
const mockWrite = writeNoteWorkspaceState as jest.MockedFunction<typeof writeNoteWorkspaceState>

describe('useNoteWorkspaceTabs persistence warning', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRead.mockImplementation(({ userId = null } = {}) => createNoteWorkspaceState(undefined, userId))
    mockWrite.mockReturnValue({ persisted: true, droppedTabIds: [] })
  })

  it('stays quiet while the whole workspace is being stored', () => {
    const { result } = renderHook(() => useNoteWorkspaceTabs('user-1'))

    act(() => { result.current.addTab() })

    expect(mockWrite).toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()
  })

  it('warns once when tabs stop fitting, not on every later write', () => {
    mockWrite.mockReturnValue({ persisted: true, droppedTabIds: ['tab-dropped'] })
    const { result } = renderHook(() => useNoteWorkspaceTabs('user-1'))

    act(() => { result.current.addTab() })
    act(() => { result.current.addTab() })
    act(() => { result.current.addTab() })

    // Persistence runs on every change; the warning must not follow it.
    expect(mockWrite.mock.calls.length).toBeGreaterThan(1)
    expect(toast.warning).toHaveBeenCalledTimes(1)
  })

  it('warns when even the active note cannot be remembered', () => {
    mockWrite.mockReturnValue({ persisted: false, droppedTabIds: [] })
    const { result } = renderHook(() => useNoteWorkspaceTabs('user-1'))
    expect(toast.warning).not.toHaveBeenCalled()

    act(() => { result.current.updateTab(result.current.activeTabId, { draft: { title: 'Unsaved note' } }) })
    act(() => { result.current.updateTab(result.current.activeTabId, { draft: { title: 'Still editing' } }) })

    expect(toast.warning).toHaveBeenCalledTimes(1)
    expect(toast.warning).toHaveBeenCalledWith('Open tabs could not be remembered', expect.objectContaining({
      description: expect.stringContaining('Save your changes'),
    }))
  })

  it('restores for the signed-in account and re-reads when the account changes', () => {
    const { rerender } = renderHook(({ userId }) => useNoteWorkspaceTabs(userId), {
      initialProps: { userId: 'user-1' },
    })

    expect(mockRead).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 'user-1' }))

    rerender({ userId: 'user-2' })

    expect(mockRead).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 'user-2' }))
  })

  it('rejects a stale view update after the tab changes note identity', () => {
    const { result } = renderHook(() => useNoteWorkspaceTabs('user-1'))
    const tabId = result.current.activeTabId
    act(() => { result.current.updateTabForNote(tabId, null, { view: { scrollTop: 250 } }) })
    expect(result.current.activeTab.view.scrollTop).toBe(250)
    act(() => { result.current.updateTab(tabId, { noteId: 'new-note' }) })
    act(() => { result.current.updateTabForNote(tabId, null, { view: { scrollTop: 800 } }) })
    expect(result.current.activeTab.view.scrollTop).toBe(250)
    act(() => { result.current.updateTabForNote(tabId, 'new-note', { view: { scrollTop: 420 } }) })
    expect(result.current.activeTab.view.scrollTop).toBe(420)
  })
})
