import { render, screen, waitFor } from "@testing-library/react"

import PerfHarnessPage from "@/app/perf-harness/page"

/**
 * The harness exists so on-device measurements are comparable between runs, which only
 * holds if it renders the same notes every time. These tests pin that, and the flag that
 * keeps it out of normal builds.
 */
function renderAt(search: string) {
  globalThis.history.replaceState({}, "", `/perf-harness/${search}`)
  return render(<PerfHarnessPage />)
}

const originalFlag = process.env.NEXT_PUBLIC_ENABLE_PERF_HARNESS

beforeEach(() => {
  process.env.NEXT_PUBLIC_ENABLE_PERF_HARNESS = "true"
})

afterEach(() => {
  if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_ENABLE_PERF_HARNESS
  else process.env.NEXT_PUBLIC_ENABLE_PERF_HARNESS = originalFlag
})

describe("perf harness", () => {
  it("renders the note count asked for in the URL", async () => {
    renderAt("?n=12")

    await waitFor(() => expect(screen.getByText(/perf harness · 12 notes/)).toBeTruthy())
  })

  it("generates the same notes every run, so measurements stay comparable", async () => {
    const first = renderAt("?n=8")
    await waitFor(() => expect(screen.getByText(/8 notes/)).toBeTruthy())
    const firstRender = first.container.textContent

    first.unmount()
    const second = renderAt("?n=8")
    await waitFor(() => expect(screen.getByText(/8 notes/)).toBeTruthy())

    expect(firstRender).toBeTruthy()
    expect(second.container.textContent).toEqual(firstRender)
  })

  it.each(["?n=0", "?n=-5", "?n=abc", ""])("falls back to a usable count for %p", async (search) => {
    renderAt(search)

    await waitFor(() => expect(screen.getByText(/perf harness · 1000 notes/)).toBeTruthy())
  })

  it("renders nothing when the flag is off, so normal builds ship an empty page", () => {
    process.env.NEXT_PUBLIC_ENABLE_PERF_HARNESS = "false"

    expect(renderAt("?n=10").container.textContent).toBe("")
  })
})
