import { act, renderHook } from '@testing-library/react'
import { useLongPress } from '@ui/web/hooks/useLongPress'

const pointer = (overrides: Partial<React.PointerEvent<HTMLElement>> = {}) => ({
  pointerType: 'touch',
  clientX: 10,
  clientY: 20,
  ...overrides,
}) as React.PointerEvent<HTMLElement>

describe('useLongPress', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('fires after the delay and consumeLongPress reports the trigger once', () => {
    const onLongPress = jest.fn()
    const { result } = renderHook(() => useLongPress(onLongPress, { delayMs: 250 }))

    act(() => result.current.longPressHandlers.onPointerDown(pointer()))
    act(() => jest.advanceTimersByTime(249))
    expect(onLongPress).not.toHaveBeenCalled()
    act(() => jest.advanceTimersByTime(1))

    expect(onLongPress).toHaveBeenCalledTimes(1)
    expect(result.current.consumeLongPress()).toBe(true)
    expect(result.current.consumeLongPress()).toBe(false)
  })

  it('ignores mouse and disabled pointer downs', () => {
    const onLongPress = jest.fn()
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useLongPress(onLongPress, { enabled, delayMs: 100 }),
      { initialProps: { enabled: true } },
    )

    act(() => result.current.longPressHandlers.onPointerDown(pointer({ pointerType: 'mouse' })))
    act(() => jest.advanceTimersByTime(100))
    expect(onLongPress).not.toHaveBeenCalled()

    rerender({ enabled: false })
    act(() => result.current.longPressHandlers.onPointerDown(pointer()))
    act(() => jest.advanceTimersByTime(100))
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('cancels when movement exceeds the threshold and on pointer end events', () => {
    const onLongPress = jest.fn()
    const { result } = renderHook(() => useLongPress(onLongPress, { delayMs: 100, moveThresholdPx: 5 }))

    act(() => result.current.longPressHandlers.onPointerDown(pointer({ clientX: 0, clientY: 0 })))
    act(() => result.current.longPressHandlers.onPointerMove(pointer({ clientX: 5, clientY: 5 })))
    act(() => jest.advanceTimersByTime(100))
    expect(onLongPress).toHaveBeenCalledTimes(1)

    act(() => result.current.longPressHandlers.onPointerDown(pointer({ clientX: 0, clientY: 0 })))
    act(() => result.current.longPressHandlers.onPointerMove(pointer({ clientX: 6, clientY: 0 })))
    act(() => jest.advanceTimersByTime(100))
    expect(onLongPress).toHaveBeenCalledTimes(1)

    act(() => result.current.longPressHandlers.onPointerDown(pointer()))
    act(() => result.current.longPressHandlers.onPointerUp(pointer()))
    act(() => jest.advanceTimersByTime(100))
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('clears a pending timer on unmount', () => {
    const onLongPress = jest.fn()
    const { result, unmount } = renderHook(() => useLongPress(onLongPress, { delayMs: 100 }))

    act(() => result.current.longPressHandlers.onPointerDown(pointer()))
    unmount()
    act(() => jest.advanceTimersByTime(100))

    expect(onLongPress).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(0)
  })
})
