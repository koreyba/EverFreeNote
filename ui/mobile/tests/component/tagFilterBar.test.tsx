import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { TagFilterBar } from '@ui/mobile/components/tags/TagFilterBar'

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      secondary: '#f0f0f0',
      border: '#e0e0e0',
      secondaryForeground: '#111111',
      accent: '#dddddd',
      destructive: '#cc0000',
      foreground: '#000000',
    },
  }),
}))

jest.mock('lucide-react-native', () => ({
  Tag: 'Tag',
  X: 'X',
}))

describe('TagFilterBar component', () => {
  it('returns null when tag prop is null', () => {
    const { UNSAFE_root } = render(<TagFilterBar tag={null} onClear={jest.fn()} />)
    expect(UNSAFE_root.children).toHaveLength(0)
    expect(screen.queryByText('Clear Tags')).toBeNull()
  })

  it('renders TagChip with active tag string and Clear Tags button when tag is provided', () => {
    render(<TagFilterBar tag="projects" onClear={jest.fn()} />)

    expect(screen.getByText('projects')).toBeTruthy()
    expect(screen.getByText('Clear Tags')).toBeTruthy()
  })

  it('triggers onClear callback when Clear Tags button is pressed', () => {
    const onClearMock = jest.fn()
    render(<TagFilterBar tag="urgent" onClear={onClearMock} />)

    const clearButton = screen.getByText('Clear Tags')
    fireEvent.press(clearButton)

    expect(onClearMock).toHaveBeenCalledTimes(1)
  })
})
