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

  it("normalizes nested path segments without leaving leading or trailing separators", () => {
    expect(buildBrowserSupabaseStorageKey("http://127.0.0.1:54321//auth//v1/")).toBe(
      "everfreenote-auth-http--127-0-0-1-54321-auth-v1"
    )
  })

  it("throws a descriptive error when URL is empty", () => {
    expect(() => buildBrowserSupabaseStorageKey("")).toThrow(
      "Missing required parameter 'NEXT_PUBLIC_SUPABASE_URL'. Please check if it is set in your .env / .env.local file."
    )
  })
})

describe("webSupabaseClientFactory", () => {
  it("throws descriptive error listing missing env parameters", () => {
    const { webSupabaseClientFactory } = require("@ui/web/adapters/supabaseClient")
    expect(() => webSupabaseClientFactory.createClient({ url: "", anonKey: "" })).toThrow(
      "Missing required Supabase configuration parameter(s): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY. Please check if they are set in your .env / .env.local file."
    )
  })
})
