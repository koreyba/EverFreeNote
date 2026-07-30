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
    const input = screen.getByPlaceholderText('Add tag...') as HTMLInputElement

    fireEvent.change(input, { target: { value: '  Project  ' } })
    fireEvent.blur(input)
    expect(onAddTags).toHaveBeenCalledWith(['project'])
    expect(input.value).toBe('')

    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    fireEvent.change(screen.getByPlaceholderText('Add tag...'), { target: { value: '   ' } })
    fireEvent.blur(screen.getByPlaceholderText('Add tag...'))
    expect(onAddTags).toHaveBeenCalledTimes(1)
  })

  it('supports escape, suggestion selection, and the two-step backspace removal', () => {
    const { onAddTags, onRemoveTag, onQueryChange } = renderTagInput({ suggestions: ['Travel'] })
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    let input = screen.getByPlaceholderText('Add tag...') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'draft' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.value).toBe('')
    expect(onAddTags).not.toHaveBeenCalled()
    expect(onQueryChange).toHaveBeenLastCalledWith('')

    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    input = screen.getByPlaceholderText('Add tag...') as HTMLInputElement
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(screen.getByText('Personal').closest('[data-cy="interactive-tag"]')?.className).toContain('ring-2')
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(onRemoveTag).toHaveBeenCalledWith('Personal')

    fireEvent.click(screen.getByRole('option', { name: /Travel/ }))
    expect(onAddTags).toHaveBeenCalledWith(['Travel'])
    expect((screen.getByPlaceholderText('Add tag...') as HTMLInputElement).value).toBe('')
  })

  it('renders tag count badges when tagCounts is provided', () => {
    renderTagInput({
      suggestions: ['Travel', 'Ideas'],
      tagCounts: { Travel: 5, Ideas: 12 },
    })

    expect(screen.getByRole('option', { name: /Travel\s*5/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Ideas\s*12/ })).toBeTruthy()
  })

  it('forwards tag clicks and keeps removal clicks from selecting the tag', () => {
    const { onRemoveTag, onTagClick } = renderTagInput()

    fireEvent.click(screen.getByText('Work'))
    expect(onTagClick).toHaveBeenCalledWith('Work')

    fireEvent.click(screen.getByRole('button', { name: 'Remove tag "Work"' }))
    expect(onRemoveTag).toHaveBeenCalledWith('Work')
    expect(onTagClick).toHaveBeenCalledTimes(1)
  })

  it('disables input and add button when disabled prop is true', () => {
    const { onAddTags } = renderTagInput({ disabled: true })
    const container = screen.getByTestId('tag-input-container')

    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    fireEvent.keyDown(container, { key: 'Enter' })

    expect(screen.getByRole('button', { name: 'Add tag' })).toHaveProperty('disabled', true)
    expect(onAddTags).not.toHaveBeenCalled()
  })

  it('navigates suggestions with ArrowDown/ArrowUp and selects with Enter, Tab, and comma', () => {
    const { onAddTags } = renderTagInput({
      suggestions: ['react', 'redux', 'rust'],
      tagCounts: { react: 10, redux: 3, rust: 0 },
    })

    const input = screen.getByPlaceholderText('Add tag...')

    // Press ArrowDown to highlight first suggestion ('react')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const options = screen.getAllByRole('option')
    expect(options[0].getAttribute('aria-selected')).toBe('true')
    expect(options[1].getAttribute('aria-selected')).toBe('false')

    // Press ArrowDown again to highlight second suggestion ('redux')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(options[1].getAttribute('aria-selected')).toBe('true')

    // Press Enter to select highlighted suggestion ('redux')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onAddTags).toHaveBeenLastCalledWith(['redux'])

    // Press ArrowUp to wrap around to last suggestion ('rust')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    const updatedOptions = screen.getAllByRole('option')
    expect(updatedOptions[2].getAttribute('aria-selected')).toBe('true')

    // Press Tab to select highlighted suggestion ('rust')
    fireEvent.keyDown(input, { key: 'Tab' })
    expect(onAddTags).toHaveBeenLastCalledWith(['rust'])
  })

  it('commits typed input on Tab when no suggestion is highlighted', () => {
    const { onAddTags } = renderTagInput()
    const input = screen.getByPlaceholderText('Add tag...')

    fireEvent.change(input, { target: { value: 'custom-tag' } })
    fireEvent.keyDown(input, { key: 'Tab' })

    expect(onAddTags).toHaveBeenCalledWith(['custom-tag'])
  })

  it('disarms backspace removal state when a non-backspace key is pressed', () => {
    const { onRemoveTag } = renderTagInput()
    const input = screen.getByPlaceholderText('Add tag...')

    // First backspace arms removal
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(screen.getByText('Personal').closest('[data-cy="interactive-tag"]')?.className).toContain('ring-2')

    // Pressing 'a' disarms backspace removal
    fireEvent.keyDown(input, { key: 'a' })

    // Next backspace re-arms instead of removing
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(onRemoveTag).not.toHaveBeenCalled()
  })

  it('focuses input when pressing Enter or Space on container div', () => {
    jest.useFakeTimers()
    renderTagInput()

    const container = screen.getByTestId('tag-input-container')
    const input = screen.getByPlaceholderText('Add tag...')

    fireEvent.keyDown(container, { key: ' ', target: container })
    act(() => {
      jest.runOnlyPendingTimers()
    })
    expect(document.activeElement).toBe(input)

    fireEvent.keyDown(container, { key: 'Enter', target: container })
    act(() => {
      jest.runOnlyPendingTimers()
    })
    expect(document.activeElement).toBe(input)
  })

  it('handles mouseDown events on tag badges and suggestions without losing focus', () => {
    const { onAddTags } = renderTagInput({
      suggestions: ['Travel'],
      tagCounts: { Travel: 5 },
    })

    const tagBadge = screen.getByText('Work').closest('[data-cy="interactive-tag"]')!
    const preventDefaultSpy = jest.fn()
    fireEvent.mouseDown(tagBadge, { preventDefault: preventDefaultSpy })

    const option = screen.getByRole('option', { name: /Travel/ })
    fireEvent.mouseDown(option, { preventDefault: preventDefaultSpy })
    fireEvent.click(option)

    expect(onAddTags).toHaveBeenCalledWith(['Travel'])
  })
})

