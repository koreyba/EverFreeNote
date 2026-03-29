import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook, waitFor } from '../testUtils'
import { useMobileSearchMode } from '@ui/mobile/hooks'

describe('useMobileSearchMode', () => {
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>

  beforeEach(() => {
    jest.clearAllMocks()
    mockAsyncStorage.getItem.mockResolvedValue(null)
    mockAsyncStorage.setItem.mockResolvedValue(undefined)
  })

  it('loads persisted mode state and persists updates', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
      isAIEnabled: true,
      viewMode: 'chunk',
    }))

    const { result } = renderHook(() => useMobileSearchMode())

    await waitFor(() => {
      expect(result.current.isAIEnabled).toBe(true)
      expect(result.current.viewMode).toBe('chunk')
    })

    act(() => {
      result.current.setViewMode('note')
    })

    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'everfreenote:mobileAiSearchMode',
        JSON.stringify({
          isAIEnabled: true,
          viewMode: 'note',
        })
      )
    })
  })

  it('sanitizes malformed persisted state and writes back a valid default payload', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('{not-json')

    const { result } = renderHook(() => useMobileSearchMode())

    await waitFor(() => {
      expect(result.current.isAIEnabled).toBe(false)
      expect(result.current.viewMode).toBe('note')
    })

    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'everfreenote:mobileAiSearchMode',
        JSON.stringify({
          isAIEnabled: false,
          viewMode: 'note',
        })
      )
    })
  })

  it('persists AI mode toggles after hydration', async () => {
    const { result } = renderHook(() => useMobileSearchMode())

    await waitFor(() => {
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('everfreenote:mobileAiSearchMode')
    })

    act(() => {
      result.current.setIsAIEnabled(true)
      result.current.setIsAIEnabled(false)
    })

    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenLastCalledWith(
        'everfreenote:mobileAiSearchMode',
        JSON.stringify({
          isAIEnabled: false,
          viewMode: 'note',
        })
      )
    })
  })

  it('normalizes legacy preset-based payloads back to the reduced shape', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
      isAIEnabled: true,
      preset: 'broad',
      viewMode: 'chunk',
    }))

    renderHook(() => useMobileSearchMode())

    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'everfreenote:mobileAiSearchMode',
        JSON.stringify({
          isAIEnabled: true,
          viewMode: 'chunk',
        })
      )
    })
  })

  it('preserves a local edit that happens before hydration finishes', async () => {
    let resolveStorage: ((value: string | null) => void) | null = null
    mockAsyncStorage.getItem.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveStorage = resolve
      })
    )

    const { result } = renderHook(() => useMobileSearchMode())

    act(() => {
      result.current.setIsAIEnabled(true)
    })

    expect(result.current.isAIEnabled).toBe(true)

    act(() => {
      resolveStorage?.(JSON.stringify({
        isAIEnabled: false,
        viewMode: 'chunk',
      }))
    })

    await waitFor(() => {
      expect(result.current.isAIEnabled).toBe(true)
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'everfreenote:mobileAiSearchMode',
        JSON.stringify({
          isAIEnabled: true,
          viewMode: 'note',
        })
      )
    })
  })

  it('persists a pre-hydration local edit even if the hook unmounts before storage resolves', async () => {
    let resolveStorage: ((value: string | null) => void) | null = null
    mockAsyncStorage.getItem.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveStorage = resolve
      })
    )

    const { result, unmount } = renderHook(() => useMobileSearchMode())

    act(() => {
      result.current.setIsAIEnabled(true)
    })

    unmount()

    act(() => {
      resolveStorage?.(JSON.stringify({
        isAIEnabled: false,
        viewMode: 'chunk',
      }))
    })

    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'everfreenote:mobileAiSearchMode',
        JSON.stringify({
          isAIEnabled: true,
          viewMode: 'note',
        })
      )
    })
  })
})
