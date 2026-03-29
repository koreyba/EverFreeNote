import { render, screen } from "@testing-library/react"

import { SettingsPage } from "@/components/features/settings/SettingsPage"
import { SupabaseTestProvider } from "@ui/web/providers/SupabaseProvider"
import { useNoteAuth } from "@ui/web/hooks/useNoteAuth"

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

    expect(screen.getByRole("heading", { name: "AI Index" })).toBeTruthy()
    expect(screen.getAllByText("Inspect indexed, stale, and unindexed notes without opening them one by one.").length).toBeGreaterThan(0)
    expect(screen.getByText("AI Index Tab Content")).toBeTruthy()
  })
})
