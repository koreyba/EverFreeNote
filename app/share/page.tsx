import { Suspense } from "react"
import type { Metadata } from "next"

import { PublicSharePageClient } from "@/components/features/public/PublicSharePageClient"
import { PublicPageHeader } from "@/components/features/public/PublicPageHeader"

export const metadata: Metadata = {
  title: "Shared note - EverFreeNote",
  robots: {
    index: false,
    follow: false,
  },
}

export default function SharePage() {
  return (
    <Suspense fallback={<PublicShareLoading />}>
      <PublicSharePageClient />
    </Suspense>
  )
}

function PublicShareLoading() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <PublicPageHeader />
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-2xl flex-col items-center justify-center px-6 pb-16 text-center">
        <p className="text-sm text-muted-foreground">Loading shared note...</p>
      </div>
    </main>
  )
}
