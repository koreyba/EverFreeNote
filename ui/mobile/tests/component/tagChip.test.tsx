import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { TagChip } from '@ui/mobile/components/tags/TagChip'

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      secondary: '#f0f0f0',
      border: '#e0e0e0',
      secondaryForeground: '#111111',
      accent: '#dddddd',
      destructive: '#cc0000',
    },
  }),
}))

jest.mock('lucide-react-native', () => ({
  Tag: 'Tag',
  X: 'X',
}))

describe('TagChip', () => {
  it('renders the tag label', () => {
    render(<TagChip tag="work" />)

    expect(screen.getByText('work')).toBeTruthy()
  })

  it('calls onPress with tag', () => {
    const onPress = jest.fn()
    render(<TagChip tag="work" onPress={onPress} />)

    fireEvent.press(screen.getByRole('button', { name: 'Tag work' }), {
      stopPropagation: jest.fn(),
    })

    expect(onPress).toHaveBeenCalledWith('work')
  })

  it('calls onRemove with tag', () => {
    const onRemove = jest.fn()
    render(<TagChip tag="work" onRemove={onRemove} />)

    fireEvent.press(screen.getByRole('button', { name: 'Remove tag work' }), {
      stopPropagation: jest.fn(),
    })

    expect(onRemove).toHaveBeenCalledWith('work')
  })
})
