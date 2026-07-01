import { act, renderHook, waitFor } from '@testing-library/react'
import { useCopyNote } from '@ui/web/hooks/useCopyNote'
import { copyNotePayloadToClipboard } from '@ui/web/lib/noteClipboard'

jest.mock('@ui/web/lib/noteClipboard', () => ({
  copyNotePayloadToClipboard: jest.fn(),
}))

const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}))

const mockCopy = copyNotePayloadToClipboard as jest.MockedFunction<typeof copyNotePayloadToClipboard>

describe('ui/web/hooks/useCopyNote', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('writes the payload and toggles the on-button confirmation for ~1s', async () => {
    jest.useFakeTimers()
    mockCopy.mockResolvedValue(undefined)

    const { result } = renderHook(() => useCopyNote())
    expect(result.current.copied).toBe(false)

    await act(async () => {
      await result.current.copyNote('<p>Hello</p>')
    })

    expect(mockCopy).toHaveBeenCalledTimes(1)
    const payload = mockCopy.mock.calls[0][0]
    expect(payload.html).toContain('data-everfreenote-copy')
    expect(result.current.copied).toBe(true)

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(result.current.copied).toBe(false)
  })

  it('does nothing for an empty body (no clipboard write, no confirmation)', async () => {
    const { result } = renderHook(() => useCopyNote())

    await act(async () => {
      await result.current.copyNote('   ')
    })

    expect(mockCopy).not.toHaveBeenCalled()
    expect(result.current.copied).toBe(false)
  })

  it('shows an error toast and stays unconfirmed when the clipboard write fails', async () => {
    mockCopy.mockRejectedValue(new Error('clipboard blocked'))

    const { result } = renderHook(() => useCopyNote())

    await act(async () => {
      await result.current.copyNote('<p>Hello</p>')
    })

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Failed to copy note'))
    expect(result.current.copied).toBe(false)
  })
})
