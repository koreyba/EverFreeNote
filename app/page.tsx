"use client"

import { useEffect, useEffectEvent } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AuthShell } from "@/components/features/auth/AuthShell"
import { NotesShell } from "@/components/features/notes/NotesShell"
import { useNoteAppController } from "@ui/web/hooks/useNoteAppController"
import { featureFlags } from "@ui/web/featureFlags"
import { consumeSettingsReturnState } from "@ui/web/lib/settingsNavigationState"
import {
  clearActiveSettingsNoteReturnPath,
  consumeAIIndexPendingNoteState,
  saveActiveSettingsNoteReturnPath,
} from "@ui/web/lib/aiIndexNavigationState"

export default function App() {
  const controller = useNoteAppController()
  const { user, loading, handleTestLogin, handleSkipAuth, handleSignInWithGoogle } = controller

  const restoreUiState = useEffectEvent((state: Parameters<typeof controller.restoreUiState>[0]) => {
    controller.restoreUiState(state).catch(() => {
      // The controller already surfaces restore failures to the user.
    })
  })

  // Show auth error from URL params
  useEffect(() => {
    if (globalThis.window === undefined) return

    const params = new URLSearchParams(globalThis.location.search)
    const error = params.get('error')
    const message = params.get('message')

    if (error === 'auth_callback_failed') {
      toast.error(`Authentication failed: ${message || 'Unknown error'}`)
      // Clean up URL
      globalThis.history.replaceState({}, '', '/')
    }
  }, [])

  useEffect(() => {
    if (loading || !user) return

    const returnState = consumeSettingsReturnState()
    if (!returnState) return

    clearActiveSettingsNoteReturnPath()
    restoreUiState(returnState.notesUiState)
  }, [loading, user])

  useEffect(() => {
    if (loading || !user) return

    const pendingNoteState = consumeAIIndexPendingNoteState()
    if (!pendingNoteState) return

    saveActiveSettingsNoteReturnPath(pendingNoteState.returnPath)
    restoreUiState({
      selectedNoteId: pendingNoteState.noteId,
      selectedNote: null,
      isEditing: false,
      isSearchPanelOpen: false,
      searchQuery: '',
      filterByTag: null,
    })
  }, [loading, user])

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
