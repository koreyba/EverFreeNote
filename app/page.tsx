"use client"

import { Loader2 } from "lucide-react"

import { AuthShell } from "@/components/features/auth/AuthShell"
import { NotesShell } from "@/components/features/notes/NotesShell"
import { useNoteAppController } from "@/hooks/useNoteAppController"

export default function App() {
  const controller = useNoteAppController()
  const { user, loading, handleTestLogin, handleSkipAuth, handleSignInWithGoogle } = controller

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
        onTestLogin={handleTestLogin}
        onSkipAuth={handleSkipAuth}
        onGoogleAuth={handleSignInWithGoogle}
      />
    )
  }

  return <NotesShell controller={controller} />
}
