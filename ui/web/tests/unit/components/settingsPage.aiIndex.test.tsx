import { fireEvent, render, screen } from "@testing-library/react"

import { SettingsPage } from "@/components/features/settings/SettingsPage"
import { SupabaseTestProvider } from "@ui/web/providers/SupabaseProvider"
import { useNoteAuth } from "@ui/web/hooks/useNoteAuth"
import { readSettingsReturnState, saveSettingsReturnState } from "@ui/web/lib/settingsNavigationState"

const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams("tab=ai-index"),
}))

jest.mock("@ui/web/hooks/useNoteAuth", () => ({
  useNoteAuth: jest.fn(),
}))

jest.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}))

jest.mock("@/components/features/settings/AIIndexTab", () => ({
  AIIndexTab: () => <div>AI Index Tab Content</div>,
}))

jest.mock("@/components/features/settings/ApiKeysSettingsPanel", () => ({
  ApiKeysSettingsPanel: () => <div>API keys panel</div>,
}))

jest.mock("@/components/features/settings/DeleteAccountPanel", () => ({
  DeleteAccountPanel: () => <div>Delete account panel</div>,
}))

jest.mock("@/components/features/settings/WordPressSettingsPanel", () => ({
  WordPressSettingsPanel: () => <div>WordPress panel</div>,
}))

describe("SettingsPage AI Index tab", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    mockPush.mockClear()
    mockReplace.mockClear()
    jest.mocked(useNoteAuth).mockReturnValue({
      user: { email: "user@example.com" } as never,
      loading: false,
      deleteAccountLoading: false,
      handleDeleteAccount: jest.fn(),
    } as never)
  })

  it("renders the AI Index tab content when tab=ai-index", () => {
    render(
      <SupabaseTestProvider supabase={{} as never}>
        <SettingsPage />
      </SupabaseTestProvider>
    )

    expect(screen.getByText("AI Index Tab Content")).toBeTruthy()
    const heading = screen.queryByRole("heading", { name: "AI Index" })
    expect(heading).not.toBeNull()
    expect(heading?.className).toContain("sr-only")
  })

  it("brings an initially selected mobile settings tab into view", () => {
    const rect = (left: number, right: number) => ({
      x: left, y: 0, left, right, top: 0, bottom: 40, width: right - left, height: 40, toJSON: () => ({}),
    }) as DOMRect
    const geometry = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.className.includes("overflow-x-auto")) return rect(0, 300)
      if (this.textContent === "AI Index" && this.parentElement?.className.includes("overflow-x-auto")) return rect(600, 680)
      return rect(0, 0)
    })
    try {
      render(<SupabaseTestProvider supabase={{} as never}><SettingsPage /></SupabaseTestProvider>)
      const mobileTab = screen.getAllByRole("button", { name: "AI Index" }).at(-1)
      expect(mobileTab?.parentElement?.scrollLeft).toBe(380)
    } finally {
      geometry.mockRestore()
    }
  })

  it("reveals the selected settings tab after resizing from desktop to mobile", () => {
    const rect = (left: number, right: number) => ({
      x: left, y: 0, left, right, top: 0, bottom: 40, width: right - left, height: 40, toJSON: () => ({}),
    }) as DOMRect
    let mobile = false
    const geometry = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (!mobile) return rect(0, 0)
      if (this.className.includes("overflow-x-auto")) return rect(0, 300)
      if (this.textContent === "AI Index" && this.parentElement?.className.includes("overflow-x-auto")) return rect(600, 680)
      return rect(0, 0)
    })
    try {
      render(<SupabaseTestProvider supabase={{} as never}><SettingsPage /></SupabaseTestProvider>)
      const mobileTab = screen.getAllByRole("button", { name: "AI Index" }).at(-1)
      mobile = true
      fireEvent.resize(window)
      expect(mobileTab?.parentElement?.scrollLeft).toBe(380)
    } finally {
      geometry.mockRestore()
    }
  })

  it("does not redirect while the authenticated session is reaching the settings hook", () => {
    jest.mocked(useNoteAuth).mockReturnValue({ user: null, loading: false } as never)
    render(
      <SupabaseTestProvider supabase={{} as never} user={{ id: 'signed-in-user' } as never}>
        <SettingsPage />
      </SupabaseTestProvider>,
    )

    expect(mockReplace).not.toHaveBeenCalledWith('/')
  })

  it("redirects when there is no authenticated session", () => {
    jest.mocked(useNoteAuth).mockReturnValue({ user: null, loading: false } as never)
    render(<SupabaseTestProvider supabase={{} as never}><SettingsPage /></SupabaseTestProvider>)

    expect(mockReplace).toHaveBeenCalledWith('/')
  })

  it.each([
    ["mobile-nav-notes", "/?view=notes"],
    ["mobile-nav-tags", "/?view=tags"],
    ["mobile-action-search", "/?search=open"],
  ])("honors explicit navigation from settings: %s", (button, destination) => {
    saveSettingsReturnState({ returnPath: "/", notesUiState: {
      selectedNoteId: null, selectedNote: null, isEditing: true,
      isSearchPanelOpen: false, searchQuery: "", filterByTag: null,
    } }, 'test-user')
    render(<SupabaseTestProvider supabase={{} as never}><SettingsPage /></SupabaseTestProvider>)

    fireEvent.click(screen.getByTestId(button))

    expect(mockPush).toHaveBeenCalledWith(destination)
    expect(readSettingsReturnState('test-user')).toBeNull()
  })
})
