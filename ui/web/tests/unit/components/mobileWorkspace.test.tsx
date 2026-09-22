import * as React from "react"
import { fireEvent, render } from "@testing-library/react"
import { MobileWorkspace, useMobileNavigationHidden } from "@ui/web/components/features/navigation/MobileWorkspace"

let mockMobile = true
jest.mock("@ui/web/hooks/use-mobile", () => ({ useIsMobile: () => mockMobile }))

function NavigationState() {
  return <output data-testid="navigation">{useMobileNavigationHidden() ? "hidden" : "visible"}</output>
}

function Workspace({ view = "notes" }: { view?: string }) {
  return (
    <MobileWorkspace viewKey={view}>
      <NavigationState />
      <div data-testid="scroll" />
      <div data-testid="other-scroll" />
      <div role="listbox"><div data-testid="popup-scroll" /></div>
      <div data-mobile-scroll-ignore><div data-testid="toolbar-scroll" /></div>
    </MobileWorkspace>
  )
}

function scroll(element: HTMLElement, top: number, maximum = 600) {
  Object.defineProperties(element, {
    scrollHeight: { configurable: true, value: maximum + 400 },
    clientHeight: { configurable: true, value: 400 },
    scrollTop: { configurable: true, value: top },
  })
  fireEvent.scroll(element)
}

describe("mobile workspace navigation", () => {
  beforeEach(() => { mockMobile = true })

  it("accumulates small downward movements and requires a deliberate reversal", () => {
    const { getByTestId } = render(<Workspace />)
    const surface = getByTestId("scroll")
    scroll(surface, 5)
    scroll(surface, 10)
    expect(getByTestId("navigation").textContent).toBe("visible")
    scroll(surface, 17)
    expect(getByTestId("navigation").textContent).toBe("hidden")
    scroll(surface, 14)
    expect(getByTestId("navigation").textContent).toBe("hidden")
    scroll(surface, 8)
    expect(getByTestId("navigation").textContent).toBe("visible")
  })

  it("ignores horizontal-only scroll events and non-scrollable containers", () => {
    const { getByTestId } = render(<Workspace />)
    scroll(getByTestId("scroll"), 0)
    scroll(getByTestId("other-scroll"), 80, 0)
    expect(getByTestId("navigation").textContent).toBe("visible")
  })

  it("ignores popup and formatting toolbar scrolls", () => {
    const { getByTestId } = render(<Workspace />)
    scroll(getByTestId("popup-scroll"), 200)
    scroll(getByTestId("toolbar-scroll"), 200)
    expect(getByTestId("navigation").textContent).toBe("visible")
  })

  it("does not interpret the bottom clamp after hiding navigation as upward scrolling", () => {
    const { getByTestId } = render(<Workspace />)
    const surface = getByTestId("scroll")
    scroll(surface, 600)
    scroll(surface, 536, 536)
    expect(getByTestId("navigation").textContent).toBe("hidden")
    scroll(surface, 525, 536)
    expect(getByTestId("navigation").textContent).toBe("visible")
  })

  it("clamps rubber-band offsets and restores navigation at the top", () => {
    const { getByTestId } = render(<Workspace />)
    scroll(getByTestId("scroll"), 900)
    expect(getByTestId("navigation").textContent).toBe("hidden")
    scroll(getByTestId("scroll"), -30)
    expect(getByTestId("navigation").textContent).toBe("visible")
  })

  it("tracks different scroll surfaces independently", () => {
    const { getByTestId } = render(<Workspace />)
    scroll(getByTestId("scroll"), 300)
    scroll(getByTestId("other-scroll"), 40)
    expect(getByTestId("navigation").textContent).toBe("hidden")
    scroll(getByTestId("other-scroll"), 20)
    expect(getByTestId("navigation").textContent).toBe("visible")
  })

  it("restores navigation on view changes and starts a fresh scroll anchor", () => {
    const { getByTestId, rerender } = render(<Workspace />)
    scroll(getByTestId("scroll"), 300)
    rerender(<Workspace view="tags" />)
    expect(getByTestId("navigation").textContent).toBe("visible")
    scroll(getByTestId("scroll"), 20)
    expect(getByTestId("navigation").textContent).toBe("hidden")
  })

  it("does not hide navigation on desktop", () => {
    mockMobile = false
    const { getByTestId } = render(<Workspace />)
    scroll(getByTestId("scroll"), 200)
    expect(getByTestId("navigation").textContent).toBe("visible")
  })
})
