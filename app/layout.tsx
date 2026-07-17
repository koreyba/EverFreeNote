import "./globals.css"
import type { Metadata } from "next"
import type { ReactNode } from "react"

import { ErrorBoundary } from "@/components/ErrorBoundary"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { SupabaseProvider } from "@ui/web/providers/SupabaseProvider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "EverFreeNote - Your Personal Note-Taking App",
  description: "Secure, simple, and synced note-taking powered by Supabase",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
                disableTransitionOnChange={true}
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
// Force reload of CSS theme variables
