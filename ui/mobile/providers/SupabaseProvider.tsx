import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { SupabaseClient, User, Session } from '@supabase/supabase-js'
import { getSupabaseConfig, supabaseClientFactory, secureStorageAdapter } from '@ui/mobile/adapters'
import { mobileSyncService } from '../services/sync'
import { AuthService } from '@core/services/auth'

interface SupabaseContextValue {
  client: SupabaseClient
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined)

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const config = getSupabaseConfig()
    return supabaseClientFactory.createClient(config, {
      storage: secureStorageAdapter,
    })
  })

  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const signOut = async () => {
    await client.auth.signOut()
  }

  const deleteAccount = async () => {
    const authService = new AuthService(client)
    await authService.deleteAccount()
    await signOut()
  }

  useEffect(() => {
    // Get initial session
    void client.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session) mobileSyncService.init(client)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session) mobileSyncService.init(client)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [client])

  return (
    <SupabaseContext.Provider value={{ client, user, session, loading, signOut, deleteAccount }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase(): SupabaseContextValue {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider')
  }
  return context
}

export function useAuth() {
  const { user, session, loading, signOut, deleteAccount } = useSupabase()
  return { user, session, loading, isAuthenticated: !!user, signOut, deleteAccount }
}
