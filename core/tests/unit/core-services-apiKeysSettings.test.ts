import { ApiKeysSettingsService } from '@core/services/apiKeysSettings'

describe('core/services/apiKeysSettings', () => {
  it('removes the stored Gemini key through the explicit upsert action', async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { gemini: { configured: false } },
      error: null,
    })
    const service = new ApiKeysSettingsService({ functions: { invoke } } as never)

    await expect(service.removeGeminiApiKey()).resolves.toEqual({
      gemini: { configured: false },
    })

    expect(invoke).toHaveBeenCalledWith('api-keys-upsert', {
      body: { removeGeminiApiKey: true },
    })
  })

  it('throws when removeGeminiApiKey receives an unexpected response shape', async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { gemini: {} },
      error: null,
    })
    const service = new ApiKeysSettingsService({ functions: { invoke } } as never)

    await expect(service.removeGeminiApiKey()).rejects.toThrow(
      'Unexpected response while updating API key settings'
    )
  })

  it('throws when removeGeminiApiKey receives an invoke error', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('request failed'))
    const service = new ApiKeysSettingsService({ functions: { invoke } } as never)

    await expect(service.removeGeminiApiKey()).rejects.toThrow('request failed')
  })
})
