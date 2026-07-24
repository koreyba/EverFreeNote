import React from 'react'
import { View } from 'react-native'
import { render, screen } from '../testUtils'
import { NoteBodyPreview } from '@ui/mobile/components/NoteBodyPreview'
import { colors as themeColors } from '@ui/mobile/lib/theme'

describe('NoteBodyPreview component', () => {
  it('renders empty View container when HTML content parses to empty string or whitespace', () => {
    const { UNSAFE_getByType, rerender } = render(
      <NoteBodyPreview html="" colors={themeColors.light} />
    )

    expect(screen.queryByText(/./)).toBeNull()
    const emptyView = UNSAFE_getByType(View)
    expect(emptyView.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: themeColors.light.background,
      })
    )

    rerender(<NoteBodyPreview html="<p>   </p>" colors={themeColors.light} />)
    expect(screen.queryByText(/./)).toBeNull()
  })

  it('renders converted plain text inside Text within ScrollView when HTML contains text', () => {
    render(<NoteBodyPreview html="<p>Hello world</p>" colors={themeColors.light} />)

    const textElement = screen.getByText('Hello world')
    expect(textElement).toBeTruthy()
  })

  it('applies proper background color and text color based on colors prop', () => {
    render(<NoteBodyPreview html="<div>Test Content</div>" colors={themeColors.light} />)

    const textElement = screen.getByText('Test Content')
    expect(textElement.props.style).toEqual(
      expect.objectContaining({
        color: themeColors.light.foreground,
        fontSize: 16,
        lineHeight: 28,
      })
    )
  })
})
