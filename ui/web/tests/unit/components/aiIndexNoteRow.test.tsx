import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type React from "react"
import { toast } from "sonner"

import { AIIndexNoteRow } from "@/components/features/settings/AIIndexNoteRow"
import { SupabaseTestProvider } from "@ui/web/providers/SupabaseProvider"

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

function renderWithSupabase(ui: React.ReactElement, invoke: jest.Mock) {
  return render(
    <SupabaseTestProvider supabase={{ functions: { invoke } } as never}>
      {ui}
    </SupabaseTestProvider>
  )
}

describe("AIIndexNoteRow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("indexes a not-indexed note and disables remove action", async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { chunkCount: 3 }, error: null })
    const onMutated = jest.fn()
    const onOpenNote = jest.fn()

    renderWithSupabase(
      <AIIndexNoteRow
        note={{
          id: "note-1",
          title: "Fresh note",
          updatedAt: "2026-03-29T10:00:00Z",
          lastIndexedAt: null,
          status: "not_indexed",
        }}
        onMutated={onMutated}
        onOpenNote={onOpenNote}
      />,
      invoke
    )

    expect(screen.queryByRole("button", { name: "Remove index" })).toBeNull()
    expect(screen.getByText("Not searchable by AI yet.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Index note" }))

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("rag-index", {
        body: {
          noteId: "note-1",
          action: "index",
        },
      })
    })

    expect(onMutated).toHaveBeenCalled()
  })

  it("uses the update action for outdated notes and reindexes them", async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { chunkCount: 5 }, error: null })
    const onMutated = jest.fn()

    renderWithSupabase(
      <AIIndexNoteRow
        note={{
          id: "note-outdated",
          title: "Outdated note",
          updatedAt: "2026-03-29T10:00:00Z",
          lastIndexedAt: "2026-03-29T09:00:00Z",
          status: "outdated",
        }}
        onMutated={onMutated}
        onOpenNote={jest.fn()}
      />,
      invoke
    )

    expect(screen.getByRole("button", { name: "Update index" })).toBeTruthy()
    expect(screen.getByText("Changed after the last successful index.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Update index" }))

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("rag-index", {
        body: {
          noteId: "note-outdated",
          action: "reindex",
        },
      })
    })

    expect(onMutated).toHaveBeenCalled()
  })

  it("removes an indexed note after confirmation", async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { deleted: true }, error: null })
    const onMutated = jest.fn()
    const onOpenNote = jest.fn()

    renderWithSupabase(
      <AIIndexNoteRow
        note={{
          id: "note-2",
          title: "Indexed note",
          updatedAt: "2026-03-29T10:00:00Z",
          lastIndexedAt: "2026-03-29T10:05:00Z",
          status: "indexed",
        }}
        onMutated={onMutated}
        onOpenNote={onOpenNote}
      />,
      invoke
    )

    fireEvent.click(screen.getByRole("button", { name: "Remove index" }))

    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove index" }))

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("rag-index", {
        body: {
          noteId: "note-2",
          action: "delete",
        },
      })
    })

    expect(onMutated).toHaveBeenCalled()
  })

  it("opens the note when the row content is clicked", () => {
    const invoke = jest.fn()
    const onOpenNote = jest.fn()

    renderWithSupabase(
      <AIIndexNoteRow
        note={{
          id: "note-3",
          title: "Jump to note",
          updatedAt: "2026-03-29T10:00:00Z",
          lastIndexedAt: "2026-03-29T10:05:00Z",
          status: "indexed",
        }}
        onMutated={jest.fn()}
        onOpenNote={onOpenNote}
      />,
      invoke
    )

    fireEvent.click(screen.getByRole("button", { name: "Open note Jump to note" }))

    expect(onOpenNote).toHaveBeenCalledWith("note-3")
  })

  it("surfaces the relogin hint for unauthorized index failures", async () => {
    const OriginalResponse = globalThis.Response
    class MockResponse {
      status: number
      private body: string

      constructor(body: string, init: { status: number }) {
        this.body = body
        this.status = init.status
      }

      async json() {
        return JSON.parse(this.body) as { error?: string }
      }
    }

    if (!OriginalResponse) {
      Object.defineProperty(globalThis, "Response", {
        value: MockResponse,
        configurable: true,
      })
    }

    const invoke = jest.fn().mockResolvedValue({
      data: null,
      error: Object.assign(new Error("Unauthorized"), {
        context: new (globalThis.Response ?? MockResponse)(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }),
      }),
    })

    renderWithSupabase(
      <AIIndexNoteRow
        note={{
          id: "note-4",
          title: "Needs auth",
          updatedAt: "2026-03-29T10:00:00Z",
          lastIndexedAt: null,
          status: "not_indexed",
        }}
        onMutated={jest.fn()}
        onOpenNote={jest.fn()}
      />,
      invoke
    )

    fireEvent.click(screen.getByRole("button", { name: "Index note" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Unauthorized. Your local auth session may belong to a different Supabase stack. Sign out and sign in again, then retry."
      )
    })

    if (!OriginalResponse) {
      delete (globalThis as { Response?: unknown }).Response
    }
  })
})
