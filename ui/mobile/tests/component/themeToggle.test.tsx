import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeToggle } from '@ui/mobile/components/ThemeToggle'

const mockSetMode = jest.fn()
const mockUseTheme = jest.fn()

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => mockUseTheme(),
}))

jest.mock('lucide-react-native', () => ({
  Sun: 'Sun',
  Moon: 'Moon',
}))

const baseTheme = {
  colors: {
    foreground: '#000000',
    border: '#000000',
    card: '#ffffff',
    accent: '#eeeeee',
  },
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockSetMode.mockReset()
  })

  it('switches to dark when current scheme is light', () => {
    mockUseTheme.mockReturnValue({
      ...baseTheme,
      colorScheme: 'light',
      setMode: mockSetMode,
    })

    const { getByLabelText } = render(<ThemeToggle />)
    fireEvent.press(getByLabelText('Toggle theme'))

    expect(mockSetMode).toHaveBeenCalledWith('dark')
  })

  it('switches to light when current scheme is dark', () => {
    mockUseTheme.mockReturnValue({
      ...baseTheme,
      colorScheme: 'dark',
      setMode: mockSetMode,
    })

    const { getByLabelText } = render(<ThemeToggle />)
    fireEvent.press(getByLabelText('Toggle theme'))

    expect(mockSetMode).toHaveBeenCalledWith('light')
  })
})
