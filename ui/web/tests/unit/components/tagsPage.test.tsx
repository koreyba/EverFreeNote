import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TagsPage } from '@/components/features/tags/TagsPage'

describe('TagsPage Component', () => {
  const mockNotes = [
    { id: '1', tags: ['react', 'javascript', 'заметки'] },
    { id: '2', tags: ['REACT', 'typescript', 'архив'] },
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

    expect(screen.getByText('Tag Management')).toBeDefined()
    expect(screen.getByText('react')).toBeDefined()
    expect(screen.getByText('(2)')).toBeDefined()
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

    expect(screen.getByText('javascript')).toBeDefined()
    expect(screen.getByText('typescript')).toBeDefined()
    expect(screen.queryByText('архив')).toBeNull()
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
})
