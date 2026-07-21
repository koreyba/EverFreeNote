import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { AuthService } from '@core/services/auth'
import { webStorageAdapter } from '@ui/web/adapters/storage'
import { webOAuthRedirectUri } from '@ui/web/config'
import { featureFlags } from '@ui/web/featureFlags'

const testAuthEmail = process.env.NEXT_PUBLIC_TEST_AUTH_EMAIL ?? ''
const testAuthPassword = process.env.NEXT_PUBLIC_TEST_AUTH_PASSWORD ?? ''
const skipAuthEmail = process.env.NEXT_PUBLIC_SKIP_AUTH_EMAIL ?? ''
const skipAuthPassword = process.env.NEXT_PUBLIC_SKIP_AUTH_PASSWORD ?? ''

export type NoteAuthConfig = {
    testAuthEnabled: boolean
    testAuthEmail: string
    testAuthPassword: string
    skipAuthEmail: string
    skipAuthPassword: string
}

const runtimeNoteAuthConfig: NoteAuthConfig = {
    testAuthEnabled: featureFlags.testAuth,
    testAuthEmail,
    testAuthPassword,
    skipAuthEmail,
    skipAuthPassword,
}

export function useNoteAuth(config: NoteAuthConfig = runtimeNoteAuthConfig) {
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
        if (!config.testAuthEnabled) {
            toast.error('Test authentication is disabled in this environment')
            return
        }

        if (!config.testAuthEmail || !config.testAuthPassword) {
            toast.error('Test auth credentials are not configured')
            return
        }

        try {
            setAuthLoading(true)
            const { data, error } = await authService.signInWithPassword(
                config.testAuthEmail,
                config.testAuthPassword
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
        if (!config.testAuthEnabled) {
            toast.error('Test authentication is disabled in this environment')
            return
        }

        if (!config.skipAuthEmail || !config.skipAuthPassword) {
            toast.error('Skip-auth credentials are not configured')
            return
        }

        try {
            setAuthLoading(true)
            const { data, error } = await authService.signInWithPassword(
                config.skipAuthEmail,
                config.skipAuthPassword
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

    const handleSignOut = async (callback?: () => void) => {
        try {
            await authService.signOut()
            await webStorageAdapter.removeItem('testUser')
            setUser(null)
            queryClient.removeQueries({ queryKey: ['notes'] })
            if (typeof callback === 'function') callback()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    const handleDeleteAccount = async (callback?: () => void) => {
        if (!user) return
        setDeleteAccountLoading(true)
        try {
            await authService.deleteAccount()

            toast.success("Account deleted")
            await handleSignOut(callback)
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
