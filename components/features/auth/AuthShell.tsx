"use client"

import { BookOpen } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import AuthForm from "@/components/AuthForm"

interface AuthShellProps {
  onTestLogin: () => void
  onSkipAuth: () => void
  onGoogleAuth: () => void
}

export function AuthShell({ onTestLogin, onSkipAuth, onGoogleAuth }: AuthShellProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-muted/30 to-accent/20">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-accent rounded-full">
              <BookOpen className="w-10 h-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">EverFreeNote</CardTitle>
          <CardDescription className="text-base">
            Your personal note-taking companion. Secure, simple, and synced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuthForm
            onTestLogin={onTestLogin}
            onSkipAuth={onSkipAuth}
            onGoogleAuth={onGoogleAuth}
          />

          <p className="text-xs text-center text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
