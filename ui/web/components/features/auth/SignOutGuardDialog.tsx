'use client'

import * as React from 'react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { SignOutPhase } from '@ui/web/hooks/useGuardedSignOut'

export function SignOutGuardDialog({ phase, onCancel, onDiscard, pendingSave = false }: {
  phase: SignOutPhase
  onCancel: () => void
  onDiscard: () => void
  pendingSave?: boolean
}) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (phase === 'confirming') cancelRef.current?.focus()
  }, [phase])
  const confirming = phase === 'confirming'

  return (
    <AlertDialog open={phase !== 'idle'} onOpenChange={(open) => {
      if (!open && phase !== 'signing-out') onCancel()
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirming ? 'Unsaved changes' : 'Checking your changes'}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirming
              ? 'Some notes have unsaved changes or their status could not be checked. Signing out will discard unsaved input in this browser. Keep editing to save it, or discard it and sign out.'
              : 'Waiting for note changes before signing out.'}
            {confirming && pendingSave && ' A save has already started and may still finish; changes it saves will remain.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef} disabled={phase === 'signing-out'} onClick={(event) => {
            event.preventDefault()
            onCancel()
          }}>Keep editing</AlertDialogCancel>
          {confirming && (
            <AlertDialogAction onClick={(event) => { event.preventDefault(); onDiscard() }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard changes and sign out
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
