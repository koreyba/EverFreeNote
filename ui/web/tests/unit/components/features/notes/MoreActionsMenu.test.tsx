import * as React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { MoreActionsMenu } from "@/components/features/notes/MoreActionsMenu"
import type { ExportableWordPressNote } from "@/components/features/wordpress/ExportToWordPressButton"

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="dropdown-menu" data-open={open ? "true" : "false"}>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onSelect, onClick, ...props }: { children?: React.ReactNode; onSelect?: (e: { preventDefault: () => void }) => void; onClick?: (e: React.MouseEvent) => void; className?: string }) => (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        if (onSelect) {
          onSelect({ preventDefault: jest.fn() })
        }
        if (onClick) {
          onClick(e)
        }
      }}
      {...props}
    >
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}))

jest.mock("@/components/features/notes/ShareNoteDialog", () => ({
  ShareNoteDialog: ({ noteId, open }: { noteId: string; open: boolean }) => (
    open ? <div data-testid="share-note-dialog" data-note-id={noteId}>Share Note Dialog</div> : null
  ),
}))

jest.mock("@/components/features/notes/RagIndexPanel", () => ({
  RagIndexPanel: ({ noteId, variant, onMenuClose }: { noteId: string; variant: string; onMenuClose?: () => void }) => (
    <div data-testid="mock-rag-index-panel" data-note-id={noteId} data-variant={variant}>
      <button type="button" onClick={onMenuClose} data-testid="close-menu-from-rag">
        Close RAG Panel
      </button>
    </div>
  ),
}))

jest.mock("@/components/features/wordpress/ExportToWordPressButton", () => ({
  ExportToWordPressButton: ({ onRequestExport, getNote }: { onRequestExport: (note: ExportableWordPressNote) => void; getNote: () => ExportableWordPressNote | null }) => (
    <button
      type="button"
      data-testid="wordpress-export-trigger"
      onClick={() => {
        const note = getNote()
        if (note) onRequestExport(note)
      }}
    >
      Export to WordPress
    </button>
  ),
}))

jest.mock("@/components/features/wordpress/WordPressExportDialog", () => ({
  WordPressExportDialog: ({ open, note }: { open: boolean; note: ExportableWordPressNote }) => (
    open ? <div data-testid="wordpress-export-dialog">{note.title}</div> : null
  ),
}))

describe("MoreActionsMenu", () => {
  const sampleExportNote: ExportableWordPressNote = {
    id: "note-1",
    title: "Test Note",
    description: "<p>Test Content</p>",
    tags: ["tech"],
  }

  const defaultProps = {
    noteId: "note-1",
    wordpressConfigured: false,
    getExportNote: () => sampleExportNote,
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("renders trigger button and default menu items", () => {
    render(<MoreActionsMenu {...defaultProps} />)

    const triggerBtn = screen.getByRole("button", { name: "More actions" })
    expect(triggerBtn).toBeTruthy()

    expect(screen.getByText("Share note")).toBeTruthy()
    expect(screen.getByTestId("mock-rag-index-panel")).toBeTruthy()
    expect(screen.queryByTestId("wordpress-export-trigger")).toBeNull()
    expect(screen.queryByText("Delete note")).toBeNull()
  })

  it("opens ShareNoteDialog when Share note item is selected", () => {
    render(<MoreActionsMenu {...defaultProps} />)

    const shareItem = screen.getByText("Share note")
    fireEvent.click(shareItem)

    expect(screen.getByTestId("share-note-dialog")).toBeTruthy()
    expect(screen.getByTestId("share-note-dialog").getAttribute("data-note-id")).toBe("note-1")
  })

  it("renders WordPress export item when wordpressConfigured is true and opens export dialog on click", () => {
    render(
      <MoreActionsMenu
        {...defaultProps}
        wordpressConfigured={true}
      />
    )

    const wpExportBtn = screen.getByTestId("wordpress-export-trigger")
    expect(wpExportBtn).toBeTruthy()

    fireEvent.click(wpExportBtn)

    expect(screen.getByTestId("wordpress-export-dialog")).toBeTruthy()
    expect(screen.getByText("Test Note")).toBeTruthy()
  })

  it("renders Delete note item when onDelete callback is provided and invokes it on click", () => {
    const onDelete = jest.fn()
    render(<MoreActionsMenu {...defaultProps} onDelete={onDelete} />)

    const deleteItem = screen.getByText("Delete note")
    expect(deleteItem).toBeTruthy()

    fireEvent.click(deleteItem)

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it("supports closing menu via RAG panel callback", () => {
    render(<MoreActionsMenu {...defaultProps} />)

    const menu = screen.getByTestId("dropdown-menu")
    const closeBtn = screen.getByTestId("close-menu-from-rag")

    fireEvent.click(closeBtn)

    expect(menu.getAttribute("data-open")).toBe("false")
  })
})
