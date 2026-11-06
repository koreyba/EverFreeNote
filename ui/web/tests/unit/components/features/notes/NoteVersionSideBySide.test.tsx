import { render, screen, within } from "@testing-library/react"
import { NoteVersionSideBySide } from "@/components/features/notes/NoteVersionSideBySide"

it("keeps the newer From version on the left and highlights changes towards the older To version", () => {
  const earlier = {
    title: "Trip draft",
    description: "<p>Weekend plan</p><p>Take the bus.</p><p>Bring a map.</p><p>Emergency contact</p>",
    tags: ["travel", "ideas"],
  }
  const later = {
    title: "Trip itinerary",
    description: "<p>Weekend plan</p><p>Catch the train.</p><p>Download the route.</p><p>Emergency contact</p>",
    tags: ["travel", "booked"],
  }
  render(<NoteVersionSideBySide from={later} to={earlier} fromVersion={5} toVersion={3} />)

  const left = screen.getByRole("article", { name: "Version 5" })
  const right = screen.getByRole("article", { name: "Version 3" })
  expect(screen.getAllByRole("article")).toEqual([left, right])
  expect(within(left).getByText("From")).toBeTruthy()
  expect(within(right).getByText("To")).toBeTruthy()
  expect(left.textContent).toContain("Trip itinerary")
  expect(right.textContent).toContain("Trip draft")
  expect(left.textContent?.replace(/\s+/g, " ")).toContain("Weekend plan Catch the train. Download the route. Emergency contact")
  expect(right.textContent?.replace(/\s+/g, " ")).toContain("Weekend plan Take the bus. Bring a map. Emergency contact")
  expect(within(left).getByText("travel").textContent).toBe("travel")
  expect(within(right).getByText("travel").textContent).toBe("travel")
  expect(Array.from(left.querySelectorAll("del"), (part) => part.textContent?.trim())).toEqual([
    "itinerary", "booked", "Catch the train.\nDownload the route.",
  ])
  expect(Array.from(right.querySelectorAll("ins"), (part) => part.textContent?.trim())).toEqual([
    "draft", "ideas", "Take the bus.\nBring a map.",
  ])
  expect(left.querySelector("ins")).toBeNull()
  expect(right.querySelector("del")).toBeNull()
})

it("shows original formatting and attachments when only markup changed", () => {
  const earlier = {
    title: null,
    description: '<p><strong>Map</strong><img src="/old-map.png" alt="Route"></p>',
    tags: null,
  }
  const later = {
    title: null,
    description: '<p><em>Map</em><img src="/new-map.png" alt="Route"></p>',
    tags: null,
  }
  render(<NoteVersionSideBySide from={earlier} to={later} fromVersion={3} toVersion={5} />)

  const left = screen.getByRole("article", { name: "Version 3" })
  const right = screen.getByRole("article", { name: "Version 5" })
  expect(left.querySelector("strong")?.textContent).toBe("Map")
  expect(right.querySelector("em")?.textContent).toBe("Map")
  expect(within(left).getByRole("img", { name: "Route" }).getAttribute("src")).toBe("/old-map.png")
  expect(within(right).getByRole("img", { name: "Route" }).getAttribute("src")).toBe("/new-map.png")
  expect(screen.queryByText("Formatting, links, or embedded content changed.")).not.toBeNull()
})

it("keeps both complete snapshots visible when the detail limit is reached", () => {
  const earlierText = `${"draft ".repeat(550)}original ending`
  const laterText = `${"saved ".repeat(550)}final ending`
  render(<NoteVersionSideBySide
    from={{ title: null, description: `<p>${earlierText}</p>`, tags: null }}
    to={{ title: null, description: `<p>${laterText}</p>`, tags: null }}
    fromVersion={3}
    toVersion={5}
  />)

  const left = screen.getByRole("article", { name: "Version 3" })
  const right = screen.getByRole("article", { name: "Version 5" })
  expect(left.querySelector("p")?.textContent).toBe(earlierText)
  expect(right.querySelector("p")?.textContent).toBe(laterText)
  expect(screen.queryByText("Detailed highlights are unavailable for this comparison.")).not.toBeNull()
})
