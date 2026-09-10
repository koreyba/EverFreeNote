import { Suspense } from "react"
import type { Metadata } from "next"

import { OAuthConsentLayout, OAuthConsentSpinner } from "@/components/features/oauth/OAuthConsentLayout"
import { OAuthConsentPageClient } from "@/components/features/oauth/OAuthConsentPageClient"

export const metadata: Metadata = {
  title: "Authorize application - EverFreeNote",
  robots: {
    index: false,
    follow: false,
  },
}

// Consent page for Supabase Auth's OAuth 2.1 server (Authentication → OAuth Server →
// Authorization path = /oauth/consent). Supabase redirects here with ?authorization_id=…
export default function OAuthConsentPage() {
  return (
    <Suspense
      fallback={
        <OAuthConsentLayout>
          <OAuthConsentSpinner text="Loading authorization request..." />
        </OAuthConsentLayout>
      }
    >
      <OAuthConsentPageClient />
    </Suspense>
  )
}
