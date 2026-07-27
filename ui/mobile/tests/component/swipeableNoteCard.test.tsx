/**
 * Component tests for SwipeableNoteCard
 * Tests swipe-to-delete functionality, delete button interactions, and selection mode
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { SwipeableNoteCard } from '@ui/mobile/components/SwipeableNoteCard'
import type { Note } from '@core/types/domain'

const mockRegister = jest.fn()
const mockUnregister = jest.fn()
const mockOnSwipeStart = jest.fn()

// Mock providers
jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      foreground: '#111111',
      card: '#ffffff',
      border: '#e0e0e0',
      accent: '#f2f2f2',
      primary: '#00aa00',
      secondary: '#f7f7f7',
      mutedForeground: '#666666',
      secondaryForeground: '#222222',
      destructive: '#ff0000',
      destructiveForeground: '#ffffff',
    },
  }),
  useSwipeContext: () => ({
    register: mockRegister,
    unregister: mockUnregister,
    onSwipeStart: mockOnSwipeStart,
  }),
}))

// Mock gesture handler
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const { View } = require('react-native')
  const React = require('react')
  
  return React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      close: jest.fn(),
    }))
    
    return (
      <View testID="swipeable-container" onSwipeableWillOpen={props.onSwipeableWillOpen as CallableFunction}>
        {props.children as React.ReactNode}
        {Boolean(props.renderRightActions) && (
          <View testID="right-actions">
            {(props.renderRightActions as CallableFunction)({ value: 0 }, { value: 0 })}
          </View>
        )}
      </View>
    )
  })
})

const mockNote: Note = {
  id: 'note-1',
  title: 'Test Note',
  description: 'Test description',
  tags: ['tag1', 'tag2'],
  created_at: '2025-12-20T10:15:00.000Z',
  updated_at: '2025-12-22T09:30:00.000Z',
  user_id: 'user-1',
}

describe('SwipeableNoteCard', () => {
  const mockOnPress = jest.fn()
  const mockOnTagPress = jest.fn()
  const mockOnDelete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders note card with swipeable container', () => {
    render(
      <SwipeableNoteCard
        note={mockNote}
        onPress={mockOnPress}
        onTagPress={mockOnTagPress}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByTestId('swipeable-container')).toBeTruthy()
    expect(screen.getByText('Test Note')).toBeTruthy()
  })

  it('renders NoteCard in selection mode without registering swipeable', () => {
    render(
      <SwipeableNoteCard
        note={mockNote}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
        isSelectionMode={true}
      />
    )

    expect(screen.queryByTestId('swipeable-container')).toBeNull()
    expect(screen.getByText('Test Note')).toBeTruthy()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('registers note ID with useSwipeContext on mount when not in selection mode and unregisters on unmount', () => {
    const { unmount } = render(
      <SwipeableNoteCard
        note={mockNote}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    )

    expect(mockRegister).toHaveBeenCalledWith('note-1', expect.anything())

    unmount()

    expect(mockUnregister).toHaveBeenCalledWith('note-1')
  })

  it('triggers onPress, onLongPress, and onTagPress callbacks', () => {
    const mockOnLongPress = jest.fn()
    render(
      <SwipeableNoteCard
        note={mockNote}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
        onTagPress={mockOnTagPress}
        onDelete={mockOnDelete}
      />
    )

    fireEvent.press(screen.getByText('Test Note'))
    expect(mockOnPress).toHaveBeenCalledWith(mockNote)

    fireEvent(screen.getByText('Test Note'), 'longPress')
    expect(mockOnLongPress).toHaveBeenCalledTimes(1)

    const tag = screen.getByText('tag1')
    fireEvent.press(tag, { stopPropagation: jest.fn() })
    expect(mockOnTagPress).toHaveBeenCalledWith('tag1')
  })

  it('triggers onSwipeStart when swipeable opens', () => {
    render(
      <SwipeableNoteCard
        note={mockNote}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    )

    const swipeable = screen.getByTestId('swipeable-container')
    fireEvent(swipeable, 'swipeableWillOpen')

    expect(mockOnSwipeStart).toHaveBeenCalledWith('note-1')
  })

  it('renders right action delete button and calls onDelete(note.id) when delete is pressed', () => {
    render(
      <SwipeableNoteCard
        note={mockNote}
        onPress={mockOnPress}
        onTagPress={mockOnTagPress}
        onDelete={mockOnDelete}
      />
    )

    const deleteButton = screen.getByLabelText('Delete note')
    expect(deleteButton).toBeTruthy()

    fireEvent.press(deleteButton)
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith('note-1')
  })

  it('renders note with snippet and headline for search variant', () => {
    const searchNote = {
      ...mockNote,
      snippet: 'Search snippet',
      headline: 'Search <mark>headline</mark>',
    }

    render(
      <SwipeableNoteCard
        note={searchNote}
        onPress={mockOnPress}
        onTagPress={mockOnTagPress}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Test Note')).toBeTruthy()
  })

  it('handles note without tags', () => {
    const noteWithoutTags = {
      ...mockNote,
      tags: [],
    }

    render(
      <SwipeableNoteCard
        note={noteWithoutTags}
        onPress={mockOnPress}
        onTagPress={mockOnTagPress}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Test Note')).toBeTruthy()
    expect(screen.queryByText('tag1')).toBeNull()
  })
})
