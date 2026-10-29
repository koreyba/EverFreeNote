"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { toast } from "sonner"
import { Button } from "@ui/web/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@ui/web/components/ui/dialog"
import { Label } from "@ui/web/components/ui/label"
import { Textarea } from "@ui/web/components/ui/textarea"

type NoteImage = { position: number; src: string; alt: string | null }

export type ImageDescriptionTarget = {
  document: ProseMirrorNode
  images: NoteImage[]
  selectedIndex: number
}

type ImageDescriptionDraft = { text: string; decorative: boolean; touched: boolean }

/** Capture positions at opening so a later selection cannot change the wrong image. */
export function getImageDescriptionTarget(editor: Editor): ImageDescriptionTarget | null {
  const images: NoteImage[] = []
  editor.state.doc.descendants((node, position) => {
    if (node.type.name === "image" && typeof node.attrs.src === "string") {
      images.push({ position, src: node.attrs.src, alt: typeof node.attrs.alt === "string" ? node.attrs.alt : null })
    }
  })
  if (images.length === 0) return null

  const selected = images.findIndex((image) => image.position === editor.state.selection.from)
  return { document: editor.state.doc, images, selectedIndex: Math.max(selected, 0) }
}

export function ImageDescriptionDialog({
  editor,
  target,
  onClose,
  onReturnFocus,
}: {
  editor: Editor
  target: ImageDescriptionTarget
  onClose: () => void
  onReturnFocus: () => void
}) {
  const [selectedIndex, setSelectedIndex] = React.useState(target.selectedIndex)
  const [drafts, setDrafts] = React.useState<ImageDescriptionDraft[]>(() => target.images.map((image) => ({
    text: image.alt ?? "",
    decorative: image.alt === "",
    touched: false,
  })))
  const selectId = React.useId()
  const descriptionId = React.useId()
  const decorativeHintId = React.useId()
  const selected = target.images[selectedIndex]
  const selectedDraft = drafts[selectedIndex]
  const changed = drafts.flatMap((draft, index) => {
    const nextAlt = draft.decorative ? "" : draft.text.trim() || null
    return draft.touched && nextAlt !== target.images[index].alt ? [{ position: target.images[index].position, alt: nextAlt }] : []
  })

  const chooseImage = (index: number) => {
    if (target.images[index]) setSelectedIndex(index)
  }

  const changeDraft = (change: Partial<ImageDescriptionDraft>) => {
    setDrafts((previous) => previous.map((draft, index) => index === selectedIndex
      ? { ...draft, ...change, touched: true }
      : draft))
  }

  const save = () => {
    // A dialog can stay open while external note content changes. Refuse to
    // apply its captured position to a different document.
    if (editor.isDestroyed || !editor.state.doc.eq(target.document)) {
      toast.error("The note changed", { description: "Select the image again to edit its description." })
      onClose()
      return
    }
    let command = editor.chain()
    changed.forEach(({ position, alt }) => {
      command = command.setNodeSelection(position).updateAttributes("image", { alt })
    })
    if (changed.length > 0) command.run()
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="max-w-md overflow-y-auto rounded-2xl [&>button:last-child]:right-2 [&>button:last-child]:top-2 [&>button:last-child]:flex [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center"
        style={{
          // Keep the dialog inside the safe area while the overlay animates.
          animation: "none",
          inset: "max(1rem, env(safe-area-inset-top, 0px)) max(1rem, env(safe-area-inset-right, 0px)) max(1rem, env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 0px))",
          width: "auto", height: "fit-content", margin: "auto", transform: "none", translate: "none",
          maxHeight: "calc(100dvh - max(1rem, env(safe-area-inset-top, 0px)) - max(1rem, env(safe-area-inset-bottom, 0px)))",
        }}
        onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus() }}
      >
        <DialogHeader>
          <DialogTitle>Image description</DialogTitle>
          <DialogDescription>Describe what the image conveys to someone who cannot see it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {target.images.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor={selectId}>Image</Label>
              <select
                id={selectId}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedIndex}
                onChange={(event) => chooseImage(Number(event.target.value))}
              >
                {target.images.map((image, index) => (
                  <option key={image.position} value={index}>
                    {`Image ${index + 1}${image.alt === null ? " — no description" : image.alt === "" ? " — decorative" : ` — ${image.alt.slice(0, 60)}`}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg bg-muted/50 p-2">
            {/* Preview repeats the image being described and is not content. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.src} alt="" aria-hidden="true" className="h-full max-w-full object-contain" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={descriptionId}>Description</Label>
            <Textarea
              id={descriptionId}
              value={selectedDraft.text}
              onChange={(event) => changeDraft({ text: event.target.value })}
              disabled={selectedDraft.decorative}
              placeholder="Describe the image"
              rows={3}
            />
          </div>
          <div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" checked={selectedDraft.decorative} onChange={(event) => changeDraft({ decorative: event.target.checked })} aria-describedby={decorativeHintId} className="h-4 w-4 accent-primary" />
              <span>Decorative image</span>
            </label>
            <p id={decorativeHintId} className="text-xs text-muted-foreground">Screen readers skip decorative images.</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" className="min-h-11" onClick={onClose}>Cancel</Button>
          <Button type="button" className="min-h-11" onClick={save} disabled={changed.length === 0}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
