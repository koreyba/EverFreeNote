import { render, screen } from "@testing-library/react"

import { PublicNotePage } from "@/components/features/public/PublicNotePage"

jest.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button" aria-label="Toggle theme" />,
}))

describe("PublicNotePage", () => {
  it("renders title, sanitized content, non-clickable tags, and the public theme toggle", () => {
    render(
      <PublicNotePage
        note={{
          token: "abc123",
          title: "Shared Article",
          description: '<p>Hello <strong>reader</strong></p><script>alert("xss")</script>',
          tags: ["alpha", "beta"],
          created_at: "2026-04-28T10:00:00.000Z",
          updated_at: "2026-04-28T10:00:00.000Z",
        }}
      />
    )

    expect(screen.getByRole("heading", { name: "Shared Article" })).toBeTruthy()
    expect(screen.getByText("reader")).toBeTruthy()
    expect(screen.getByText("alpha")).toBeTruthy()
    expect(screen.getByText("beta")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeTruthy()
    expect(screen.getByTestId("public-page-header").className).toContain("sticky")
    expect(screen.getByTestId("public-page-header").className).toContain("top-0")
    expect(screen.queryByText('alert("xss")')).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.queryByRole("searchbox")).toBeNull()
    expect(screen.queryByText("Edit")).toBeNull()
    expect(screen.queryByText("Delete")).toBeNull()
  })
})
