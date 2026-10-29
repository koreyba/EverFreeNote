/** @jest-environment allure-jest/jsdom */

import { ContentConverter } from '../../enex/converter'
import { ExportService } from '../../enex/export-service'
import { ImageDownloader } from '../../enex/image-downloader'
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
    let activeUploads = 0
    let maxActiveUploads = 0
    const pendingUploads: Array<{ fileName: string; resolve: (url: string) => void }> = []
    const upload = jest.fn((_data: string, _mime: string, _userId: string, _noteId: string, fileName: string) => new Promise<string>((resolve) => {
      activeUploads += 1
      maxActiveUploads = Math.max(maxActiveUploads, activeUploads)
      pendingUploads.push({
        fileName,
        resolve: (url) => {
          activeUploads -= 1
          resolve(url)
        },
      })
    }))
    const converter = new ContentConverter({ upload } as never)
    const resources = Array.from({ length: 6 }, (_, index) => ({
      data: 'AQ==', mime: 'image/png', hash: `hash-${index}`,
    }))
    const html = resources.map((resource) => `<en-media hash="${resource.hash}"/>`).join('')

    const conversion = converter.convert(html, resources, 'u', 'n')
    expect(upload).toHaveBeenCalledTimes(5)
    expect(maxActiveUploads).toBe(5)
    expect(pendingUploads).toHaveLength(5)

    const firstBatch = pendingUploads.splice(0)
    firstBatch.forEach(({ resolve }) => resolve('https://cdn.test/image.png'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(upload).toHaveBeenCalledTimes(6)
    expect(maxActiveUploads).toBe(5)
    expect(pendingUploads).toHaveLength(1)
    pendingUploads[0].resolve('https://cdn.test/image.png')

    const result = await conversion
    expect(upload).toHaveBeenCalledTimes(6)
    expect(pendingUploads[0].fileName).toBe('image_5')
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
  it('keeps mixed data images and URLs aligned with their own resources when a download fails', async () => {
    const dataUri = 'data:image/png;base64,AQ=='
    const original = `<p><img src="/unsupported.png" alt="relative"><img src="${dataUri}" width="48" height="48" alt="pasted"><img src="https://cdn.test/missing.jpg" width="90" height="60" alt="missing"><img src="https://cdn.test/ok.webp" width="120" height="80" alt="remote"></p>`
    const noteService = {
      getNotesByIds: jest.fn().mockResolvedValue([{ id: '1', title: 'Photos', description: original, created_at: '2026-01-01', updated_at: '2026-01-01', tags: [] }]),
    }
    const builder = { build: jest.fn().mockReturnValue('<enex/>') }
    const downloader = new ImageDownloader()
    const sourceOne = { data: 'AQ==', mime: 'image/png', hash: 'hash-first', fileName: 'first.png' }
    const sourceThree = { data: 'Ag==', mime: 'image/webp', hash: 'hash-third', fileName: 'third.webp' }
    jest.spyOn(downloader, 'downloadImage').mockImplementation(async (url) => url === dataUri ? sourceOne : url.endsWith('ok.webp') ? sourceThree : null)

    const result = await new ExportService(noteService as never, builder as never, downloader).exportNotes(['1'], 'user')
    const exported = builder.build.mock.calls[0][0][0]
    expect(result.skippedImages).toBe(2)
    expect(exported.resources).toEqual([sourceOne, sourceThree])
    expect(exported.content).toContain('<img src="/unsupported.png" alt="relative">')
    expect(exported.content).toContain('<en-media type="image/png" hash="hash-first" width="48" height="48" alt="pasted"/>')
    expect(exported.content).toContain('<img src="https://cdn.test/missing.jpg" width="90" height="60" alt="missing">')
    expect(exported.content).toContain('<en-media type="image/webp" hash="hash-third" width="120" height="80" alt="remote"/>')
  })

  it('leaves unsupported image sources unchanged and reports them as skipped', async () => {
    const original = '<p><img src="/relative.png" width="48" height="48"></p>'
    const noteService = {
      getNotesByIds: jest.fn().mockResolvedValue([{ id: '1', title: 'Photos', description: original, created_at: '2026-01-01', updated_at: '2026-01-01', tags: [] }]),
    }
    const builder = { build: jest.fn().mockReturnValue('<enex/>') }
    const downloader = new ImageDownloader()
    const download = jest.spyOn(downloader, 'downloadImage')
    const result = await new ExportService(noteService as never, builder as never, downloader).exportNotes(['1'], 'user')
    expect(result.skippedImages).toBe(1)
    expect(builder.build.mock.calls[0][0][0].content).toBe(original)
    expect(download).not.toHaveBeenCalled()
  })

  it('removes invalid dimensions from an unsupported image in the exported copy only', async () => {
    const original = '<p><img src="/relative.png" width="50%" height="48"></p>'
    const noteService = {
      getNotesByIds: jest.fn().mockResolvedValue([{ id: '1', title: 'Photos', description: original, created_at: '2026-01-01', updated_at: '2026-01-01', tags: [] }]),
    }
    const builder = { build: jest.fn().mockReturnValue('<enex/>') }
    const result = await new ExportService(noteService as never, builder as never, new ImageDownloader()).exportNotes(['1'], 'user')
    expect(result.skippedImages).toBe(1)
    expect(builder.build.mock.calls[0][0][0].content).toBe('<p><img src="/relative.png" height="48"></p>')
    await expect(noteService.getNotesByIds.mock.results[0].value).resolves.toEqual([expect.objectContaining({ description: original })])
  })

  it('keeps a failed inline image and does not attach the following URL resource to it', async () => {
    const dataUri = 'data:image/png;base64,AQ=='
    const original = `<p><img src="${dataUri}" width="48" height="48" alt="inline"><img src="https://cdn.test/ok.webp" width="96" height="64" alt="remote"></p>`
    const noteService = {
      getNotesByIds: jest.fn().mockResolvedValue([{ id: '1', title: 'Photos', description: original, created_at: '2026-01-01', updated_at: '2026-01-01', tags: [] }]),
    }
    const builder = { build: jest.fn().mockReturnValue('<enex/>') }
    const downloader = new ImageDownloader()
    const remote = { data: 'Ag==', mime: 'image/webp', hash: 'remote-hash', fileName: 'remote.webp' }
    jest.spyOn(downloader, 'downloadImage').mockImplementation(async (url) => url === dataUri ? null : remote)
    const result = await new ExportService(noteService as never, builder as never, downloader).exportNotes(['1'], 'user')
    const exported = builder.build.mock.calls[0][0][0]
    expect(result.skippedImages).toBe(1)
    expect(exported.resources).toEqual([remote])
    expect(exported.content).toContain(`<img src="${dataUri}" width="48" height="48" alt="inline">`)
    expect(exported.content).toContain('<en-media type="image/webp" hash="remote-hash" width="96" height="64" alt="remote"/>')
  })

  it('retains image dimensions and description through ENEX export and import', async () => {
    const noteService = {
      getNotesByIds: jest.fn().mockResolvedValue([{
        id: '1', title: 'Photo', description: '<p><img src="https://cdn.test/a.png" width="120" height="80" alt="A garden"></p>',
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', tags: ['photos'],
      }]),
    }
    const builder = { build: jest.fn().mockReturnValue('<enex/>') }
    const downloader = {
      extractImageUrls: jest.fn().mockReturnValue(['https://cdn.test/a.png']),
      downloadImage: jest.fn().mockResolvedValue({ data: 'AQ==', mime: 'image/png', hash: 'abc123', fileName: 'a.png', width: 192, height: 192 }),
    }
    await new ExportService(noteService as never, builder as never, downloader as never).exportNotes(['1'], 'user')
    const exported = builder.build.mock.calls[0][0][0]
    expect(exported.content).toContain('<en-media type="image/png" hash="abc123" width="120" height="80" alt="A garden"/>')
    expect(exported.resources[0]).toMatchObject({ width: 192, height: 192 })
    const converter = new ContentConverter({ upload: jest.fn().mockResolvedValue('https://cdn.test/a.png') } as never)
    const imported = await converter.convert(exported.content, exported.resources, 'user', 'note')
    expect(imported).toContain('width="120"')
    expect(imported).toContain('height="80"')
    expect(imported).toContain('alt="A garden"')
  })

  it('keeps quoted and greater-than characters in an image description through ENEX', async () => {
    const original = '<p><img src="https://cdn.test/a.png" width="48" height="32" alt="A &gt; B &amp; &quot;tree&quot;"></p>'
    const noteService = {
      getNotesByIds: jest.fn().mockResolvedValue([{ id: '1', title: 'Photo', description: original, created_at: '2026-01-01', updated_at: '2026-01-01', tags: [] }]),
    }
    const builder = { build: jest.fn().mockReturnValue('<enex/>') }
    const downloader = {
      extractImageUrls: jest.fn().mockReturnValue(['https://cdn.test/a.png']),
      downloadImage: jest.fn().mockResolvedValue({ data: 'AQ==', mime: 'image/png', hash: 'abc123', fileName: 'a.png' }),
    }
    await new ExportService(noteService as never, builder as never, downloader as never).exportNotes(['1'], 'user')
    const exported = builder.build.mock.calls[0][0][0]
    expect(exported.content).toContain('/>')
    expect(exported.content).not.toContain('</en-media>')
    const converter = new ContentConverter({ upload: jest.fn().mockResolvedValue('https://cdn.test/a.png') } as never)
    const imported = await converter.convert(exported.content, exported.resources, 'user', 'note')
    const image = new DOMParser().parseFromString(imported, 'text/html').querySelector('img')
    expect(image?.getAttribute('alt')).toBe('A > B & "tree"')
    expect(image?.getAttribute('width')).toBe('48')
    expect(image?.getAttribute('height')).toBe('32')
  })

  it('omits invalid dimensions from ENEX image markup', async () => {
    const noteService = {
      getNotesByIds: jest.fn().mockResolvedValue([{
        id: '1', title: 'Photo', description: '<img src="https://cdn.test/a.png" width="12px" height="0" onerror="bad()">',
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', tags: [],
      }]),
    }
    const builder = { build: jest.fn().mockReturnValue('<enex/>') }
    const downloader = {
      extractImageUrls: jest.fn().mockReturnValue(['https://cdn.test/a.png']),
      downloadImage: jest.fn().mockResolvedValue({ data: 'AQ==', mime: 'image/png', hash: 'abc123', fileName: 'a.png' }),
    }
    await new ExportService(noteService as never, builder as never, downloader as never).exportNotes(['1'], 'user')
    expect(builder.build.mock.calls[0][0][0].content).toBe('<en-media type="image/png" hash="abc123"/>')
  })

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
