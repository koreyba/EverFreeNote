import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { TagList } from '@ui/mobile/components/tags/TagList'

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

describe('TagList', () => {
  it('renders nothing when tags are empty', () => {
    const { toJSON } = render(<TagList tags={[]} />)

    expect(toJSON()).toBeNull()
  })

  it('shows overflow count when maxVisible is set', () => {
    render(<TagList tags={['one', 'two', 'three']} maxVisible={2} />)

    expect(screen.getByText('+1')).toBeTruthy()
  })

  it('hides overflow count when showOverflowCount is false', () => {
    render(
      <TagList tags={['one', 'two', 'three']} maxVisible={2} showOverflowCount={false} />
    )

    expect(screen.queryByText('+1')).toBeNull()
  })

  it('calls onTagPress with tag', () => {
    const onTagPress = jest.fn()
    render(<TagList tags={['alpha']} onTagPress={onTagPress} />)

    fireEvent.press(screen.getByRole('button', { name: 'Tag alpha' }), {
      stopPropagation: jest.fn(),
    })

    expect(onTagPress).toHaveBeenCalledWith('alpha')
  })
})
