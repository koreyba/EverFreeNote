import { forwardRef } from 'react'
import { FixedSizeList } from 'react-window'
import InteractiveTag from '@/components/InteractiveTag'

/**
 * Virtualized note list component for optimal performance with large datasets
 * Only renders visible notes in the viewport
 * 
 * @param {Object} props
 * @param {Array} props.notes - Array of notes to display
 * @param {Object} props.selectedNote - Currently selected note
 * @param {Function} props.onSelectNote - Callback when note is clicked
 * @param {Function} props.onTagClick - Callback when tag is clicked
 * @param {number} props.height - Height of the list container
 */
export const VirtualNoteList = forwardRef(function VirtualNoteList(
  { notes, selectedNote, onSelectNote, onTagClick, height },
  ref
) {
  const ITEM_HEIGHT = 120 // Height of each note item in pixels

  // Row renderer for react-window
  const Row = ({ index, style }) => {
    const note = notes[index]
    if (!note) return null

    const isSelected = selectedNote?.id === note.id

    return (
      <div style={style} className="px-2 py-0.5">
        <div
          onClick={() => onSelectNote(note)}
          className={`p-3 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? 'bg-accent border'
              : 'hover:bg-muted/50 border border-transparent'
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
    <FixedSizeList
      ref={ref}
      height={height}
      itemCount={notes.length}
      itemSize={ITEM_HEIGHT}
      width="100%"
      overscanCount={5} // Render 5 extra items above/below viewport for smooth scrolling
    >
      {Row}
    </FixedSizeList>
  )
})

