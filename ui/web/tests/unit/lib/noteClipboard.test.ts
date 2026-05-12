import { copyNotePayloadToClipboard } from '@ui/web/lib/noteClipboard'

const payload = {
  html: '<p>Hello</p>',
  text: 'Hello',
}

describe('copyNotePayloadToClipboard', () => {
  const originalNavigator = globalThis.navigator
  const originalClipboardItem = globalThis.ClipboardItem

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    })
    Object.defineProperty(globalThis, 'ClipboardItem', {
      configurable: true,
      value: originalClipboardItem,
    })
    jest.clearAllMocks()
  })

  it('falls back to plain text when rich clipboard write fails', async () => {
    const write = jest.fn().mockRejectedValue(new Error('rich write unavailable'))
    const writeText = jest.fn().mockResolvedValue(undefined)
    const ClipboardItemMock = jest.fn(function ClipboardItem(data: Record<string, Blob>) {
      return { data }
    })

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          write,
          writeText,
        },
      },
    })
    Object.defineProperty(globalThis, 'ClipboardItem', {
      configurable: true,
      value: ClipboardItemMock,
    })

    await copyNotePayloadToClipboard(payload)

    expect(write).toHaveBeenCalledTimes(1)
    expect(ClipboardItemMock).toHaveBeenCalledWith(expect.objectContaining({
      'text/html': expect.any(Blob),
      'text/plain': expect.any(Blob),
    }))
    expect(writeText).toHaveBeenCalledWith('Hello')
  })
})
