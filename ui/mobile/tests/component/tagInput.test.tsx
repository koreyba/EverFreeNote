import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { TagInput } from '@ui/mobile/components/tags/TagInput'

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      primary: '#16a34a',
      secondary: '#f3f4f6',
      border: '#e5e7eb',
      accent: '#e5e7eb',
      mutedForeground: '#6b7280',
      foreground: '#111827',
      background: '#ffffff',
    },
  }),
}))

jest.mock('lucide-react-native', () => {
  const React = require('react')
  const { Text } = require('react-native')
  return {
    Plus: () => React.createElement(Text, null, 'PlusIcon'),
    Tag: () => React.createElement(Text, null, 'TagIcon'),
    X: () => React.createElement(Text, null, 'XIcon'),
  }
})

describe('TagInput', () => {
  it('renders label text, placeholder when tags is empty, and TagChips when tags is non-empty', () => {
    const { rerender } = render(
      <TagInput
        tags={[]}
        onChangeTags={jest.fn()}
        label="Custom Label"
        placeholder="Custom placeholder..."
      />
    )

    expect(screen.getByText('Custom Label')).toBeTruthy()
    expect(screen.getByText('Custom placeholder...')).toBeTruthy()

    rerender(
      <TagInput
        tags={['work', 'urgent']}
        onChangeTags={jest.fn()}
        label="Custom Label"
        placeholder="Custom placeholder..."
      />
    )

    expect(screen.getByText('work')).toBeTruthy()
    expect(screen.getByText('urgent')).toBeTruthy()
    expect(screen.queryByText('Custom placeholder...')).toBeNull()
  })

  it('invokes onChangeTags without the target tag when tag removal is triggered', () => {
    const onChangeTags = jest.fn()
    render(<TagInput tags={['work', 'personal']} onChangeTags={onChangeTags} />)

    fireEvent.press(screen.getByRole('button', { name: 'Remove tag work' }), {
      stopPropagation: jest.fn(),
    })

    expect(onChangeTags).toHaveBeenCalledTimes(1)
    expect(onChangeTags).toHaveBeenCalledWith(['personal'])
  })

  it('enters editing mode and displays text input when add button is clicked', () => {
    render(<TagInput tags={['work']} onChangeTags={jest.fn()} />)

    expect(screen.queryByPlaceholderText('tag name')).toBeNull()

    fireEvent.press(screen.getByText('PlusIcon'))

    expect(screen.getByPlaceholderText('tag name')).toBeTruthy()
  })

  it('parses comma-separated tags, deduplicates, and calls onChangeTags on submit', () => {
    const onChangeTags = jest.fn()
    render(<TagInput tags={['work']} onChangeTags={onChangeTags} />)

    fireEvent.press(screen.getByText('PlusIcon'))

    const input = screen.getByPlaceholderText('tag name')
    fireEvent.changeText(input, 'urgent, Work,  ideas, URGENT ')
    fireEvent(input, 'submitEditing')

    expect(onChangeTags).toHaveBeenCalledTimes(1)
    expect(onChangeTags).toHaveBeenCalledWith(['work', 'urgent', 'ideas'])
  })

  it('parses draft text and calls onChangeTags on blur', () => {
    const onChangeTags = jest.fn()
    render(<TagInput tags={[]} onChangeTags={onChangeTags} />)

    fireEvent.press(screen.getByText('PlusIcon'))

    const input = screen.getByPlaceholderText('tag name')
    fireEvent.changeText(input, 'finance, tax')
    fireEvent(input, 'blur')

    expect(onChangeTags).toHaveBeenCalledTimes(1)
    expect(onChangeTags).toHaveBeenCalledWith(['finance', 'tax'])
  })

  it('does not enter editing mode when disabled is true', () => {
    render(<TagInput tags={[]} onChangeTags={jest.fn()} disabled={true} />)

    fireEvent.press(screen.getByText('PlusIcon'))

    expect(screen.queryByPlaceholderText('tag name')).toBeNull()
  })
})
