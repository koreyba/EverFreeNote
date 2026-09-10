import { downloadGeneratedFile } from '@ui/web/adapters/fileDownload'
import { isNativeShell } from '@ui/shell/runtime/platform'
import { saveAndShareFile } from '@ui/shell/runtime/fileExport'

jest.mock('@ui/shell/runtime/platform', () => ({ isNativeShell: jest.fn() }))
jest.mock('@ui/shell/runtime/fileExport', () => ({ saveAndShareFile: jest.fn() }))

describe('downloadGeneratedFile', () => {
  const blob = new Blob(['<xml/>'], { type: 'application/xml' })

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => 'blob:generated')
    URL.revokeObjectURL = jest.fn()
  })

  it('clicks a download link in a browser', async () => {
    jest.mocked(isNativeShell).mockReturnValue(false)
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    await downloadGeneratedFile(blob, 'notes.enex', 'export')

    expect(click).toHaveBeenCalled()
    expect(saveAndShareFile).not.toHaveBeenCalled()
    click.mockRestore()
  })

  it('shares the file from the shell, where a download link does nothing', async () => {
    // Verified on device: an <a download> click in an Android WebView produces no file,
    // no prompt and no error, so the export silently vanishes.
    jest.mocked(isNativeShell).mockReturnValue(true)
    jest.mocked(saveAndShareFile).mockResolvedValue()
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    await downloadGeneratedFile(blob, 'notes.enex', 'export')

    expect(saveAndShareFile).toHaveBeenCalledWith(blob, 'notes.enex', 'export')
    expect(click).not.toHaveBeenCalled()
    click.mockRestore()
  })

  it('propagates a failure to save so the caller can report it', async () => {
    jest.mocked(isNativeShell).mockReturnValue(true)
    jest.mocked(saveAndShareFile).mockRejectedValue(new Error('no space'))

    await expect(downloadGeneratedFile(blob, 'notes.enex', 'export')).rejects.toThrow('no space')
  })
})
