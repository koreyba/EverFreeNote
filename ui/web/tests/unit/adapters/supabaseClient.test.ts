import { buildBrowserSupabaseStorageKey } from "@ui/web/adapters/supabaseClient"

describe("buildBrowserSupabaseStorageKey", () => {
  it("includes host and port so local Supabase stacks do not share auth state", () => {
    expect(buildBrowserSupabaseStorageKey("http://127.0.0.1:54321")).toBe(
      "everfreenote-auth-http--127-0-0-1-54321-root"
    )
    expect(buildBrowserSupabaseStorageKey("http://127.0.0.1:55321")).toBe(
      "everfreenote-auth-http--127-0-0-1-55321-root"
    )
  })

  it("falls back to a sanitized raw URL when parsing fails", () => {
    expect(buildBrowserSupabaseStorageKey("not a url")).toBe("everfreenote-auth-not-a-url")
  })
})
