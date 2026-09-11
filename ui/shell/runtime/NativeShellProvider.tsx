"use client"

import { useEffect, type ReactNode } from "react"
import { App } from "@capacitor/app"
import { Browser } from "@capacitor/browser"
import { useRouter } from "next/navigation"

import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { isNativeShell, shellScheme } from "@ui/shell/runtime/platform"

/**
 * Wires the web app to the Android shell. Renders nothing and does nothing at all in
 * a browser, so it is safe to mount unconditionally in the root layout.
 *
 * Two things need native handling:
 *
 *  - OAuth return. Sign-in happens in a Custom Tab, which cannot navigate back into
 *    the app on its own. Android delivers the custom-scheme redirect here instead,
 *    and the code is exchanged in this WebView — which is where Supabase stored the
 *    PKCE verifier when the flow started.
 *  - Hardware back. Without this the button closes the app from any screen.
 */
export function NativeShellProvider({ children }: { children: ReactNode }) {
  const { supabase } = useSupabase()
  const router = useRouter()

  useEffect(() => {
    if (!isNativeShell()) return

    const scheme = shellScheme()
    let disposed = false
    const listeners: Array<{ remove: () => Promise<void> }> = []

    const handleCallback = async (rawUrl: string) => {
      if (!rawUrl.startsWith(`${scheme}://`)) return

      // The Custom Tab stays open behind the app until closed explicitly.
      await Browser.close().catch(() => {
        // Already closed by the user; nothing to do.
      })

      // Anything can be sent to a registered scheme, not just our provider redirect.
      let url: URL
      try {
        url = new URL(rawUrl)
      } catch {
        return
      }

      const code = url.searchParams.get("code")
      const errorDescription = url.searchParams.get("error_description")

      if (errorDescription) {
        router.replace(`/?error=auth_callback_failed&message=${encodeURIComponent(errorDescription)}`)
        return
      }

      if (!code) return

      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (disposed) return

      if (error) {
        router.replace(`/?error=auth_callback_failed&message=${encodeURIComponent(error.message)}`)
        return
      }

      router.replace("/")
    }

    // addListener resolves asynchronously, so a listener can arrive after cleanup has
    // already run; without this it would stay registered for the life of the process.
    const track = (pending: Promise<{ remove: () => Promise<void> }>) => {
      void pending.then((listener) => {
        if (disposed) void listener.remove()
        else listeners.push(listener)
      })
    }

    track(
      App.addListener("appUrlOpen", (event) => {
        handleCallback(event.url).catch((error: unknown) => {
          console.error("[shell] failed to handle deep link", error)
        })
      })
    )

    track(
      App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          globalThis.history.back()
        } else {
          void App.exitApp()
        }
      })
    )

    return () => {
      disposed = true
      for (const listener of listeners) void listener.remove()
    }
  }, [router, supabase])

  return <>{children}</>
}
