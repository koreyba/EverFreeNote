import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { EditorToolbar } from '@ui/mobile/components/EditorToolbar'

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      foreground: '#000000',
      background: '#ffffff',
      border: '#cccccc',
      accent: '#eeeeee',
    },
  }),
}))

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native')
  const icon = (name: string) => ({ testID }: { testID?: string }) => <View testID={testID ?? name} />
  return {
    Bold: icon('Bold'),
    Italic: icon('Italic'),
    Underline: icon('Underline'),
    List: icon('List'),
    ListOrdered: icon('ListOrdered'),
    Heading1: icon('Heading1'),
    Heading2: icon('Heading2'),
    Minus: icon('Minus'),
    Quote: icon('Quote'),
    Code: icon('Code'),
  }
})

describe('EditorToolbar — MD button', () => {
  it('renders the MD button', () => {
    const { getByLabelText } = render(
      <EditorToolbar onCommand={jest.fn()} />
    )

    expect(getByLabelText('Apply as Markdown')).toBeTruthy()
  })

  it('is disabled by default (hasSelection not provided)', () => {
    const { getByLabelText } = render(
      <EditorToolbar onCommand={jest.fn()} />
    )

    const button = getByLabelText('Apply as Markdown')
    expect(button.props.accessibilityState?.disabled).toBe(true)
  })

  it('is disabled when hasSelection=false', () => {
    const { getByLabelText } = render(
      <EditorToolbar onCommand={jest.fn()} hasSelection={false} />
    )

    const button = getByLabelText('Apply as Markdown')
    expect(button.props.accessibilityState?.disabled).toBe(true)
  })

  it('is enabled when hasSelection=true', () => {
    const { getByLabelText } = render(
      <EditorToolbar onCommand={jest.fn()} hasSelection={true} />
    )

    const button = getByLabelText('Apply as Markdown')
    expect(button.props.accessibilityState?.disabled).toBe(false)
  })

  it('calls onCommand("applySelectionAsMarkdown") when pressed with selection', () => {
    const onCommand = jest.fn()
    const { getByLabelText } = render(
      <EditorToolbar onCommand={onCommand} hasSelection={true} />
    )

    fireEvent.press(getByLabelText('Apply as Markdown'))

    expect(onCommand).toHaveBeenCalledTimes(1)
    expect(onCommand).toHaveBeenCalledWith('applySelectionAsMarkdown')
  })

  it('does not call onCommand when disabled (hasSelection=false)', () => {
    const onCommand = jest.fn()
    const { getByLabelText } = render(
      <EditorToolbar onCommand={onCommand} hasSelection={false} />
    )

    fireEvent.press(getByLabelText('Apply as Markdown'))

    expect(onCommand).not.toHaveBeenCalled()
  })

  it('displays "MD" label text', () => {
    const { getByText } = render(
      <EditorToolbar onCommand={jest.fn()} />
    )

    expect(getByText('MD')).toBeTruthy()
  })
})
