import "./globals.css"
import type { Metadata } from "next"
import type { ReactNode } from "react"

import { ErrorBoundary } from "@/components/ErrorBoundary"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { SupabaseProvider } from "@/lib/providers/SupabaseProvider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "EverFreeNote - Your Personal Note-Taking App",
  description: "Secure, simple, and synced note-taking powered by Supabase",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <SupabaseProvider>
            <QueryProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                storageKey="everfreenote-theme"
              >
                {children}
                <Toaster />
              </ThemeProvider>
            </QueryProvider>
          </SupabaseProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
