import { WordPressSettingsService } from '../../services/wordpressSettings'

const serviceWithInvoke = (invoke: jest.Mock) => ({ functions: { invoke } }) as never

describe('WordPressSettingsService additional branches', () => {
  it('uses the exact status and upsert invoke payloads', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: { configured: false, integration: null }, error: null })
      .mockResolvedValueOnce({ data: { configured: true, integration: null }, error: null })
    const service = new WordPressSettingsService(serviceWithInvoke(invoke))
    const input = {
      siteUrl: 'https://wordpress.example',
      wpUsername: 'editor',
      applicationPassword: 'app-password',
      enabled: true,
    }

    await expect(service.getStatus()).resolves.toEqual({ configured: false, integration: null })
    await expect(service.upsert(input)).resolves.toEqual({ configured: true, integration: null })

    expect(invoke).toHaveBeenNthCalledWith(1, 'wordpress-settings-status', { body: {} })
    expect(invoke).toHaveBeenNthCalledWith(2, 'wordpress-settings-upsert', { body: input })
  })

  it('returns the default status and rejects malformed upsert responses', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: undefined, error: null })
      .mockResolvedValueOnce({ data: 'malformed', error: null })
      .mockResolvedValueOnce({ data: 0, error: null })
      .mockResolvedValueOnce({ data: false, error: null })
    const service = new WordPressSettingsService(serviceWithInvoke(invoke))

    await expect(service.getStatus()).resolves.toEqual({ configured: false, integration: null })
    await expect(service.getStatus()).resolves.toEqual({ configured: false, integration: null })
    await expect(service.upsert({ siteUrl: 'https://wordpress.example', wpUsername: 'editor', enabled: false }))
      .rejects.toThrow('Unexpected response while saving WordPress settings')
    await expect(service.upsert({ siteUrl: 'https://wordpress.example', wpUsername: 'editor', enabled: false }))
      .rejects.toThrow('Unexpected response while saving WordPress settings')
  })

  it('uses message and msg values from context JSON errors', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({
        data: null,
        error: { context: { json: jest.fn().mockResolvedValue({ message: 'status context message' }) } },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { context: { json: jest.fn().mockResolvedValue({ msg: 'upsert context message' }) } },
      })
    const service = new WordPressSettingsService(serviceWithInvoke(invoke))

    await expect(service.getStatus()).rejects.toThrow('status context message')
    await expect(service.upsert({ siteUrl: 'https://wordpress.example', wpUsername: 'editor', enabled: true }))
      .rejects.toThrow('upsert context message')
  })

  it('uses operation fallbacks when context JSON has only an HTTP status', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({
        data: null,
        error: { context: { status: 503, json: jest.fn().mockResolvedValue({}) } },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { context: { status: 500, json: jest.fn().mockResolvedValue(null) } },
      })
    const service = new WordPressSettingsService(serviceWithInvoke(invoke))

    await expect(service.getStatus()).rejects.toThrow('Failed to load WordPress settings')
    await expect(service.upsert({ siteUrl: 'https://wordpress.example', wpUsername: 'editor', enabled: true }))
      .rejects.toThrow('Failed to save WordPress settings')
  })

  it('preserves Error messages and falls back for unknown error values', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: null, error: new Error('status request failed') })
      .mockResolvedValueOnce({ data: null, error: { context: null } })
      .mockResolvedValueOnce({ data: null, error: new Error('upsert request failed') })
      .mockResolvedValueOnce({ data: null, error: { unexpected: true } })
    const service = new WordPressSettingsService(serviceWithInvoke(invoke))
    const input = { siteUrl: 'https://wordpress.example', wpUsername: 'editor', enabled: false }

    await expect(service.getStatus()).rejects.toThrow('status request failed')
    await expect(service.getStatus()).rejects.toThrow('Failed to load WordPress settings')
    await expect(service.upsert(input)).rejects.toThrow('upsert request failed')
    await expect(service.upsert(input)).rejects.toThrow('Failed to save WordPress settings')
  })
})
