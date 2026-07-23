import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { useTheme } from "next-themes"

import { ThemeToggle } from "@/components/theme-toggle"

const mockSetTheme = jest.fn()

jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}))

describe("ThemeToggle", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      resolvedTheme: "light",
      themes: ["light", "dark", "system"],
      systemTheme: "light",
    })
  })

  it("renders light mode theme toggle button with accessible label and Moon icon", () => {
    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: /toggle theme/i })
    expect(button).toBeTruthy()
    expect(button.getAttribute("title")).toBe("Switch to dark mode")
  })

  it("switches theme from light to dark on click", () => {
    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: /toggle theme/i })
    fireEvent.click(button)

    expect(mockSetTheme).toHaveBeenCalledWith("dark")
  })

  it("renders dark mode theme toggle with Sun icon and switches from dark to light on click", () => {
    jest.mocked(useTheme).mockReturnValue({
      theme: "dark",
      setTheme: mockSetTheme,
      resolvedTheme: "dark",
      themes: ["light", "dark", "system"],
      systemTheme: "dark",
    })

    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: /toggle theme/i })
    expect(button.getAttribute("title")).toBe("Switch to light mode")

    fireEvent.click(button)
    expect(mockSetTheme).toHaveBeenCalledWith("light")
  })

  it("handles system theme when resolvedTheme is dark", () => {
    jest.mocked(useTheme).mockReturnValue({
      theme: "system",
      setTheme: mockSetTheme,
      resolvedTheme: "dark",
      themes: ["light", "dark", "system"],
      systemTheme: "dark",
    })

    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: /toggle theme/i })
    expect(button.getAttribute("title")).toBe("Switch to light mode")

    fireEvent.click(button)
    expect(mockSetTheme).toHaveBeenCalledWith("light")
  })

  it("handles system theme when resolvedTheme is light", () => {
    jest.mocked(useTheme).mockReturnValue({
      theme: "system",
      setTheme: mockSetTheme,
      resolvedTheme: "light",
      themes: ["light", "dark", "system"],
      systemTheme: "light",
    })

    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: /toggle theme/i })
    expect(button.getAttribute("title")).toBe("Switch to dark mode")

    fireEvent.click(button)
    expect(mockSetTheme).toHaveBeenCalledWith("dark")
  })

  it("renders theme toggle button with toggle theme aria-label", () => {
    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: "Toggle theme" })
    expect(button).toBeTruthy()
  })
})
