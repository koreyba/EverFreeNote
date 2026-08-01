import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { AlphabeticalIndex } from '@ui/mobile/components/tags/AlphabeticalIndex'

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      border: '#dddddd',
      foreground: '#111111',
      primary: '#008000',
      primaryForeground: '#ffffff',
      accent: '#e8f5e9',
    },
  }),
}))

describe('AlphabeticalIndex', () => {
  it('selects the clicked letter instead of toggling the previous letter off', () => {
    const onSelect = jest.fn()
    render(
      <AlphabeticalIndex
        letters={['A', 'B']}
        selectedLetter="A"
        onSelect={onSelect}
      />
    )

    fireEvent.press(screen.getByLabelText('Show tags beginning with B'))

    expect(onSelect).toHaveBeenCalledWith('B')
  })

  it('marks only the selected letter as selected', () => {
    render(
      <AlphabeticalIndex
        letters={['A', 'B']}
        selectedLetter="B"
        onSelect={jest.fn()}
      />
    )

    expect(screen.getByLabelText('Show tags beginning with A').props.accessibilityState).toEqual({ selected: false })
    expect(screen.getByLabelText('Show tags beginning with B').props.accessibilityState).toEqual({ selected: true })
  })
})
