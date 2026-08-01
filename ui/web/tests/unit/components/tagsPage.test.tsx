import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TagsPage } from '@/components/features/tags/TagsPage'

describe('TagsPage Component', () => {
  const mockNotes = [
    { id: '1', tags: ['react', 'javascript', 'Ð·Ð°Ð¼ÐµÑ‚ÐºÐ¸'] },
    { id: '2', tags: ['REACT', 'typescript', 'Ð°Ñ€Ñ…Ð¸Ð²'] },
  ]

  const mockOnSelectTag = jest.fn()
  const mockOnRenameTag = jest.fn()
  const mockOnDeleteTag = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    })
  })

  it('renders tag list with counts and total count header', () => {
    render(
      <TagsPage
        notes={mockNotes}
        onSelectTag={mockOnSelectTag}
        onRenameTag={mockOnRenameTag}
        onDeleteTag={mockOnDeleteTag}
      />
    )

    expect(screen.getByText('Tag Management')).toBeTruthy()
    expect(screen.getByText('react')).toBeTruthy()
    expect(screen.getByText('(2)')).toBeTruthy()
  })

  it('filters tags when searching', () => {
    render(
      <TagsPage
        notes={mockNotes}
        onSelectTag={mockOnSelectTag}
        onRenameTag={mockOnRenameTag}
        onDeleteTag={mockOnDeleteTag}
      />
    )

    const searchInput = screen.getByTestId('tags-search-input')
    fireEvent.change(searchInput, { target: { value: 'script' } })

    expect(screen.getByText('javascript')).toBeTruthy()
    expect(screen.getByText('typescript')).toBeTruthy()
    expect(screen.queryByText('Ð°Ñ€Ñ…Ð¸Ð²')).toBeNull()
  })

  it('clears the tag search and restores all tags', () => {
    render(
      <TagsPage
        notes={mockNotes}
        onSelectTag={mockOnSelectTag}
        onRenameTag={mockOnRenameTag}
        onDeleteTag={mockOnDeleteTag}
      />
    )

    const searchInput = screen.getByTestId('tags-search-input')
    fireEvent.change(searchInput, { target: { value: 'script' } })

    expect(screen.getByTestId('tags-search-clear')).toBeTruthy()
    fireEvent.click(screen.getByTestId('tags-search-clear'))

    expect((searchInput as HTMLInputElement).value).toBe('')
    expect(screen.getByText('react')).toBeTruthy()
    expect(screen.getByText('typescript')).toBeTruthy()
  })

  it('triggers onSelectTag when a tag card is clicked', () => {
    render(
      <TagsPage
        notes={mockNotes}
        onSelectTag={mockOnSelectTag}
        onRenameTag={mockOnRenameTag}
        onDeleteTag={mockOnDeleteTag}
      />
    )

    const tagCard = screen.getByTestId('select-tag-react')
    fireEvent.click(tagCard)

    expect(mockOnSelectTag).toHaveBeenCalledWith('react')
  })

  it('keeps the newly selected letter active when switching letters', () => {
    render(
      <TagsPage
        notes={[{ tags: ['alpha', 'beta'] }]}
        onSelectTag={mockOnSelectTag}
        onRenameTag={mockOnRenameTag}
        onDeleteTag={mockOnDeleteTag}
      />
    )

    fireEvent.click(screen.getByTestId('letter-jump-A'))
    expect(screen.getByTestId('select-tag-alpha')).toBeTruthy()
    expect(screen.queryByTestId('select-tag-beta')).toBeNull()

    fireEvent.click(screen.getByTestId('letter-jump-B'))
    expect(screen.getByTestId('select-tag-beta')).toBeTruthy()
    expect(screen.queryByTestId('select-tag-alpha')).toBeNull()
  })

  it('warns before renaming a tag into an existing tag', async () => {
    render(
      <TagsPage
        notes={[{ tags: ['react', 'javascript'] }]}
        onSelectTag={mockOnSelectTag}
        onRenameTag={mockOnRenameTag}
        onDeleteTag={mockOnDeleteTag}
      />
    )

    fireEvent.keyDown(screen.getByTestId('tag-menu-trigger-react'), { key: 'Enter' })
    fireEvent.click(await screen.findByTestId('rename-action-react'))
    fireEvent.change(await screen.findByTestId('rename-tag-input'), { target: { value: 'javascript' } })
    fireEvent.click(screen.getByTestId('confirm-rename-tag-button'))

    expect(screen.getByRole('alert').textContent).toContain('merge the two tags')
    expect(mockOnRenameTag).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('confirm-rename-tag-button'))
    expect(mockOnRenameTag).toHaveBeenCalledWith('react', 'javascript')
  })

  it('confirms deleting a tag through the delete dialog', async () => {
    render(
      <TagsPage
        notes={[{ tags: ['react'] }]}
        onSelectTag={mockOnSelectTag}
        onRenameTag={mockOnRenameTag}
        onDeleteTag={mockOnDeleteTag}
      />
    )

    fireEvent.keyDown(screen.getByTestId('tag-menu-trigger-react'), { key: 'Enter' })
    fireEvent.click(await screen.findByTestId('delete-action-react'))
    fireEvent.click(await screen.findByTestId('confirm-delete-tag-button'))

    expect(mockOnDeleteTag).toHaveBeenCalledWith('react')
  })

  it('clears the rename highlight after its timeout and cleans up on unmount', async () => {
    jest.useFakeTimers()
    try {
      const { rerender, unmount } = render(
        <TagsPage
          notes={[{ tags: ['alpha'] }]}
          onSelectTag={mockOnSelectTag}
          onRenameTag={mockOnRenameTag}
          onDeleteTag={mockOnDeleteTag}
        />
      )

      fireEvent.keyDown(screen.getByTestId('tag-menu-trigger-alpha'), { key: 'Enter' })
      fireEvent.click(await screen.findByTestId('rename-action-alpha'))
      fireEvent.change(await screen.findByTestId('rename-tag-input'), { target: { value: 'beta' } })
      fireEvent.click(screen.getByTestId('confirm-rename-tag-button'))

      rerender(
        <TagsPage
          notes={[{ tags: ['beta'] }]}
          onSelectTag={mockOnSelectTag}
          onRenameTag={mockOnRenameTag}
          onDeleteTag={mockOnDeleteTag}
        />
      )
      expect(screen.getByText('Updated')).toBeTruthy()

      act(() => {
        jest.advanceTimersByTime(2500)
      })
      expect(screen.queryByText('Updated')).toBeNull()

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
      fireEvent.keyDown(screen.getByTestId('tag-menu-trigger-beta'), { key: 'Enter' })
      fireEvent.click(await screen.findByTestId('rename-action-beta'))
      fireEvent.change(await screen.findByTestId('rename-tag-input'), { target: { value: 'gamma' } })
      fireEvent.click(screen.getByTestId('confirm-rename-tag-button'))
      unmount()

      act(() => {
        jest.advanceTimersByTime(2500)
      })
      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    } finally {
      jest.useRealTimers()
    }
  })

  it('shows an empty state when there are no tags', () => {
    render(
      <TagsPage
        notes={[]}
        onSelectTag={mockOnSelectTag}
        onRenameTag={mockOnRenameTag}
        onDeleteTag={mockOnDeleteTag}
      />
    )

    expect(screen.getByText('No tags found')).toBeTruthy()
  })
})

