import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { AIIndexTab } from "@/components/features/settings/AIIndexTab"
import type { AIIndexMutationResult } from "@core/types/aiIndex"
import { SupabaseTestProvider } from "@ui/web/providers/SupabaseProvider"
import * as aiIndexHooks from "@ui/web/hooks/useAIIndexNotes"
import {
  clearActiveSettingsNoteReturnPath,
  consumeAIIndexViewState,
  saveAIIndexPendingNoteState,
  saveAIIndexViewState,
} from "@ui/web/lib/aiIndexNavigationState"

const mockPush = jest.fn()
const mockPrefetch = jest.fn()
const mockAIIndexList = jest.fn()
const mockToastError = jest.fn()
const mockToastMessage = jest.fn()
const mockToastSuccess = jest.fn()

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    message: (...args: unknown[]) => mockToastMessage(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    prefetch: mockPrefetch,
  }),
}))

jest.mock("@ui/web/lib/aiIndexNavigationState", () => ({
  clearActiveSettingsNoteReturnPath: jest.fn(),
  consumeAIIndexViewState: jest.fn(() => null),
  saveAIIndexPendingNoteState: jest.fn(),
  saveAIIndexViewState: jest.fn(),
}))

jest.mock("@/components/features/settings/AIIndexList", () => ({
  AIIndexList: (props: unknown) => {
    mockAIIndexList(props)
    return <div data-testid="ai-index-list" />
  },
}))

describe("AIIndexTab", () => {
  const mockQuery = {
    data: { pages: [{ totalCount: 0, notes: [], hasMore: false }] },
    dataUpdatedAt: 1,
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn().mockResolvedValue(undefined),
    fetchNextPage: jest.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    jest.useFakeTimers()
    mockPush.mockReset()
    mockPrefetch.mockReset()
    mockAIIndexList.mockReset()
    mockToastError.mockReset()
    mockToastMessage.mockReset()
    mockToastSuccess.mockReset()
    jest.mocked(consumeAIIndexViewState).mockReturnValue(null)
    jest.mocked(clearActiveSettingsNoteReturnPath).mockReset()
    jest.mocked(saveAIIndexViewState).mockReset()
    jest.mocked(saveAIIndexPendingNoteState).mockReset()
    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockReturnValue([])
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockReturnValue(mockQuery as never)
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it("renders the ordinary search row and debounces the search query", async () => {
    render(
      <SupabaseTestProvider
        supabase={{} as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    const input = screen.getByLabelText("Search AI index notes")

    await waitFor(() => {
      expect(mockPrefetch).toHaveBeenCalledWith("/")
    })

    expect(aiIndexHooks.useAIIndexNotes).toHaveBeenLastCalledWith("all", "")

    fireEvent.change(input, { target: { value: "he" } })

    await waitFor(() => {
      expect(screen.getByText("Search starts after 3 characters.")).toBeTruthy()
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(aiIndexHooks.useAIIndexNotes).toHaveBeenLastCalledWith("all", "")

    fireEvent.change(input, { target: { value: "hello world" } })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(aiIndexHooks.useAIIndexNotes).toHaveBeenLastCalledWith("all", "hello world")
    })

    fireEvent.click(screen.getByRole("button", { name: "Clear AI index search" }))

    await waitFor(() => {
      expect(aiIndexHooks.useAIIndexNotes).toHaveBeenLastCalledWith("all", "")
    })
  })

  it("passes the selected filter and search query together", async () => {
    render(
      <SupabaseTestProvider
        supabase={{} as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Outdated" }))
    fireEvent.change(screen.getByLabelText("Search AI index notes"), { target: { value: "outdated note" } })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(aiIndexHooks.useAIIndexNotes).toHaveBeenLastCalledWith("outdated", "outdated note")
    })
  })

  it("restores saved AI Index state on mount and clears the active note return path", async () => {
    jest.mocked(consumeAIIndexViewState).mockReturnValue({
      filter: "indexed",
      searchDraft: "saved query",
      searchQuery: "saved query",
      scrollOffset: 128,
    })

    render(
      <SupabaseTestProvider
        supabase={{} as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    await waitFor(() => {
      expect(aiIndexHooks.useAIIndexNotes).toHaveBeenLastCalledWith("indexed", "saved query")
    })

    expect((screen.getByLabelText("Search AI index notes") as HTMLInputElement).value).toBe("saved query")
    expect(clearActiveSettingsNoteReturnPath).toHaveBeenCalled()
  })

  it("saves the current view state before opening a note from the list", async () => {
    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockReturnValue([
      {
        id: "note-7",
        title: "Saved note",
        updatedAt: "2026-03-29T10:00:00Z",
        lastIndexedAt: null,
        status: "not_indexed",
      },
    ])
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockReturnValue({
      ...mockQuery,
      data: { pages: [{ totalCount: 1, notes: [], hasMore: false }] },
    } as never)

    render(
      <SupabaseTestProvider
        supabase={{} as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Outdated" }))
    fireEvent.change(screen.getByLabelText("Search AI index notes"), { target: { value: "outdated note" } })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(aiIndexHooks.useAIIndexNotes).toHaveBeenLastCalledWith("outdated", "outdated note")
    })

    const initialListProps = mockAIIndexList.mock.calls.at(-1)?.[0] as {
      onScrollOffsetChange: (offset: number) => void
    }

    act(() => {
      initialListProps.onScrollOffsetChange(144)
    })

    const latestListProps = mockAIIndexList.mock.calls.at(-1)?.[0] as {
      onOpenNote: (noteId: string) => void
    }

    act(() => {
      latestListProps.onOpenNote("note-7")
    })

    expect(saveAIIndexViewState).toHaveBeenCalledWith({
      filter: "outdated",
      searchDraft: "outdated note",
      searchQuery: "outdated note",
      scrollOffset: 144,
    })
    expect(saveAIIndexPendingNoteState).toHaveBeenCalledWith({
      noteId: "note-7",
      returnPath: "/settings?tab=ai-index",
    })
    expect(mockPush).toHaveBeenCalledWith("/")
  })

  it("renders an actionable error state and retries the query", () => {
    const refetch = jest.fn().mockResolvedValue(undefined)
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockReturnValue({
      ...mockQuery,
      isError: true,
      error: new Error("RPC unavailable"),
      refetch,
    } as never)

    render(
      <SupabaseTestProvider
        supabase={{} as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    expect(screen.getByText("AI index status is unavailable")).toBeTruthy()
    expect(screen.getByText("RPC unavailable")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(refetch).toHaveBeenCalled()
  })

  it("updates row status immediately on the all-notes view after a successful mutation", async () => {
    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockReturnValue([
      {
        id: "note-outdated",
        title: "Outdated note",
        updatedAt: "2026-03-29T10:00:00Z",
        lastIndexedAt: "2026-03-29T09:00:00Z",
        status: "outdated",
      },
    ])
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockReturnValue({
      ...mockQuery,
      data: { pages: [{ totalCount: 1, notes: [], hasMore: false }] },
    } as never)

    render(
      <SupabaseTestProvider
        supabase={{} as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    const latestListProps = mockAIIndexList.mock.calls.at(-1)?.[0] as {
      notes: Array<{ id: string; status: string }>
      onMutated: (result: AIIndexMutationResult) => void
      exitingNoteIds?: string[]
    }

    act(() => {
      latestListProps.onMutated({
        noteId: "note-outdated",
        previousStatus: "outdated",
        nextStatus: "indexed",
      })
    })

    const rerenderedListProps = mockAIIndexList.mock.calls.at(-1)?.[0] as {
      notes: Array<{ id: string; status: string }>
      exitingNoteIds?: string[]
    }

    expect(rerenderedListProps.notes).toEqual([
      expect.objectContaining({
        id: "note-outdated",
        status: "indexed",
      }),
    ])
    expect(rerenderedListProps.exitingNoteIds).toEqual([])
  })

  it("animates outdated notes out of the filtered view after a successful reindex", async () => {
    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockReturnValue([
      {
        id: "note-outdated",
        title: "Outdated note",
        updatedAt: "2026-03-29T10:00:00Z",
        lastIndexedAt: "2026-03-29T09:00:00Z",
        status: "outdated",
      },
      {
        id: "note-outdated-2",
        title: "Another outdated note",
        updatedAt: "2026-03-29T11:00:00Z",
        lastIndexedAt: "2026-03-29T10:30:00Z",
        status: "outdated",
      },
    ])
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockReturnValue({
      ...mockQuery,
      data: { pages: [{ totalCount: 2, notes: [], hasMore: false }] },
    } as never)

    render(
      <SupabaseTestProvider
        supabase={{} as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Outdated" }))

    const latestListProps = mockAIIndexList.mock.calls.at(-1)?.[0] as {
      notes: Array<{ id: string; status: string }>
      onMutated: (result: AIIndexMutationResult) => void
      exitingNoteIds?: string[]
    }

    act(() => {
      latestListProps.onMutated({
        noteId: "note-outdated",
        previousStatus: "outdated",
        nextStatus: "indexed",
      })
    })

    const duringExitProps = mockAIIndexList.mock.calls.at(-1)?.[0] as {
      notes: Array<{ id: string; status: string }>
      exitingNoteIds?: string[]
    }

    expect(duringExitProps.notes).toEqual([
      expect.objectContaining({ id: "note-outdated", status: "indexed" }),
      expect.objectContaining({ id: "note-outdated-2", status: "outdated" }),
    ])
    expect(duringExitProps.exitingNoteIds).toEqual(["note-outdated"])

    act(() => {
      jest.advanceTimersByTime(300)
    })

    const afterExitProps = mockAIIndexList.mock.calls.at(-1)?.[0] as {
      notes: Array<{ id: string; status: string }>
      exitingNoteIds?: string[]
    }

    expect(afterExitProps.notes).toEqual([
      expect.objectContaining({ id: "note-outdated-2", status: "outdated" }),
    ])
    expect(afterExitProps.exitingNoteIds).toEqual([])
  })

  it("hides stable optimistic rows that stop matching after the user switches filters", async () => {
    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockReturnValue([
      {
        id: "note-optimistic",
        title: "Optimistic note",
        updatedAt: "2026-03-29T10:00:00Z",
        lastIndexedAt: null,
        status: "not_indexed",
      },
    ])
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockReturnValue({
      ...mockQuery,
      data: { pages: [{ totalCount: 1, notes: [], hasMore: false }] },
    } as never)

    render(
      <SupabaseTestProvider
        supabase={{} as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    const listProps = mockAIIndexList.mock.calls.at(-1)?.[0] as {
      onMutated: (result: AIIndexMutationResult) => void
    }

    act(() => {
      listProps.onMutated({
        noteId: "note-optimistic",
        previousStatus: "not_indexed",
        nextStatus: "indexed",
      })
    })

    fireEvent.click(screen.getByRole("button", { name: "Not indexed" }))

    const rerenderedListProps = mockAIIndexList.mock.calls.at(-1)?.[0] as {
      notes: Array<{ id: string; status: string }>
      exitingNoteIds?: string[]
    }

    expect(rerenderedListProps.notes).toEqual([])
    expect(rerenderedListProps.exitingNoteIds).toEqual([])
  })

  it("shows a moved note normally when the user switches into its destination filter", () => {
    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockReturnValue([
      {
        id: "note-outdated",
        title: "Outdated note",
        updatedAt: "2026-03-29T10:00:00Z",
        lastIndexedAt: "2026-03-29T09:00:00Z",
        status: "outdated",
      },
    ])
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockReturnValue({
      ...mockQuery,
      data: { pages: [{ totalCount: 1, notes: [], hasMore: false }] },
      dataUpdatedAt: 10,
    } as never)

    render(
      <SupabaseTestProvider
        supabase={{} as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Outdated" }))

    const listProps = mockAIIndexList.mock.calls.at(-1)?.[0] as {
      onMutated: (result: AIIndexMutationResult) => void
    }

    act(() => {
      listProps.onMutated({
        noteId: "note-outdated",
        previousStatus: "outdated",
        nextStatus: "indexed",
      })
    })

    fireEvent.click(screen.getByRole("button", { name: "Indexed" }))

    const rerenderedListProps = mockAIIndexList.mock.calls.at(-1)?.[0] as {
      notes: Array<{ id: string; status: string }>
      exitingNoteIds?: string[]
    }

    expect(rerenderedListProps.notes).toEqual([
      expect.objectContaining({ id: "note-outdated", status: "indexed" }),
    ])
    expect(rerenderedListProps.exitingNoteIds).toEqual([])
  })

  it("stops subtracting optimistic totals after the server refetch catches up", () => {
    jest.spyOn(Date, "now").mockReturnValue(15)

    let currentNotes = [
      {
        id: "note-outdated",
        title: "Outdated note",
        updatedAt: "2026-03-29T10:00:00Z",
        lastIndexedAt: "2026-03-29T09:00:00Z",
        status: "outdated" as const,
      },
      {
        id: "note-outdated-2",
        title: "Another outdated note",
        updatedAt: "2026-03-29T11:00:00Z",
        lastIndexedAt: "2026-03-29T10:30:00Z",
        status: "outdated" as const,
      },
    ]
    let currentQuery = {
      ...mockQuery,
      data: { pages: [{ totalCount: 2, notes: [], hasMore: false }] },
      dataUpdatedAt: 10,
    }

    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockImplementation(() => currentNotes)
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockImplementation(() => currentQuery as never)

    const view = render(
      <SupabaseTestProvider
        supabase={{} as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Outdated" }))

    const listProps = mockAIIndexList.mock.calls.at(-1)?.[0] as {
      onMutated: (result: AIIndexMutationResult) => void
    }

    act(() => {
      listProps.onMutated({
        noteId: "note-outdated",
        previousStatus: "outdated",
        nextStatus: "indexed",
      })
    })

    expect(screen.getByText("Showing 1 note")).toBeTruthy()

    currentNotes = [
      {
        id: "note-outdated-2",
        title: "Another outdated note",
        updatedAt: "2026-03-29T11:00:00Z",
        lastIndexedAt: "2026-03-29T10:30:00Z",
        status: "outdated",
      },
    ]
    currentQuery = {
      ...mockQuery,
      data: { pages: [{ totalCount: 1, notes: [], hasMore: false }] },
      dataUpdatedAt: 20,
    }

    view.rerender(
      <SupabaseTestProvider
        supabase={{} as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    expect(screen.getByText("Showing 1 note")).toBeTruthy()
  })

  it("shows the bulk button only when the loaded list contains actionable notes", () => {
    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockReturnValue([
      {
        id: "note-indexed",
        title: "Indexed note",
        updatedAt: "2026-03-29T10:00:00Z",
        lastIndexedAt: "2026-03-29T10:00:00Z",
        status: "indexed",
      },
    ])
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockReturnValue({
      ...mockQuery,
      data: { pages: [{ totalCount: 1, notes: [], hasMore: false }] },
    } as never)

    const view = render(
      <SupabaseTestProvider
        supabase={{ functions: { invoke: jest.fn() } } as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    expect(screen.queryByRole("button", { name: "Index loaded notes" })).toBeNull()

    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockReturnValue([
      {
        id: "note-not-indexed",
        title: "Need index",
        updatedAt: "2026-03-29T11:00:00Z",
        lastIndexedAt: null,
        status: "not_indexed",
      },
    ])

    view.rerender(
      <SupabaseTestProvider
        supabase={{ functions: { invoke: jest.fn() } } as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    expect(screen.getByRole("button", { name: "Index loaded notes" })).toBeTruthy()
  })

  it("bulk-indexes only loaded actionable notes and skips indexed rows", async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: { outcome: "indexed", chunkCount: 1 }, error: null })
      .mockResolvedValueOnce({ data: { outcome: "indexed", chunkCount: 2 }, error: null })

    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockReturnValue([
      {
        id: "note-indexed",
        title: "Indexed note",
        updatedAt: "2026-03-29T10:00:00Z",
        lastIndexedAt: "2026-03-29T10:00:00Z",
        status: "indexed",
      },
      {
        id: "note-not-indexed",
        title: "Need index",
        updatedAt: "2026-03-29T11:00:00Z",
        lastIndexedAt: null,
        status: "not_indexed",
      },
      {
        id: "note-outdated",
        title: "Need reindex",
        updatedAt: "2026-03-29T12:00:00Z",
        lastIndexedAt: "2026-03-29T11:30:00Z",
        status: "outdated",
      },
    ])
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockReturnValue({
      ...mockQuery,
      data: { pages: [{ totalCount: 3, notes: [], hasMore: false }] },
    } as never)

    render(
      <SupabaseTestProvider
        supabase={{ functions: { invoke } } as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Index loaded notes" }))

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(2)
    })

    expect(invoke).toHaveBeenNthCalledWith(1, "rag-index", {
      body: { noteId: "note-not-indexed", action: "index" },
    })
    expect(invoke).toHaveBeenNthCalledWith(2, "rag-index", {
      body: { noteId: "note-outdated", action: "reindex" },
    })
  })

  it("keeps the supabase function context during bulk indexing", async () => {
    const note = {
      id: "note-not-indexed",
      title: "Need index",
      updatedAt: "2026-03-29T11:00:00Z",
      lastIndexedAt: null,
      status: "not_indexed" as const,
    }
    const functions = {
      calls: [] as Array<[string, { body: { noteId: string; action: string } }]>,
      invoke(this: typeof functions, name: string, options: { body: { noteId: string; action: string } }) {
        if (this !== functions) {
          return Promise.reject(new Error("lost functions context"))
        }

        this.calls.push([name, options])
        return Promise.resolve({ data: { outcome: "indexed", chunkCount: 1 }, error: null })
      },
    }

    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockReturnValue([note])
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockReturnValue({
      ...mockQuery,
      data: { pages: [{ totalCount: 1, notes: [], hasMore: false }] },
    } as never)

    render(
      <SupabaseTestProvider
        supabase={{ functions } as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Index loaded notes" }))

    await waitFor(() => {
      expect(functions.calls).toHaveLength(1)
    })

    expect(functions.calls[0]).toEqual([
      "rag-index",
      { body: { noteId: "note-not-indexed", action: "index" } },
    ])
    expect(mockToastError).not.toHaveBeenCalledWith("Bulk indexing failed")
  })

  it("keeps the bulk action scoped to the committed search results", async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { outcome: "indexed", chunkCount: 1 }, error: null })

    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockReturnValue([
      {
        id: "note-search-hit",
        title: "Matched note",
        updatedAt: "2026-03-29T11:00:00Z",
        lastIndexedAt: null,
        status: "not_indexed",
      },
    ])
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockReturnValue({
      ...mockQuery,
      data: { pages: [{ totalCount: 1, notes: [], hasMore: false }] },
    } as never)

    render(
      <SupabaseTestProvider
        supabase={{ functions: { invoke } } as never}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        <AIIndexTab />
      </SupabaseTestProvider>
    )

    fireEvent.change(screen.getByLabelText("Search AI index notes"), { target: { value: "match" } })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(aiIndexHooks.useAIIndexNotes).toHaveBeenLastCalledWith("all", "match")
    })

    fireEvent.click(screen.getByRole("button", { name: "Index loaded notes" }))

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(1)
    })

    expect(invoke).toHaveBeenCalledWith("rag-index", {
      body: { noteId: "note-search-hit", action: "index" },
    })
  })
})
