import { WordPressExportService } from '../../services/wordpressExport'

const serviceWithInvoke = (invoke: jest.Mock) => ({ functions: { invoke } }) as never

const context = (payload: unknown, extra: Record<string, unknown> = {}) => ({
  json: jest.fn().mockResolvedValue(payload),
  ...extra,
})

describe('WordPressExportService additional branches', () => {
  it('accepts empty and mixed valid category responses', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: { categories: [], rememberedCategoryIds: [] }, error: null })
      .mockResolvedValueOnce({
        data: {
          categories: [{ id: 3, name: 'News' }, { id: '4', name: '' }],
          rememberedCategoryIds: [3, '4'],
        },
        error: null,
      })
    const service = new WordPressExportService(serviceWithInvoke(invoke))

    await expect(service.getCategories()).resolves.toEqual({ categories: [], rememberedCategoryIds: [] })
    await expect(service.getCategories()).resolves.toEqual({
      categories: [{ id: 3, name: 'News' }, { id: 4, name: '' }],
      rememberedCategoryIds: [3, 4],
    })
  })

  it('rejects category containers, items and ids with unsupported shapes', async () => {
    const invoke = jest.fn()
    const service = new WordPressExportService(serviceWithInvoke(invoke))
    const invalidResponses: unknown[] = [
      { categories: {}, rememberedCategoryIds: [] },
      { categories: [], rememberedCategoryIds: {} },
      { categories: [null], rememberedCategoryIds: [] },
      { categories: [{ id: 1, name: 7 }], rememberedCategoryIds: [] },
      { categories: [{ id: 1.5, name: 'Fractional' }], rememberedCategoryIds: [] },
      { categories: [{ id: '-2', name: 'Negative' }], rememberedCategoryIds: [] },
      { categories: [], rememberedCategoryIds: [1.5] },
      { categories: [], rememberedCategoryIds: ['0'] },
      { categories: [], rememberedCategoryIds: [false] },
    ]

    for (const data of invalidResponses) {
      invoke.mockResolvedValueOnce({ data, error: null })
      await expect(service.getCategories()).rejects.toMatchObject({
        name: 'WordPressBridgeError',
        code: 'invalid_response',
        message: 'Invalid categories response',
      })
    }
  })

  it('normalizes numeric-string export ids and preserves an explicit payload', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: { postId: '41', postUrl: '', slug: '' }, error: null })
      .mockResolvedValueOnce({ data: { postId: 42, postUrl: 'https://wp/post/42', slug: 'published' }, error: null })
    const service = new WordPressExportService(serviceWithInvoke(invoke))
    const payload = {
      noteId: 'note-42',
      categoryIds: [3, 4],
      tags: ['tech', 'release'],
      slug: 'published',
      title: 'A published note',
      status: 'publish' as const,
    }

    await expect(service.exportNote({ ...payload, title: undefined })).resolves.toEqual({
      postId: 41,
      postUrl: '',
      slug: '',
    })
    await expect(service.exportNote(payload)).resolves.toEqual({
      postId: 42,
      postUrl: 'https://wp/post/42',
      slug: 'published',
    })
    expect(invoke).toHaveBeenNthCalledWith(2, 'wordpress-bridge', {
      body: {
        action: 'export_note',
        noteId: 'note-42',
        categoryIds: [3, 4],
        tags: ['tech', 'release'],
        slug: 'published',
        title: 'A published note',
        status: 'publish',
      },
    })
  })

  it('rejects export responses with malformed records and post ids', async () => {
    const invoke = jest.fn()
    const service = new WordPressExportService(serviceWithInvoke(invoke))
    const invalidResponses: unknown[] = [
      [],
      { postUrl: 'https://wp/post', slug: 'ok' },
      { postId: '1.5', postUrl: 'https://wp/post', slug: 'ok' },
      { postId: '-1', postUrl: 'https://wp/post', slug: 'ok' },
      { postId: '', postUrl: 'https://wp/post', slug: 'ok' },
      { postId: 1, postUrl: null, slug: 'ok' },
      { postId: 1, postUrl: 'https://wp/post', slug: null },
    ]

    for (const data of invalidResponses) {
      invoke.mockResolvedValueOnce({ data, error: null })
      await expect(service.exportNote({ noteId: 'n', categoryIds: [], tags: [], slug: 'n' }))
        .rejects.toMatchObject({ code: 'invalid_response', message: 'Invalid export response' })
    }
  })

  it('uses context fields when valid and falls back for status-only or malformed context errors', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: null, error: { context: context({ code: 'wp_error', message: 'Message field', details: { status: 'retry' } }) } })
      .mockResolvedValueOnce({ data: null, error: { context: context({ code: 7, msg: 'Message fallback' }) } })
      .mockResolvedValueOnce({ data: null, error: { context: context(null, { status: 503 }) } })
      .mockResolvedValueOnce({ data: null, error: { context: { json: 'not-a-function', status: 500 } } })
    const service = new WordPressExportService(serviceWithInvoke(invoke))

    await expect(service.getCategories()).rejects.toMatchObject({
      code: 'wp_error',
      message: 'Message field',
      details: { status: 'retry' },
    })
    await expect(service.getCategories()).rejects.toMatchObject({
      code: 'bridge_error',
      message: 'Message fallback',
    })
    await expect(service.getCategories()).rejects.toMatchObject({
      code: 'bridge_error',
      message: 'WordPress export failed',
    })
    await expect(service.getCategories()).rejects.toThrow('WordPress export failed')
  })

  it('handles absent context, rejected JSON and empty Error messages', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: null, error: {} })
      .mockResolvedValueOnce({ data: null, error: { context: null } })
      .mockResolvedValueOnce({ data: null, error: { context: { json: jest.fn().mockRejectedValue(new Error('invalid json')) } } })
      .mockResolvedValueOnce({ data: null, error: new Error('') })
    const service = new WordPressExportService(serviceWithInvoke(invoke))

    for (let i = 0; i < 4; i++) {
      await expect(service.getCategories()).rejects.toMatchObject({
        code: 'bridge_error',
        message: 'WordPress export failed',
      })
    }
  })
})
