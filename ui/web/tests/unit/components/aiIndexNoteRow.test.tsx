import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type React from "react"

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
  it("indexes a not-indexed note and disables remove action", async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { chunkCount: 3 }, error: null })
    const onMutated = jest.fn()

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
      />,
      invoke
    )

    expect((screen.getByRole("button", { name: "Remove from index" }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole("button", { name: "Index" }))

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

  it("removes an indexed note after confirmation", async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { deleted: true }, error: null })
    const onMutated = jest.fn()

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
      />,
      invoke
    )

    fireEvent.click(screen.getByRole("button", { name: "Remove from index" }))

    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove from index" }))

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
})
