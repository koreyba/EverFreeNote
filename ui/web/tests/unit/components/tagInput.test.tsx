import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { TagInput } from '@/components/TagInput'

describe('TagInput', () => {
  const renderTagInput = (overrides: Partial<React.ComponentProps<typeof TagInput>> = {}) => {
    const onAddTags = jest.fn()
    const onRemoveTag = jest.fn()
    const onTagClick = jest.fn()
    const onQueryChange = jest.fn()

    const view = render(
      <TagInput
        tags={['Work', 'Personal']}
        onAddTags={onAddTags}
        onRemoveTag={onRemoveTag}
        onTagClick={onTagClick}
        onQueryChange={onQueryChange}
        {...overrides}
      />,
    )

    return { ...view, onAddTags, onRemoveTag, onTagClick, onQueryChange }
  }

  afterEach(() => {
    jest.useRealTimers()
  })

  it('opens editing from the add button and focuses the input', () => {
    jest.useFakeTimers()
    renderTagInput()

    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    const input = screen.getByPlaceholderText('Add tag...')

    expect(input).toBeTruthy()
    act(() => jest.runOnlyPendingTimers())
    expect(document.activeElement).toBe(input)
  })

  it('normalizes comma-separated tags on Enter and clears the query', () => {
    const { onAddTags, onQueryChange } = renderTagInput()
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    const input = screen.getByPlaceholderText('Add tag...')

    fireEvent.change(input, { target: { value: ' Alpha, BETA, ,  ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onAddTags).toHaveBeenCalledWith(['alpha', 'beta'])
    expect(onQueryChange).toHaveBeenNthCalledWith(1, ' Alpha, BETA, ,  ')
    expect(onQueryChange).toHaveBeenLastCalledWith('')
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('commits a non-empty value on blur and ignores whitespace-only values', () => {
    const { onAddTags } = renderTagInput()
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    const input = screen.getByPlaceholderText('Add tag...')

    fireEvent.change(input, { target: { value: '  Project  ' } })
    fireEvent.blur(input)
    expect(onAddTags).toHaveBeenCalledWith(['project'])
    expect(screen.queryByPlaceholderText('Add tag...')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    fireEvent.change(screen.getByPlaceholderText('Add tag...'), { target: { value: '   ' } })
    fireEvent.blur(screen.getByPlaceholderText('Add tag...'))
    expect(onAddTags).toHaveBeenCalledTimes(1)
  })

  it('supports escape, suggestion selection, and the two-step backspace removal', () => {
    const { onAddTags, onRemoveTag, onQueryChange } = renderTagInput({ suggestions: ['Travel'] })
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    let input = screen.getByPlaceholderText('Add tag...')

    fireEvent.change(input, { target: { value: 'draft' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByPlaceholderText('Add tag...')).toBeNull()
    expect(onAddTags).not.toHaveBeenCalled()
    expect(onQueryChange).toHaveBeenLastCalledWith('')

    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    input = screen.getByPlaceholderText('Add tag...')
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(screen.getByText('Personal').closest('[data-cy="interactive-tag"]')?.className).toContain('ring-2')
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(onRemoveTag).toHaveBeenCalledWith('Personal')

    fireEvent.click(screen.getByRole('button', { name: 'Travel' }))
    expect(onAddTags).toHaveBeenCalledWith(['Travel'])
    expect((screen.getByPlaceholderText('Add tag...') as HTMLInputElement).value).toBe('')
  })

  it('forwards tag clicks and keeps removal clicks from selecting the tag', () => {
    const { onRemoveTag, onTagClick } = renderTagInput()

    fireEvent.click(screen.getByText('Work'))
    expect(onTagClick).toHaveBeenCalledWith('Work')

    fireEvent.click(screen.getByRole('button', { name: 'Remove tag "Work"' }))
    expect(onRemoveTag).toHaveBeenCalledWith('Work')
    expect(onTagClick).toHaveBeenCalledTimes(1)
  })

  it('does not enter editing when disabled, including keyboard activation', () => {
    const { onAddTags } = renderTagInput({ disabled: true })
    const container = screen.getByTestId('tag-input-container')

    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    fireEvent.keyDown(container, { key: 'Enter' })

    expect(screen.queryByPlaceholderText('Add tag...')).toBeNull()
    expect(screen.getByRole('button', { name: 'Add tag' })).toHaveProperty('disabled', true)
    expect(onAddTags).not.toHaveBeenCalled()
  })
})
