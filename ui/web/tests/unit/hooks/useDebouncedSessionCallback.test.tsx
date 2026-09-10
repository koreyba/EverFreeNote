import { act, renderHook } from '@testing-library/react'
import { useDebouncedSessionCallback } from '@ui/web/hooks/useDebouncedSessionCallback'

describe('useDebouncedSessionCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('delivers only the latest scheduled value after the delay', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedSessionCallback(callback, 250, 'cancel'))

    act(() => {
      result.current.schedule(1)
      result.current.schedule(2)
      result.current.schedule(3)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(3)
  })

  it('always uses the latest callback reference', () => {
    const first = jest.fn()
    const second = jest.fn()
    const { result, rerender } = renderHook(
      ({ callback }) => useDebouncedSessionCallback(callback, 250, 'cancel'),
      { initialProps: { callback: first } },
    )

    act(() => result.current.schedule('value'))
    rerender({ callback: second })
    act(() => {
      jest.advanceTimersByTime(250)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('value')
  })

  it('cancel drops the pending value', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedSessionCallback(callback, 250, 'cancel'))

    act(() => {
      result.current.schedule('value')
      result.current.cancel()
      jest.advanceTimersByTime(250)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('flushes a pending value on unmount when configured to flush', () => {
    const callback = jest.fn()
    const { result, unmount } = renderHook(() => useDebouncedSessionCallback(callback, 250, 'flush'))

    act(() => result.current.schedule('pending'))
    unmount()

    expect(callback).toHaveBeenCalledWith('pending')
  })

  it('drops a pending value on unmount when configured to cancel', () => {
    const callback = jest.fn()
    const { result, unmount } = renderHook(() => useDebouncedSessionCallback(callback, 250, 'cancel'))

    act(() => result.current.schedule('pending'))
    unmount()
    act(() => {
      jest.advanceTimersByTime(250)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('does nothing when flushing without a pending value', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedSessionCallback(callback, 250, 'flush'))

    act(() => result.current.flush())

    expect(callback).not.toHaveBeenCalled()
  })
})
