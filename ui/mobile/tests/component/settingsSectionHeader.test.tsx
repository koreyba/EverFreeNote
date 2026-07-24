import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { SettingsSectionHeader } from '@ui/mobile/components/settings/SettingsSectionHeader'

const mockColors = {
  mutedForeground: '#6b7280',
}

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: mockColors,
  }),
}))

describe('SettingsSectionHeader', () => {
  it('renders title string in uppercase format', () => {
    render(<SettingsSectionHeader title="account settings" />)

    expect(screen.getByText('ACCOUNT SETTINGS')).toBeTruthy()
  })

  it('applies colors.mutedForeground to text style', () => {
    render(<SettingsSectionHeader title="general" />)

    const textElement = screen.getByText('GENERAL')

    expect(textElement.props.style).toEqual(
      expect.objectContaining({
        color: mockColors.mutedForeground,
      })
    )
  })
})
