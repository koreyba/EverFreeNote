import { Badge } from "@/components/ui/badge"
import { NOTE_CONTENT_CLASS } from "@core/constants/typography"
import { SanitizationService } from "@core/services/sanitizer"
import type { PublicNote } from "@core/services/publicNoteShare"
import { PublicPageHeader } from "@/components/features/public/PublicPageHeader"

type PublicNotePageProps = Readonly<{
  note: PublicNote
}>

export function PublicNotePage({ note }: PublicNotePageProps) {
  const tags = note.tags ?? []
  const updatedSource = note.updated_at ?? note.created_at
  const updatedDate = updatedSource ? new Date(updatedSource) : null
  const updated = updatedDate && !Number.isNaN(updatedDate.getTime())
    ? updatedDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    : "Unknown"
  const sanitizedContent = SanitizationService.sanitize(note.description ?? "")

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <PublicPageHeader />
      <article className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="border-b pb-6">
          <p className="text-sm text-muted-foreground">Shared note</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{note.title || "Untitled"}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Updated {updated}</p>
          {tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2" aria-label="Tags">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="pointer-events-none select-text">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </header>

        <div
          className={`${NOTE_CONTENT_CLASS} mt-8`}
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </article>
    </main>
  )
}
