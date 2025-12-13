"use client"

import * as React from "react"
import { Loader2, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RichTextEditor from "@/components/RichTextEditor"

interface NoteEditorProps {
  initialTitle?: string
  initialDescription?: string
  initialTags?: string
  isSaving: boolean
  onSave: (data: { title: string; description: string; tags: string }) => void
  onCancel: () => void
}

export const NoteEditor = React.memo(function NoteEditor({
  initialTitle = "",
  initialDescription = "",
  initialTags = "",
  isSaving,
  onSave,
  onCancel
}: NoteEditorProps) {
  const [title, setTitle] = React.useState(initialTitle)
  const [description, setDescription] = React.useState(initialDescription)
  const [tags, setTags] = React.useState(initialTags)

  // Sync with props if they change (e.g. switching notes)
  React.useEffect(() => {
    setTitle(initialTitle)
    setDescription(initialDescription)
    setTags(initialTags)
  }, [initialTitle, initialDescription, initialTags])

  const handleSave = () => {
    onSave({ title, description, tags })
  }

  // Обработчики событий для предотвращения пересоздания на каждом рендере
  const handleTagsChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTags(e.target.value)
    },
    []
  )

  return (
    <div className="flex-1 flex flex-col">
      {/* Editor Header */}
      <div className="p-4 border-b bg-card flex items-center justify-between">
        <h2 className="text-lg font-semibold text-muted-foreground">
          Editing
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={onCancel}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>

      {/* Editor Form */}
      <div className="flex-1 overflow-y-auto p-6 bg-card">
        <div className="max-w-4xl mx-auto space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-2xl font-bold leading-snug shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Tag className="w-4 h-4" />
              <span>Tags (comma-separated):</span>
            </div>
            <Input
              type="text"
              placeholder="work, personal, ideas"
              value={tags}
              onChange={handleTagsChange}
            />
          </div>
          <div>
            <RichTextEditor
              content={description}
              onChange={setDescription}
            />
          </div>
        </div>
      </div>
    </div>
  )
})
