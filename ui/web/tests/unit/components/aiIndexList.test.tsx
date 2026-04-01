import { render, screen } from "@testing-library/react"

import { AIIndexList } from "@/components/features/settings/AIIndexList"

jest.mock("react-window", () => ({
  List: () => null,
  useDynamicRowHeight: () => 168,
  useListRef: () => ({ current: { element: null } }),
}))

describe("AIIndexList", () => {
  it("renders the provided empty state when there are no notes", () => {
    render(
      <AIIndexList
        notes={[]}
        isLoading={false}
        hasMore={false}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
        onMutated={jest.fn()}
        onOpenNote={jest.fn()}
        emptyState={<div>Nothing to review here yet</div>}
      />
    )

    expect(screen.getByText("Nothing to review here yet")).toBeTruthy()
  })
})
