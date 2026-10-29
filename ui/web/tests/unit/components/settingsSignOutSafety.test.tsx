import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SettingsPage } from '@/components/features/settings/SettingsPage'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { useNoteAuth } from '@ui/web/hooks/useNoteAuth'
import { writeNoteWorkspaceState } from '@ui/web/lib/noteWorkspaceStorage'
import { createNoteWorkspaceState, updateWorkspaceTab } from '@core/services/noteWorkspaceTabs'
import type { NoteWorkspaceState } from '@core/services/noteWorkspaceTabs'
import { useWorkspaceMemory, WorkspaceMemoryProvider } from '@ui/web/providers/WorkspaceMemoryProvider'

const signOut = jest.fn()
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams('tab=account'),
}))
jest.mock('@ui/web/hooks/useNoteAuth', () => ({ useNoteAuth: jest.fn() }))
jest.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => null }))
jest.mock('@/components/features/settings/AIIndexTab', () => ({ AIIndexTab: () => null }))
jest.mock('@/components/features/settings/ApiKeysSettingsPanel', () => ({ ApiKeysSettingsPanel: () => null }))
jest.mock('@/components/features/settings/WordPressSettingsPanel', () => ({ WordPressSettingsPanel: () => null }))
jest.mock('@/components/features/settings/DeleteAccountPanel', () => ({
  DeleteAccountPanel: ({ onSignOut }: { onSignOut: () => void }) => <button onClick={onSignOut}>Sign out</button>,
}))

function SeedMemory({ state, children }: { state: NoteWorkspaceState; children: React.ReactNode }) {
  const memory = useWorkspaceMemory()
  React.useLayoutEffect(() => { memory.remember(state) }, [memory, state])
  return children
}

function SeedPendingWrite({ onLease, children }: { onLease: (lease: { signal: AbortSignal; finish: () => void }) => void; children: React.ReactNode }) {
  const memory = useWorkspaceMemory()
  React.useLayoutEffect(() => {
    const lease = memory.beginWrite('user-1', 'draft-tab')!
    onLease(lease)
    return lease.finish
  }, [memory, onLease])
  return children
}

describe('settings sign out with a local draft', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    signOut.mockReset().mockResolvedValue(undefined)
    mockPush.mockReset()
    jest.mocked(useNoteAuth).mockReturnValue({
      user: { id: 'user-1', email: 'user@example.invalid' },
      loading: false,
      deleteAccountLoading: false,
      handleDeleteAccount: jest.fn(),
      handleSignOut: signOut,
    } as never)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
  })

  it('warns on mobile before discarding a failed workspace draft', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    const workspace = updateWorkspaceTab(createNoteWorkspaceState(() => 'draft-tab', 'user-1'), 'draft-tab', {
      mode: 'editing', draft: { title: 'Private failed draft' }, saveState: 'error', saveError: 'Storage failed',
    })
    writeNoteWorkspaceState(workspace)
    render(<SupabaseTestProvider supabase={{} as never} user={{ id: 'user-1' } as never}><SettingsPage /></SupabaseTestProvider>)

    const beforeUnload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(beforeUnload)
    expect(beforeUnload.defaultPrevented).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect((await screen.findByRole('alertdialog')).textContent?.toLowerCase()).toContain('unsaved')
    expect(signOut).not.toHaveBeenCalled()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep editing' })))
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(window.sessionStorage.getItem('everfreenote:notes-workspace:v1')).toContain('Private failed draft')
  })

  it('requires confirmation when the workspace cannot be read', async () => {
    jest.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => { throw new Error('Blocked storage') })
    render(<SupabaseTestProvider supabase={{} as never} user={{ id: 'user-1' } as never}><SettingsPage /></SupabaseTestProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect((await screen.findByRole('alertdialog')).textContent).toContain('could not be checked')
    expect(signOut).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes and sign out' }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
  })

  it('protects a memory-only draft on unload without showing it to a different owner', async () => {
    const failedA = updateWorkspaceTab(createNoteWorkspaceState(() => 'draft-a', 'user-1'), 'draft-a', {
      mode: 'editing', draft: { title: 'Private memory-only draft' }, saveState: 'error',
    })
    const { unmount } = render(
      <SupabaseTestProvider supabase={{} as never} user={{ id: 'user-1' } as never}>
        <WorkspaceMemoryProvider><SeedMemory state={failedA}><SettingsPage /></SeedMemory></WorkspaceMemoryProvider>
      </SupabaseTestProvider>
    )
    const unloadA = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unloadA)
    expect(unloadA.defaultPrevented).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect((await screen.findByRole('alertdialog')).textContent).toContain('Unsaved changes')
    unmount()

    jest.mocked(useNoteAuth).mockReturnValue({
      user: { id: 'user-2', email: 'other@example.invalid' }, loading: false,
      deleteAccountLoading: false, handleDeleteAccount: jest.fn(), handleSignOut: signOut,
    } as never)
    render(
      <SupabaseTestProvider supabase={{} as never} user={{ id: 'user-2' } as never}>
        <WorkspaceMemoryProvider><SeedMemory state={failedA}><SettingsPage /></SeedMemory></WorkspaceMemoryProvider>
      </SupabaseTestProvider>
    )
    const unloadB = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unloadB)
    expect(unloadB.defaultPrevented).toBe(true)
    expect(screen.queryByText('Private memory-only draft')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('warns about an already-started save and cancels it only on explicit discard', async () => {
    const workspace = updateWorkspaceTab(createNoteWorkspaceState(() => 'draft-tab', 'user-1'), 'draft-tab', {
      mode: 'editing', draft: { title: 'Private draft' }, saveState: 'dirty',
    })
    let lease!: { signal: AbortSignal; finish: () => void }
    const capture = (current: typeof lease) => { lease = current }
    render(
      <SupabaseTestProvider supabase={{} as never} user={{ id: 'user-1' } as never}>
        <WorkspaceMemoryProvider><SeedMemory state={workspace}><SeedPendingWrite onLease={capture}><SettingsPage /></SeedPendingWrite></SeedMemory></WorkspaceMemoryProvider>
      </SupabaseTestProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect((await screen.findByRole('alertdialog')).textContent).toContain('A save has already started and may still finish')
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(lease.signal.aborted).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await screen.findByRole('alertdialog')
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes and sign out' }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(lease.signal.aborted).toBe(true)
  })

  it('signs out without a discard prompt when the workspace is saved', async () => {
    writeNoteWorkspaceState(createNoteWorkspaceState(() => 'saved-tab', 'user-1'))
    render(<SupabaseTestProvider supabase={{} as never} user={{ id: 'user-1' } as never}><SettingsPage /></SupabaseTestProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Unsaved changes')).toBeNull()
  })
})
