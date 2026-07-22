/** @jest-environment jsdom */

import { ImageDownloader } from '../../enex/image-downloader'
import { ImageProcessor } from '../../enex/image-processor'

describe('ENEX image services', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    delete (globalThis as { fetch?: unknown }).fetch
    delete (globalThis as { createImageBitmap?: unknown }).createImageBitmap
    delete process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY
  })

  it('extracts only absolute image URLs and handles empty markup', () => {
    const downloader = new ImageDownloader()
    expect(downloader.extractImageUrls('')).toEqual([])
    expect(downloader.extractImageUrls('<img src="/local.png"><img src="https://cdn.test/a.png"><img src="http://x.test/b.jpg">'))
      .toEqual(['https://cdn.test/a.png', 'http://x.test/b.jpg'])
  })

  it('downloads an image, computes md5, mime, filename and dimensions', async () => {
    const downloader = new ImageDownloader()
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      arrayBuffer: async () => new Uint8Array([97, 98, 99]).buffer,
    } as Response)
    Object.assign(globalThis, { fetch: fetchMock })
    const bitmap = { width: 10, height: 20, close: jest.fn() }
    Object.assign(globalThis, { createImageBitmap: jest.fn().mockResolvedValue(bitmap) })

    await expect(downloader.downloadImage('https://cdn.test/path/image.png')).resolves.toMatchObject({
      data: 'YWJj', mime: 'image/png', hash: '900150983cd24fb0d6963f7d28e17f72', fileName: 'image.png', width: 10, height: 20,
    })
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.test/path/image.png')
  })

  it('uses proxy only when enabled and returns null for failed downloads', async () => {
    const downloader = new ImageDownloader()
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(new Error('CORS'))
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ 'x-proxy-mime': 'image/jpeg' }), arrayBuffer: async () => new Uint8Array([1]).buffer } as Response)
    Object.assign(globalThis, { fetch: fetchMock })
    process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY = 'true'
    await expect(downloader.downloadImage('https://cdn.test/a.jpg')).resolves.toMatchObject({ mime: 'image/jpeg', fileName: 'a.jpg' })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/proxy-image?url=https%3A%2F%2Fcdn.test%2Fa.jpg')

    process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY = 'false'
    fetchMock.mockRejectedValueOnce(new Error('blocked'))
    await expect(downloader.downloadImage('https://cdn.test/b.png')).resolves.toBeNull()
  })

  it('handles HTTP failures, proxy failures and unreadable dimensions', async () => {
    const downloader = new ImageDownloader()
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0) })
      .mockResolvedValueOnce({ ok: false, status: 502, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0) })
    Object.assign(globalThis, { fetch: fetchMock, createImageBitmap: jest.fn().mockRejectedValue(new Error('bad image')) })
    process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY = 'true'
    await expect(downloader.downloadImage('https://cdn.test/missing.png')).resolves.toBeNull()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/proxy-image?url=https%3A%2F%2Fcdn.test%2Fmissing.png')
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0) })
    await expect(downloader.downloadImage('https://cdn.test/fail.png')).resolves.toBeNull()
  })

  it('falls back to unknown MIME and filename handling when response metadata is absent', async () => {
    const downloader = new ImageDownloader()
    Object.assign(globalThis, {
      fetch: jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        arrayBuffer: async () => new Uint8Array([1, 2]).buffer,
      } as Response),
    })

    await expect(downloader.downloadImage('not a URL')).resolves.toMatchObject({
      mime: 'application/octet-stream',
      fileName: 'image',
      width: undefined,
      height: undefined,
    })
  })

  it('uploads image data and wraps storage failures', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null })
    const getPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage.test/image.png' } })
    const from = jest.fn().mockReturnValue({ upload, getPublicUrl })
    const processor = new ImageProcessor({ storage: { from } } as never)
    await expect(processor.upload('data:image/png;base64,AQID', 'image/png', 'user', 'note', 'image'))
      .resolves.toBe('https://storage.test/image.png')
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^user\/note\/\d+_image\.png$/), expect.any(Blob), {
      contentType: 'image/png', cacheControl: '3600', upsert: false,
    })

    upload.mockResolvedValueOnce({ error: { message: 'storage denied' } })
    await expect(processor.upload('AQ==', 'image/png', 'user', 'note', 'image')).rejects.toThrow('storage denied')
    getPublicUrl.mockReturnValueOnce({ data: {} })
    await expect(processor.upload('AQ==', 'image/png', 'user', 'note', 'image')).rejects.toThrow('Failed to get public URL')
  })
})
