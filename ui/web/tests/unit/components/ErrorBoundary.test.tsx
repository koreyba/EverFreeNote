import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"

import { ErrorBoundary } from "@/components/ErrorBoundary"
import { browser } from "@ui/web/adapters/browser"

const ProblematicComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test component crashed!")
  }
  return <div>Everything is fine</div>
}

describe("ErrorBoundary", () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it("renders children normally when no rendering error occurs", () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText("Everything is fine")).toBeTruthy()
    expect(screen.queryByText("Something went wrong")).toBeNull()
  })

  it("catches rendering errors, logs to console.error, and displays fallback UI", () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "development"

    try {
      render(
        <ErrorBoundary>
          <ProblematicComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.queryByText("Everything is fine")).toBeNull()
      expect(screen.getByText("Something went wrong")).toBeTruthy()
      expect(
        screen.getByText(
          "The application encountered an unexpected error. Please try refreshing the page."
        )
      ).toBeTruthy()

      // Verifies development environment error info rendering
      expect(screen.getByText(/Error: Test component crashed!/i)).toBeTruthy()
      expect(screen.getByText("Stack trace")).toBeTruthy()

      // Verifies console.error logging by componentDidCatch
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error caught by boundary:",
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      )
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  it("reloads browser location when Reload Application button is clicked", () => {
    const reloadMock = jest.fn()
    jest.spyOn(browser, "location", "get").mockReturnValue({
      origin: "",
      search: "",
      reload: reloadMock,
    })

    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByRole("button", { name: "Reload Application" })
    fireEvent.click(reloadButton)

    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it("navigates back when Go Back button is clicked and history length is greater than 0", () => {
    const backSpy = jest.spyOn(window.history, "back").mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    const goBackButton = screen.getByRole("button", { name: "Go Back" })
    fireEvent.click(goBackButton)

    expect(backSpy).toHaveBeenCalledTimes(1)
  })

  it("reloads browser location when Go Back button is clicked and history length is 0", () => {
    const reloadMock = jest.fn()
    jest.spyOn(browser, "location", "get").mockReturnValue({
      origin: "",
      search: "",
      reload: reloadMock,
    })
    jest.spyOn(window.history, "length", "get").mockReturnValue(0)

    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    const goBackButton = screen.getByRole("button", { name: "Go Back" })
    fireEvent.click(goBackButton)

    expect(reloadMock).toHaveBeenCalledTimes(1)
  })
})
