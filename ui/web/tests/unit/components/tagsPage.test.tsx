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

  it('warns before renaming a tag into an existing tag', () => {
    render(
      <TagsPage
        notes={[{ tags: ['react', 'javascript'] }]}
        onSelectTag={mockOnSelectTag}
        onRenameTag={mockOnRenameTag}
        onDeleteTag={mockOnDeleteTag}
      />
    )

    fireEvent.click(screen.getByTestId('tag-menu-trigger-react'))
    fireEvent.click(screen.getByTestId('rename-action-react'))
    fireEvent.change(screen.getByTestId('rename-tag-input'), { target: { value: 'javascript' } })
    fireEvent.click(screen.getByTestId('confirm-rename-tag-button'))

    expect(screen.getByRole('alert').textContent).toContain('merge the two tags')
    expect(mockOnRenameTag).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('confirm-rename-tag-button'))
    expect(mockOnRenameTag).toHaveBeenCalledWith('react', 'javascript')
  })

  it('confirms deleting a tag through the delete dialog', () => {
    render(
      <TagsPage
        notes={[{ tags: ['react'] }]}
        onSelectTag={mockOnSelectTag}
        onRenameTag={mockOnRenameTag}
        onDeleteTag={mockOnDeleteTag}
      />
    )

    fireEvent.click(screen.getByTestId('tag-menu-trigger-react'))
    fireEvent.click(screen.getByTestId('delete-action-react'))
    fireEvent.click(screen.getByTestId('confirm-delete-tag-button'))

    expect(mockOnDeleteTag).toHaveBeenCalledWith('react')
  })

  it('clears the rename highlight after its timeout and cleans up on unmount', () => {
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

      fireEvent.click(screen.getByTestId('tag-menu-trigger-alpha'))
      fireEvent.click(screen.getByTestId('rename-action-alpha'))
      fireEvent.change(screen.getByTestId('rename-tag-input'), { target: { value: 'beta' } })
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

      fireEvent.click(screen.getByTestId('tag-menu-trigger-beta'))
      fireEvent.click(screen.getByTestId('rename-action-beta'))
      fireEvent.change(screen.getByTestId('rename-tag-input'), { target: { value: 'gamma' } })
      fireEvent.click(screen.getByTestId('confirm-rename-tag-button'))
      unmount()

      act(() => {
        jest.advanceTimersByTime(2500)
      })
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
