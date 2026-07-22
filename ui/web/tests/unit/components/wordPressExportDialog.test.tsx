import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WordPressExportDialog } from '@/components/features/wordpress/WordPressExportDialog'
import { WordPressBridgeError } from '@core/services/wordpressExport'

const mockGetCategories = jest.fn()
const mockExportNote = jest.fn()
const mockGetStatus = jest.fn()
const mockGetUser = jest.fn()
const mockPreferenceUpsert = jest.fn()
const mockNoteUpdate = jest.fn()
const mockNoteUpdateEq = jest.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: jest.fn((table: string) => {
    if (table === 'wordpress_export_preferences') return { upsert: mockPreferenceUpsert }
    return { update: mockNoteUpdate }
  }),
}

jest.mock('@core/services/wordpressExport', () => ({
  WordPressExportService: jest.fn().mockImplementation(() => ({
    getCategories: mockGetCategories,
    exportNote: mockExportNote,
  })),
  WordPressBridgeError: class WordPressBridgeError extends Error {},
}))
jest.mock('@core/services/wordpressSettings', () => ({
  WordPressSettingsService: jest.fn().mockImplementation(() => ({ getStatus: mockGetStatus })),
}))
jest.mock('@ui/web/providers/SupabaseProvider', () => ({
  useSupabase: () => ({ supabase: mockSupabase }),
}))

const note = {
  id: 'note-1',
  title: 'Café Notes',
  description: 'Body',
  tags: ['Existing', 'existing', 'travel'],
}

function renderDialog(overrides: { open?: boolean; onOpenChange?: jest.Mock } = {}) {
  return render(
    <WordPressExportDialog
      note={note}
      open={overrides.open ?? true}
      onOpenChange={overrides.onOpenChange ?? jest.fn()}
    />,
  )
}

describe('WordPressExportDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCategories.mockResolvedValue({
      categories: [{ id: 1, name: 'Tech' }, { id: 2, name: 'Travel' }],
      rememberedCategoryIds: [2],
    })
    mockGetStatus.mockResolvedValue({ integration: { siteUrl: 'https://blog.example.com/' } })
    mockExportNote.mockResolvedValue({ postId: 42, postUrl: 'https://blog.example.com/cafe-notes', slug: 'cafe-notes' })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPreferenceUpsert.mockResolvedValue({ error: null })
    mockNoteUpdate.mockReturnValue({ eq: mockNoteUpdateEq })
    mockNoteUpdateEq.mockResolvedValue({ error: null })
  })

  it('loads categories and remembered settings, edits tags, and persists category changes', async () => {
    renderDialog()

    expect(screen.getByRole('heading', { name: 'Export to WordPress' })).toBeTruthy()
    expect(screen.getByDisplayValue('Café Notes')).toBeTruthy()
    expect(screen.getByDisplayValue('cafe-notes')).toBeTruthy()
    expect(screen.getByText('Loading categories...')).toBeTruthy()

    await waitFor(() => expect(screen.getByLabelText('Travel')).toBeTruthy())
    expect(screen.getByLabelText('Travel').getAttribute('data-state')).toBe('checked')
    expect(screen.getByLabelText('Tech').getAttribute('data-state')).toBe('unchecked')

    fireEvent.click(screen.getByLabelText('Tech'))
    await waitFor(() => expect(mockPreferenceUpsert).toHaveBeenCalledWith(
      { user_id: 'user-1', remembered_category_ids: [2, 1] },
      { onConflict: 'user_id' },
    ))

    fireEvent.change(screen.getByPlaceholderText('Add tag'), { target: { value: 'New Tag' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Add tag'), { key: 'Enter' })
    expect(screen.getByText('New Tag')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag New Tag' }))
    expect(screen.queryByText('New Tag')).toBeNull()
  })

  it('rejects an invalid slug before starting an export', async () => {
    renderDialog()
    await waitFor(() => expect(screen.getByLabelText('Travel')).toBeTruthy())
    fireEvent.change(screen.getByDisplayValue('cafe-notes'), { target: { value: 'Bad Slug' } })
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    expect(await screen.findByText('Use lowercase latin letters, digits, and hyphen only.')).toBeTruthy()
    expect(mockExportNote).not.toHaveBeenCalled()
  })

  it('exports successfully and adds the site published tag to the note', async () => {
    renderDialog()
    await waitFor(() => expect(screen.getByLabelText('Travel')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => expect(mockExportNote).toHaveBeenCalledWith({
      noteId: 'note-1',
      categoryIds: [2],
      tags: ['Existing', 'travel'],
      title: note.title,
      slug: 'cafe-notes',
      status: 'publish',
    }))
    expect(mockNoteUpdate).toHaveBeenCalledWith({ tags: ['Existing', 'travel', 'blog.example.com_published'] })
    expect(mockNoteUpdateEq).toHaveBeenCalledWith('id', 'note-1')
    expect(await screen.findByText('Post published (ID: 42).')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Open post/ }).getAttribute('href')).toBe('https://blog.example.com/cafe-notes')
  })

  it('keeps export success while reporting a published-tag update failure', async () => {
    mockNoteUpdateEq.mockResolvedValueOnce({ error: new Error('note update unavailable') })
    renderDialog()
    await waitFor(() => expect(screen.getByLabelText('Travel')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    expect(await screen.findByText('Post published, but failed to update note tag: note update unavailable')).toBeTruthy()
    expect(screen.getByText('Post published (ID: 42).')).toBeTruthy()
  })

  it('does not update note tags when the published-tag checkbox is cleared', async () => {
    renderDialog()
    await waitFor(() => expect(screen.getByLabelText('Travel')).toBeTruthy())
    fireEvent.click(screen.getByLabelText('Add published tag to the note'))
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => expect(mockExportNote).toHaveBeenCalled())
    expect(mockNoteUpdate).not.toHaveBeenCalled()
    expect(screen.getByText('Post published (ID: 42).')).toBeTruthy()
  })

  it('shows bridge and generic export failures and clears submitting state', async () => {
    mockExportNote.mockRejectedValueOnce(new WordPressBridgeError('Bridge rejected export'))
    renderDialog()
    await waitFor(() => expect(screen.getByLabelText('Travel')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    expect(await screen.findByText('Bridge rejected export')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy()

    mockExportNote.mockRejectedValueOnce('unknown failure')
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    expect(await screen.findByText('Export failed')).toBeTruthy()
  })

  it('shows category errors and treats a missing preference user as a no-op', async () => {
    mockGetCategories.mockRejectedValueOnce(new Error('Categories unavailable'))
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    renderDialog()

    expect(await screen.findByText('Categories unavailable')).toBeTruthy()
    mockGetCategories.mockResolvedValueOnce({ categories: [], rememberedCategoryIds: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(await screen.findByText('No categories returned by WordPress.')).toBeTruthy()
    expect(mockPreferenceUpsert).not.toHaveBeenCalled()
  })

  it('notifies the parent when the close button is clicked', async () => {
    const onOpenChange = jest.fn()
    renderDialog({ onOpenChange })
    await waitFor(() => expect(screen.getByLabelText('Travel')).toBeTruthy())

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
