import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SettingsPage } from '@/components/features/settings/SettingsPage'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { SPLIT_VIEW_ENABLED_KEY, SplitViewPreferenceProvider } from '@ui/web/providers/SplitViewPreferenceProvider'
import { useNoteAuth } from '@ui/web/hooks/useNoteAuth'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams('tab=account'),
}))
jest.mock('@ui/web/hooks/useNoteAuth', () => ({ useNoteAuth: jest.fn() }))
jest.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => null }))
jest.mock('@/components/features/settings/AIIndexTab', () => ({ AIIndexTab: () => null }))
jest.mock('@/components/features/settings/ApiKeysSettingsPanel', () => ({ ApiKeysSettingsPanel: () => null }))
jest.mock('@/components/features/settings/WordPressSettingsPanel', () => ({ WordPressSettingsPanel: () => null }))

function mountSettings() {
  return render(<SplitViewPreferenceProvider><SupabaseTestProvider supabase={{} as never} user={{ id: 'user-1' } as never}>
    <SettingsPage />
  </SupabaseTestProvider></SplitViewPreferenceProvider>)
}

beforeEach(() => {
  window.localStorage.clear()
  jest.mocked(useNoteAuth).mockReturnValue({
    user: { id: 'user-1', email: 'user@example.invalid' }, loading: false,
    deleteAccountLoading: false, handleDeleteAccount: jest.fn(), handleSignOut: jest.fn(),
  } as never)
})
afterEach(() => jest.restoreAllMocks())

it('offers split view as an opt-in browser preference in account settings', async () => {
  mountSettings()
  const toggle = await screen.findByRole('switch', { name: 'Split view' })
  expect(toggle.getAttribute('aria-checked')).toBe('false')
  expect(screen.getByText(/desktop/i)).toBeTruthy()
  expect(screen.getByText(/this browser/i)).toBeTruthy()
})

it('persists the choice across a fresh provider mount', async () => {
  const first = mountSettings()
  const toggle = await screen.findByRole('switch', { name: 'Split view' })
  fireEvent.click(toggle)
  expect(toggle.getAttribute('aria-checked')).toBe('true')
  expect(window.localStorage.getItem(SPLIT_VIEW_ENABLED_KEY)).toBe('true')
  first.unmount()
  mountSettings()
  await waitFor(() => expect(screen.getByRole('switch', { name: 'Split view' }).getAttribute('aria-checked')).toBe('true'))
})

it('keeps the current choice but warns when storage rejects a write', async () => {
  mountSettings()
  const toggle = await screen.findByRole('switch', { name: 'Split view' })
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota', 'QuotaExceededError') })
  fireEvent.click(toggle)
  expect(toggle.getAttribute('aria-checked')).toBe('true')
  expect(screen.getByRole('status').textContent).toMatch(/could not be saved.*reload/i)
})

it('warns when storage cannot be read', async () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError') })
  mountSettings()
  expect((await screen.findByRole('switch', { name: 'Split view' })).getAttribute('aria-checked')).toBe('false')
  expect(screen.getByRole('status').textContent).toMatch(/could not be saved.*reload/i)
})

it('ignores session storage events while responding to a preference change from another browser tab', async () => {
  window.localStorage.setItem(SPLIT_VIEW_ENABLED_KEY, 'true')
  mountSettings()
  const toggle = await screen.findByRole('switch', { name: 'Split view' })
  await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'))
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: window.sessionStorage })))
  expect(toggle.getAttribute('aria-checked')).toBe('true')
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: SPLIT_VIEW_ENABLED_KEY, newValue: 'false', storageArea: window.localStorage })))
  expect(toggle.getAttribute('aria-checked')).toBe('false')
})
