import { ApiKeysSettingsService } from '@core/services/apiKeysSettings'
import { SETTINGS_SERVICE_UNAVAILABLE_MESSAGE } from '@core/services/settingsErrorMessage'

const serviceWithInvoke = (invoke: jest.Mock) => ({ functions: { invoke } }) as never

describe('ApiKeysSettingsService additional branch behavior', () => {
  it('handles configured status variants and sends exact status, key, and remove payloads', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: { gemini: { configured: true } }, error: null })
      .mockResolvedValueOnce({ data: { gemini: { configured: false } }, error: null })
      .mockResolvedValueOnce({ data: { gemini: { configured: false } }, error: null })
    const service = new ApiKeysSettingsService(serviceWithInvoke(invoke))

    await expect(service.getStatus()).resolves.toEqual({ gemini: { configured: true } })
    await expect(service.upsert('gemini-secret')).resolves.toEqual({ gemini: { configured: false } })
    await expect(service.removeGeminiApiKey()).resolves.toEqual({ gemini: { configured: false } })

    expect(invoke).toHaveBeenNthCalledWith(1, 'api-keys-status', { body: {} })
    expect(invoke).toHaveBeenNthCalledWith(2, 'api-keys-upsert', { body: { geminiApiKey: 'gemini-secret' } })
    expect(invoke).toHaveBeenNthCalledWith(3, 'api-keys-upsert', { body: { removeGeminiApiKey: true } })
  })

  it('passes an empty API key through the exact upsert payload', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { gemini: { configured: false } }, error: null })
    const service = new ApiKeysSettingsService(serviceWithInvoke(invoke))

    await expect(service.upsert('')).resolves.toEqual({ gemini: { configured: false } })
    expect(invoke).toHaveBeenCalledWith('api-keys-upsert', { body: { geminiApiKey: '' } })
  })

  it('rejects malformed status and upsert response shapes', async () => {
    const invoke = jest.fn()
    const service = new ApiKeysSettingsService(serviceWithInvoke(invoke))
    const malformedResponses: unknown[] = [
      null,
      42,
      'malformed response',
      {},
      { gemini: null },
      { gemini: 'malformed settings' },
      { gemini: {} },
      { gemini: { configured: 'yes' } },
    ]

    for (const data of malformedResponses) {
      invoke.mockResolvedValueOnce({ data, error: null })
      await expect(service.getStatus()).rejects.toThrow('Unexpected response while loading API key settings')
    }

    invoke.mockResolvedValueOnce({ data: { gemini: {} }, error: null })
    await expect(service.upsert('secret')).rejects.toThrow('Unexpected response while updating API key settings')
  })

  it('uses context messages, unavailable status fallbacks, and operation-specific fallbacks', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({
        data: null,
        error: { context: { json: jest.fn().mockResolvedValue({ message: 'status context message' }) } },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { context: { status: 503, json: jest.fn().mockResolvedValue({}) } },
      })
      .mockResolvedValueOnce({ data: null, error: { code: 'STATUS_FAILED' } })
      .mockResolvedValueOnce({
        data: null,
        error: { context: { json: jest.fn().mockResolvedValue({ msg: 'upsert context message' }) } },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { context: { status: 502, json: jest.fn().mockResolvedValue({}) } },
      })
      .mockResolvedValueOnce({ data: null, error: { code: 'UPSERT_FAILED' } })
    const service = new ApiKeysSettingsService(serviceWithInvoke(invoke))

    await expect(service.getStatus()).rejects.toThrow('status context message')
    await expect(service.getStatus()).rejects.toThrow(SETTINGS_SERVICE_UNAVAILABLE_MESSAGE)
    await expect(service.getStatus()).rejects.toThrow('Failed to load API key settings')
    await expect(service.upsert('secret')).rejects.toThrow('upsert context message')
    await expect(service.upsert('secret')).rejects.toThrow(SETTINGS_SERVICE_UNAVAILABLE_MESSAGE)
    await expect(service.upsert('secret')).rejects.toThrow('Failed to save API key')
  })

  it('preserves ordinary Error messages from status and upsert requests', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: null, error: new Error('status request failed') })
      .mockResolvedValueOnce({ data: null, error: new Error('upsert request failed') })
    const service = new ApiKeysSettingsService(serviceWithInvoke(invoke))

    await expect(service.getStatus()).rejects.toThrow('status request failed')
    await expect(service.upsert('secret')).rejects.toThrow('upsert request failed')
  })
})
