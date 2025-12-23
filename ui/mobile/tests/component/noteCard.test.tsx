import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { format } from 'date-fns'
import { NoteCard } from '@ui/mobile/components/NoteCard'
import type { Note } from '@core/types/domain'

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
    },
  }),
}))

const baseNote: Note = {
  id: 'note-1',
  title: 'Test title',
  description: 'Plain description',
  tags: ['alpha', 'beta'],
  created_at: '2025-12-20T10:15:00.000Z',
  updated_at: '2025-12-22T09:30:00.000Z',
  user_id: 'user-1',
}

describe('NoteCard', () => {
  it('renders title and formatted date', () => {
    render(<NoteCard note={baseNote} onPress={jest.fn()} />)

    expect(screen.getByText('Test title')).toBeTruthy()
    expect(screen.getByText(format(new Date(baseNote.updated_at), 'dd.MM.yyyy HH:mm'))).toBeTruthy()
  })

  it('sanitizes and renders description for list variant', () => {
    const note = {
      ...baseNote,
      description: 'Hello <b>world</b>',
    }

    render(<NoteCard note={note} onPress={jest.fn()} />)

    expect(screen.getByText('Hello world')).toBeTruthy()
  })

  it('renders search snippet with highlights', () => {
    const note = {
      ...baseNote,
      description: 'Ignored in search',
      headline: 'Hello <mark>world</mark>',
    }

    render(<NoteCard note={note} onPress={jest.fn()} variant="search" />)

    expect(screen.getByText('Hello ')).toBeTruthy()
    expect(screen.getByText('world')).toBeTruthy()
    expect(screen.queryByText('Ignored in search')).toBeNull()
  })

  it('does not render snippet when search variant has no content', () => {
    const note = {
      ...baseNote,
      description: '',
      headline: null,
      snippet: null,
    }

    render(<NoteCard note={note} onPress={jest.fn()} variant="search" />)

    expect(screen.queryByText('Plain description')).toBeNull()
  })

  it('renders tags and handles press', () => {
    const onPress = jest.fn()
    render(<NoteCard note={baseNote} onPress={onPress} />)

    expect(screen.getByText('alpha')).toBeTruthy()
    expect(screen.getByText('beta')).toBeTruthy()

    fireEvent.press(screen.getByText('Test title'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
