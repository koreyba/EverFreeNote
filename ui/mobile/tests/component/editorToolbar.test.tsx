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
      card: '#ffffff',
      primary: '#228822',
      primaryForeground: '#ffffff',
      secondary: '#f3f3f3',
      secondaryForeground: '#000000',
      mutedForeground: '#666666',
      destructive: '#cc0000',
      destructiveForeground: '#ffffff',
      ring: '#116611',
    },
  }),
}))

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native')
  const icon = (name: string) => ({ testID }: { testID?: string }) => <View testID={testID ?? name} />
  return {
    Bold: icon('Bold'),
    Italic: icon('Italic'),
    Strikethrough: icon('Strikethrough'),
    Underline: icon('Underline'),
    Minus: icon('Minus'),
    List: icon('List'),
    ListOrdered: icon('ListOrdered'),
    Quote: icon('Quote'),
    Code: icon('Code'),
  }
})

describe('EditorToolbar', () => {
  it('renders the MD button', () => {
    const { getByLabelText } = render(<EditorToolbar onCommand={jest.fn()} />)

    expect(getByLabelText('Apply as Markdown')).toBeTruthy()
  })

  it('keeps the MD button disabled without selection', () => {
    const onCommand = jest.fn()
    const { getByLabelText } = render(<EditorToolbar onCommand={onCommand} hasSelection={false} />)
    const button = getByLabelText('Apply as Markdown')

    expect(button.props.accessibilityState?.disabled).toBe(true)
    fireEvent.press(button)
    expect(onCommand).not.toHaveBeenCalled()
  })

  it('enables and triggers the MD button with selection', () => {
    const onCommand = jest.fn()
    const { getByLabelText } = render(<EditorToolbar onCommand={onCommand} hasSelection={true} />)

    fireEvent.press(getByLabelText('Apply as Markdown'))

    expect(onCommand).toHaveBeenCalledWith('applySelectionAsMarkdown', undefined)
  })

  it('opens heading menu and sends selected heading command', () => {
    const onCommand = jest.fn()
    const { getByLabelText, getByText } = render(<EditorToolbar onCommand={onCommand} />)

    fireEvent.press(getByLabelText('Open heading menu'))
    fireEvent.press(getByText('H3'))

    expect(onCommand).toHaveBeenCalledWith('toggleHeadingLevel', [3])
  })

  it('opens alignment menu and sends align command', () => {
    const onCommand = jest.fn()
    const { getByLabelText, getByText } = render(<EditorToolbar onCommand={onCommand} />)

    fireEvent.press(getByLabelText('Open alignment menu'))
    fireEvent.press(getByText('Center'))

    expect(onCommand).toHaveBeenCalledWith('setTextAlign', ['center'])
  })

  it('opens font size menu and sends size command', () => {
    const onCommand = jest.fn()
    const { getByLabelText, getByText } = render(<EditorToolbar onCommand={onCommand} />)

    fireEvent.press(getByLabelText('Open font size menu'))
    fireEvent.press(getByText('24'))

    expect(onCommand).toHaveBeenCalledWith('setFontSize', ['24pt'])
  })

  it('sends clear formatting command', () => {
    const onCommand = jest.fn()
    const { getByLabelText, getByText } = render(<EditorToolbar onCommand={onCommand} />)

    expect(getByText('Clear')).toBeTruthy()

    fireEvent.press(getByLabelText('Clear formatting'))

    expect(onCommand).toHaveBeenCalledWith('clearFormatting', undefined)
  })

  it('blurs editor before opening link/image menus', () => {
    const onCommand = jest.fn()
    const { getByLabelText } = render(<EditorToolbar onCommand={onCommand} />)

    fireEvent.press(getByLabelText('Open link menu'))
    fireEvent.press(getByLabelText('Open image menu'))

    expect(onCommand).toHaveBeenNthCalledWith(1, 'blur', undefined)
    expect(onCommand).toHaveBeenNthCalledWith(2, 'blur', undefined)
  })

  it('reports menu visibility changes', () => {
    const onMenuVisibilityChange = jest.fn()
    const { getByLabelText } = render(
      <EditorToolbar onCommand={jest.fn()} onMenuVisibilityChange={onMenuVisibilityChange} />
    )

    expect(onMenuVisibilityChange).toHaveBeenLastCalledWith(false)

    fireEvent.press(getByLabelText('Open link menu'))
    expect(onMenuVisibilityChange).toHaveBeenLastCalledWith(true)

    fireEvent.press(getByLabelText('Open link menu'))
    expect(onMenuVisibilityChange).toHaveBeenLastCalledWith(false)
  })

  it('sends horizontal rule command', () => {
    const onCommand = jest.fn()
    const { getByLabelText } = render(<EditorToolbar onCommand={onCommand} />)

    fireEvent.press(getByLabelText('Horizontal rule'))

    expect(onCommand).toHaveBeenCalledWith('setHorizontalRule', undefined)
  })

  it('sends strikethrough command', () => {
    const onCommand = jest.fn()
    const { getByLabelText } = render(<EditorToolbar onCommand={onCommand} />)

    fireEvent.press(getByLabelText('Strikethrough'))

    expect(onCommand).toHaveBeenCalledWith('toggleStrike', undefined)
  })

  it('sends task list command', () => {
    const onCommand = jest.fn()
    const { getByLabelText } = render(<EditorToolbar onCommand={onCommand} />)

    fireEvent.press(getByLabelText('Task list'))

    expect(onCommand).toHaveBeenCalledWith('toggleTaskList', undefined)
  })

  it('applies a link from the link menu', () => {
    const onCommand = jest.fn()
    const { getByLabelText, getByPlaceholderText, getByText } = render(<EditorToolbar onCommand={onCommand} />)

    fireEvent.press(getByLabelText('Open link menu'))
    fireEvent.changeText(getByPlaceholderText('https://example.com'), 'https://openai.com')
    fireEvent.press(getByText('Apply'))

    expect(onCommand).toHaveBeenCalledWith('setLinkUrl', ['https://openai.com'])
  })

  it('removes a link from the link menu', () => {
    const onCommand = jest.fn()
    const { getByLabelText, getByText } = render(<EditorToolbar onCommand={onCommand} />)

    fireEvent.press(getByLabelText('Open link menu'))
    fireEvent.press(getByText('Remove'))

    expect(onCommand).toHaveBeenCalledWith('setLinkUrl', [''])
  })

  it('inserts an image from the image menu', () => {
    const onCommand = jest.fn()
    const { getByLabelText, getByPlaceholderText, getByText } = render(<EditorToolbar onCommand={onCommand} />)

    fireEvent.press(getByLabelText('Open image menu'))
    fireEvent.changeText(getByPlaceholderText('https://example.com/image.png'), 'https://cdn.test/image.png')
    fireEvent.press(getByText('Insert'))

    expect(onCommand).toHaveBeenCalledWith('insertImageUrl', ['https://cdn.test/image.png'])
  })

  it('closes link menu on cancel without calling onCommand', () => {
    const onCommand = jest.fn()
    const { getByLabelText, getByText, queryByPlaceholderText } = render(<EditorToolbar onCommand={onCommand} />)

    fireEvent.press(getByLabelText('Open link menu'))
    onCommand.mockClear()

    fireEvent.press(getByText('Cancel'))

    expect(onCommand).not.toHaveBeenCalled()
    expect(queryByPlaceholderText('https://example.com')).toBeNull()
  })

  it('closes image menu on cancel without calling onCommand', () => {
    const onCommand = jest.fn()
    const { getByLabelText, getByText, queryByPlaceholderText } = render(<EditorToolbar onCommand={onCommand} />)

    fireEvent.press(getByLabelText('Open image menu'))
    onCommand.mockClear()

    fireEvent.press(getByText('Cancel'))

    expect(onCommand).not.toHaveBeenCalled()
    expect(queryByPlaceholderText('https://example.com/image.png')).toBeNull()
  })
})
