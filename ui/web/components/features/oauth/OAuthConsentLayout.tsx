"use client"

import type { ReactNode } from "react"
import { CircleNotch as Loader2 } from "@phosphor-icons/react"

import { PublicPageHeader } from "@/components/features/public/PublicPageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function OAuthConsentLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <PublicPageHeader />
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col items-center justify-center px-6 py-10">
        {children}
      </div>
    </main>
  )
}

export function OAuthConsentSpinner({ text }: Readonly<{ text: string }>) {
  return (
    <output className="flex flex-col items-center gap-3 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </output>
  )
}

export function OAuthConsentMessageCard({ title, message }: Readonly<{ title: string; message: string }>) {
  return (
    <Card className="w-full shadow-lg" data-testid="oauth-consent-message">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        You can close this window and start the connection again from your AI application.
      </CardContent>
    </Card>
  )
}
