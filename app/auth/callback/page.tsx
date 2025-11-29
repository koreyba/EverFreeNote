"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient()

        // Extract code from URL query parameters
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get("code")

        if (!code) {
          console.error("No authorization code found in callback URL")
          router.push(`/?error=auth_callback_failed&message=${encodeURIComponent("No authorization code provided")}`)
          return
        }

        // exchangeCodeForSession will automatically use code_verifier from localStorage
        // that was saved by createBrowserClient during signInWithOAuth()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

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

        // Safely access session after error check - data may be null on error
        const session = data?.session
        if (!session) {
          console.error("No session returned after code exchange")
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
