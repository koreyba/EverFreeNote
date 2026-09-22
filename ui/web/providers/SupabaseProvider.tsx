"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { webSupabaseClientFactory } from "@ui/web/adapters/supabaseClient"
import { webStorageAdapter } from "@ui/web/adapters/storage"
import { supabaseConfig } from "@ui/web/config"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { readOfflineSessionUser, sessionUserForProject } from "@ui/web/lib/offlineAuthSession"

type SupabaseContextType = {
  supabase: SupabaseClient
  user: User | null
  loading: boolean
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => {
    return webSupabaseClientFactory.createClient(
      supabaseConfig,
      { storage: webStorageAdapter }
    )
  })
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let disposed = false
    let authRevision = 0
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = typeof event.reason === "string" ? event.reason : (event.reason?.message as string | undefined)
      if (reason?.includes("Navigator LockManager lock")) {
        // Supabase auth falls back if Web Locks are busy; ignore to avoid debugger breakpoints
        event.preventDefault()
      }
    }
    globalThis.addEventListener("unhandledrejection", handleUnhandledRejection)

    const checkAuth = async () => {
      try {
        const savedUser = await readOfflineSessionUser(supabaseConfig.url)
        if (disposed || authRevision !== 0) return
        setUser(savedUser)
        setLoading(false)

        // Refresh can wait on an unreachable server; it must never gate local access.
        const { data: { session }, error } = await supabase.auth.getSession()
        if (disposed || authRevision !== 0 || error) return
        const sessionUser = sessionUserForProject(session, supabaseConfig.url)
        setUser(sessionUser)
        if (session?.access_token && !sessionUser) void supabase.auth.signOut({ scope: "local" })
      } catch (error) {
        console.error("Error checking auth session:", error)
      } finally {
        if (!disposed) setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (disposed || (event === "INITIAL_SESSION" && !session)) return
        authRevision += 1
        setUser(sessionUserForProject(session, supabaseConfig.url))
        setLoading(false)
      }
    )

    void checkAuth()

    return () => {
      disposed = true
      subscription.unsubscribe()
      globalThis.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [supabase])

  return (
    <SupabaseContext.Provider value={{ supabase, user, loading }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider")
  }
  return context
}

// Test-only provider for unit/component tests to inject a mocked Supabase client.
export function SupabaseTestProvider({
  children,
  supabase,
  user = null,
  loading = false,
}: {
  children: React.ReactNode
  supabase: SupabaseClient
  user?: User | null
  loading?: boolean
}) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseContext.Provider value={{ supabase, user, loading }}>
        {children}
      </SupabaseContext.Provider>
    </QueryClientProvider>
  )
}
