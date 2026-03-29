"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { webSupabaseClientFactory } from "@ui/web/adapters/supabaseClient"
import { webStorageAdapter } from "@ui/web/adapters/storage"
import { supabaseConfig } from "@ui/web/config"
import type { SupabaseClient, User } from "@supabase/supabase-js"

type SupabaseContextType = {
  supabase: SupabaseClient
  user: User | null
  loading: boolean
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

function readTokenIssuer(accessToken: string | null | undefined) {
  if (!accessToken) return null

  const [, payload] = accessToken.split(".")
  if (!payload) return null

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/")
    const paddedPayload = normalizedPayload.padEnd(normalizedPayload.length + ((4 - normalizedPayload.length % 4) % 4), "=")
    const decodedPayload = JSON.parse(window.atob(paddedPayload)) as { iss?: unknown }
    return typeof decodedPayload.iss === "string" ? decodedPayload.iss : null
  } catch {
    return null
  }
}

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
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = typeof event.reason === "string" ? event.reason : (event.reason?.message as string | undefined)
      if (reason?.includes("Navigator LockManager lock")) {
        // Supabase auth falls back if Web Locks are busy; ignore to avoid debugger breakpoints
        event.preventDefault()
      }
    }
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const expectedIssuer = `${supabaseConfig.url}/auth/v1`
        const tokenIssuer = readTokenIssuer(session?.access_token)

        if (session?.access_token && tokenIssuer && tokenIssuer !== expectedIssuer) {
          await supabase.auth.signOut()
          setUser(null)
          return
        }

        setUser(session?.user || null)
      } catch (error) {
        console.error("Error checking auth session:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
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
