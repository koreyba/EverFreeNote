"use client"

import * as React from "react"
import { List as ReactWindowList, ListChildComponentProps } from "react-window"

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

type ItemData = {
  notes: Note[]
  selectedNote: Note | null
  onSelectNote: (note: Note) => void
  onTagClick: (tag: string) => void
}

const ITEM_HEIGHT = 120

const Row = ({ index, style, data }: ListChildComponentProps<ItemData>) => {
  const { notes, selectedNote, onSelectNote, onTagClick } = data
  const note = notes?.[index]

  // Safety check: render skeleton if note is missing to prevent crashes
  if (!note) {
    return (
      <div style={style} className="px-2 py-1">
        <div className="h-full p-3 rounded-xl border border-transparent bg-muted/5 animate-pulse">
          <div className="h-4 bg-muted/20 rounded w-2/3 mb-2" />
          <div className="h-3 bg-muted/20 rounded w-1/2" />
        </div>
      </div>
    )
  }

  const isSelected = selectedNote?.id === note.id

  return (
    <div style={style} className="px-2 py-1">
      <div
        onClick={() => onSelectNote(note)}
        className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
          isSelected 
            ? "bg-accent border-primary/20 shadow-sm" 
            : "bg-card border-transparent hover:border-border hover:shadow-sm hover:-translate-y-0.5"
        }`}
      >
        {isSelected && (
          <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />
        )}
        
        <div className={isSelected ? "pl-2" : ""}>
          <h3 className={`font-semibold truncate transition-colors ${isSelected ? "text-primary" : "group-hover:text-foreground"}`}>
            {note.title || "Untitled Note"}
          </h3>
          <p className="text-sm text-muted-foreground truncate mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {note.description || "No additional text"}
          </p>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex flex-wrap gap-1">
              {note.tags && note.tags.length > 0 ? (
                note.tags.slice(0, 3).map((tag, tagIndex) => (
                  <InteractiveTag
                    key={tagIndex}
                    tag={tag}
                    onClick={(t) => {
                      // Stop propagation to prevent selecting the note when clicking a tag
                      onTagClick(t);
                    }}
                    showIcon={false}
                    className="text-[10px] px-1.5 py-0.5 h-auto bg-muted/50 hover:bg-primary/10 hover:text-primary border-transparent"
                  />
                ))
              ) : (
                <span className="h-5" /> 
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/60 font-medium tabular-nums">
              {new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Virtualized note list component for large datasets.
 */
export const VirtualNoteList = ({
  notes = [],
  selectedNote,
  onSelectNote,
  onTagClick,
  height,
  ListComponent = ReactWindowList,
}: VirtualNoteListProps) => {
  const safeNotes = React.useMemo(() => notes ?? [], [notes])

  const itemData = React.useMemo(() => ({
    notes: safeNotes,
    selectedNote,
    onSelectNote,
    onTagClick
  }), [safeNotes, selectedNote, onSelectNote, onTagClick])

  // If no items, don't render the virtual list to avoid react-window invalid index errors
  if (safeNotes.length === 0) {
    return null
  }

  return (
    <ListComponent
      height={height}
      itemCount={safeNotes.length}
      itemSize={ITEM_HEIGHT}
      width="100%"
      overscanCount={5}
      itemData={itemData}
      // Some react-window builds expect rowProps; pass empty object to avoid undefined -> Object.values crash
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rowProps={{} as any}
    >
      {Row}
    </ListComponent>
  )
}
