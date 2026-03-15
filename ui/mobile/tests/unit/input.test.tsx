import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

jest.mock('@ui/mobile/providers', () => {
  const { getThemeColors } = jest.requireActual('@ui/mobile/lib/theme')

  return {
    __esModule: true,
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    useTheme: () => ({
      colors: getThemeColors('light'),
      mode: 'light',
      setMode: jest.fn(),
      colorScheme: 'light',
      isHydrated: true,
    }),
  }
})

import { Input } from '@ui/mobile/components/ui/Input'

describe('Input', () => {
  it('uses Android-safe text metrics for the shared settings fields', () => {
    render(<Input placeholder="Site URL" value="" onChangeText={jest.fn()} />)

    const input = screen.getByPlaceholderText('Site URL')
    const style = StyleSheet.flatten(input.props.style)

    expect(style).toEqual(
      expect.objectContaining({
        minHeight: 48,
        paddingVertical: 10,
        lineHeight: 20,
        textAlignVertical: 'center',
      })
    )
  })
})
