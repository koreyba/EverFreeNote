import { renderHook, act } from '@testing-library/react-native'
import { useBulkSelection } from '@ui/mobile/hooks/useBulkSelection'

describe('useBulkSelection', () => {
  it('starts with isActive=false and empty selectedIds', () => {
    const { result } = renderHook(() => useBulkSelection())

    expect(result.current.isActive).toBe(false)
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('activate(id) sets isActive=true and adds id to selectedIds', () => {
    const { result } = renderHook(() => useBulkSelection())

    act(() => {
      result.current.activate('note-1')
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.selectedIds.has('note-1')).toBe(true)
    expect(result.current.selectedIds.size).toBe(1)
  })

  it('toggle(id) adds id when not already selected', () => {
    const { result } = renderHook(() => useBulkSelection())

    act(() => {
      result.current.activate('note-1')
      result.current.toggle('note-2')
    })

    expect(result.current.selectedIds.has('note-2')).toBe(true)
    expect(result.current.selectedIds.size).toBe(2)
  })

  it('toggle(id) removes id when already selected', () => {
    const { result } = renderHook(() => useBulkSelection())

    act(() => {
      result.current.activate('note-1')
    })

    act(() => {
      result.current.toggle('note-1')
    })

    expect(result.current.selectedIds.has('note-1')).toBe(false)
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('toggle does not change isActive', () => {
    const { result } = renderHook(() => useBulkSelection())

    act(() => {
      result.current.activate('note-1')
    })

    act(() => {
      result.current.toggle('note-1') // deselect
    })

    expect(result.current.isActive).toBe(true)
  })

  it('selectAll(ids) replaces selectedIds with provided ids', () => {
    const { result } = renderHook(() => useBulkSelection())

    act(() => {
      result.current.selectAll(['a', 'b', 'c'])
    })

    expect(result.current.selectedIds.has('a')).toBe(true)
    expect(result.current.selectedIds.has('b')).toBe(true)
    expect(result.current.selectedIds.has('c')).toBe(true)
    expect(result.current.selectedIds.size).toBe(3)
  })

  it('clear() empties selectedIds without changing isActive', () => {
    const { result } = renderHook(() => useBulkSelection())

    act(() => {
      result.current.activate('note-1')
      result.current.toggle('note-2')
    })

    act(() => {
      result.current.clear()
    })

    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.isActive).toBe(true)
  })

  it('deactivate() resets isActive and clears selectedIds', () => {
    const { result } = renderHook(() => useBulkSelection())

    act(() => {
      result.current.activate('note-1')
      result.current.toggle('note-2')
    })

    act(() => {
      result.current.deactivate()
    })

    expect(result.current.isActive).toBe(false)
    expect(result.current.selectedIds.size).toBe(0)
  })
})
