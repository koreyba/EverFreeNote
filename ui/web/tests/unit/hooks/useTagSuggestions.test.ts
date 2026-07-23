import { renderHook } from '@testing-library/react'
import { useTagSuggestions } from '@ui/web/hooks/useTagSuggestions'

describe('useTagSuggestions', () => {
  const defaultTags = ['react', 'react-dom', 'react-router', 'redux', 'refactor', 'rust']

  it('returns empty array when query length is less than default minChars (3)', () => {
    const { result } = renderHook(() =>
      useTagSuggestions({
        allTags: defaultTags,
        selectedTags: [],
        query: 're',
      })
    )

    expect(result.current).toEqual([])
  })

  it('returns empty array for empty query string', () => {
    const { result } = renderHook(() =>
      useTagSuggestions({
        allTags: defaultTags,
        selectedTags: [],
        query: '',
      })
    )

    expect(result.current).toEqual([])
  })

  it('returns matching tag suggestions starting with the query when minChars condition is met', () => {
    const { result } = renderHook(() =>
      useTagSuggestions({
        allTags: defaultTags,
        selectedTags: [],
        query: 'rea',
      })
    )

    expect(result.current).toEqual(['react', 'react-dom', 'react-router'])
  })

  it('respects custom minChars option', () => {
    const { result } = renderHook(() =>
      useTagSuggestions({
        allTags: defaultTags,
        selectedTags: [],
        query: 'ru',
        minChars: 2,
      })
    )

    expect(result.current).toEqual(['rub', 'rust'].filter((t) => defaultTags.includes(t)))
    expect(result.current).toEqual(['rust'])
  })

  it('filters out already selected tags from suggestions', () => {
    const { result } = renderHook(() =>
      useTagSuggestions({
        allTags: defaultTags,
        selectedTags: ['react'],
        query: 'rea',
      })
    )

    expect(result.current).toEqual(['react-dom', 'react-router'])
  })

  it('sorts suggestions alphabetically (localeCompare)', () => {
    const unorderedTags = ['react-router', 'react', 'react-dom', 'react-native']
    const { result } = renderHook(() =>
      useTagSuggestions({
        allTags: unorderedTags,
        selectedTags: [],
        query: 'rea',
        limit: 10,
      })
    )

    expect(result.current).toEqual(['react', 'react-dom', 'react-native', 'react-router'])
  })

  it('limits the number of returned suggestions to the specified limit', () => {
    const { result } = renderHook(() =>
      useTagSuggestions({
        allTags: defaultTags,
        selectedTags: [],
        query: 'rea',
        limit: 2,
      })
    )

    expect(result.current).toHaveLength(2)
    expect(result.current).toEqual(['react', 'react-dom'])
  })

  it('returns empty array when all matching tags are in selectedTags', () => {
    const { result } = renderHook(() =>
      useTagSuggestions({
        allTags: ['react', 'react-dom'],
        selectedTags: ['react', 'react-dom'],
        query: 'rea',
      })
    )

    expect(result.current).toEqual([])
  })

  it('returns empty array when allTags is empty', () => {
    const { result } = renderHook(() =>
      useTagSuggestions({
        allTags: [],
        selectedTags: [],
        query: 'react',
      })
    )

    expect(result.current).toEqual([])
  })

  it('memoizes the output when props do not change', () => {
    const props = {
      allTags: defaultTags,
      selectedTags: [],
      query: 'rea',
    }
    const { result, rerender } = renderHook((p) => useTagSuggestions(p), {
      initialProps: props,
    })

    const firstResult = result.current
    rerender(props)
    const secondResult = result.current

    expect(firstResult).toBe(secondResult)
  })

  it('updates suggestions when props (like query or selectedTags) change', () => {
    const { result, rerender } = renderHook(
      (props) => useTagSuggestions(props),
      {
        initialProps: {
          allTags: defaultTags,
          selectedTags: [] as string[],
          query: 'rea',
        },
      }
    )

    expect(result.current).toEqual(['react', 'react-dom', 'react-router'])

    rerender({
      allTags: defaultTags,
      selectedTags: ['react'],
      query: 'rea',
    })

    expect(result.current).toEqual(['react-dom', 'react-router'])

    rerender({
      allTags: defaultTags,
      selectedTags: [],
      query: 'red',
    })

    expect(result.current).toEqual(['redux'])
  })
})
