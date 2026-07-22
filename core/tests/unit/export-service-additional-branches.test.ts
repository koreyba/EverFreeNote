/** @jest-environment jsdom */

import { ExportService } from '../../enex/export-service'

type NoteRecord = {
  id: string
  title: string | null
  description: string | null
  created_at: string
  updated_at: string | null
  tags: string[] | null
}

const makeNote = (id: string, description = ''): NoteRecord => ({
  id,
  title: id,
  description,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: null,
  tags: [],
})

const makeService = (overrides: {
  getNotesByIds?: jest.Mock
  build?: jest.Mock
  extractImageUrls?: jest.Mock
  downloadImage?: jest.Mock
} = {}) => {
  const noteService = { getNotesByIds: overrides.getNotesByIds ?? jest.fn() }
  const builder = { build: overrides.build ?? jest.fn().mockReturnValue('<enex/>') }
  const downloader = {
    extractImageUrls: overrides.extractImageUrls ?? jest.fn().mockReturnValue([]),
    downloadImage: overrides.downloadImage ?? jest.fn(),
  }

  return {
    service: new ExportService(noteService as never, builder as never, downloader as never),
    noteService,
    builder,
    downloader,
  }
}

describe('ExportService additional branches', () => {
  it('returns an empty export for an empty or unmatched note selection without a progress callback', async () => {
    const getNotesByIds = jest.fn().mockResolvedValue([])
    const build = jest.fn().mockReturnValue('<en-export/>')
    const { service, noteService, builder } = makeService({ getNotesByIds, build })

    const emptyResult = await service.exportNotes([], 'user')
    const unmatchedResult = await service.exportNotes(['missing-note'], 'user')

    expect(noteService.getNotesByIds).toHaveBeenCalledTimes(1)
    expect(noteService.getNotesByIds).toHaveBeenCalledWith(['missing-note'], 'user')
    expect(builder.build).toHaveBeenNthCalledWith(1, [])
    expect(builder.build).toHaveBeenNthCalledWith(2, [])
    expect(emptyResult.skippedImages).toBe(0)
    expect(unmatchedResult.skippedImages).toBe(0)
    expect(emptyResult.blob.type).toBe('application/xml')
    expect(unmatchedResult.blob.type).toBe('application/xml')
  })

  it('emits progress steps in lifecycle order for a note without images', async () => {
    const getNotesByIds = jest.fn().mockResolvedValue([makeNote('note-1', '<p>Content</p>')])
    const progress = jest.fn()
    const { service } = makeService({ getNotesByIds })

    await service.exportNotes(['note-1'], 'user', progress)

    expect(progress.mock.calls.map(([event]) => event.currentStep)).toEqual([
      'fetching',
      'fetching',
      'downloading-images',
      'building-xml',
      'complete',
    ])
    expect(progress).toHaveBeenNthCalledWith(1, {
      currentNote: 0,
      totalNotes: 1,
      currentStep: 'fetching',
      message: 'Loading notes',
    })
    expect(progress).toHaveBeenLastCalledWith({
      currentNote: 1,
      totalNotes: 1,
      currentStep: 'complete',
      message: 'Export completed',
    })
  })

  it('propagates note-fetch failures and does not start XML building', async () => {
    const getNotesByIds = jest.fn().mockRejectedValue(new Error('notes unavailable'))
    const progress = jest.fn()
    const { service, builder } = makeService({ getNotesByIds })

    await expect(service.exportNotes(['note-1'], 'user', progress)).rejects.toThrow('notes unavailable')

    expect(progress).toHaveBeenCalledWith({
      currentNote: 0,
      totalNotes: 1,
      currentStep: 'fetching',
      message: 'Loading notes',
    })
    expect(builder.build).not.toHaveBeenCalled()
  })

  it('propagates an image download rejection instead of producing a partial export', async () => {
    const getNotesByIds = jest.fn().mockResolvedValue([makeNote('note-1', '<img src="https://cdn.test/a.png">')])
    const extractImageUrls = jest.fn().mockReturnValue(['https://cdn.test/a.png'])
    const downloadImage = jest.fn().mockRejectedValue(new Error('download failed'))
    const { service, builder } = makeService({ getNotesByIds, extractImageUrls, downloadImage })

    await expect(service.exportNotes(['note-1'], 'user')).rejects.toThrow('download failed')

    expect(downloadImage).toHaveBeenCalledWith('https://cdn.test/a.png')
    expect(builder.build).not.toHaveBeenCalled()
  })

  it('downloads image batches larger than five and preserves resource order', async () => {
    const urls = Array.from({ length: 6 }, (_, index) => `https://cdn.test/image-${index}.png`)
    const html = urls.map((url) => `<img src="${url}">`).join('')
    const getNotesByIds = jest.fn().mockResolvedValue([makeNote('note-1', html)])
    const extractImageUrls = jest.fn().mockReturnValue(urls)
    let activeDownloads = 0
    let maxActiveDownloads = 0
    const pendingDownloads: Array<{ url: string; resolve: (resource: unknown) => void }> = []
    const downloadImage = jest.fn((url: string) => new Promise((resolve) => {
      activeDownloads += 1
      maxActiveDownloads = Math.max(maxActiveDownloads, activeDownloads)
      pendingDownloads.push({
        url,
        resolve: (resource) => {
          activeDownloads -= 1
          resolve(resource)
        },
      })
    }))
    const build = jest.fn().mockReturnValue('<enex/>')
    const { service, builder } = makeService({ getNotesByIds, build, extractImageUrls, downloadImage })

    const exportPromise = service.exportNotes(['note-1'], 'user')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(downloadImage).toHaveBeenCalledTimes(5)
    expect(maxActiveDownloads).toBe(5)
    expect(pendingDownloads).toHaveLength(5)

    const firstBatch = pendingDownloads.splice(0)
    firstBatch.forEach(({ resolve, url }) => {
      const index = urls.indexOf(url)
      resolve({
        data: `base64-${index}`,
        mime: 'image/png',
        hash: `hash-${index}`,
        fileName: `image-${index}.png`,
      })
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(downloadImage).toHaveBeenCalledTimes(6)
    expect(maxActiveDownloads).toBe(5)
    expect(pendingDownloads).toHaveLength(1)

    const lastDownload = pendingDownloads[0]
    const lastIndex = urls.indexOf(lastDownload.url)
    lastDownload.resolve({
      data: `base64-${lastIndex}`,
      mime: 'image/png',
      hash: `hash-${lastIndex}`,
      fileName: `image-${lastIndex}.png`,
    })

    await exportPromise

    const builtNote = builder.build.mock.calls[0][0][0]
    expect(downloadImage).toHaveBeenCalledTimes(6)
    expect(builtNote.resources.map((resource: { hash: string }) => resource.hash)).toEqual([
      'hash-0',
      'hash-1',
      'hash-2',
      'hash-3',
      'hash-4',
      'hash-5',
    ])
    expect((builtNote.content.match(/<en-media /g) ?? []).length).toBe(6)
    expect(builtNote.content.indexOf('hash-0')).toBeLessThan(builtNote.content.indexOf('hash-5'))
  })

  it('keeps unknown returned note IDs stable when ordering falls back to zero', async () => {
    const getNotesByIds = jest.fn().mockResolvedValue([
      makeNote('server-note-a'),
      makeNote('server-note-b'),
    ])
    const build = jest.fn().mockReturnValue('<enex/>')
    const { service, builder } = makeService({ getNotesByIds, build })

    await service.exportNotes(['requested-note'], 'user')

    const builtNotes = builder.build.mock.calls[0][0]
    expect(builtNotes.map((note: { id?: string; title: string }) => note.title)).toEqual([
      'server-note-a',
      'server-note-b',
    ])
  })
})
