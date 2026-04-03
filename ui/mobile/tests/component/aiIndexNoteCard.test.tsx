import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { AIIndexNoteCard } from '@ui/mobile/components/settings/AIIndexNoteCard'
import type { AIIndexNoteRow } from '@core/types/aiIndex'

const mockInvoke = jest.fn()
const mockToastShow = jest.fn()

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      foreground: '#111111',
      card: '#ffffff',
      border: '#e0e0e0',
      mutedForeground: '#666666',
      destructive: '#ff0000',
      selectionBackground: '#f2fff2',
      selectionBorder: '#00aa00',
      selectionForeground: '#006600',
      primary: '#00aa00',
      primaryForeground: '#ffffff',
      secondary: '#f7f7f7',
      secondaryForeground: '#222222',
      destructiveForeground: '#ffffff',
      accent: '#f2f2f2',
      ring: '#00aa00',
    },
  }),
  useSupabase: () => ({
    client: {
      functions: { invoke: mockInvoke },
    },
    user: { id: 'test-user-id' },
  }),
}))

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: (...args: unknown[]) => mockToastShow(...args) },
}))

jest.mock('@core/rag/indexResult', () => ({
  parseRagIndexResult: jest.fn(),
}))

const { parseRagIndexResult } = require('@core/rag/indexResult') as {
  parseRagIndexResult: jest.Mock
}

function makeNote(overrides: Partial<AIIndexNoteRow> = {}): AIIndexNoteRow {
  return {
    id: 'note-1',
    title: 'My Note',
    updatedAt: '2025-06-01T00:00:00Z',
    lastIndexedAt: null,
    status: 'not_indexed',
    ...overrides,
  }
}

describe('AIIndexNoteCard', () => {
  const onMutated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders title and status for not_indexed', () => {
    render(<AIIndexNoteCard note={makeNote()} onMutated={onMutated} />)

    expect(screen.getByText('My Note')).toBeTruthy()
    expect(screen.getByText('Not indexed')).toBeTruthy()
    expect(screen.getByText('Not searchable by AI yet.')).toBeTruthy()
  })

  it('shows "Untitled Note" when title is empty', () => {
    render(<AIIndexNoteCard note={makeNote({ title: '  ' })} onMutated={onMutated} />)
    expect(screen.getByText('Untitled Note')).toBeTruthy()
  })

  it('shows "Index note" for not_indexed status', () => {
    render(<AIIndexNoteCard note={makeNote({ status: 'not_indexed' })} onMutated={onMutated} />)
    expect(screen.getByText('Index note')).toBeTruthy()
    expect(screen.queryByText('Remove index')).toBeNull()
  })

  it('shows "Reindex" and "Remove index" for indexed status', () => {
    render(
      <AIIndexNoteCard
        note={makeNote({ status: 'indexed', lastIndexedAt: '2025-06-01T00:00:00Z' })}
        onMutated={onMutated}
      />
    )
    expect(screen.getByText('Reindex')).toBeTruthy()
    expect(screen.getByText('Remove index')).toBeTruthy()
  })

  it('shows "Update index" for outdated status', () => {
    render(
      <AIIndexNoteCard
        note={makeNote({ status: 'outdated', lastIndexedAt: '2025-05-01T00:00:00Z' })}
        onMutated={onMutated}
      />
    )
    expect(screen.getByText('Update index')).toBeTruthy()
    expect(screen.getByText('Remove index')).toBeTruthy()
  })

  it('calls invoke with index action on press', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null })
    parseRagIndexResult.mockReturnValue({ outcome: 'indexed', chunkCount: 3, message: null })

    render(<AIIndexNoteCard note={makeNote()} onMutated={onMutated} />)
    fireEvent.press(screen.getByText('Index note'))

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('rag-index', {
        body: { noteId: 'note-1', action: 'index' },
      })
    })

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Note indexed' })
      )
    })

    expect(onMutated).toHaveBeenCalledWith({
      noteId: 'note-1',
      previousStatus: 'not_indexed',
      nextStatus: 'indexed',
    })
  })

  it('calls invoke with delete action on Remove press', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null })
    parseRagIndexResult.mockReturnValue({ outcome: 'deleted', message: null })

    render(
      <AIIndexNoteCard
        note={makeNote({ status: 'indexed', lastIndexedAt: '2025-06-01T00:00:00Z' })}
        onMutated={onMutated}
      />
    )
    fireEvent.press(screen.getByText('Remove index'))

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('rag-index', {
        body: { noteId: 'note-1', action: 'delete' },
      })
    })

    await waitFor(() => {
      expect(onMutated).toHaveBeenCalledWith({
        noteId: 'note-1',
        previousStatus: 'indexed',
        nextStatus: 'not_indexed',
      })
    })
  })

  it('shows error toast on invoke failure', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Network fail') })

    render(<AIIndexNoteCard note={makeNote()} onMutated={onMutated} />)
    fireEvent.press(screen.getByText('Index note'))

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      )
    })

    expect(onMutated).not.toHaveBeenCalled()
  })

  it('shows a fallback toast when the backend skips indexing without a message', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null })
    parseRagIndexResult.mockReturnValue({ outcome: 'skipped', reason: null, message: null })

    render(<AIIndexNoteCard note={makeNote()} onMutated={onMutated} />)
    fireEvent.press(screen.getByText('Index note'))

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Indexing was skipped.' })
      )
    })

    expect(onMutated).not.toHaveBeenCalled()
  })

  it('restores not_indexed when skip reason is too_short', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null })
    parseRagIndexResult.mockReturnValue({
      outcome: 'skipped',
      reason: 'too_short',
      chunkCount: 0,
      message: 'Note is too short for indexing',
      debugChunks: [],
    })

    render(<AIIndexNoteCard note={makeNote()} onMutated={onMutated} />)
    fireEvent.press(screen.getByText('Index note'))

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Note is too short for indexing' })
      )
    })

    expect(onMutated).toHaveBeenCalledWith({
      noteId: 'note-1',
      previousStatus: 'not_indexed',
      nextStatus: 'not_indexed',
    })
  })
})
