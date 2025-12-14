import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { AuthService } from '@core/services/auth'
import { webStorageAdapter } from '@ui/web/adapters/storage'
import { webOAuthRedirectUri } from '@ui/web/config'
import { featureFlags } from '@ui/web/featureFlags'

export function useNoteAuth() {
    const { supabase, loading: providerLoading } = useSupabase()
    const queryClient = useQueryClient()

    // -- State --
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [authLoading, setAuthLoading] = useState(false)
    const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)

    const authService = new AuthService(supabase)

    // -- Effects --
    useEffect(() => {
        const checkAuth = async () => {
            await webStorageAdapter.removeItem('testUser')
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user || null)
            setLoading(false)
        }

        checkAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setUser(session?.user || null)
            }
        )

        return () => subscription.unsubscribe()
    }, [supabase])

    // -- Handlers --

    const handleSignInWithGoogle = async () => {
        try {
            const { error } = await authService.signInWithGoogle(webOAuthRedirectUri)
            if (error) console.error('Error signing in:', error)
        } catch (error) {
            console.error('Error signing in:', error)
        }
    }

    const handleTestLogin = async () => {
        if (!featureFlags.testAuth) {
            toast.error('Test authentication is disabled in this environment')
            return
        }

        try {
            setAuthLoading(true)
            const { data, error } = await authService.signInWithPassword(
                'test@example.com',
                'testpassword123'
            )

            if (error) {
                toast.error('Failed to login as test user: ' + error.message)
                setAuthLoading(false)
                return
            }

            if (data?.user) {
                setUser(data.user)
                toast.success('Logged in as test user!')
            }
        } catch {
            toast.error('Failed to login as test user')
        } finally {
            setAuthLoading(false)
        }
    }

    const handleSkipAuth = async () => {
        if (!featureFlags.testAuth) {
            toast.error('Test authentication is disabled in this environment')
            return
        }

        try {
            setAuthLoading(true)
            const { data, error } = await authService.signInWithPassword(
                'skip-auth@example.com',
                'testpassword123'
            )

            if (error) {
                toast.error('Failed to login as skip-auth user: ' + error.message)
                setAuthLoading(false)
                return
            }

            if (data?.user) {
                setUser(data.user)
                toast.success('Logged in as skip-auth user!')
            }
        } catch {
            toast.error('Failed to login as skip-auth user')
        } finally {
            setAuthLoading(false)
        }
    }

    const handleSignOut = async (onSignOut?: () => void) => {
        try {
            await authService.signOut()
            await webStorageAdapter.removeItem('testUser')
            setUser(null)
            queryClient.removeQueries({ queryKey: ['notes'] })
            if (onSignOut) onSignOut()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    const handleDeleteAccount = async (onDelete?: () => void) => {
        if (!user) return
        setDeleteAccountLoading(true)
        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
            if (sessionError || !sessionData.session?.access_token) {
                throw new Error("Unable to get session token for deletion")
            }
            const token = sessionData.session.access_token
            const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
            if (!functionsUrl) {
                throw new Error("Functions URL is not configured (set NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL)")
            }

            const response = await fetch(`${functionsUrl}/functions/v1/delete-account`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ deleteNotes: true }),
            })

            const payload = await response.json().catch(() => ({}))
            if (!response.ok) {
                const message = payload?.error || `Delete function error (${response.status})`
                throw new Error(message)
            }

            toast.success("Account deleted")
            await handleSignOut(onDelete)
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to delete account"
            toast.error(message)
        } finally {
            setDeleteAccountLoading(false)
        }
    }

    const combinedLoading = loading || providerLoading || authLoading

    return {
        user,
        loading: combinedLoading,
        authLoading,
        deleteAccountLoading,
        handleSignInWithGoogle,
        handleTestLogin,
        handleSkipAuth,
        handleSignOut,
        handleDeleteAccount
    }
}