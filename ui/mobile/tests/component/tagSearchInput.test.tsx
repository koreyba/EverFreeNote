import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { TagSearchInput } from '@ui/mobile/components/tags/TagSearchInput'

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      border: '#dddddd',
      foreground: '#111111',
      mutedForeground: '#777777',
      destructive: '#cc0000',
    },
  }),
}))

jest.mock('lucide-react-native', () => ({
  Search: 'Search',
  X: 'X',
}))

describe('TagSearchInput', () => {
  it('shows a clear button only when search text exists and clears it', () => {
    const onClear = jest.fn()
    const { rerender } = render(
      <TagSearchInput value="" onChangeText={jest.fn()} onClear={onClear} />
    )

    expect(screen.queryByLabelText('Clear tag search')).toBeNull()

    rerender(<TagSearchInput value="work" onChangeText={jest.fn()} onClear={onClear} />)
    fireEvent.press(screen.getByLabelText('Clear tag search'))

    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
