import React from 'react'
import { View } from 'react-native'
import { render, screen, createMockTheme } from '../testUtils'
import { ComingSoonBadge } from '@ui/mobile/components/settings/ComingSoonBadge'

const mockThemeColors = {
  ...createMockTheme().colors,
  muted: '#f5f5f5',
  mutedForeground: '#777777',
}

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: mockThemeColors,
  }),
}))

describe('ComingSoonBadge component', () => {
  it('renders "Soon" text inside the badge', () => {
    render(<ComingSoonBadge />)

    expect(screen.getByText('Soon')).toBeTruthy()
  })

  it('applies colors.muted background style and colors.mutedForeground text style from useTheme', () => {
    const { UNSAFE_getByType } = render(<ComingSoonBadge />)

    const textElement = screen.getByText('Soon')
    expect(textElement.props.style).toEqual(
      expect.objectContaining({
        color: '#777777',
        fontSize: 11,
      })
    )

    const badgeContainer = UNSAFE_getByType(View)
    expect(badgeContainer.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: '#f5f5f5',
      })
    )
  })
})
