/** @jest-environment jsdom */

import { ContentConverter } from '../../enex/converter'
import { ExportService } from '../../enex/export-service'
import type { EnexResource } from '../../enex/types'

describe('ContentConverter', () => {
  it('removes ENML wrappers, marks unsupported blocks and sanitizes output', async () => {
    const converter = new ContentConverter({ upload: jest.fn() } as never)
    const result = await converter.convert(
      '<en-note><div style="color:#fff">Text</div><p><br></p><table><tr><td>hidden</td></tr></table><script>bad()</script></en-note>',
      [], 'user', 'note', 'Title',
    )
    expect(result).toContain('<p style="color: #fff">Text</p>')
    expect(result).toContain('[Unsupported content: Table]')
    expect(result).not.toContain('<script>')
  })

  it('replaces uploaded, fallback and missing ENEX media resources', async () => {
    const upload = jest.fn()
      .mockResolvedValueOnce('https://cdn.test/one.png')
      .mockRejectedValueOnce(new Error('upload failed'))
    const converter = new ContentConverter({ upload } as never)
    const resources = [
      { data: 'YWJj', mime: 'image/png', hash: '900150983cd24fb0d6963f7d28e17f72' },
      { data: 'AQ==', mime: 'image/jpeg', hash: 'missing-upload' },
    ]
    const html = '<en-note><en-media hash="900150983cd24fb0d6963f7d28e17f72"/><en-media hash="missing-upload"/><en-media hash="unknown"/></en-note>'
    const result = await converter.convert(html, resources, 'user', 'note', 'Title')
    expect(result).toContain('src="https://cdn.test/one.png"')
    expect(result).toContain('src="data:image/jpeg;base64,AQ=="')
    expect(result).toContain('[Image missing: unknown]')
    expect(upload).toHaveBeenCalledTimes(2)
  })

  it('processes image uploads in batches and accepts precomputed hashes', async () => {
    const upload = jest.fn().mockResolvedValue('https://cdn.test/image.png')
    const converter = new ContentConverter({ upload } as never)
    const resources = Array.from({ length: 6 }, (_, index) => ({
      data: 'AQ==', mime: 'image/png', hash: `hash-${index}`,
    }))
    const html = resources.map((resource) => `<en-media hash="${resource.hash}"/>`).join('')
    const result = await converter.convert(html, resources, 'u', 'n')
    expect(upload).toHaveBeenCalledTimes(6)
    expect((result.match(/<img /g) ?? []).length).toBe(6)
  })

  it('calculates a resource hash when the ENEX resource does not provide one', async () => {
    const upload = jest.fn().mockResolvedValue('https://cdn.test/image.png')
    const converter = new ContentConverter({ upload } as never)
    const resources: EnexResource[] = [{ data: 'YWJj', mime: 'image/png' }]
    await converter.convert('<en-media hash="900150983cd24fb0d6963f7d28e17f72"/>', resources, 'u', 'n')
    expect(resources[0].hash).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(upload).toHaveBeenCalledWith('YWJj', 'image/png', 'u', 'n', 'image_0')
  })
})

describe('ExportService', () => {
  it('returns an empty ENEX file when no notes are selected', async () => {
    const noteService = { getNotesByIds: jest.fn() }
    const builder = { build: jest.fn().mockReturnValue('<en-export/>') }
    const service = new ExportService(noteService as never, builder as never, {} as never)
    const progress = jest.fn()
    const result = await service.exportNotes([], 'user', progress)
    expect(noteService.getNotesByIds).not.toHaveBeenCalled()
    expect(builder.build).toHaveBeenCalledWith([])
    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.blob.size).toBeGreaterThan(0)
    expect(result.skippedImages).toBe(0)
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ currentStep: 'fetching' }))
  })

  it('exports notes without images and reports progress through completion', async () => {
    const noteService = {
      getNotesByIds: jest.fn().mockResolvedValue([
        { id: '2', title: 'Second', description: '<p>2</p>', created_at: '2026-01-02T00:00:00Z', updated_at: null, tags: ['b'] },
        { id: '1', title: null, description: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T01:00:00Z', tags: null },
      ]),
    }
    const builder = { build: jest.fn().mockReturnValue('<enex>notes</enex>') }
    const downloader = { extractImageUrls: jest.fn().mockReturnValue([]), downloadImage: jest.fn() }
    const service = new ExportService(noteService as never, builder as never, downloader as never)
    const progress = jest.fn()
    const result = await service.exportNotes(['1', '2'], 'user', progress)
    expect(builder.build).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ title: 'Untitled', content: '', tags: [] }),
      expect.objectContaining({ title: 'Second', content: '<p>2</p>' }),
    ]))
    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.blob.size).toBeGreaterThan(0)
    expect(result.fileName).toMatch(/^everfreenote-export-\d{8}-\d{6}\.enex$/)
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ currentStep: 'complete' }))
  })

  it('converts downloaded images to en-media and keeps skipped originals', async () => {
    const noteService = {
      getNotesByIds: jest.fn().mockResolvedValue([
        { id: '1', title: 'Images', description: '<p><img src="https://cdn.test/a.png"><img src="https://cdn.test/b.png"></p>', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', tags: [] },
      ]),
    }
    const builder = { build: jest.fn().mockReturnValue('<enex/>') }
    const downloader = {
      extractImageUrls: jest.fn().mockReturnValue(['https://cdn.test/a.png', 'https://cdn.test/b.png']),
      downloadImage: jest.fn()
        .mockResolvedValueOnce({ data: 'AQ==', mime: 'image/png', hash: 'hash-a', fileName: 'a.png' })
        .mockResolvedValueOnce(null),
    }
    const service = new ExportService(noteService as never, builder as never, downloader as never)
    const result = await service.exportNotes(['1'], 'user')
    const builtNote = builder.build.mock.calls[0][0][0]
    expect(builtNote.resources).toHaveLength(1)
    expect(builtNote.content).toContain('<en-media type="image/png" hash="hash-a"/>')
    expect(builtNote.content).toContain('https://cdn.test/b.png')
    expect(result.skippedImages).toBe(1)
  })

  it('fetches ids in 150-item batches and preserves requested order', async () => {
    const ids = Array.from({ length: 151 }, (_, index) => `id-${index}`)
    const noteService = {
      getNotesByIds: jest.fn(async (batch: string[]) => batch.slice().reverse().map((id) => ({
        id, title: id, description: '', created_at: '2026-01-01T00:00:00Z', updated_at: null, tags: [],
      }))),
    }
    const builder = { build: jest.fn().mockReturnValue('<enex/>') }
    const downloader = { extractImageUrls: jest.fn().mockReturnValue([]), downloadImage: jest.fn() }
    const service = new ExportService(noteService as never, builder as never, downloader as never)
    await service.exportNotes(ids, 'user')
    expect(noteService.getNotesByIds).toHaveBeenCalledTimes(2)
    expect(noteService.getNotesByIds.mock.calls[0][0]).toHaveLength(150)
    expect(builder.build.mock.calls[0][0].map((note: { id?: string; title: string }) => note.title)).toEqual(ids)
  })
})
