import { render, screen } from "@testing-library/react"
import { NoteVersionComparison } from "@/components/features/notes/NoteVersionComparison"
import { compareNoteVersions } from "@core/utils/compareNoteVersions"

jest.mock("@core/utils/compareNoteVersions")

it("uses the selected From and To order and keeps paragraph blocks separate", () => {
  jest.mocked(compareNoteVersions).mockReturnValue({
    title: null,
    body: {
      limited: false,
      parts: [
        { kind: "unchanged", text: "Stable heading", block: true },
        { kind: "removed", text: "Published release\nCustomer onboarding", block: true },
        { kind: "added", text: "Internal draft\nNew prototype", block: true },
      ],
    },
    bodyMarkupChanged: false,
    addedTags: [],
    removedTags: [],
    tagOrderChanged: false,
  })
  const earlier = { title: "Roadmap", description: "<p>Internal draft</p><p>New prototype</p>", tags: [] }
  const later = { title: "Roadmap", description: "<p>Published release</p><p>Customer onboarding</p>", tags: [] }

  const { container } = render(<NoteVersionComparison from={later} to={earlier} fromVersion={4} toVersion={2} />)

  expect(compareNoteVersions).toHaveBeenCalledWith(later, earlier)
  expect(screen.getByRole("heading", { name: "Version 4 → Version 2" })).toBeTruthy()
  expect(screen.getByText("Added", { selector: "header span" })).toBeTruthy()
  expect(screen.getByText("Removed", { selector: "header span" })).toBeTruthy()

  expect(screen.getByText("Stable heading").classList.contains("block")).toBe(true)
  const removed = container.querySelector("del.block")
  expect(removed?.textContent).toBe("Removed Published release\nCustomer onboarding")
  const added = container.querySelector("ins.block")
  expect(added?.textContent).toBe("Added Internal draft\nNew prototype")
})
