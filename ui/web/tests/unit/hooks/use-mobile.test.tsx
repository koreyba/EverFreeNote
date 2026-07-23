import { renderHook, act } from "@testing-library/react"
import { useIsMobile } from "@ui/web/hooks/use-mobile"

function setupMatchMedia(initialMatches = false) {
  const listeners = new Set<(e: Event) => void>()

  const mediaQueryList = {
    matches: initialMatches,
    media: "(max-width: 767px)",
    onchange: null,
    addEventListener: jest.fn((event: string, callback: (e: Event) => void) => {
      if (event === "change") {
        listeners.add(callback)
      }
    }),
    removeEventListener: jest.fn((event: string, callback: (e: Event) => void) => {
      if (event === "change") {
        listeners.delete(callback)
      }
    }),
    dispatchEvent: jest.fn(),
  } as unknown as MediaQueryList

  const matchMediaMock = jest.fn((query: string) => {
    return {
      ...mediaQueryList,
      media: query,
    }
  })

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: matchMediaMock,
  })

  const triggerChange = () => {
    listeners.forEach((listener) => listener(new Event("change")))
  }

  return {
    mediaQueryList,
    matchMediaMock,
    listeners,
    triggerChange,
  }
}

describe("useIsMobile", () => {
  const originalInnerWidth = window.innerWidth

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    jest.clearAllMocks()
  })

  it("returns true when innerWidth is below 768px", () => {
    setupMatchMedia(true)
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 500 })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it("returns false when innerWidth is 768px or greater", () => {
    setupMatchMedia(false)
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it("registers matchMedia listener for max-width: 767px", () => {
    const { matchMediaMock, mediaQueryList } = setupMatchMedia(false)
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 })

    renderHook(() => useIsMobile())

    expect(matchMediaMock).toHaveBeenCalledWith("(max-width: 767px)")
    expect(mediaQueryList.addEventListener).toHaveBeenCalledWith("change", expect.any(Function))
  })

  it("updates mobile state when screen resizes and matchMedia change event triggers", () => {
    const { triggerChange } = setupMatchMedia(false)
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // Simulate screen resize to mobile width
    act(() => {
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 600 })
      triggerChange()
    })

    expect(result.current).toBe(true)
  })

  it("removes matchMedia listener on unmount", () => {
    const { mediaQueryList } = setupMatchMedia(false)
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 })

    const { unmount } = renderHook(() => useIsMobile())

    expect(mediaQueryList.addEventListener).toHaveBeenCalledWith("change", expect.any(Function))

    unmount()

    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function))
  })

  it("handles exact breakpoint boundary at 767px and 768px correctly", () => {
    setupMatchMedia(true)

    // 767px is mobile (< 768)
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 767 })
    const { result: mobileResult } = renderHook(() => useIsMobile())
    expect(mobileResult.current).toBe(true)

    // 768px is desktop (not < 768)
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 768 })
    const { result: desktopResult } = renderHook(() => useIsMobile())
    expect(desktopResult.current).toBe(false)
  })
})
