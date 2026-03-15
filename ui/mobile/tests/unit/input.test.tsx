import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { getThemeColors } from '@ui/mobile/lib/theme'

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

  it('maps disabled to a non-editable text input', () => {
    render(<Input placeholder="Gemini API Key" value="" onChangeText={jest.fn()} disabled />)

    const input = screen.getByPlaceholderText('Gemini API Key')
    const style = StyleSheet.flatten(input.props.style)

    expect(input.props.editable).toBe(false)
    expect(style).toEqual(expect.objectContaining({ opacity: 0.65 }))
  })

  it('renders labels and error state styling', () => {
    render(
      <Input
        label="Site URL"
        error="Required"
        placeholder="https://example.com"
        value=""
        onChangeText={jest.fn()}
      />
    )

    const input = screen.getByPlaceholderText('https://example.com')
    const style = StyleSheet.flatten(input.props.style)

    expect(screen.getByText('Site URL')).toBeTruthy()
    expect(screen.getByText('Required')).toBeTruthy()
    expect(style).toEqual(
      expect.objectContaining({ borderColor: getThemeColors('light').destructive })
    )
  })

  it('respects editable=false even without disabled', () => {
    render(<Input placeholder="Username" value="" onChangeText={jest.fn()} editable={false} />)

    const input = screen.getByPlaceholderText('Username')

    expect(input.props.editable).toBe(false)
  })
})
