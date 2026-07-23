import * as React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { Sidebar } from "@/components/features/notes/Sidebar"
import type { User } from "@supabase/supabase-js"

const mockSetTheme = jest.fn()

jest.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: mockSetTheme,
    resolvedTheme: "light",
  }),
}))

const mockUser = {
  id: "user-123",
  email: "alex.dev@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
} as User

describe("Sidebar", () => {
  const defaultProps = {
    user: mockUser,
    notesDisplayed: 5,
    notesTotal: 20,
    pendingCount: 0,
    failedCount: 0,
    isOffline: false,
    selectionMode: false,
    selectedCount: 0,
    bulkDeleting: false,
    onExitSelectionMode: jest.fn(),
    onSelectAll: jest.fn(),
    onBulkDelete: jest.fn(),
    filterByTag: null,
    onClearTagFilter: jest.fn(),
    onOpenSearch: jest.fn(),
    onOpenSettings: jest.fn(),
    onCreateNote: jest.fn(),
    onSignOut: jest.fn(),
    children: <div data-testid="notes-list-children">Notes List Content</div>,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Brand & Theme Header", () => {
    it("renders EverFreeNote title and theme toggle", () => {
      render(<Sidebar {...defaultProps} />)

      const titleHeading = screen.getByRole("heading", { level: 1 })
      expect(titleHeading.textContent).toBe("EverFreeNote")
      expect(screen.getByRole("button", { name: "Toggle theme" })).toBeTruthy()
    })

    it("handles theme toggle click", async () => {
      render(<Sidebar {...defaultProps} />)

      const themeBtn = screen.getByRole("button", { name: "Toggle theme" })
      fireEvent.click(themeBtn)

      await waitFor(() => {
        expect(mockSetTheme).toHaveBeenCalledWith("dark")
      })
    })
  })

  describe("Sync Status Indicator", () => {
    it("renders Synchronized dot when online and counts are zero", () => {
      const { container } = render(<Sidebar {...defaultProps} isOffline={false} pendingCount={0} failedCount={0} />)

      const statusOutput = container.querySelector('output[aria-label="Synchronized"]')
      expect(statusOutput).toBeTruthy()
      expect(statusOutput?.className).toContain("bg-emerald-500")
    })

    it("renders Offline mode status dot when isOffline is true", () => {
      const { container } = render(<Sidebar {...defaultProps} isOffline={true} />)

      const statusOutput = container.querySelector('output[aria-label="Offline mode"]')
      expect(statusOutput).toBeTruthy()
      expect(statusOutput?.className).toContain("bg-amber-500")
    })

    it("renders Syncing count status dot when pendingCount > 0", () => {
      const { container } = render(<Sidebar {...defaultProps} pendingCount={3} />)

      const statusOutput = container.querySelector('output[aria-label="Syncing: 3"]')
      expect(statusOutput).toBeTruthy()
      expect(statusOutput?.className).toContain("bg-muted-foreground")
    })

    it("renders Sync failed count status dot when failedCount > 0", () => {
      const { container } = render(<Sidebar {...defaultProps} failedCount={2} />)

      const statusOutput = container.querySelector('output[aria-label="Sync failed: 2"]')
      expect(statusOutput).toBeTruthy()
      expect(statusOutput?.className).toContain("bg-destructive")
    })
  })

  describe("Search & Navigation Actions", () => {
    it("triggers onOpenSearch when search trigger is clicked", () => {
      const onOpenSearch = jest.fn()
      render(<Sidebar {...defaultProps} onOpenSearch={onOpenSearch} />)

      const searchTrigger = screen.getByTestId("sidebar-search-trigger")
      fireEvent.click(searchTrigger)

      expect(onOpenSearch).toHaveBeenCalledTimes(1)
    })

    it("triggers onCreateNote when New Note button is clicked", () => {
      const onCreateNote = jest.fn()
      render(<Sidebar {...defaultProps} onCreateNote={onCreateNote} />)

      const newNoteBtn = screen.getByRole("button", { name: /New Note/i })
      fireEvent.click(newNoteBtn)

      expect(onCreateNote).toHaveBeenCalledTimes(1)
    })

    it("formats notes count text correctly", () => {
      render(<Sidebar {...defaultProps} notesDisplayed={7} notesTotal={15} />)
      expect(screen.getByText("7 of 15 notes")).toBeTruthy()
    })

    it("renders fallback text when notes count props are omitted", () => {
      render(<Sidebar {...defaultProps} notesDisplayed={undefined} notesTotal={undefined} />)
      expect(screen.getByText("- of unknown notes")).toBeTruthy()
    })
  })

  describe("Selection Mode & Bulk Delete Confirmation", () => {
    it("renders SelectionModeActions when selectionMode is true", () => {
      render(
        <Sidebar
          {...defaultProps}
          selectionMode={true}
          selectedCount={3}
        />
      )

      expect(screen.getByTestId("selection-mode-count").textContent).toBe("3")
    })

    it("triggers onSelectAll when select all button is clicked in selection mode", () => {
      const onSelectAll = jest.fn()
      render(
        <Sidebar
          {...defaultProps}
          selectionMode={true}
          selectedCount={1}
          onSelectAll={onSelectAll}
        />
      )

      const selectAllBtn = screen.getByTestId("selection-mode-select-all")
      fireEvent.click(selectAllBtn)

      expect(onSelectAll).toHaveBeenCalledTimes(1)
    })

    it("opens BulkDeleteDialog when bulk delete button is clicked and confirms bulk delete", async () => {
      const onBulkDelete = jest.fn()
      render(
        <Sidebar
          {...defaultProps}
          selectionMode={true}
          selectedCount={2}
          onBulkDelete={onBulkDelete}
        />
      )

      const deleteBtn = screen.getByTestId("selection-mode-delete")
      fireEvent.click(deleteBtn)

      // Dialog opens
      expect(screen.getByTestId("bulk-delete-dialog")).toBeTruthy()
      expect(screen.getByText(/This action will delete 2 notes\./i)).toBeTruthy()

      const input = screen.getByTestId("bulk-delete-confirm-input")
      fireEvent.change(input, { target: { value: "2" } })

      const confirmBtn = screen.getByTestId("bulk-delete-confirm")
      fireEvent.click(confirmBtn)

      await waitFor(() => {
        expect(onBulkDelete).toHaveBeenCalledTimes(1)
      })
    })

    it("triggers onExitSelectionMode when cancel button is clicked", () => {
      const onExitSelectionMode = jest.fn()
      render(
        <Sidebar
          {...defaultProps}
          selectionMode={true}
          selectedCount={1}
          onExitSelectionMode={onExitSelectionMode}
        />
      )

      const cancelBtn = screen.getByRole("button", { name: /Cancel/i })
      fireEvent.click(cancelBtn)

      expect(onExitSelectionMode).toHaveBeenCalledTimes(1)
    })
  })

  describe("Children & User Profile Section", () => {
    it("renders children in notes list container", () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByTestId("notes-list-children")).toBeTruthy()
    })

    it("renders user initial avatar and email address", () => {
      render(<Sidebar {...defaultProps} />)

      expect(screen.getByText("A")).toBeTruthy()
      expect(screen.getByText("alex.dev@example.com")).toBeTruthy()
    })

    it("triggers onOpenSettings when settings button is clicked", () => {
      const onOpenSettings = jest.fn()
      render(<Sidebar {...defaultProps} onOpenSettings={onOpenSettings} />)

      const settingsBtn = screen.getByRole("button", { name: "Open settings page" })
      fireEvent.click(settingsBtn)

      expect(onOpenSettings).toHaveBeenCalledTimes(1)
    })

    it("triggers onSignOut when sign out button is clicked", () => {
      const onSignOut = jest.fn()
      render(<Sidebar {...defaultProps} onSignOut={onSignOut} />)

      const signOutBtn = screen.getByRole("button", { name: "Sign out" })
      fireEvent.click(signOutBtn)

      expect(onSignOut).toHaveBeenCalledTimes(1)
    })
  })
})
