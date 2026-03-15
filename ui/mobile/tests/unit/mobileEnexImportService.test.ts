const mockCreate = jest.fn()
const mockReadAsStringAsync = jest.fn()
const mockResolveExistingTitlesForImport = jest.fn()

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  EncodingType: {
    UTF8: 'utf8',
  },
  readAsStringAsync: (...args: unknown[]) => mockReadAsStringAsync(...args),
}))

jest.mock('@core/enex/note-creator', () => ({
  NoteCreator: jest.fn().mockImplementation(() => ({
    create: mockCreate,
  })),
}))

jest.mock('@core/enex/import-shared', () => {
  const actual = jest.requireActual('@core/enex/import-shared')

  return {
    ...actual,
    resolveExistingTitlesForImport: (...args: unknown[]) =>
      mockResolveExistingTitlesForImport(...args),
  }
})

import { MobileEnexImportService } from '@ui/mobile/services/enexImport'

describe('MobileEnexImportService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReadAsStringAsync.mockResolvedValue('')
    mockResolveExistingTitlesForImport.mockResolvedValue(new Map([['Duplicate note', 'existing-id']]))
  })

  it('passes duplicate settings through and treats skipped duplicates as non-errors', async () => {
    const progress = jest.fn()
    mockCreate
      .mockResolvedValueOnce('created-id')
      .mockResolvedValueOnce(null)

    const service = new MobileEnexImportService({} as never)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<en-export>
  <note>
    <title>Fresh note</title>
    <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note><en-note><div>Hello</div></en-note>]]></content>
    <created>20260314T103000Z</created>
  </note>
  <note>
    <title>Duplicate note</title>
    <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note><en-note><div>World</div></en-note>]]></content>
    <created>20260314T104500Z</created>
  </note>
</en-export>`

    const result = await service.importXml(
      xml,
      'user-1',
      {
        duplicateStrategy: 'skip',
        skipFileDuplicates: true,
      },
      progress
    )

    expect(mockResolveExistingTitlesForImport).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'skip'
    )
    expect(mockCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ title: 'Fresh note' }),
      'user-1',
      'skip',
      expect.objectContaining({
        skipFileDuplicates: true,
        existingByTitle: expect.any(Map),
        seenTitlesInImport: expect.any(Set),
      })
    )
    expect(mockCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: 'Duplicate note' }),
      'user-1',
      'skip',
      expect.any(Object)
    )
    expect(progress).toHaveBeenLastCalledWith({ processed: 2, total: 2 })
    expect(result).toEqual({
      success: 1,
      errors: 0,
      failedNotes: [],
      message: 'Imported 1 note(s), skipped 1 duplicate note(s).',
    })
  })

  it('falls back to per-note duplicate lookup when prefix snapshot lookup fails', async () => {
    mockResolveExistingTitlesForImport.mockResolvedValueOnce(null)
    mockCreate.mockResolvedValueOnce('created-id')

    const service = new MobileEnexImportService({} as never)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<en-export>
  <note>
    <title>Fresh note</title>
    <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note><en-note><div>Hello</div></en-note>]]></content>
    <created>20260314T103000Z</created>
  </note>
</en-export>`

    const result = await service.importXml(
      xml,
      'user-1',
      {
        duplicateStrategy: 'prefix',
        skipFileDuplicates: false,
      }
    )

    expect(mockResolveExistingTitlesForImport).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'prefix'
    )
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Fresh note' }),
      'user-1',
      'prefix',
      expect.objectContaining({
        existingByTitle: null,
      })
    )
    expect(result).toEqual({
      success: 1,
      errors: 0,
      failedNotes: [],
      message: 'Imported 1 note(s).',
    })
  })

  it('surfaces a user-facing error when duplicate lookup is unavailable for skip mode', async () => {
    mockResolveExistingTitlesForImport.mockRejectedValueOnce(
      new Error(
        'Could not verify existing notes. Try again, or switch duplicate handling to "Add [duplicate] prefix to title".'
      )
    )

    const service = new MobileEnexImportService({} as never)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<en-export>
  <note>
    <title>Fresh note</title>
    <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note><en-note><div>Hello</div></en-note>]]></content>
    <created>20260314T103000Z</created>
  </note>
</en-export>`

    await expect(
      service.importXml(xml, 'user-1', {
        duplicateStrategy: 'skip',
        skipFileDuplicates: false,
      })
    ).rejects.toThrow(
      'Could not verify existing notes. Try again, or switch duplicate handling to "Add [duplicate] prefix to title".'
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('rejects oversized import assets before reading them', async () => {
    const service = new MobileEnexImportService({} as never)

    await expect(
      service.importAsset(
        {
          uri: 'file:///tmp/huge.enex',
          name: 'huge.enex',
          size: 101 * 1024 * 1024,
          lastModified: 0,
        },
        'user-1'
      )
    ).rejects.toThrow('Selected .enex file is too large to import. Maximum supported size is 100 MB.')

    expect(mockReadAsStringAsync).not.toHaveBeenCalled()
  })
})
