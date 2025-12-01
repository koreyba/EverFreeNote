"use client"

import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AuthShell } from "@/components/features/auth/AuthShell"
import { NotesShell } from "@/components/features/notes/NotesShell"
import { useNoteAppController } from "@ui/web/hooks/useNoteAppController"
import { featureFlags } from "@ui/web/featureFlags"

export default function App() {
  const controller = useNoteAppController()
  const { user, loading, handleTestLogin, handleSkipAuth, handleSignInWithGoogle } = controller

  // Show auth error from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const error = params.get('error')
      const message = params.get('message')

      if (error === 'auth_callback_failed') {
        toast.error(`Authentication failed: ${message || 'Unknown error'}`)
        // Clean up URL
        window.history.replaceState({}, '', '/')
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-muted/30 to-accent/20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <AuthShell
        enableTestAuth={featureFlags.testAuth}
        onTestLogin={handleTestLogin}
        onSkipAuth={handleSkipAuth}
        onGoogleAuth={handleSignInWithGoogle}
      />
    )
  }

  return <NotesShell controller={controller} />
}
