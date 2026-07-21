import { WordPressBridgeError, WordPressExportService } from '../../services/wordpressExport'
import { WordPressSettingsService } from '../../services/wordpressSettings'

const context = (payload: unknown, status = 400) => ({ json: jest.fn().mockResolvedValue(payload), status })

describe('WordPress services', () => {
  it('loads categories and normalizes numeric string ids', async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { categories: [{ id: '7', name: 'Tech' }], rememberedCategoryIds: ['7'] }, error: null,
    })
    const service = new WordPressExportService({ functions: { invoke } } as never)
    await expect(service.getCategories()).resolves.toEqual({
      categories: [{ id: 7, name: 'Tech' }], rememberedCategoryIds: [7],
    })
    expect(invoke).toHaveBeenCalledWith('wordpress-bridge', { body: { action: 'get_categories' } })
  })

  it('rejects invalid categories and export responses', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { categories: [], rememberedCategoryIds: ['bad'] }, error: null })
    const service = new WordPressExportService({ functions: { invoke } } as never)
    await expect(service.getCategories()).rejects.toMatchObject({ code: 'invalid_response' })
    invoke.mockResolvedValueOnce({ data: { postId: 0, postUrl: '', slug: '' }, error: null })
    await expect(service.exportNote({ noteId: 'n', categoryIds: [], tags: [], slug: 'n' })).rejects.toThrow('Invalid export response')
  })

  it('rejects malformed category items and export fields instead of coercing them', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: null, error: null })
    const service = new WordPressExportService({ functions: { invoke } } as never)

    for (const data of [
      null,
      {},
      { categories: [{}], rememberedCategoryIds: [] },
      { categories: [{ id: 0, name: 'bad' }], rememberedCategoryIds: [] },
      { categories: [], rememberedCategoryIds: [0] },
    ]) {
      invoke.mockResolvedValueOnce({ data, error: null })
      await expect(service.getCategories()).rejects.toMatchObject({ code: 'invalid_response' })
    }

    for (const data of [
      { postId: 1, postUrl: 3, slug: 'ok' },
      { postId: 1, postUrl: 'https://wp/post', slug: 3 },
      { postId: 'not-a-number', postUrl: 'https://wp/post', slug: 'ok' },
    ]) {
      invoke.mockResolvedValueOnce({ data, error: null })
      await expect(service.exportNote({ noteId: 'n', categoryIds: [], tags: [], slug: 'n' })).rejects.toMatchObject({ code: 'invalid_response' })
    }
  })

  it('parses bridge context errors and invokes export with defaults', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: null, error: { context: context({ code: 'wp_down', msg: 'WordPress unavailable', details: { retry: true } }) } })
      .mockResolvedValueOnce({ data: { postId: '12', postUrl: 'https://wp/post', slug: 'post' }, error: null })
    const service = new WordPressExportService({ functions: { invoke } } as never)
    await expect(service.getCategories()).rejects.toMatchObject({
      name: 'WordPressBridgeError', code: 'wp_down', message: 'WordPress unavailable', details: { retry: true },
    } satisfies Partial<WordPressBridgeError>)
    await expect(service.exportNote({ noteId: 'n', categoryIds: [2], tags: ['x'], slug: 'post' })).resolves.toEqual({
      postId: 12, postUrl: 'https://wp/post', slug: 'post',
    })
    expect(invoke).toHaveBeenLastCalledWith('wordpress-bridge', {
      body: { action: 'export_note', noteId: 'n', categoryIds: [2], tags: ['x'], slug: 'post', title: undefined, status: 'publish' },
    })
  })

  it('falls back for ordinary and unknown bridge errors', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: null, error: new Error('network') })
      .mockResolvedValueOnce({ data: null, error: { context: { json: jest.fn().mockRejectedValue(new Error('bad json')) } } })
    const service = new WordPressExportService({ functions: { invoke } } as never)
    await expect(service.getCategories()).rejects.toMatchObject({ code: 'bridge_error', message: 'network' })
    await expect(service.getCategories()).rejects.toThrow('WordPress export failed')
  })

  it('loads and saves settings, including error and empty response branches', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { configured: true, integration: null }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
    const service = new WordPressSettingsService({ functions: { invoke } } as never)
    await expect(service.getStatus()).resolves.toEqual({ configured: false, integration: null })
    await expect(service.upsert({ siteUrl: 'https://wp', wpUsername: 'u', enabled: true })).resolves.toEqual({ configured: true, integration: null })
    await expect(service.upsert({ siteUrl: 'https://wp', wpUsername: 'u', enabled: true })).rejects.toThrow('Unexpected response')

    invoke.mockResolvedValueOnce({ data: null, error: { context: context({ message: 'bad settings' }) } })
    await expect(service.getStatus()).rejects.toThrow('bad settings')
    invoke.mockResolvedValueOnce({ data: null, error: { context: { json: jest.fn().mockRejectedValue(new Error('bad')) } } })
    await expect(service.getStatus()).rejects.toThrow('Failed to load WordPress settings')
  })
})
