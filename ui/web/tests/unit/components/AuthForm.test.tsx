import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import AuthForm from "@/components/AuthForm"

describe("AuthForm", () => {
  const defaultProps = {
    onTestLogin: jest.fn(),
    onSkipAuth: jest.fn(),
    onGoogleAuth: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders Google OAuth button by default and hides test auth options", () => {
    render(<AuthForm {...defaultProps} />)

    expect(screen.getByRole("button", { name: /continue with google/i })).toBeTruthy()
    expect(screen.queryByText(/or test the app/i)).toBeNull()
    expect(screen.queryByRole("button", { name: /test login/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /skip authentication/i })).toBeNull()
  })

  it("renders test auth options and divider when enableTestAuth is true", () => {
    render(<AuthForm {...defaultProps} enableTestAuth={true} />)

    expect(screen.getByRole("button", { name: /continue with google/i })).toBeTruthy()
    expect(screen.getByText(/or test the app/i)).toBeTruthy()
    expect(screen.getByRole("button", { name: /test login \(persistent\)/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /skip authentication \(quick test\)/i })).toBeTruthy()
  })

  it("handles Google OAuth button click and manages loading state during pending execution", async () => {
    let resolveGoogleAuth!: () => void
    const googlePromise = new Promise<void>((resolve) => {
      resolveGoogleAuth = resolve
    })
    const onGoogleAuthMock = jest.fn().mockReturnValue(googlePromise)

    render(<AuthForm {...defaultProps} enableTestAuth={true} onGoogleAuth={onGoogleAuthMock} />)

    const googleBtn = screen.getByRole("button", { name: /continue with google/i }) as HTMLButtonElement
    const testLoginBtn = screen.getByRole("button", { name: /test login/i }) as HTMLButtonElement
    const skipAuthBtn = screen.getByRole("button", { name: /skip authentication/i }) as HTMLButtonElement

    expect(googleBtn.disabled).toBe(false)
    expect(testLoginBtn.disabled).toBe(false)
    expect(skipAuthBtn.disabled).toBe(false)

    fireEvent.click(googleBtn)

    expect(onGoogleAuthMock).toHaveBeenCalledTimes(1)
    expect(googleBtn.disabled).toBe(true)
    expect(testLoginBtn.disabled).toBe(true)
    expect(skipAuthBtn.disabled).toBe(true)

    resolveGoogleAuth()

    await waitFor(() => {
      expect(googleBtn.disabled).toBe(false)
    })

    expect(testLoginBtn.disabled).toBe(false)
    expect(skipAuthBtn.disabled).toBe(false)
  })

  it("handles Test Login button click and manages loading state", async () => {
    let resolveTestLogin!: () => void
    const testLoginPromise = new Promise<void>((resolve) => {
      resolveTestLogin = resolve
    })
    const onTestLoginMock = jest.fn().mockReturnValue(testLoginPromise)

    render(<AuthForm {...defaultProps} enableTestAuth={true} onTestLogin={onTestLoginMock} />)

    const testLoginBtn = screen.getByRole("button", { name: /test login/i }) as HTMLButtonElement

    fireEvent.click(testLoginBtn)

    expect(onTestLoginMock).toHaveBeenCalledTimes(1)
    expect(testLoginBtn.disabled).toBe(true)

    resolveTestLogin()

    await waitFor(() => {
      expect(testLoginBtn.disabled).toBe(false)
    })
  })

  it("handles Skip Authentication button click and manages loading state", async () => {
    let resolveSkipAuth!: () => void
    const skipAuthPromise = new Promise<void>((resolve) => {
      resolveSkipAuth = resolve
    })
    const onSkipAuthMock = jest.fn().mockReturnValue(skipAuthPromise)

    render(<AuthForm {...defaultProps} enableTestAuth={true} onSkipAuth={onSkipAuthMock} />)

    const skipAuthBtn = screen.getByRole("button", { name: /skip authentication/i }) as HTMLButtonElement

    fireEvent.click(skipAuthBtn)

    expect(onSkipAuthMock).toHaveBeenCalledTimes(1)
    expect(skipAuthBtn.disabled).toBe(true)

    resolveSkipAuth()

    await waitFor(() => {
      expect(skipAuthBtn.disabled).toBe(false)
    })
  })

  it("resets loading state when authentication action fails or throws error", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const onGoogleAuthMock = jest.fn().mockImplementation(async () => {})

    render(<AuthForm {...defaultProps} onGoogleAuth={onGoogleAuthMock} />)

    const googleBtn = screen.getByRole("button", { name: /continue with google/i }) as HTMLButtonElement

    try {
      fireEvent.click(googleBtn)
    } catch {
      // Expected error thrown by React event handler in DEV mode
    }

    await waitFor(() => {
      expect(googleBtn.disabled).toBe(false)
    })

    expect(onGoogleAuthMock).toHaveBeenCalledTimes(1)
    consoleSpy.mockRestore()
  })
})
