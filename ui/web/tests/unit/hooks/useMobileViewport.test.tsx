import { act, renderHook } from "@testing-library/react"
import { useMobileViewport } from "@ui/web/hooks/useMobileViewport"

describe("mobile visual viewport", () => {
  const originalViewport = window.visualViewport
  let viewport: EventTarget & { height: number; offsetTop: number; scale: number }

  beforeEach(() => {
    viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0, scale: 1 })
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport })
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 })
  })

  afterEach(() => {
    Object.defineProperty(window, "visualViewport", { configurable: true, value: originalViewport })
  })

  it("reports keyboard resize and viewport panning, then restores the full height", () => {
    const { result } = renderHook(() => useMobileViewport(true))
    expect(result.current).toEqual({ height: 800, offsetTop: 0, keyboardOpen: false })
    act(() => {
      viewport.height = 430
      viewport.offsetTop = 30
      viewport.dispatchEvent(new Event("resize"))
    })
    expect(result.current).toEqual({ height: 430, offsetTop: 30, keyboardOpen: true })
    act(() => {
      viewport.offsetTop = 50
      viewport.dispatchEvent(new Event("scroll"))
    })
    expect(result.current?.offsetTop).toBe(50)
    act(() => {
      viewport.height = 800
      viewport.offsetTop = 0
      window.dispatchEvent(new Event("resize"))
    })
    expect(result.current).toEqual({ height: 800, offsetTop: 0, keyboardOpen: false })
  })

  it("ignores pinch zoom and unchanged viewport events", () => {
    const { result } = renderHook(() => useMobileViewport(true))
    const initial = result.current
    act(() => viewport.dispatchEvent(new Event("resize")))
    expect(result.current).toBe(initial)
    act(() => {
      viewport.scale = 2
      viewport.height = 400
      viewport.dispatchEvent(new Event("resize"))
    })
    expect(result.current).toBe(initial)
  })

  it("falls back to CSS when VisualViewport is unavailable", () => {
    Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined })
    const { result } = renderHook(() => useMobileViewport(true))
    expect(result.current).toBeNull()
  })

  it("does not subscribe on desktop and cleans listeners when returning to desktop", () => {
    const add = jest.spyOn(viewport, "addEventListener")
    const remove = jest.spyOn(viewport, "removeEventListener")
    const removeWindow = jest.spyOn(window, "removeEventListener")
    const { result, rerender } = renderHook(({ enabled }) => useMobileViewport(enabled), { initialProps: { enabled: false } })
    expect(add).not.toHaveBeenCalled()
    expect(result.current).toBeNull()
    rerender({ enabled: true })
    expect(add).toHaveBeenCalledTimes(2)
    rerender({ enabled: false })
    expect(result.current).toBeNull()
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function))
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function))
    expect(removeWindow).toHaveBeenCalledWith("resize", expect.any(Function))
    removeWindow.mockRestore()
  })
})
