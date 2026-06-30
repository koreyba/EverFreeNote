import { copyNotePayloadToClipboard } from '@ui/web/lib/noteClipboard'

const payload = { html: '<div>rich</div>', text: 'rich' }

describe('ui/web/lib/noteClipboard', () => {
  const originalClipboard = globalThis.navigator?.clipboard
  const originalClipboardItem = globalThis.ClipboardItem

  afterEach(() => {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    })
    globalThis.ClipboardItem = originalClipboardItem
    jest.restoreAllMocks()
  })

  function setClipboard(value: unknown) {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value,
      configurable: true,
    })
  }

  it('writes a dual-format ClipboardItem when rich writes are available', async () => {
    const write = jest.fn().mockResolvedValue(undefined)
    const writeText = jest.fn().mockResolvedValue(undefined)
    setClipboard({ write, writeText })
    globalThis.ClipboardItem = class {
      constructor(public items: Record<string, Blob>) {}
    } as unknown as typeof ClipboardItem

    await copyNotePayloadToClipboard(payload)

    expect(write).toHaveBeenCalledTimes(1)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('falls back to writeText when the rich write is rejected', async () => {
    const write = jest.fn().mockRejectedValue(new Error('no html'))
    const writeText = jest.fn().mockResolvedValue(undefined)
    setClipboard({ write, writeText })
    globalThis.ClipboardItem = class {
      constructor(public items: Record<string, Blob>) {}
    } as unknown as typeof ClipboardItem

    await copyNotePayloadToClipboard(payload)

    expect(writeText).toHaveBeenCalledWith('rich')
  })

  it('falls back to writeText when ClipboardItem is unavailable', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    globalThis.ClipboardItem = undefined as unknown as typeof ClipboardItem

    await copyNotePayloadToClipboard(payload)

    expect(writeText).toHaveBeenCalledWith('rich')
  })

  it('throws when the clipboard API is unavailable', async () => {
    setClipboard(undefined)

    await expect(copyNotePayloadToClipboard(payload)).rejects.toThrow('Clipboard API unavailable')
  })
})
