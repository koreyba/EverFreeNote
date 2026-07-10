import { fireEvent, render, screen } from "@testing-library/react"
import * as React from "react"
import { PreferencesPanel } from "@/components/features/settings/PreferencesPanel"
import { SPELLCHECK_ENABLED_KEY } from "@core/constants/preferences"

describe("PreferencesPanel", () => {
  beforeEach(() => {
    localStorage.clear()
    jest.restoreAllMocks()
  })

  it("renders correctly with default spellcheck enabled", () => {
    render(<PreferencesPanel />)
    
    expect(screen.getByText("Editor Spellcheck")).toBeTruthy()
    expect(
      screen.getByText("Enable browser-native spelling checking while editing note bodies.")
    ).toBeTruthy()

    const toggle = screen.getByRole("switch")
    expect(toggle).toBeTruthy()
    // It should default to true (checked) if localStorage is empty
    expect(toggle.getAttribute("aria-checked")).toBe("true")
  })

  it("loads value from localStorage on mount when false", () => {
    localStorage.setItem(SPELLCHECK_ENABLED_KEY, "false")
    render(<PreferencesPanel />)

    const toggle = screen.getByRole("switch")
    expect(toggle.getAttribute("aria-checked")).toBe("false")
  })

  it("loads value from localStorage on mount when true", () => {
    localStorage.setItem(SPELLCHECK_ENABLED_KEY, "true")
    render(<PreferencesPanel />)

    const toggle = screen.getByRole("switch")
    expect(toggle.getAttribute("aria-checked")).toBe("true")
  })

  it("toggles value and writes to localStorage", () => {
    render(<PreferencesPanel />)

    const toggle = screen.getByRole("switch")
    expect(toggle.getAttribute("aria-checked")).toBe("true")

    // Toggle off
    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-checked")).toBe("false")
    expect(localStorage.getItem(SPELLCHECK_ENABLED_KEY)).toBe("false")

    // Toggle back on
    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-checked")).toBe("true")
    expect(localStorage.getItem(SPELLCHECK_ENABLED_KEY)).toBe("true")
  })
})
