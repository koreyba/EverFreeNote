"use client"

import * as React from "react"
import { Check, Copy, Globe2, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PublicNoteShareService, buildPublicNoteUrl } from "@core/services/publicNoteShare"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"

type ShareNoteDialogProps = Readonly<{
  noteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}>

export function ShareNoteDialog({ noteId, open, onOpenChange }: ShareNoteDialogProps) {
  const { supabase, user } = useSupabase()
  const service = React.useMemo(() => new PublicNoteShareService(supabase), [supabase])
  const [shareUrl, setShareUrl] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    setShareUrl("")
    setError(null)
    setCopied(false)
  }, [noteId])

  const generateLink = React.useCallback(async () => {
    if (!user?.id) {
      setError("Sign in again to create a share link.")
      return
    }

    setIsLoading(true)
    setError(null)
    setCopied(false)

    try {
      const link = await service.getOrCreateViewLink(noteId, user.id)
      const origin = globalThis.location?.origin ?? ""
      setShareUrl(buildPublicNoteUrl(origin, link.token))
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Could not create share link."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [noteId, service, user?.id])

  React.useEffect(() => {
    if (!open) return
    if (shareUrl) return

    generateLink().catch(() => undefined)
  }, [generateLink, open, shareUrl])

  React.useEffect(() => {
    if (open) return

    setCopied(false)
    setError(null)
  }, [open])

  const copyLink = React.useCallback(async () => {
    if (!shareUrl) return

    try {
      await globalThis.navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setError(null)
    } catch {
      setCopied(false)
      setError("Could not copy automatically. Select the link and copy it manually.")
    }
  }, [shareUrl])

  const requestLink = React.useCallback(() => {
    generateLink().catch(() => undefined)
  }, [generateLink])

  const requestCopy = React.useCallback(() => {
    copyLink().catch(() => undefined)
  }, [copyLink])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Share note</DialogTitle>
          <DialogDescription>
            Create a read-only public link for this note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
            <div className="mt-0.5 rounded-md bg-background p-2 text-muted-foreground">
              <Globe2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">Anyone with the link can view</div>
              <div className="text-sm text-muted-foreground">
                Viewers can read the title, content, and tags only.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-note-link">Public link</Label>
            <div className="flex gap-2">
              <Input
                id="share-note-link"
                value={isLoading ? "Generating link..." : shareUrl}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
                aria-describedby={error ? "share-note-error" : undefined}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={requestCopy}
                disabled={!shareUrl || isLoading}
                aria-label={copied ? "Link copied" : "Copy share link"}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {error ? (
            <div id="share-note-error" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={requestLink} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {shareUrl ? "Get link" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
