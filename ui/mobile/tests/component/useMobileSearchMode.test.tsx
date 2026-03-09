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
      preset: 'broad',
      viewMode: 'chunk',
    }))

    const { result } = renderHook(() => useMobileSearchMode())

    await waitFor(() => {
      expect(result.current.isAIEnabled).toBe(true)
      expect(result.current.preset).toBe('broad')
      expect(result.current.viewMode).toBe('chunk')
    })

    act(() => {
      result.current.setPreset('strict')
      result.current.setViewMode('note')
    })

    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'everfreenote:mobileAiSearchMode',
        JSON.stringify({
          isAIEnabled: true,
          preset: 'strict',
          viewMode: 'note',
        })
      )
    })
  })
})
