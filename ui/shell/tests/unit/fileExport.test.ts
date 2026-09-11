import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

import { saveAndShareFile } from '@ui/shell/runtime/fileExport'

jest.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: jest.fn() },
  Directory: { Cache: 'CACHE' },
}))
jest.mock('@capacitor/share', () => ({ Share: { share: jest.fn() } }))

describe('saveAndShareFile', () => {
  it('writes the file to cache and opens the share sheet', async () => {
    jest.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///cache/notes.enex' })
    jest.mocked(Share.share).mockResolvedValue({ activityType: '' })

    await saveAndShareFile(new Blob(['<xml/>'], { type: 'application/xml' }), 'notes.enex', 'export')

    const writeArgs = jest.mocked(Filesystem.writeFile).mock.calls[0][0]
    expect(writeArgs.path).toBe('notes.enex')
    // Cache needs no storage permission and the file only has to outlive the share sheet.
    expect(writeArgs.directory).toBe(Directory.Cache)
    // The data: prefix FileReader adds must not reach writeFile.
    expect(typeof writeArgs.data).toBe('string')
    expect(writeArgs.data as string).not.toContain('base64,')
    expect((writeArgs.data as string).length).toBeGreaterThan(0)

    expect(Share.share).toHaveBeenCalledWith({ title: 'export', files: ['file:///cache/notes.enex'] })
  })
})
