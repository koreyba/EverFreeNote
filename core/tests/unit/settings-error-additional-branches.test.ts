import {
  extractJsonErrorMessage,
  readJsonErrorMessage,
  readJsonErrorPayload,
  readSettingsErrorMessage,
  SETTINGS_SERVICE_UNAVAILABLE_MESSAGE,
} from '../../services/settingsErrorMessage'

const unavailable = SETTINGS_SERVICE_UNAVAILABLE_MESSAGE

describe('settings error message additional branches', () => {
  it('returns null for missing, non-function and malformed JSON readers', async () => {
    expect(await readJsonErrorPayload(null as never)).toBeNull()
    expect(await readJsonErrorPayload({})).toBeNull()
    expect(await readJsonErrorPayload({ json: null as never })).toBeNull()
    expect(await readJsonErrorPayload({ json: jest.fn().mockResolvedValue(null) })).toBeNull()
    expect(await readJsonErrorPayload({ json: jest.fn().mockResolvedValue(false) })).toBeNull()
    expect(await readJsonErrorPayload({ json: jest.fn().mockResolvedValue('malformed') })).toBeNull()
    expect(await readJsonErrorPayload({ json: jest.fn().mockRejectedValue(new Error('invalid JSON')) })).toBeNull()
  })

  it('uses field precedence, skips blank values and preserves non-empty message text', async () => {
    expect(extractJsonErrorMessage({ message: '  ', msg: ' secondary ', error: 'third' }))
      .toBe(' secondary ')
    expect(extractJsonErrorMessage({ message: '', msg: '\t', error: 'last available' }))
      .toBe('last available')
    expect(extractJsonErrorMessage({ message: 42, msg: { text: 'wrong type' }, error: null }))
      .toBeNull()
    expect(extractJsonErrorMessage({ message: 'first', error: 'second' }, ['error', 'message']))
      .toBe('second')
    await expect(readJsonErrorMessage({
      json: jest.fn().mockResolvedValue({ message: 'from JSON' }),
    })).resolves.toBe('from JSON')
  })

  it('maps every supported network message pattern to the exact unavailable message', async () => {
    const patterns = [
      'failed to fetch',
      'network request failed',
      'name resolution failed',
      'fetch failed',
      'load failed',
    ]

    for (const pattern of patterns) {
      await expect(readSettingsErrorMessage(new Error(`PREFIX ${pattern.toUpperCase()} suffix`), 'fallback'))
        .resolves.toBe(unavailable)
      await expect(readSettingsErrorMessage({
        context: { json: jest.fn().mockResolvedValue({ message: `context ${pattern}` }) },
      }, 'fallback')).resolves.toBe(unavailable)
    }
  })

  it('maps 502, 503 and 504 contexts while preserving actionable messages and ordinary statuses', async () => {
    for (const status of [502, 503, 504]) {
      await expect(readSettingsErrorMessage({
        context: { status, json: jest.fn().mockResolvedValue({}) },
      }, 'fallback')).resolves.toBe(unavailable)
    }

    await expect(readSettingsErrorMessage({
      context: { status: 501, json: jest.fn().mockResolvedValue({}) },
    }, 'fallback')).resolves.toBe('fallback')
    await expect(readSettingsErrorMessage({
      context: { status: 503, json: jest.fn().mockResolvedValue({ message: 'Fix this setting' }) },
    }, 'fallback')).resolves.toBe('Fix this setting')
  })

  it('uses exact Error messages and fallback text for empty or unknown errors', async () => {
    await expect(readSettingsErrorMessage(new Error('explicit failure'), 'fallback'))
      .resolves.toBe('explicit failure')
    await expect(readSettingsErrorMessage(new Error(''), 'fallback')).resolves.toBe('fallback')
    await expect(readSettingsErrorMessage(null, 'custom fallback')).resolves.toBe('custom fallback')
    await expect(readSettingsErrorMessage('plain error value', 'custom fallback'))
      .resolves.toBe('custom fallback')
    await expect(readSettingsErrorMessage({ context: null }, 'custom fallback'))
      .resolves.toBe('custom fallback')
    await expect(readSettingsErrorMessage({ context: { status: '503' } }, 'custom fallback'))
      .resolves.toBe('custom fallback')
  })
})
