import * as React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { ExportToWordPressButton, type ExportableWordPressNote } from "@ui/web/components/features/wordpress/ExportToWordPressButton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

describe("ExportToWordPressButton", () => {
  const sampleNote: ExportableWordPressNote = {
    id: "wp-note-1",
    title: "WordPress Note Title",
    description: "<p>Note Body Description</p>",
    tags: ["wordpress", "blog"],
  }

  const defaultProps = {
    getNote: jest.fn(() => sampleNote),
    onRequestExport: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Button Trigger Variant", () => {
    it("renders default button with 'Export to WP' label", () => {
      render(<ExportToWordPressButton {...defaultProps} />)

      const btn = screen.getByRole("button", { name: /Export to WP/i }) as HTMLButtonElement
      expect(btn).toBeTruthy()
      expect(btn.disabled).toBe(false)
    })

    it("renders custom label and custom variant when provided", () => {
      render(
        <ExportToWordPressButton
          {...defaultProps}
          label="Publish to Blog"
          variant="secondary"
        />
      )

      const btn = screen.getByRole("button", { name: "Publish to Blog" })
      expect(btn).toBeTruthy()
      expect(btn.className).toContain("bg-secondary")
    })

    it("triggers onRequestExport with note data when clicked", () => {
      const onRequestExport = jest.fn()
      const getNote = jest.fn(() => sampleNote)

      render(
        <ExportToWordPressButton
          getNote={getNote}
          onRequestExport={onRequestExport}
        />
      )

      const btn = screen.getByRole("button", { name: /Export to WP/i })
      fireEvent.click(btn)

      expect(getNote).toHaveBeenCalledTimes(1)
      expect(onRequestExport).toHaveBeenCalledTimes(1)
      expect(onRequestExport).toHaveBeenCalledWith(sampleNote)
    })

    it("does not call onRequestExport if getNote returns null or note without id", () => {
      const onRequestExport = jest.fn()
      const getNoteNull = jest.fn(() => null)

      const { rerender } = render(
        <ExportToWordPressButton
          getNote={getNoteNull}
          onRequestExport={onRequestExport}
        />
      )

      const btn = screen.getByRole("button", { name: /Export to WP/i })
      fireEvent.click(btn)

      expect(getNoteNull).toHaveBeenCalledTimes(1)
      expect(onRequestExport).not.toHaveBeenCalled()

      const getNoteNoId = jest.fn(() => ({ title: "No ID Note" } as unknown as ExportableWordPressNote))

      rerender(
        <ExportToWordPressButton
          getNote={getNoteNoId}
          onRequestExport={onRequestExport}
        />
      )

      fireEvent.click(btn)

      expect(getNoteNoId).toHaveBeenCalledTimes(1)
      expect(onRequestExport).not.toHaveBeenCalled()
    })

    it("disables the button when disabled prop is true", () => {
      render(<ExportToWordPressButton {...defaultProps} disabled={true} />)

      const btn = screen.getByRole("button", { name: /Export to WP/i }) as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })
  })

  describe("Menu Item Trigger Variant", () => {
    it("renders as DropdownMenuItem inside DropdownMenuContent and triggers export on select", () => {
      const onRequestExport = jest.fn()
      const getNote = jest.fn(() => sampleNote)

      render(
        <DropdownMenu open={true}>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <ExportToWordPressButton
              getNote={getNote}
              onRequestExport={onRequestExport}
              triggerVariant="menu-item"
              label="Export from Menu"
            />
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const menuItem = screen.getByRole("menuitem", { name: "Export from Menu" })
      expect(menuItem).toBeTruthy()

      fireEvent.click(menuItem)

      expect(getNote).toHaveBeenCalledTimes(1)
      expect(onRequestExport).toHaveBeenCalledWith(sampleNote)
    })

    it("disables menu item when disabled prop is true", () => {
      render(
        <DropdownMenu open={true}>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <ExportToWordPressButton
              {...defaultProps}
              triggerVariant="menu-item"
              disabled={true}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const menuItem = screen.getByRole("menuitem", { name: "Export to WP" })
      expect(menuItem.getAttribute("data-disabled")).not.toBeNull()
    })
  })
})
