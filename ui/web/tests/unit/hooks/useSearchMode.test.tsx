import { act, renderHook } from '@testing-library/react'
import { useSearchMode } from '@ui/web/hooks/useSearchMode'

const STORAGE_KEY = 'everfreenote:aiSearchMode'

describe('useSearchMode', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with stable defaults', () => {
    const { result } = renderHook(() => useSearchMode())

    expect(result.current.isAIEnabled).toBe(false)
    expect(result.current.viewMode).toBe('note')
  })

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useSearchMode())

    act(() => {
      result.current.setIsAIEnabled(true)
      result.current.setViewMode('chunk')
    })

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      isAIEnabled: true,
      viewMode: 'chunk',
    })
  })

  it('restores state from localStorage and ignores the legacy preset field', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ isAIEnabled: true, preset: 'strict', viewMode: 'chunk' })
    )

    const { result } = renderHook(() => useSearchMode())

    expect(result.current.isAIEnabled).toBe(true)
    expect(result.current.viewMode).toBe('chunk')
  })

  it('falls back to defaults for invalid persisted values', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ isAIEnabled: 'yes', preset: 'invalid', viewMode: 'grid' })
    )

    const { result } = renderHook(() => useSearchMode())

    expect(result.current.isAIEnabled).toBe(false)
    expect(result.current.viewMode).toBe('note')
  })

  it('falls back to defaults when persisted JSON is malformed', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, 'not-json')

    const { result } = renderHook(() => useSearchMode())

    expect(result.current.isAIEnabled).toBe(false)
    expect(result.current.viewMode).toBe('note')
  })

  it('keeps in-memory state updates when localStorage writes fail', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const { result } = renderHook(() => useSearchMode())

    expect(() => {
      act(() => {
        result.current.setIsAIEnabled(true)
        result.current.setViewMode('chunk')
      })
    }).not.toThrow()

    expect(result.current.isAIEnabled).toBe(true)
    expect(result.current.viewMode).toBe('chunk')

    setItemSpy.mockRestore()
  })
})
