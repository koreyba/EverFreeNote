"use client"

import { createContext, Fragment, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react"
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
  /** Changes when the account identity changes, not on same-account refresh. */
  sessionKey?: string | number
  getSessionSnapshot?: () => { userId: string | null; epoch: number }
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
  const [sessionEpoch, setSessionEpoch] = useState(0)
  const sessionRef = useRef<{ userId: string | null; epoch: number }>({ userId: null, epoch: 0 })
  const getSessionSnapshot = useCallback(() => sessionRef.current, [])
  const setSessionUser = useCallback((nextUser: User | null) => {
    const userId = nextUser?.id ?? null
    if (sessionRef.current.userId !== userId) {
      sessionRef.current = { userId, epoch: sessionRef.current.epoch + 1 }
      setSessionEpoch(sessionRef.current.epoch)
    }
    setUser(nextUser)
  }, [])

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
        setSessionUser(savedUser)
        setLoading(false)

        // Refresh can wait on an unreachable server; it must never gate local access.
        const { data: { session }, error } = await supabase.auth.getSession()
        if (disposed || authRevision !== 0 || error) return
        const sessionUser = sessionUserForProject(session, supabaseConfig.url)
        setSessionUser(sessionUser)
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
        setSessionUser(sessionUserForProject(session, supabaseConfig.url))
        setLoading(false)
      }
    )

    void checkAuth()

    return () => {
      disposed = true
      subscription.unsubscribe()
      globalThis.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [setSessionUser, supabase])

  return (
    <SupabaseContext.Provider value={{ supabase, user, loading, sessionKey: sessionEpoch, getSessionSnapshot }}>
      {children}
    </SupabaseContext.Provider>
  )
}

/** Isolates all descendant state and query clients across account sessions. */
export function AccountSessionBoundary({ children }: { children: React.ReactNode }) {
  const { user, sessionKey } = useSupabase()
  return <Fragment key={sessionKey ?? user?.id ?? 'signed-out'}>{children}</Fragment>
}

function TestQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
  const sessionRef = useRef<{ userId: string | null; epoch: number }>({ userId: user?.id ?? null, epoch: 0 })
  useLayoutEffect(() => {
    const userId = user?.id ?? null
    if (sessionRef.current.userId !== userId) sessionRef.current = { userId, epoch: sessionRef.current.epoch + 1 }
  }, [user?.id])
  const getSessionSnapshot = useCallback(() => sessionRef.current, [])
  return (
    <SupabaseContext.Provider value={{ supabase, user, loading, sessionKey: user?.id ?? 'signed-out', getSessionSnapshot }}>
      <AccountSessionBoundary><TestQueryProvider>{children}</TestQueryProvider></AccountSessionBoundary>
    </SupabaseContext.Provider>
  )
}
