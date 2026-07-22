/** @jest-environment jsdom */

import { ImageDownloader } from '../../enex/image-downloader'
import { ImageProcessor } from '../../enex/image-processor'

const setFetch = (implementation: typeof fetch): jest.Mock => {
  const fetchMock = jest.fn(implementation)
  Object.assign(globalThis, { fetch: fetchMock })
  return fetchMock
}

describe('ENEX image services additional branches', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    delete (globalThis as { fetch?: unknown }).fetch
    delete (globalThis as { createImageBitmap?: unknown }).createImageBitmap
    delete process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY
  })

  it('filters empty, relative, unsupported and malformed image sources', () => {
    const downloader = new ImageDownloader()

    expect(downloader.extractImageUrls(
      '<img><img src=""><img src="/local.png"><img src="ftp://cdn.test/file.png">' +
      '<img src="https://cdn.test/valid.png"><img src="not a url">',
    )).toEqual(['https://cdn.test/valid.png'])
  })

  it('prefers the response MIME type and passes the blob to the dimension reader', async () => {
    const downloader = new ImageDownloader()
    const fetchMock = setFetch(jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/avif' }),
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as Response) as unknown as typeof fetch)
    const createImageBitmapMock = jest.fn().mockResolvedValue({ width: 3, height: 4 })
    Object.assign(globalThis, { createImageBitmap: createImageBitmapMock })

    await expect(downloader.downloadImage('https://cdn.test/image.png')).resolves.toMatchObject({
      mime: 'image/avif',
      width: 3,
      height: 4,
      fileName: 'image.png',
    })
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.test/image.png')
    expect(createImageBitmapMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/avif' }))
  })

  it('uses the URL MIME fallback for a successful proxy response', async () => {
    const downloader = new ImageDownloader()
    const fetchMock = setFetch(jest.fn()
      .mockRejectedValueOnce(new Error('CORS'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        arrayBuffer: async () => new Uint8Array([4]).buffer,
      } as Response) as unknown as typeof fetch)
    process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY = 'true'

    await expect(downloader.downloadImage('https://cdn.test/assets/photo.gif')).resolves.toMatchObject({
      mime: 'image/gif',
      fileName: 'photo.gif',
      width: undefined,
      height: undefined,
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/proxy-image?url=https%3A%2F%2Fcdn.test%2Fassets%2Fphoto.gif')
  })

  it('does not retry a failed direct fetch when the proxy is disabled', async () => {
    const downloader = new ImageDownloader()
    const fetchMock = setFetch(jest.fn().mockRejectedValue(new Error('network unavailable')) as unknown as typeof fetch)

    await expect(downloader.downloadImage('https://cdn.test/image.png')).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uses the invalid-host fallback when an enabled proxy receives a non-URL', async () => {
    const downloader = new ImageDownloader()
    const fetchMock = setFetch(jest.fn()
      .mockRejectedValueOnce(new Error('invalid URL'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        arrayBuffer: async () => new Uint8Array([5]).buffer,
      } as Response) as unknown as typeof fetch)
    process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY = 'true'

    await expect(downloader.downloadImage('not a URL')).resolves.toMatchObject({
      mime: 'application/octet-stream',
      fileName: 'image',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/proxy-image?url=not%20a%20URL')
  })

  it('wraps invalid base64 and preserves a JPEG data URI extension', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null })
    const getPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage.test/photo.jpeg' } })
    const from = jest.fn().mockReturnValue({ upload, getPublicUrl })
    const processor = new ImageProcessor({ storage: { from } } as never)

    await expect(processor.upload('data:image/jpeg;base64,AQID', 'image/jpeg', 'u', 'n', 'photo'))
      .resolves.toBe('https://storage.test/photo.jpeg')
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^u\/n\/\d+_photo\.jpeg$/), expect.any(Blob), {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    })

    await expect(processor.upload('%%%not-base64%%%', 'image/png', 'u', 'n', 'broken'))
      .rejects.toThrow('Failed to upload image:')
  })

  it('rejects images above the upload size limit before touching storage', async () => {
    const upload = jest.fn()
    const from = jest.fn().mockReturnValue({ upload, getPublicUrl: jest.fn() })
    const processor = new ImageProcessor({ storage: { from } } as never)
    const oversizedBase64 = btoa('x'.repeat(10 * 1024 * 1024 + 1))

    await expect(processor.upload(oversizedBase64, 'image/png', 'u', 'n', 'large'))
      .rejects.toThrow('Image too large: 10.0MB (max 10MB)')
    expect(upload).not.toHaveBeenCalled()
  })
})
