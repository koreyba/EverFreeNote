"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { browser } from "@/lib/adapters/browser"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      const search = browser.location.search || (typeof window !== "undefined" ? window.location.search : "")
      const code = new URLSearchParams(search).get("code")

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error) {
          console.error("Error exchanging code for session:", error)
          router.push("/?error=auth_callback_failed")
          return
        }
      }

      // Redirect to home page
      router.push("/")
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
