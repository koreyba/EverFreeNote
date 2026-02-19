import { renderHook, act, waitFor } from '@testing-library/react-native'
import { useBulkDeleteNotes } from '@ui/mobile/hooks/useBulkDeleteNotes'
import Toast from 'react-native-toast-message'

const mockMutateAsync = jest.fn()

jest.mock('@ui/mobile/hooks/useNotes', () => ({
  useDeleteNote: () => ({
    mutateAsync: mockMutateAsync,
  }),
}))

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}))

describe('useBulkDeleteNotes', () => {
  beforeEach(() => {
    mockMutateAsync.mockResolvedValue(undefined)
    ;(Toast.show as jest.Mock).mockClear()
  })

  it('calls deleteNote for each provided id', async () => {
    const { result } = renderHook(() => useBulkDeleteNotes())

    await act(async () => {
      await result.current.bulkDelete(['a', 'b', 'c'])
    })

    expect(mockMutateAsync).toHaveBeenCalledTimes(3)
    expect(mockMutateAsync).toHaveBeenCalledWith('a')
    expect(mockMutateAsync).toHaveBeenCalledWith('b')
    expect(mockMutateAsync).toHaveBeenCalledWith('c')
  })

  it('sets isPending=true during execution and false after', async () => {
    let resolveDelete!: () => void
    mockMutateAsync.mockImplementation(
      () => new Promise<void>(resolve => { resolveDelete = resolve })
    )

    const { result } = renderHook(() => useBulkDeleteNotes())

    act(() => {
      void result.current.bulkDelete(['note-1'])
    })

    expect(result.current.isPending).toBe(true)

    await act(async () => {
      resolveDelete()
    })

    await waitFor(() => expect(result.current.isPending).toBe(false))
  })

  it('continues remaining deletions when one fails (Promise.allSettled)', async () => {
    mockMutateAsync
      .mockResolvedValueOnce(undefined)        // 'a' succeeds
      .mockRejectedValueOnce(new Error('fail')) // 'b' fails
      .mockResolvedValueOnce(undefined)         // 'c' succeeds

    const { result } = renderHook(() => useBulkDeleteNotes())

    await act(async () => {
      await result.current.bulkDelete(['a', 'b', 'c'])
    })

    expect(mockMutateAsync).toHaveBeenCalledTimes(3)
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'Could not delete 1 note' })
    )
  })

  it('does not call deleteNote when ids array is empty', async () => {
    const { result } = renderHook(() => useBulkDeleteNotes())

    await act(async () => {
      await result.current.bulkDelete([])
    })

    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('does not show toast when all deletions succeed', async () => {
    const { result } = renderHook(() => useBulkDeleteNotes())

    await act(async () => {
      await result.current.bulkDelete(['a', 'b'])
    })

    expect(Toast.show).not.toHaveBeenCalled()
  })

  it('uses plural form in toast message for multiple failures', async () => {
    mockMutateAsync.mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useBulkDeleteNotes())

    await act(async () => {
      await result.current.bulkDelete(['a', 'b', 'c'])
    })

    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ text1: 'Could not delete 3 notes' })
    )
  })
})
