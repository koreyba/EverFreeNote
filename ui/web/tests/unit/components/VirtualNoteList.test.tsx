import * as React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { VirtualNoteList } from "@/components/VirtualNoteList"
import type { Note } from "@core/types/domain"

jest.mock("react-window", () => ({
  List: ({ children, itemCount, itemData }: { children: React.ComponentType<unknown>; itemCount: number; itemData: unknown }) => {
    const Row = children as unknown as React.ComponentType<{ index: number; style: React.CSSProperties; data: unknown }>
    return (
      <div data-testid="virtual-list">
        {Array.from({ length: itemCount }).map((_, index) => (
          <Row key={index} index={index} style={{}} data={itemData} />
        ))}
      </div>
    )
  },
}))

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    user_id: "user-1",
    title: "Sample Note Title",
    content: "Sample note content",
    description: "Sample note description",
    is_pinned: false,
    is_archived: false,
    is_trashed: false,
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-02T12:00:00.000Z",
    tags: ["frontend", "react", "testing", "extra-tag"],
    ...overrides,
  } as Note
}

describe("VirtualNoteList", () => {
  const defaultProps = {
    height: 600,
    selectedNote: null,
    onSelectNote: jest.fn(),
    onTagClick: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Empty & Null states", () => {
    it("renders null when notes array is empty", () => {
      const { container } = render(
        <VirtualNoteList notes={[]} {...defaultProps} />
      )
      expect(container.firstChild).toBeNull()
    })

    it("renders null when notes prop is null or undefined", () => {
      const { container } = render(
        // @ts-expect-error testing runtime fallback
        <VirtualNoteList notes={null} {...defaultProps} />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe("Virtualized rendering & Note items", () => {
    it("renders notes using the virtual list component", () => {
      const notes = [
        makeNote({ id: "note-1", title: "Note 1" }),
        makeNote({ id: "note-2", title: "Note 2" }),
      ]

      render(<VirtualNoteList notes={notes} {...defaultProps} />)

      expect(screen.getByText("Note 1")).toBeTruthy()
      expect(screen.getByText("Note 2")).toBeTruthy()
    })

    it("renders skeleton placeholder when note is missing in itemData index", () => {
      const CustomList = ({ children, itemData }: { children: React.ComponentType<unknown>; itemData: Record<string, unknown> }) => {
        const Row = children as unknown as React.ComponentType<{ index: number; style: React.CSSProperties; data: unknown }>
        return (
          <div>
            <Row index={0} style={{}} data={{ ...itemData, notes: [] }} />
          </div>
        )
      }

      const { container } = render(
        <VirtualNoteList
          notes={[makeNote()]}
          {...defaultProps}
          ListComponent={CustomList}
        />
      )

      expect(container.querySelector(".animate-pulse")).toBeTruthy()
    })
  })

  describe("Note text & tag fallbacks", () => {
    it("renders default title and description fallbacks when fields are empty", () => {
      const notes = [
        makeNote({
          id: "empty-note",
          title: "",
          // @ts-expect-error testing null description
          description: null,
          tags: [],
        }),
      ]

      render(<VirtualNoteList notes={notes} {...defaultProps} />)

      expect(screen.getByText("Untitled Note")).toBeTruthy()
      expect(screen.getByText("No additional text")).toBeTruthy()
    })

    it("slices tags to a maximum of 3 items", () => {
      const notes = [
        makeNote({
          tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
        }),
      ]

      render(<VirtualNoteList notes={notes} {...defaultProps} />)

      expect(screen.getByText("tag1")).toBeTruthy()
      expect(screen.getByText("tag2")).toBeTruthy()
      expect(screen.getByText("tag3")).toBeTruthy()
      expect(screen.queryByText("tag4")).toBeNull()
      expect(screen.queryByText("tag5")).toBeNull()
    })

    it("renders spacer when note has no tags", () => {
      const notes = [makeNote({ tags: [] })]
      const { container } = render(
        <VirtualNoteList notes={notes} {...defaultProps} />
      )
      expect(container.querySelector("span.h-5")).toBeTruthy()
    })
  })

  describe("Selection State", () => {
    it("renders selected styling when note matches selectedNote id", () => {
      const note1 = makeNote({ id: "note-1", title: "Note 1" })
      const note2 = makeNote({ id: "note-2", title: "Note 2" })
      const notes = [note1, note2]

      render(
        <VirtualNoteList
          notes={notes}
          {...defaultProps}
          selectedNote={note1}
        />
      )

      const note1Button = screen.getByRole("button", { name: /Note 1/ })
      const note2Button = screen.getByRole("button", { name: /Note 2/ })

      expect(note1Button.getAttribute("aria-pressed")).toBe("true")
      expect(note1Button.className).toContain("bg-accent")

      expect(note2Button.getAttribute("aria-pressed")).toBe("false")
      expect(note2Button.className).toContain("bg-card")
    })
  })

  describe("Click and Keyboard Callbacks", () => {
    it("calls onSelectNote when a note item is clicked", () => {
      const note = makeNote({ id: "note-1", title: "Clickable Note" })
      const onSelectNote = jest.fn()

      render(
        <VirtualNoteList
          notes={[note]}
          {...defaultProps}
          onSelectNote={onSelectNote}
        />
      )

      const noteBtn = screen.getByRole("button", { name: /Clickable Note/ })
      fireEvent.click(noteBtn)

      expect(onSelectNote).toHaveBeenCalledTimes(1)
      expect(onSelectNote).toHaveBeenCalledWith(note)
    })

    it("calls onSelectNote when Enter or Space key is pressed on note item", () => {
      const note = makeNote({ id: "note-1", title: "Keyboard Note" })
      const onSelectNote = jest.fn()

      render(
        <VirtualNoteList
          notes={[note]}
          {...defaultProps}
          onSelectNote={onSelectNote}
        />
      )

      const noteBtn = screen.getByRole("button", { name: /Keyboard Note/ })

      fireEvent.keyDown(noteBtn, { key: "Enter" })
      expect(onSelectNote).toHaveBeenCalledTimes(1)
      expect(onSelectNote).toHaveBeenCalledWith(note)

      fireEvent.keyDown(noteBtn, { key: " " })
      expect(onSelectNote).toHaveBeenCalledTimes(2)

      // Unhandled keys should not trigger selection
      fireEvent.keyDown(noteBtn, { key: "Tab" })
      expect(onSelectNote).toHaveBeenCalledTimes(2)
    })

    it("does not call onSelectNote if keydown event originates from child element", () => {
      const note = makeNote({ id: "note-1", title: "Parent Note" })
      const onSelectNote = jest.fn()

      render(
        <VirtualNoteList
          notes={[note]}
          {...defaultProps}
          onSelectNote={onSelectNote}
        />
      )

      const titleHeader = screen.getByText("Parent Note")
      fireEvent.keyDown(titleHeader, { key: "Enter", bubbles: true })

      expect(onSelectNote).not.toHaveBeenCalled()
    })

    it("calls onTagClick when a tag is clicked", () => {
      const note = makeNote({ id: "note-1", tags: ["react"] })
      const onTagClick = jest.fn()
      const onSelectNote = jest.fn()

      render(
        <VirtualNoteList
          notes={[note]}
          {...defaultProps}
          onSelectNote={onSelectNote}
          onTagClick={onTagClick}
        />
      )

      const tagElement = screen.getByText("react")
      fireEvent.click(tagElement)

      expect(onTagClick).toHaveBeenCalledWith("react")
      expect(onSelectNote).not.toHaveBeenCalled()
    })
  })

  describe("Custom ListComponent & Window Resizing", () => {
    it("passes custom height and virtualizer parameters to ListComponent", () => {
      const customListSpy = jest.fn(({ children, height }: { children: React.ComponentType<unknown>; height: number }) => {
        const Row = children as unknown as React.ComponentType<{ index: number; style: React.CSSProperties; data: unknown }>
        return (
          <div data-testid="custom-list" data-height={height}>
            <Row index={0} style={{}} data={{ notes: [makeNote()], onSelectNote: jest.fn() }} />
          </div>
        )
      })

      const { rerender } = render(
        <VirtualNoteList
          notes={[makeNote()]}
          {...defaultProps}
          height={400}
          ListComponent={customListSpy}
        />
      )

      expect(customListSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          height: 400,
          itemCount: 1,
          itemSize: 120,
          width: "100%",
          overscanCount: 5,
        }),
        undefined
      )

      // Simulate window resize changing height prop to 800
      rerender(
        <VirtualNoteList
          notes={[makeNote()]}
          {...defaultProps}
          height={800}
          ListComponent={customListSpy}
        />
      )

      expect(customListSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          height: 800,
        }),
        undefined
      )
    })
  })
})
