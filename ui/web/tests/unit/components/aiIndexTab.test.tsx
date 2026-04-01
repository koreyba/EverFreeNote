import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { AIIndexTab } from "@/components/features/settings/AIIndexTab"
import { SupabaseTestProvider } from "@ui/web/providers/SupabaseProvider"
import * as aiIndexHooks from "@ui/web/hooks/useAIIndexNotes"

const mockPush = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

jest.mock("@/components/features/settings/AIIndexList", () => ({
  AIIndexList: () => <div data-testid="ai-index-list" />,
}))

describe("AIIndexTab", () => {
  const mockQuery = {
    data: { pages: [{ totalCount: 0, notes: [], hasMore: false }] },
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
  }

  beforeEach(() => {
    jest.useFakeTimers()
    mockPush.mockReset()
    jest.spyOn(aiIndexHooks, "useFlattenedAIIndexNotes").mockReturnValue([])
    jest.spyOn(aiIndexHooks, "useAIIndexNotes").mockReturnValue(mockQuery as never)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
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
})
