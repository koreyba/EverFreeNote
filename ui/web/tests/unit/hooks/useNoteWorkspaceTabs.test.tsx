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

  it('restores for the signed-in account and re-reads when the account changes', () => {
    const { rerender } = renderHook(({ userId }) => useNoteWorkspaceTabs(userId), {
      initialProps: { userId: 'user-1' },
    })

    expect(mockRead).toHaveBeenLastCalledWith({ userId: 'user-1' })

    rerender({ userId: 'user-2' })

    expect(mockRead).toHaveBeenLastCalledWith({ userId: 'user-2' })
  })
})
