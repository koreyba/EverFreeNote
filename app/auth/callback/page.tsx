"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { webSupabaseClientFactory } from "@ui/web/adapters/supabaseClient"
import { webStorageAdapter } from "@ui/web/adapters/storage"
import { supabaseConfig } from "@ui/web/config"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Ensure we're in browser environment
        if (typeof window === 'undefined') {
          console.error("Auth callback can only run in browser")
          return
        }

        const supabase = webSupabaseClientFactory.createClient(
          supabaseConfig,
          { storage: webStorageAdapter }
        )

        // If Supabase already processed the callback (detectSessionInUrl runs internally)
        // and we already have a session, just redirect without re-exchanging the code.
        const { data: existingSession } = await supabase.auth.getSession()
        if (existingSession.session) {
          router.push("/")
          return
        }

        // Extract code from URL query parameters
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get("code")

        if (!code) {
          console.error("No authorization code found in callback URL")
          router.push(`/?error=auth_callback_failed&message=${encodeURIComponent("No authorization code provided")}`)
          return
        }

        // Check for code_verifier in localStorage (Supabase stores it with key pattern: sb-{project-ref}-auth-code-verifier)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
        const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || ''
        const codeVerifierKey = projectRef ? `sb-${projectRef}-auth-code-verifier` : null
        
        // Log all localStorage keys that might contain code_verifier
        const allStorageKeys = Object.keys(localStorage).filter(key => key.includes('code-verifier') || key.includes('auth'))
        console.log('LocalStorage keys related to auth:', allStorageKeys)
        
        let hasCodeVerifier = true
        if (codeVerifierKey) {
          const codeVerifier = localStorage.getItem(codeVerifierKey)
          hasCodeVerifier = !!codeVerifier
          console.log('Code verifier found:', hasCodeVerifier ? 'YES' : 'NO', 'Key:', codeVerifierKey)
        }

        // If no code verifier is available, Supabase likely already handled the exchange.
        if (!hasCodeVerifier) {
          const { data: postCheck } = await supabase.auth.getSession()
          if (postCheck.session) {
            router.push("/")
            return
          }
          console.error("No code_verifier found in storage; skipping exchange to avoid 400 error.")
          router.push(`/?error=auth_callback_failed&message=${encodeURIComponent("Auth session could not be restored")}`)
          return
        }

        // exchangeCodeForSession will automatically use code_verifier from localStorage
        // that was saved by createBrowserClient during signInWithOAuth()
        const result = await supabase.auth.exchangeCodeForSession(code)

        // Safely destructure - result.data may be null/undefined on error
        const error = result.error
        const data = result.data

        if (error) {
          console.error("Error exchanging code for session:", error)
          console.error("Error details:", {
            message: error.message,
            status: error.status,
            name: error.name
          })
          router.push(`/?error=auth_callback_failed&message=${encodeURIComponent(error.message)}`)
          return
        }

        // Safely access session after error check - data may be null/undefined on error
        const session = data?.session
        if (!session) {
          console.error("No session returned after code exchange", { data, error })
          router.push(`/?error=auth_callback_failed&message=${encodeURIComponent("Failed to establish session")}`)
          return
        }

        // Redirect to home page
        router.push("/")
      } catch (error) {
        // Catch any unexpected errors (e.g., TypeError from destructuring)
        console.error("Unexpected error in auth callback:", error)
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
        router.push(`/?error=auth_callback_failed&message=${encodeURIComponent(errorMessage)}`)
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  )
}
