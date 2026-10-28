import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export type SignOutPhase = 'idle' | 'checking' | 'confirming' | 'signing-out'

/** Prepare local drafts before clearing the account-bound workspace. */
export function useGuardedSignOut(identity: string | null, prepare: () => Promise<boolean>, signOut: () => Promise<void>) {
  const [phase, setPhase] = useState<SignOutPhase>('idle')
  const attemptRef = useRef(0)
  const busyRef = useRef(false)
  const identityRef = useRef(identity)
  const ownerRef = useRef<string | null>(null)

  useEffect(() => {
    if (identityRef.current === identity) return
    identityRef.current = identity
    attemptRef.current += 1
    busyRef.current = false
    setPhase('idle')
  }, [identity])

  const cancel = useCallback(() => {
    // A slow save may finish after cancellation, but it must never sign out.
    attemptRef.current += 1
    busyRef.current = false
    setPhase('idle')
  }, [])

  const request = useCallback(async () => {
    if (busyRef.current || !identityRef.current) return
    busyRef.current = true
    ownerRef.current = identityRef.current
    const attempt = ++attemptRef.current
    setPhase('checking')
    try {
      let safe = false
      try { safe = await prepare() } catch { /* Unknown state requires confirmation. */ }
      if (attempt !== attemptRef.current || ownerRef.current !== identityRef.current) return
      if (!safe) {
        setPhase('confirming')
        return
      }
      setPhase('signing-out')
      await signOut()
      if (attempt === attemptRef.current) setPhase('idle')
    } catch {
      if (attempt === attemptRef.current) {
        toast.error('Could not sign out. Please try again.')
        setPhase('idle')
      }
    } finally {
      if (attempt === attemptRef.current) busyRef.current = false
    }
  }, [prepare, signOut])

  const discardAndSignOut = useCallback(async () => {
    if (busyRef.current || phase !== 'confirming' || !ownerRef.current || ownerRef.current !== identityRef.current) return
    busyRef.current = true
    const attempt = ++attemptRef.current
    setPhase('signing-out')
    try {
      await signOut()
    } catch {
      toast.error('Could not sign out. Please try again.')
    } finally {
      if (attempt === attemptRef.current) {
        busyRef.current = false
        setPhase('idle')
      }
    }
  }, [phase, signOut])

  return { phase, request, cancel, discardAndSignOut }
}
