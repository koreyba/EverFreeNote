import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { WordPressSettingsPanel } from '@/components/features/settings/WordPressSettingsPanel'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'

const mockGetStatus = jest.fn()
const mockUpsert = jest.fn()
const mockSupabase = {} as never

jest.mock('@ui/web/providers/SupabaseProvider', () => ({
  useSupabase: jest.fn(),
}))

jest.mock('@core/services/wordpressSettings', () => ({
  WordPressSettingsService: jest.fn().mockImplementation(() => ({
    getStatus: mockGetStatus,
    upsert: mockUpsert,
  })),
}))

const emptyStatus = { configured: false, integration: null }
const configuredStatus = {
  configured: true,
  integration: {
    siteUrl: 'https://blog.example.com/base/',
    wpUsername: 'stored-user',
    enabled: true,
    hasPassword: true,
  },
}

function renderPanel(props: React.ComponentProps<typeof WordPressSettingsPanel> = {}) {
  return render(<WordPressSettingsPanel {...props} />)
}

describe('WordPressSettingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useSupabase).mockReturnValue({ supabase: mockSupabase, user: null, loading: false })
    mockGetStatus.mockResolvedValue(emptyStatus)
    mockUpsert.mockResolvedValue(configuredStatus)
  })

  it('loads configured settings, reports loading, and notifies the parent', async () => {
    let resolveStatus: ((status: typeof configuredStatus) => void) | undefined
    const pendingStatus = new Promise<typeof configuredStatus>((resolve) => {
      resolveStatus = resolve
    })
    mockGetStatus.mockReturnValueOnce(pendingStatus)
    const onConfiguredChange = jest.fn()

    renderPanel({ onConfiguredChange })

    expect((screen.getByLabelText('Site URL') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Save settings' }) as HTMLButtonElement).disabled).toBe(true)

    await act(async () => {
      resolveStatus?.(configuredStatus)
      await pendingStatus
    })
    expect(screen.getByText('Integration is configured.')).toBeTruthy()
    expect(screen.getByDisplayValue('https://blog.example.com/base/')).toBeTruthy()
    expect(screen.getByDisplayValue('stored-user')).toBeTruthy()
    expect(screen.getByPlaceholderText('Leave empty to keep current password')).toBeTruthy()
    expect(onConfiguredChange).toHaveBeenCalledWith(true)
  })

  it('shows load errors and uses a fallback for non-Error failures', async () => {
    mockGetStatus.mockRejectedValueOnce(new Error('settings unavailable'))
    const first = renderPanel()
    expect(await screen.findByText('settings unavailable')).toBeTruthy()
    first.unmount()

    mockGetStatus.mockRejectedValueOnce('unexpected load failure')
    renderPanel()
    expect(await screen.findByText('Failed to load WordPress settings')).toBeTruthy()
  })

  it('rejects missing credentials, invalid protocols, and an initial missing password', async () => {
    renderPanel()
    await waitFor(() => expect(mockGetStatus).toHaveBeenCalled())
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save settings' }) as HTMLButtonElement).disabled).toBe(false))

    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(await screen.findByText('Site URL and username are required.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Site URL'), { target: { value: 'ftp://blog.example.com' } })
    fireEvent.change(screen.getByLabelText('WordPress username'), { target: { value: 'editor' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(await screen.findByText('Enter a valid site URL including http:// or https://.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Site URL'), { target: { value: 'https://blog.example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(await screen.findByText('Application password is required for initial setup.')).toBeTruthy()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('normalizes and saves settings, toggles enabled, and clears the password after success', async () => {
    const onConfiguredChange = jest.fn()
    renderPanel({ onConfiguredChange })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save settings' }) as HTMLButtonElement).disabled).toBe(false))

    fireEvent.change(screen.getByLabelText('Site URL'), {
      target: { value: '  https://blog.example.com/base///?source=test  ' },
    })
    fireEvent.change(screen.getByLabelText('WordPress username'), { target: { value: ' editor ' } })
    fireEvent.change(screen.getByLabelText('Application password'), { target: { value: '  xxxx yyyy  ' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable WordPress export' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))

    await waitFor(() => expect(mockUpsert).toHaveBeenCalledWith({
      siteUrl: 'https://blog.example.com/base?source=test',
      wpUsername: 'editor',
      applicationPassword: 'xxxx yyyy',
      enabled: false,
    }))
    expect(await screen.findByText('WordPress settings saved.')).toBeTruthy()
    expect((screen.getByLabelText('Application password') as HTMLInputElement).value).toBe('')
    expect(screen.getByText('Integration is configured.')).toBeTruthy()
    expect(onConfiguredChange).toHaveBeenCalledWith(true)
  })

  it('keeps a stored password when saving without replacing it', async () => {
    mockGetStatus.mockResolvedValueOnce(configuredStatus)
    renderPanel()
    await waitFor(() => expect(screen.getByText('Stored password exists. Enter a new one only to replace it.')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('Site URL'), { target: { value: 'https://new.example.com/' } })
    fireEvent.change(screen.getByLabelText('WordPress username'), { target: { value: 'new-user' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))

    await waitFor(() => expect(mockUpsert).toHaveBeenCalledWith({
      siteUrl: 'https://new.example.com',
      wpUsername: 'new-user',
      applicationPassword: undefined,
      enabled: true,
    }))
  })

  it('reports save errors, clears saving state, and supports closing', async () => {
    const onClose = jest.fn()
    renderPanel({ onClose, showCloseButton: true })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save settings' }) as HTMLButtonElement).disabled).toBe(false))

    fireEvent.change(screen.getByLabelText('Site URL'), { target: { value: 'https://blog.example.com' } })
    fireEvent.change(screen.getByLabelText('WordPress username'), { target: { value: 'editor' } })
    fireEvent.change(screen.getByLabelText('Application password'), { target: { value: 'secret' } })
    mockUpsert.mockRejectedValueOnce(new Error('save unavailable'))
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(await screen.findByText('save unavailable')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeTruthy()

    mockUpsert.mockRejectedValueOnce(null)
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(await screen.findByText('Failed to save WordPress settings')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
