const mockGetNotes = jest.fn()
const mockWriteAsStringAsync = jest.fn()
const mockBuild = jest.fn().mockReturnValue('<en-export></en-export>')

let mockDocumentDirectory: string | null = 'file:///documents/'
let mockCacheDirectory: string | null = 'file:///cache/'

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  get documentDirectory() {
    return mockDocumentDirectory
  },
  get cacheDirectory() {
    return mockCacheDirectory
  },
  EncodingType: {
    UTF8: 'utf8',
  },
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
}))

jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => ({
    getNotes: (...args: unknown[]) => mockGetNotes(...args),
  })),
}))

jest.mock('@core/enex/enex-builder', () => ({
  EnexBuilder: jest.fn().mockImplementation(() => ({
    build: (...args: unknown[]) => mockBuild(...args),
  })),
}))

import { MobileEnexExportService } from '@ui/mobile/services/enexExport'

describe('MobileEnexExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDocumentDirectory = 'file:///documents/'
    mockCacheDirectory = 'file:///cache/'
    mockWriteAsStringAsync.mockResolvedValue(undefined)
    mockBuild.mockReturnValue('<en-export><note><title>Test</title></note></en-export>')
  })

  it('exports notes successfully and calls progress callbacks for single page', async () => {
    const mockNotes = [
      { id: '1', title: 'Note 1', content: 'Content 1' },
      { id: '2', title: 'Note 2', content: 'Content 2' },
    ]
    mockGetNotes.mockResolvedValueOnce({
      notes: mockNotes,
      totalCount: 2,
      hasMore: false,
    })

    const onProgress = jest.fn()
    const service = new MobileEnexExportService({} as never)

    const result = await service.exportAllNotes('user-123', onProgress)

    expect(mockGetNotes).toHaveBeenCalledTimes(1)
    expect(mockGetNotes).toHaveBeenCalledWith('user-123', { page: 0, pageSize: 200 })

    expect(onProgress).toHaveBeenNthCalledWith(1, {
      stage: 'loading',
      loaded: 2,
      total: 2,
    })
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      stage: 'building',
      noteCount: 2,
    })
    expect(onProgress).toHaveBeenNthCalledWith(3, {
      stage: 'writing',
      noteCount: 2,
      fileName: expect.any(String),
    })

    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^file:\/\/\/documents\//),
      '<en-export><note><title>Test</title></note></en-export>',
      { encoding: 'utf8' }
    )

    expect(result).toEqual({
      fileUri: expect.stringMatching(/^file:\/\/\/documents\//),
      fileName: expect.any(String),
      noteCount: 2,
    })
  })

  it('paginates through multiple pages of notes', async () => {
    const page1Notes = Array.from({ length: 200 }, (_, i) => ({ id: `id-${i}`, title: `Note ${i}` }))
    const page2Notes = Array.from({ length: 50 }, (_, i) => ({ id: `id-${200 + i}`, title: `Note ${200 + i}` }))

    mockGetNotes
      .mockResolvedValueOnce({
        notes: page1Notes,
        totalCount: 250,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        notes: page2Notes,
        totalCount: 250,
        hasMore: false,
      })

    const onProgress = jest.fn()
    const service = new MobileEnexExportService({} as never)

    const result = await service.exportAllNotes('user-123', onProgress)

    expect(mockGetNotes).toHaveBeenCalledTimes(2)
    expect(mockGetNotes).toHaveBeenNthCalledWith(1, 'user-123', { page: 0, pageSize: 200 })
    expect(mockGetNotes).toHaveBeenNthCalledWith(2, 'user-123', { page: 1, pageSize: 200 })

    expect(onProgress).toHaveBeenCalledWith({ stage: 'loading', loaded: 200, total: 250 })
    expect(onProgress).toHaveBeenCalledWith({ stage: 'loading', loaded: 250, total: 250 })

    expect(result.noteCount).toBe(250)
  })

  it('falls back to cacheDirectory when documentDirectory is unavailable', async () => {
    mockDocumentDirectory = null
    mockCacheDirectory = 'file:///cache/'

    mockGetNotes.mockResolvedValueOnce({
      notes: [],
      totalCount: 0,
      hasMore: false,
    })

    const service = new MobileEnexExportService({} as never)
    const result = await service.exportAllNotes('user-123')

    expect(result.fileUri).toEqual(expect.stringMatching(/^file:\/\/\/cache\//))
  })

  it('throws an error when base directory is completely unavailable', async () => {
    mockDocumentDirectory = null
    mockCacheDirectory = null

    mockGetNotes.mockResolvedValueOnce({
      notes: [],
      totalCount: 0,
      hasMore: false,
    })

    const service = new MobileEnexExportService({} as never)

    await expect(service.exportAllNotes('user-123')).rejects.toThrow(
      'Export directory is unavailable on this device'
    )
  })
})
