"use client"

import * as React from "react"
import { List as ReactWindowList } from "react-window"

import InteractiveTag from "@/components/InteractiveTag"
import type { Note } from "@/types/domain"

type VirtualNoteListProps = {
  notes: Note[]
  selectedNote: Note | null
  onSelectNote: (note: Note) => void
  onTagClick: (tag: string) => void
  height: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ListComponent?: React.ComponentType<any>
}

const ITEM_HEIGHT = 120

/**
 * Virtualized note list component for large datasets.
 */
export const VirtualNoteList = ({
  notes,
  selectedNote,
  onSelectNote,
  onTagClick,
  height,
  ListComponent = ReactWindowList,
}: VirtualNoteListProps) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const note = notes[index]
    if (!note) return null

    const isSelected = selectedNote?.id === note.id

    return (
      <div style={style} className="px-2 py-0.5">
        <div
          onClick={() => onSelectNote(note)}
          className={`p-3 rounded-lg cursor-pointer transition-colors ${
            isSelected ? "bg-accent border" : "hover:bg-muted/50 border border-transparent"
          }`}
        >
          <h3 className="font-semibold truncate">{note.title}</h3>
          <p className="text-sm text-muted-foreground truncate mt-1">
            {note.description}
          </p>
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {note.tags.slice(0, 3).map((tag, tagIndex) => (
                <InteractiveTag
                  key={tagIndex}
                  tag={tag}
                  onClick={onTagClick}
                  showIcon={false}
                  className="text-xs px-2 py-0.5"
                />
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(note.updated_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ListComponent
      height={height}
      itemCount={notes.length}
      itemSize={ITEM_HEIGHT}
      width="100%"
      overscanCount={5}
    >
      {Row}
    </ListComponent>
  )
}

