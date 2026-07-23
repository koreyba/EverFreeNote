import React from "react"
import { render, screen, waitFor, act } from "@testing-library/react"

import { PublicSharePageClient } from "@/components/features/public/PublicSharePageClient"
import type { PublicNote } from "@core/services/publicNoteShare"

const mockGetSearchParams = jest.fn()
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: mockGetSearchParams,
  }),
}))

const mockSupabase = {}
jest.mock("@ui/web/providers/SupabaseProvider", () => ({
  useSupabase: () => ({ supabase: mockSupabase }),
}))

const mockGetPublicNoteByToken = jest.fn()
jest.mock("@core/services/publicNoteShare", () => ({
  PublicNoteShareService: jest.fn().mockImplementation(() => ({
    getPublicNoteByToken: mockGetPublicNoteByToken,
  })),
}))

jest.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button" aria-label="Toggle theme">Toggle Theme</button>,
}))

const makePublicNote = (overrides: Partial<PublicNote> = {}): PublicNote => ({
  token: "valid-token-123",
  title: "Shared Test Note",
  description: "<p>This is a <strong>public note</strong> markdown content.</p>",
  tags: ["public", "test"],
  created_at: "2026-04-28T10:00:00.000Z",
  updated_at: "2026-04-28T12:00:00.000Z",
  ...overrides,
})

describe("PublicSharePageClient", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSearchParams.mockReturnValue("valid-token-123")
  })

  it("shows loading state initially while note is fetching", () => {
    mockGetPublicNoteByToken.mockImplementation(() => new Promise(() => undefined))

    render(<PublicSharePageClient />)

    expect(screen.getByRole("heading", { name: "Loading shared note" })).toBeTruthy()
    expect(screen.getByText("One moment while the note opens.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeTruthy()
  })

  it("loads and displays the public note with title, tags, formatted date, and markdown content", async () => {
    const note = makePublicNote()
    mockGetPublicNoteByToken.mockResolvedValue(note)

    render(<PublicSharePageClient />)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Shared Test Note" })).toBeTruthy()
    })

    expect(mockGetPublicNoteByToken).toHaveBeenCalledWith("valid-token-123")
    expect(screen.getByText("public note")).toBeTruthy()
    expect(screen.getByText("public")).toBeTruthy()
    expect(screen.getByText("test")).toBeTruthy()
    expect(screen.getByText(/Shared note/i)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeTruthy()
  })

  it("handles missing token in search parameters as not-found state", async () => {
    mockGetSearchParams.mockReturnValue("")

    render(<PublicSharePageClient />)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Note not available" })).toBeTruthy()
    })

    expect(screen.getByText("This shared note link is missing, inactive, or no longer available.")).toBeTruthy()
    expect(mockGetPublicNoteByToken).not.toHaveBeenCalled()
  })

  it("handles null search params token as not-found state", async () => {
    mockGetSearchParams.mockReturnValue(null)

    render(<PublicSharePageClient />)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Note not available" })).toBeTruthy()
    })

    expect(screen.getByText("This shared note link is missing, inactive, or no longer available.")).toBeTruthy()
    expect(mockGetPublicNoteByToken).not.toHaveBeenCalled()
  })

  it("displays not-found message when getPublicNoteByToken returns null", async () => {
    mockGetPublicNoteByToken.mockResolvedValue(null)

    render(<PublicSharePageClient />)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Note not available" })).toBeTruthy()
    })

    expect(screen.getByText("This shared note link is missing, inactive, or no longer available.")).toBeTruthy()
  })

  it("displays error message when getPublicNoteByToken rejects with Error", async () => {
    mockGetPublicNoteByToken.mockRejectedValue(new Error("Database connection lost"))

    render(<PublicSharePageClient />)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Could not load note" })).toBeTruthy()
    })

    expect(screen.getByText("Database connection lost")).toBeTruthy()
  })

  it("displays fallback error message when getPublicNoteByToken rejects with non-Error object", async () => {
    mockGetPublicNoteByToken.mockRejectedValue("Unknown rejection")

    render(<PublicSharePageClient />)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Could not load note" })).toBeTruthy()
    })

    expect(screen.getByText("Could not load this shared note.")).toBeTruthy()
  })

  it("cancels state updates cleanly when unmounted before request resolves", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    let resolvePromise!: (value: PublicNote | null) => void
    const pendingPromise = new Promise<PublicNote | null>((resolve) => {
      resolvePromise = resolve
    })

    mockGetPublicNoteByToken.mockReturnValue(pendingPromise)

    const { unmount } = render(<PublicSharePageClient />)

    // Unmount before promise resolves
    unmount()

    // Resolve after unmount - should not trigger console.error warning
    await act(async () => {
      resolvePromise(makePublicNote())
    })

    expect(consoleErrorSpy).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})
