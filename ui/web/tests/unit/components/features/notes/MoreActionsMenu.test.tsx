import * as React from "react"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { step } from "allure-js-commons"
import { MoreActionsMenu } from "@/components/features/notes/MoreActionsMenu"
import type { ExportableWordPressNote } from "@/components/features/wordpress/ExportToWordPressButton"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { SupabaseTestProvider } from "@ui/web/providers/SupabaseProvider"
import type { Tables } from "@/supabase/types"

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

function fireMousePointer(target: HTMLElement, type: "pointerdown" | "pointerup") {
  const event = new MouseEvent(type, { button: 0, bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: "mouse" },
  })
  fireEvent(target, event)
}

async function openVersionOptions(trigger: HTMLElement) {
  // jsdom does not implement pointer capture.
  if (!trigger.hasPointerCapture) Object.defineProperty(trigger, "hasPointerCapture", { value: () => false })
  fireMousePointer(trigger, "pointerdown")
  const listbox = await screen.findByRole("listbox")
  fireMousePointer(trigger, "pointerup")
  return within(listbox)
}

async function chooseVersion(trigger: HTMLElement, name: string) {
  const options = await openVersionOptions(trigger)
  const option = await options.findByRole("option", { name })
  fireMousePointer(option, "pointerdown")
  fireMousePointer(option, "pointerup")
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
}

function createVersionHistoryClient(
  versions: Pick<Tables<"note_versions">, "version" | "created_at">[],
  snapshots: Record<number, Pick<Tables<"note_versions">, "title" | "description" | "tags">>,
) {
  const loadHistory = jest.fn(async (from: number, to: number, beforeVersion: number | null = null) => ({
    data: versions.filter(entry => beforeVersion === null || entry.version < beforeVersion).slice(from, to + 1),
    error: null,
  }))
  const loadVersion = jest.fn(async (version: number) => ({ data: snapshots[version], error: null }))
  const supabase = {
    from: jest.fn().mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            range: (from: number, to: number) => ({
              abortSignal: () => loadHistory(from, to),
              lt: (_column: string, beforeVersion: number) => ({
                abortSignal: () => loadHistory(from, to, beforeVersion),
              }),
            }),
          }),
          eq: (_column: string, version: number) => ({
            eq: () => ({ abortSignal: () => ({ single: () => loadVersion(version) }) }),
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient
  return { supabase, loadVersion, loadHistory }
}

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

  it("previews a saved version and restores it against the latest revision", async () => {
    const { supabase } = createVersionHistoryClient([
      { version: 2, created_at: "2026-11-05T16:00:00Z" },
      { version: 1, created_at: "2026-11-05T15:00:00Z" },
    ], {
      2: { title: "Current title", description: "<p>Current body</p>", tags: [] },
      1: { title: "Earlier title", description: "<p><strong>Earlier body</strong></p>", tags: ["draft"] },
    })
    const onRestore = jest.fn().mockResolvedValue(undefined)

    render(
      <SupabaseTestProvider supabase={supabase} user={{ id: "owner-1" } as User}>
        <MoreActionsMenu {...defaultProps} versionHistory={{ onRestore }} />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("menuitem", { name: "Version history" }))
    const history = within(await screen.findByRole("dialog", { name: "Version history" }))
    expect(await history.findByText("Current body")).toBeTruthy()
    expect(history.getByRole<HTMLButtonElement>("button", { name: "Restore version" }).disabled).toBe(true)

    fireEvent.click(history.getByRole("button", { name: /Version 1/ }))
    expect((await history.findByText("Earlier body")).tagName).toBe("STRONG")
    expect(history.getByText("draft")).toBeTruthy()
    fireEvent.click(history.getByRole("button", { name: "Restore version" }))

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Version history" })).toBeNull())
    expect(onRestore).toHaveBeenCalledWith(1, 2)
  })

  it("returns focus to More actions when Escape closes version history", async () => {
    const { supabase } = createVersionHistoryClient([
      { version: 1, created_at: "2026-11-05T15:00:00Z" },
    ], {
      1: { title: "Saved note", description: "<p>Saved body</p>", tags: [] },
    })

    render(
      <SupabaseTestProvider supabase={supabase} user={{ id: "owner-1" } as User}>
        <MoreActionsMenu {...defaultProps} versionHistory={{ onRestore: jest.fn() }} />
      </SupabaseTestProvider>
    )

    const trigger = screen.getByRole("button", { name: "More actions" })
    const historyItem = screen.getByRole("menuitem", { name: "Version history" })
    historyItem.focus()
    fireEvent.click(historyItem)
    const dialog = await screen.findByRole("dialog", { name: "Version history" })
    expect(await within(dialog).findByText("Saved body")).toBeTruthy()

    await step("Close the history dialog by keyboard and return to the menu trigger", async () => {
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
      fireEvent.keyDown(document.activeElement ?? dialog, { key: "Escape" })
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Version history" })).toBeNull())
      await waitFor(() => expect(document.activeElement === trigger).toBe(true))
    })
  })

  it("allows previewing an earlier version while pending edits block restoring it", async () => {
    const { supabase } = createVersionHistoryClient([
      { version: 2, created_at: "2026-11-05T16:00:00Z" },
      { version: 1, created_at: "2026-11-05T15:00:00Z" },
    ], {
      2: { title: "Latest note", description: "<p>Latest body</p>", tags: [] },
      1: { title: "Earlier note", description: "<p>Earlier body</p>", tags: [] },
    })
    const onRestore = jest.fn()
    const restoreBlockedReason = "Finish syncing this note before restoring a version."

    render(
      <SupabaseTestProvider supabase={supabase} user={{ id: "owner-1" } as User}>
        <MoreActionsMenu {...defaultProps} versionHistory={{ onRestore, restoreBlockedReason }} />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("menuitem", { name: "Version history" }))
    const history = within(await screen.findByRole("dialog", { name: "Version history" }))
    fireEvent.click(await history.findByRole("button", { name: /Version 1/ }))
    expect(await history.findByText("Earlier body")).toBeTruthy()
    expect(history.getByText(restoreBlockedReason)).toBeTruthy()
    const restore = history.getByRole<HTMLButtonElement>("button", { name: "Restore version" })
    expect(restore.disabled).toBe(true)
    fireEvent.click(restore)
    expect(onRestore).not.toHaveBeenCalled()
  })

  it("refreshes history after a stale restore and retries against the newer revision", async () => {
    const versions = [
      { version: 2, created_at: "2026-11-05T16:00:00Z" },
      { version: 1, created_at: "2026-11-05T15:00:00Z" },
    ]
    const { supabase } = createVersionHistoryClient(versions, {
      3: { title: "New remote note", description: "<p>New remote body</p>", tags: [] },
      2: { title: "Latest note", description: "<p>Latest body</p>", tags: [] },
      1: { title: "Earlier note", description: "<p>Earlier body</p>", tags: [] },
    })
    const conflict = "The note changed. Review the latest version and try again."
    const onRestore = jest.fn()
      .mockImplementationOnce(async () => {
        versions.unshift({ version: 3, created_at: "2026-11-05T17:00:00Z" })
        throw new Error(conflict)
      })
      .mockResolvedValueOnce(undefined)

    render(
      <SupabaseTestProvider supabase={supabase} user={{ id: "owner-1" } as User}>
        <MoreActionsMenu {...defaultProps} versionHistory={{ onRestore }} />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("menuitem", { name: "Version history" }))
    const history = within(await screen.findByRole("dialog", { name: "Version history" }))

    await step("Attempt to restore version 1 while version 2 is current", async () => {
      fireEvent.click(await history.findByRole("button", { name: /Version 1/ }))
      expect(await history.findByText("Earlier body")).toBeTruthy()
      fireEvent.click(history.getByRole("button", { name: "Restore version" }))
      expect((await history.findByRole("alert")).textContent).toBe(conflict)
      expect(onRestore).toHaveBeenNthCalledWith(1, 1, 2)
    })

    await step("Review the new current version and retry restoring version 1", async () => {
      fireEvent.click(await history.findByRole("button", { name: /Version 3 Current/ }))
      expect(await history.findByText("New remote body")).toBeTruthy()
      fireEvent.click(history.getByRole("button", { name: /Version 1/ }))
      expect(await history.findByText("Earlier body")).toBeTruthy()
      fireEvent.click(history.getByRole("button", { name: "Restore version" }))
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Version history" })).toBeNull())
      expect(onRestore).toHaveBeenNthCalledWith(2, 1, 3)
    })
  })

  it("compares an older selection with the current version and reuses loaded snapshots", async () => {
    const { supabase, loadVersion } = createVersionHistoryClient([
      { version: 2, created_at: "2026-11-05T16:00:00Z" },
      { version: 1, created_at: "2026-11-05T15:00:00Z" },
    ], {
      2: { title: "Final title", description: "<p>Read the published guide.</p>", tags: ["public"] },
      1: { title: "Planned title", description: "<p>Read the <strong>draft</strong> guide.</p>", tags: ["internal"] },
    })

    render(
      <SupabaseTestProvider supabase={supabase} user={{ id: "owner-1" } as User}>
        <MoreActionsMenu {...defaultProps} versionHistory={{ onRestore: jest.fn() }} />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("menuitem", { name: "Version history" }))
    const history = within(await screen.findByRole("dialog", { name: "Version history" }))
    expect(await history.findByText("Final title")).toBeTruthy()

    fireEvent.click(history.getByRole("button", { name: /Version 1/ }))
    expect((await history.findByText("draft")).tagName).toBe("STRONG")
    fireEvent.click(history.getByRole("button", { name: "Compare versions" }))
    const from = history.getByRole("combobox", { name: "From version" })
    const to = history.getByRole("combobox", { name: "To version" })
    expect(from.textContent).toContain("Version 1")
    expect(to.textContent).toContain("Version 2")

    const comparison = await history.findByRole("region", { name: "Version comparison" })
    expect(Array.from(comparison.querySelectorAll("ins"), node => node.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("Final"), expect.stringContaining("published"), expect.stringContaining("public")])
    )
    expect(Array.from(comparison.querySelectorAll("del"), node => node.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("Planned"), expect.stringContaining("draft"), expect.stringContaining("internal")])
    )

    await step("Choose the other version by keyboard to swap From and To", async () => {
      from.focus()
      fireEvent.keyDown(from, { key: "Enter" })
      const versions = within(await screen.findByRole("listbox"))
      const currentChoice = versions.getByRole("option", { name: "Version 1" })
      const nextChoice = versions.getByRole("option", { name: "Version 2 (current)" })
      await waitFor(() => expect(document.activeElement).toBe(currentChoice))
      fireEvent.keyDown(currentChoice, { key: "ArrowUp" })
      await waitFor(() => expect(document.activeElement).toBe(nextChoice))
      fireEvent.keyDown(nextChoice, { key: "Enter" })
      await waitFor(() => expect(document.activeElement).toBe(from))
      expect(from.textContent).toContain("Version 2")
      expect(to.textContent).toContain("Version 1")
    })

    fireEvent.click(history.getByRole("button", { name: "Back to history" }))
    expect((await history.findByText("draft")).tagName).toBe("STRONG")
    expect(loadVersion.mock.calls).toEqual([[2], [1]])
  })

  it("keeps the From and To direction in both views and preserves the history selection", async () => {
    const { supabase, loadVersion } = createVersionHistoryClient([
      { version: 4, created_at: "2026-11-05T18:00:00Z" },
      { version: 3, created_at: "2026-11-05T17:00:00Z" },
      { version: 2, created_at: "2026-11-05T16:00:00Z" },
      { version: 1, created_at: "2026-11-05T15:00:00Z" },
    ], {
      4: { title: "Trip planning", description: "<p>Fourth body</p>", tags: [] },
      3: { title: "Trip planning", description: "<p><strong>Third body</strong></p>", tags: [] },
      2: { title: "Trip planning", description: "<p><strong>Second body</strong></p>", tags: [] },
      1: { title: "Trip planning", description: "<p>First body</p>", tags: [] },
    })
    const onRestore = jest.fn().mockResolvedValue(undefined)

    render(
      <SupabaseTestProvider supabase={supabase} user={{ id: "owner-1" } as User}>
        <MoreActionsMenu {...defaultProps} versionHistory={{ onRestore }} />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("menuitem", { name: "Version history" }))
    const history = within(await screen.findByRole("dialog", { name: "Version history" }))
    expect(await history.findByText("Fourth body")).toBeTruthy()

    const from = () => history.getByRole("combobox", { name: "From version" })
    const to = () => history.getByRole("combobox", { name: "To version" })
    const expectInlinePair = (removed: string, added: string) => waitFor(() => {
      const comparison = history.getByRole("region", { name: "Version comparison" })
      expect(comparison.querySelector("del")?.textContent).toContain(removed)
      expect(comparison.querySelector("ins")?.textContent).toContain(added)
    })
    const expectSideBySidePair = async (leftVersion: number, leftBody: string, rightVersion: number, rightBody: string) => {
      const left = await history.findByRole("article", { name: `Version ${leftVersion}` })
      const right = history.getByRole("article", { name: `Version ${rightVersion}` })
      expect(left.textContent).toContain(leftBody)
      expect(right.textContent).toContain(rightBody)
      expect(left.compareDocumentPosition(right)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    }

    await step("Open comparison with the previous version and the current version", async () => {
      fireEvent.click(history.getByRole("button", { name: "Compare versions" }))
      expect(from().textContent).toContain("Version 3")
      expect(to().textContent).toContain("Version 4")
      expect(history.queryByRole("button", { name: /^Version 4\b/ })).toBeNull()
      expect(history.queryByRole("button", { name: /^Restore version/ })).toBeNull()
      expect(await history.findByRole("region", { name: "Version comparison" })).toBeTruthy()
      fireEvent.click(history.getByRole("button", { name: "Back to history" }))
    })

    await step("Select version 2 in history and choose versions 1 and 3 for comparison", async () => {
      fireEvent.click(history.getByRole("button", { name: /Version 2/ }))
      expect(await history.findByText("Second body")).toBeTruthy()
      fireEvent.click(history.getByRole("button", { name: "Compare versions" }))
      expect(from().textContent).toContain("Version 2")
      expect(to().textContent).toContain("Version 4")
      await chooseVersion(from(), "Version 1")
      await chooseVersion(to(), "Version 3")
      await expectInlinePair("First", "Third")
    })

    await step("Switch to side by side and keep version 1 on the left", async () => {
      fireEvent.click(history.getByRole("button", { name: "Side by side" }))
      await expectSideBySidePair(1, "First body", 3, "Third body")
      expect(from().textContent).toContain("Version 1")
      expect(to().textContent).toContain("Version 3")
    })

    await step("Swap versions using From and keep that direction in Inline", async () => {
      await chooseVersion(from(), "Version 3")
      expect(from().textContent).toContain("Version 3")
      expect(to().textContent).toContain("Version 1")
      await expectSideBySidePair(3, "Third body", 1, "First body")
      fireEvent.click(history.getByRole("button", { name: "Inline" }))
      await expectInlinePair("Third", "First")
      expect(from().textContent).toContain("Version 3")
      expect(to().textContent).toContain("Version 1")
    })

    await step("Return to history and restore the originally selected version", async () => {
      fireEvent.click(history.getByRole("button", { name: "Back to history" }))
      expect((await history.findByText("Second body")).tagName).toBe("STRONG")
      expect(history.queryByRole("combobox", { name: "From version" })).toBeNull()
      fireEvent.click(history.getByRole("button", { name: "Restore version" }))
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Version history" })).toBeNull())
      expect(onRestore).toHaveBeenCalledWith(2, 4)
    })

    expect(loadVersion.mock.calls).toEqual([[4], [3], [2], [1]])
  })

  it("preserves the comparison across three history pages and offers the oldest version", async () => {
    const versions = Array.from({ length: 64 }, (_, index) => ({
      version: 64 - index,
      created_at: new Date(Date.UTC(2026, 10, 5, 15, 64 - index)).toISOString(),
    }))
    const { supabase, loadVersion, loadHistory } = createVersionHistoryClient(versions, {
      64: { title: "Current note", description: "<p>Current body</p>", tags: [] },
      35: { title: "Working note", description: "<p>Working body</p>", tags: [] },
      5: { title: "Early note", description: "<p>Early body</p>", tags: [] },
      1: { title: "First draft", description: "<p>First body</p>", tags: [] },
    })

    render(
      <SupabaseTestProvider supabase={supabase} user={{ id: "owner-1" } as User}>
        <MoreActionsMenu {...defaultProps} versionHistory={{ onRestore: jest.fn() }} />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("menuitem", { name: "Version history" }))
    const history = within(await screen.findByRole("dialog", { name: "Version history" }))
    expect(await history.findByText("Current body")).toBeTruthy()

    await step("Open comparison from the oldest version on page one", async () => {
      fireEvent.click(history.getByRole("button", { name: /^Version 35\s/ }))
      fireEvent.click(history.getByRole("button", { name: "Compare versions" }))
    })

    const from = history.getByRole("combobox", { name: "From version" })
    const to = history.getByRole("combobox", { name: "To version" })

    await step("Load page two and choose a pair spanning both pages", async () => {
      const options = await openVersionOptions(from)
      expect(options.queryByRole("option", { name: "Version 5" })).toBeNull()
      fireEvent.keyDown(options.getByRole("option", { name: "Version 35" }), { key: "Escape" })
      await waitFor(() => expect(document.activeElement).toBe(from))
      fireEvent.click(history.getByRole("button", { name: "Load earlier versions" }))
      await chooseVersion(from, "Version 5")
      await chooseVersion(to, "Version 35")
      fireEvent.click(history.getByRole("button", { name: "Side by side" }))
      expect((await history.findByRole("article", { name: "Version 5" })).textContent).toContain("Early body")
      expect(history.getByRole("article", { name: "Version 35" }).textContent).toContain("Working body")
    })

    await step("Load page three, keep the selected pair, and compare the oldest version", async () => {
      fireEvent.click(history.getByRole("button", { name: "Load earlier versions" }))
      await waitFor(() => expect(history.queryByRole("button", { name: /^(Load earlier versions|Loading…)$/ })).toBeNull())
      expect(from.textContent).toContain("Version 5")
      expect(to.textContent).toContain("Version 35")
      expect(history.getByRole("article", { name: "Version 5" })).toBeTruthy()
      await chooseVersion(from, "Version 1")
      expect((await history.findByRole("article", { name: "Version 1" })).textContent).toContain("First body")
      expect(history.getByRole("article", { name: "Version 35" }).textContent).toContain("Working body")
    })

    expect(loadHistory.mock.calls).toEqual([[0, 29], [0, 29, 35], [0, 29, 5]])
    expect(loadVersion.mock.calls).toEqual([[64], [35], [5], [1]])
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
