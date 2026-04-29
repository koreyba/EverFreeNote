"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

import { PublicNoteShareService, type PublicNote } from "@core/services/publicNoteShare"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { PublicNotePage } from "@/components/features/public/PublicNotePage"
import { PublicPageHeader } from "@/components/features/public/PublicPageHeader"

type LoadState =
  | { status: "loading" }
  | { status: "found"; note: PublicNote }
  | { status: "not-found" }
  | { status: "error"; message: string }

export function PublicSharePageClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const { supabase } = useSupabase()
  const service = React.useMemo(() => new PublicNoteShareService(supabase), [supabase])
  const [state, setState] = React.useState<LoadState>({ status: "loading" })

  React.useEffect(() => {
    let isActive = true

    async function loadNote() {
      if (!token.trim()) {
        setState({ status: "not-found" })
        return
      }

      setState({ status: "loading" })

      try {
        const note = await service.getPublicNoteByToken(token)
        if (!isActive) return
        setState(note ? { status: "found", note } : { status: "not-found" })
      } catch (error) {
        if (!isActive) return
        const message = error instanceof Error ? error.message : "Could not load this shared note."
        setState({ status: "error", message })
      }
    }

    loadNote().catch(() => undefined)

    return () => {
      isActive = false
    }
  }, [service, token])

  if (state.status === "found") {
    return <PublicNotePage note={state.note} />
  }

  if (state.status === "error") {
    return <PublicNoteMessage title="Could not load note" message={state.message} />
  }

  if (state.status === "not-found") {
    return (
      <PublicNoteMessage
        title="Note not available"
        message="This shared note link is missing, inactive, or no longer available."
      />
    )
  }

  return <PublicNoteMessage title="Loading shared note" message="One moment while the note opens." />
}

function PublicNoteMessage({ title, message }: Readonly<{ title: string; message: string }>) {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <PublicPageHeader />
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-2xl flex-col items-center justify-center px-6 pb-16 text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </div>
    </main>
  )
}
