import React from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { SupabaseClient } from "@supabase/supabase-js"

import { useAIIndexNotes } from "@ui/web/hooks/useAIIndexNotes"
import { SupabaseTestProvider } from "@ui/web/providers/SupabaseProvider"

const createWrapper = (supabase: SupabaseClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SupabaseTestProvider
        supabase={supabase}
        user={{ id: "user-1", email: "user@example.com" } as never}
      >
        {children}
      </SupabaseTestProvider>
    )
  }

describe("useAIIndexNotes", () => {
  it("loads paginated AI index rows and exposes next page state", async () => {
    const rpc = jest.fn().mockImplementation(async (_fn: string, params: { page_number: number }) => {
      if (params.page_number === 0) {
        return {
          data: [
            {
              id: "note-1",
              title: "Indexed note",
              updated_at: "2026-03-29T10:00:00Z",
              last_indexed_at: "2026-03-29T10:05:00Z",
              status: "indexed",
              total_count: 3,
            },
            {
              id: "note-2",
              title: "Outdated note",
              updated_at: "2026-03-29T11:00:00Z",
              last_indexed_at: "2026-03-29T09:00:00Z",
              status: "outdated",
              total_count: 3,
            },
          ],
          error: null,
        }
      }

      return {
        data: [
          {
            id: "note-3",
            title: null,
            updated_at: "2026-03-28T10:00:00Z",
            last_indexed_at: null,
            status: "not_indexed",
            total_count: 3,
          },
        ],
        error: null,
      }
    })

    const supabase = { rpc } as unknown as SupabaseClient
    const { result } = renderHook(() => useAIIndexNotes("all"), {
      wrapper: createWrapper(supabase),
    })

    await waitFor(() => {
      expect(result.current.data?.pages[0]?.notes).toHaveLength(2)
      expect(result.current.hasNextPage).toBe(true)
    })

    expect(rpc).toHaveBeenCalledWith("get_ai_index_notes", {
      filter_status: "all",
      page_number: 0,
      page_size: 50,
      search_query: null,
      search_ts_query: null,
      search_language: null,
    })

    await act(async () => {
      await result.current.fetchNextPage()
    })

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2)
      expect(result.current.data?.pages[1]?.notes[0]?.title).toBe("")
      expect(result.current.hasNextPage).toBe(false)
    })
  })

  it("passes the selected filter through to the RPC request", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    })

    const supabase = { rpc } as unknown as SupabaseClient
    renderHook(() => useAIIndexNotes("outdated"), {
      wrapper: createWrapper(supabase),
    })

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith("get_ai_index_notes", {
        filter_status: "outdated",
        page_number: 0,
        page_size: 50,
        search_query: null,
        search_ts_query: null,
        search_language: null,
      })
    })
  })

  it("passes ordinary search params through to the RPC request", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    })

    const supabase = { rpc } as unknown as SupabaseClient
    renderHook(() => useAIIndexNotes("all", "hello world"), {
      wrapper: createWrapper(supabase),
    })

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith("get_ai_index_notes", {
        filter_status: "all",
        page_number: 0,
        page_size: 50,
        search_query: "hello world",
        search_ts_query: "hello:* & world:*",
        search_language: "english",
      })
    })
  })

  it("surfaces actionable migration guidance when PostgREST schema cache is stale", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function public.get_ai_index_notes(filter_status, page_number, page_size, search_language, search_query, search_ts_query) in the schema cache",
        details: "Searched for the function public.get_ai_index_notes with parameters filter_status, page_number, page_size, search_language, search_query, search_ts_query or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.",
        hint: "Perhaps you meant to call the function public.match_notes",
      },
    })

    const supabase = { rpc } as unknown as SupabaseClient
    const { result } = renderHook(() => useAIIndexNotes("all", "hello world"), {
      wrapper: createWrapper(supabase),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toContain("AI Index database function is out of date.")
      expect(result.current.error?.message).toContain("20260329000002_add_search_to_ai_index_notes_rpc.sql")
      expect(result.current.error?.message).toContain("Code: PGRST202")
    })
  })
})
