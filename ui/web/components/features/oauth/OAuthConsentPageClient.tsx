"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, ShieldCheck } from "lucide-react"
import type { OAuthAuthorizationDetails } from "@supabase/supabase-js"

import AuthForm from "@/components/AuthForm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { featureFlags } from "@ui/web/featureFlags"
import { useNoteAuth } from "@ui/web/hooks/useNoteAuth"
import {
  clearOAuthConsentAuthorizationId,
  isValidAuthorizationId,
  saveOAuthConsentAuthorizationId,
} from "@ui/web/lib/oauthConsentNavigationState"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"

import { OAuthConsentLayout, OAuthConsentMessageCard, OAuthConsentSpinner } from "./OAuthConsentLayout"

type DetailsState =
  | { status: "idle" }
  | { status: "ready"; details: OAuthAuthorizationDetails }
  | { status: "error"; message: string }

type Decision = "idle" | "approve" | "deny" | "redirecting"

export const OAUTH_CONSENT_ACCESS_SUMMARY = [
  "List and search your notes",
  "Read the content of your notes",
  "Create new notes",
  "Update existing notes",
] as const

const defaultNavigate = (url: string) => {
  globalThis.window.location.assign(url)
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message) return message
  }
  return fallback
}

function safeHostname(uri: string | null | undefined): string | null {
  if (!uri) return null
  try {
    return new URL(uri).hostname
  } catch {
    return null
  }
}

type OAuthConsentPageClientProps = {
  /** Injected for tests; defaults to a full-page navigation. */
  navigate?: (url: string) => void
}

export function OAuthConsentPageClient({ navigate = defaultNavigate }: Readonly<OAuthConsentPageClientProps>) {
  const searchParams = useSearchParams()
  const rawAuthorizationId = searchParams.get("authorization_id")
  const authorizationId = isValidAuthorizationId(rawAuthorizationId) ? rawAuthorizationId : null

  const { supabase, user, loading: sessionLoading } = useSupabase()
  const userId = user?.id ?? null
  const { handleSignInWithGoogle, handleTestLogin, handleSkipAuth } = useNoteAuth()

  const [details, setDetails] = useState<DetailsState>({ status: "idle" })
  const [decision, setDecision] = useState<Decision>("idle")

  useEffect(() => {
    if (!authorizationId || sessionLoading || !userId) return

    // No synchronous setState here: the "idle" state already renders the loading
    // spinner, and the async callbacks below move the state machine forward.
    let cancelled = false

    supabase.auth.oauth
      .getAuthorizationDetails(authorizationId)
      .then(({ data, error }) => {
        if (cancelled) return

        if (error || !data) {
          setDetails({ status: "error", message: error?.message ?? "Authorization request not found or expired." })
          return
        }

        // Supabase returns redirect_url when this client was already approved: skip the screen.
        if (data.redirect_url) {
          clearOAuthConsentAuthorizationId()
          setDecision("redirecting")
          navigate(data.redirect_url)
          return
        }

        setDetails({ status: "ready", details: data })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setDetails({ status: "error", message: describeError(error, "Failed to load the authorization request.") })
      })

    return () => {
      cancelled = true
    }
  }, [authorizationId, sessionLoading, userId, supabase, navigate])

  const decide = useCallback(
    async (kind: "approve" | "deny") => {
      if (!authorizationId) return
      setDecision(kind)

      try {
        const { data, error } =
          kind === "approve"
            ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
            : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })

        if (error || !data?.redirect_url) {
          setDetails({ status: "error", message: error?.message ?? "Could not complete the authorization." })
          setDecision("idle")
          return
        }

        clearOAuthConsentAuthorizationId()
        setDecision("redirecting")
        navigate(data.redirect_url)
      } catch (error) {
        setDetails({ status: "error", message: describeError(error, "Could not complete the authorization.") })
        setDecision("idle")
      }
    },
    [authorizationId, supabase, navigate],
  )

  const handleGoogleSignIn = useCallback(async () => {
    if (authorizationId) saveOAuthConsentAuthorizationId(authorizationId)
    await handleSignInWithGoogle()
  }, [authorizationId, handleSignInWithGoogle])

  if (!authorizationId) {
    return (
      <OAuthConsentLayout>
        <OAuthConsentMessageCard
          title="Invalid authorization request"
          message="This link is missing a valid authorization id."
        />
      </OAuthConsentLayout>
    )
  }

  if (sessionLoading) {
    return (
      <OAuthConsentLayout>
        <OAuthConsentSpinner text="Checking your session..." />
      </OAuthConsentLayout>
    )
  }

  if (!userId) {
    return (
      <OAuthConsentLayout>
        <Card className="w-full shadow-lg" data-testid="oauth-consent-signin">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">Sign in to continue</CardTitle>
            <CardDescription>
              An application is requesting access to your EverFreeNote notebook. Sign in to review the request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm
              enableTestAuth={featureFlags.testAuth}
              onGoogleAuth={handleGoogleSignIn}
              onTestLogin={handleTestLogin}
              onSkipAuth={handleSkipAuth}
            />
          </CardContent>
        </Card>
      </OAuthConsentLayout>
    )
  }

  if (details.status === "error") {
    return (
      <OAuthConsentLayout>
        <OAuthConsentMessageCard title="Authorization failed" message={details.message} />
      </OAuthConsentLayout>
    )
  }

  if (details.status !== "ready" || decision === "redirecting") {
    return (
      <OAuthConsentLayout>
        <OAuthConsentSpinner
          text={decision === "redirecting" ? "Returning to the application..." : "Loading authorization request..."}
        />
      </OAuthConsentLayout>
    )
  }

  const { client, scope, user: requestUser } = details.details
  const clientName = client?.name?.trim() || "An application"
  const clientHost = safeHostname(client?.uri)
  const scopes = (scope ?? "").split(/\s+/).filter(Boolean)
  const busy = decision !== "idle"

  return (
    <OAuthConsentLayout>
      <Card className="w-full shadow-lg" data-testid="oauth-consent-card">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
            <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">
            <span data-testid="oauth-consent-client-name">{clientName}</span> wants to access your notebook
          </CardTitle>
          <CardDescription className="space-y-1">
            {clientHost ? <span className="block">{clientHost}</span> : null}
            <span className="block">
              Signed in as <span className="font-medium text-foreground">{requestUser?.email ?? user?.email}</span>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">This application will be able to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {OAUTH_CONSENT_ACCESS_SUMMARY.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          {scopes.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Requested scopes</p>
              <div className="mt-1 flex flex-wrap gap-1" data-testid="oauth-consent-scopes">
                {scopes.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Only notes in your own account are accessible. The application never receives your password.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => decide("deny")}
            disabled={busy}
            data-testid="oauth-consent-deny"
          >
            {decision === "deny" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Deny
          </Button>
          <Button onClick={() => decide("approve")} disabled={busy} data-testid="oauth-consent-approve">
            {decision === "approve" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Approve
          </Button>
        </CardFooter>
      </Card>
    </OAuthConsentLayout>
  )
}
