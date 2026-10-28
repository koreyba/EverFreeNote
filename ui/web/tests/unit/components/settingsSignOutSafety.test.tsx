import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SettingsPage } from '@/components/features/settings/SettingsPage'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { useNoteAuth } from '@ui/web/hooks/useNoteAuth'
import { writeNoteWorkspaceState } from '@ui/web/lib/noteWorkspaceStorage'
import { createNoteWorkspaceState, updateWorkspaceTab } from '@core/services/noteWorkspaceTabs'

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

  it('signs out without a discard prompt when the workspace is saved', async () => {
    writeNoteWorkspaceState(createNoteWorkspaceState(() => 'saved-tab', 'user-1'))
    render(<SupabaseTestProvider supabase={{} as never} user={{ id: 'user-1' } as never}><SettingsPage /></SupabaseTestProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Unsaved changes')).toBeNull()
  })
})
