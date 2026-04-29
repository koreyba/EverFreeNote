import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { ShareNoteDialog } from "@/components/features/notes/ShareNoteDialog"
import { SupabaseTestProvider } from "@ui/web/providers/SupabaseProvider"

const shareLink = {
  id: "share-1",
  note_id: "note-1",
  user_id: "user-1",
  token: "abc123",
  permission: "view",
  is_active: true,
  created_at: "2026-04-28T10:00:00.000Z",
  updated_at: "2026-04-28T10:00:00.000Z",
}

function createSupabaseMock(results = [shareLink], insertedLink = shareLink) {
  const existingMaybeSingle = jest
    .fn()
    .mockImplementation(() => Promise.resolve({ data: results.shift() ?? null, error: null }))
  const eqIsActive = jest.fn().mockReturnValue({ maybeSingle: existingMaybeSingle })
  const eqPermission = jest.fn().mockReturnValue({ eq: eqIsActive })
  const eqUserId = jest.fn().mockReturnValue({ eq: eqPermission })
  const eqNoteId = jest.fn().mockReturnValue({ eq: eqUserId })
  const select = jest.fn().mockReturnValue({ eq: eqNoteId })
  const insertSingle = jest.fn().mockResolvedValue({ data: insertedLink, error: null })
  const insertSelect = jest.fn().mockReturnValue({ single: insertSingle })
  const insert = jest.fn().mockReturnValue({ select: insertSelect })

  return {
    supabase: {
      from: jest.fn().mockReturnValue({ select, insert }),
    },
    chain: { select, eqNoteId, eqUserId, eqPermission, eqIsActive, existingMaybeSingle, insert, insertSelect, insertSingle },
  }
}

describe("ShareNoteDialog", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    })
  })

  it("generates a share link and copies it", async () => {
    const { supabase, chain } = createSupabaseMock([])

    render(
      <SupabaseTestProvider
        supabase={supabase as never}
        user={{ id: "user-1" } as never}
      >
        <ShareNoteDialog noteId="note-1" open onOpenChange={jest.fn()} />
      </SupabaseTestProvider>
    )

    expect(screen.getByText("Anyone with the link can view")).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByDisplayValue("http://localhost/share/?token=abc123")).toBeTruthy()
    })

    expect(chain.eqNoteId).toHaveBeenCalledWith("note_id", "note-1")
    expect(chain.eqUserId).toHaveBeenCalledWith("user_id", "user-1")
    expect(chain.eqPermission).toHaveBeenCalledWith("permission", "view")
    expect(chain.eqIsActive).toHaveBeenCalledWith("is_active", true)
    expect(chain.insert).toHaveBeenCalledWith([
      {
        note_id: "note-1",
        user_id: "user-1",
        permission: "view",
      },
    ])
    expect(chain.insertSelect).toHaveBeenCalled()
    expect(chain.insertSingle).toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Copy share link" }))

    await waitFor(() => {
      expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith("http://localhost/share/?token=abc123")
      expect(screen.getByRole("button", { name: "Link copied" })).toBeTruthy()
    })
  })

  it("shows an auth error when no user is available", async () => {
    const { supabase } = createSupabaseMock()

    render(
      <SupabaseTestProvider supabase={supabase as never} user={null}>
        <ShareNoteDialog noteId="note-1" open onOpenChange={jest.fn()} />
      </SupabaseTestProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Sign in again to create a share link.")).toBeTruthy()
    })
  })

  it("resets the generated URL when switching to another note", async () => {
    const secondLink = { ...shareLink, note_id: "note-2", token: "def456" }
    const { supabase } = createSupabaseMock([shareLink, secondLink])
    const { rerender } = render(
      <SupabaseTestProvider
        supabase={supabase as never}
        user={{ id: "user-1" } as never}
      >
        <ShareNoteDialog noteId="note-1" open onOpenChange={jest.fn()} />
      </SupabaseTestProvider>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue("http://localhost/share/?token=abc123")).toBeTruthy()
    })

    rerender(
      <SupabaseTestProvider
        supabase={supabase as never}
        user={{ id: "user-1" } as never}
      >
        <ShareNoteDialog noteId="note-2" open onOpenChange={jest.fn()} />
      </SupabaseTestProvider>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue("http://localhost/share/?token=def456")).toBeTruthy()
    })
  })
})
