import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type React from "react"

import { AIIndexList } from "@/components/features/settings/AIIndexList"
import type { AIIndexMutationResult, AIIndexNoteRow as AIIndexNoteRowData } from "@core/types/aiIndex"

const mockScrollTo = jest.fn()
const mockListRef = {
  current: {
    element: {
      scrollTo: mockScrollTo,
    },
  },
}

jest.mock("lucide-react", () => ({
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader-icon" className={className} />
  ),
}))

jest.mock("react-window", () => {
  const React = jest.requireActual("react")

  return {
    List: ({
      rowCount,
      rowComponent: RowComponent,
      rowProps,
      onRowsRendered,
      onScroll,
    }: {
      rowCount: number
      rowComponent: React.ComponentType<Record<string, unknown>>
      rowProps: Record<string, unknown>
      onRowsRendered?: (info: { stopIndex: number }) => void
      onScroll?: (event: React.UIEvent<HTMLDivElement>) => void
    }) => {
      React.useEffect(() => {
        onRowsRendered?.({ stopIndex: rowCount - 1 })
      }, [onRowsRendered, rowCount])

      return (
        <div data-testid="virtual-list" onScroll={onScroll}>
          {Array.from({ length: rowCount }, (_, index) => (
            <RowComponent
              key={index}
              index={index}
              style={{}}
              ariaAttributes={{
                "aria-posinset": index + 1,
                "aria-setsize": rowCount,
                role: "listitem",
              }}
              {...rowProps}
            />
          ))}
        </div>
      )
    },
    useDynamicRowHeight: () => 168,
    useListRef: () => mockListRef,
  }
})

jest.mock("@/components/features/settings/AIIndexNoteRow", () => ({
  AIIndexNoteRow: ({
    note,
    onMutated,
    onOpenNote,
    isExiting,
  }: {
    note: AIIndexNoteRowData
    onMutated: (result: AIIndexMutationResult) => void
    onOpenNote: (noteId: string) => void
    isExiting?: boolean
  }) => (
    <div data-testid={`note-row-${note.id}`} data-exiting={isExiting ? "true" : "false"}>
      <span>{note.title}</span>
      <span>{note.status}</span>
      <button type="button" onClick={() => onOpenNote(note.id)}>
        Open {note.id}
      </button>
      <button
        type="button"
        onClick={() => onMutated({
          noteId: note.id,
          previousStatus: note.status,
          nextStatus: "indexed",
        })}
      >
        Refresh {note.id}
      </button>
    </div>
  ),
}))

const notes: AIIndexNoteRowData[] = [
  {
    id: "note-1",
    title: "Fresh note",
    updatedAt: "2026-03-29T10:00:00Z",
    lastIndexedAt: null,
    status: "not_indexed",
  },
  {
    id: "note-2",
    title: "Indexed note",
    updatedAt: "2026-03-29T11:00:00Z",
    lastIndexedAt: "2026-03-29T11:05:00Z",
    status: "indexed",
  },
]

function renderAIIndexList(overrides: Partial<React.ComponentProps<typeof AIIndexList>> = {}) {
  const onLoadMore = jest.fn()
  const onMutated = jest.fn()
  const onOpenNote = jest.fn()
  const onScrollOffsetChange = jest.fn()

  const view = render(
    <AIIndexList
      notes={notes}
      isLoading={false}
      hasMore={false}
      isFetchingNextPage={false}
      onLoadMore={onLoadMore}
      onMutated={onMutated}
      onOpenNote={onOpenNote}
      onScrollOffsetChange={onScrollOffsetChange}
      emptyState={<div>Nothing to review here yet</div>}
      height={420}
      width={640}
      {...overrides}
    />
  )

  return {
    ...view,
    onLoadMore,
    onMutated,
    onOpenNote,
    onScrollOffsetChange,
  }
}

describe("AIIndexList", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockListRef.current.element = {
      scrollTo: mockScrollTo,
    }
  })

  it("renders note rows and forwards note actions", () => {
    const { onMutated, onOpenNote } = renderAIIndexList()

    expect(screen.getByText("Fresh note")).toBeTruthy()
    expect(screen.getByText("Indexed note")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Open note-1" }))
    fireEvent.click(screen.getByRole("button", { name: "Refresh note-2" }))

    expect(onOpenNote).toHaveBeenCalledWith("note-1")
    expect(onMutated).toHaveBeenCalledTimes(1)
  })

  it("renders the loading skeleton while the list is fetching", () => {
    const { container } = renderAIIndexList({ isLoading: true, notes: [] })

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
  })

  it("renders the provided empty state when there are no notes", () => {
    renderAIIndexList({ notes: [] })

    expect(screen.getByText("Nothing to review here yet")).toBeTruthy()
  })

  it("shows the next-page spinner while more notes are loading", () => {
    const { onLoadMore } = renderAIIndexList({
      hasMore: true,
      isFetchingNextPage: true,
    })

    expect(screen.getByTestId("loader-icon")).toBeTruthy()
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it("loads more notes when pagination affordances are reached", async () => {
    const { onLoadMore } = renderAIIndexList({ hasMore: true })

    await waitFor(() => {
      expect(onLoadMore).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole("button", { name: "Load more notes" }))

    expect(onLoadMore).toHaveBeenCalledTimes(2)
  })

  it("reports scroll changes and restores saved scroll offset", async () => {
    const { onScrollOffsetChange } = renderAIIndexList({ initialScrollOffset: 128 })

    await waitFor(() => {
      expect(mockScrollTo).toHaveBeenCalledWith({ top: 128, behavior: "auto" })
    })

    const list = screen.getByTestId("virtual-list")
    Object.defineProperty(list, "scrollTop", {
      configurable: true,
      value: 72,
      writable: true,
    })

    fireEvent.scroll(list)

    expect(onScrollOffsetChange).toHaveBeenCalledWith(72)
  })

  it("marks exiting rows so filtered removals can animate out", () => {
    renderAIIndexList({ exitingNoteIds: ["note-2"] })

    expect((screen.getByTestId("note-row-note-1") as HTMLDivElement).dataset.exiting).toBe("false")
    expect((screen.getByTestId("note-row-note-2") as HTMLDivElement).dataset.exiting).toBe("true")
  })
})
