import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiKeysSettingsService } from '../../../../core/services/apiKeysSettings'

describe('core/services/ApiKeysSettingsService', () => {
  it('getStatus returns status payload on success', async () => {
    const invoke = cy.stub().resolves({
      data: { gemini: { configured: true } },
      error: null,
    })
    const supabase = { functions: { invoke } } as unknown as SupabaseClient

    const service = new ApiKeysSettingsService(supabase)
    const result = await service.getStatus()

    expect(result).to.deep.equal({ gemini: { configured: true } })
    expect(invoke).to.have.been.calledWith('api-keys-status', { body: {} })
  })

  it('getStatus returns unconfigured state for null response', async () => {
    const invoke = cy.stub().resolves({ data: null, error: null })
    const supabase = { functions: { invoke } } as unknown as SupabaseClient

    const service = new ApiKeysSettingsService(supabase)
    const result = await service.getStatus()

    expect(result).to.deep.equal({ gemini: { configured: false } })
  })

  it('getStatus surfaces message from error context payload', async () => {
    const invoke = cy.stub().resolves({
      data: null,
      error: {
        context: { json: async () => ({ message: 'Unauthorized' }) },
      },
    })
    const supabase = { functions: { invoke } } as unknown as SupabaseClient

    const service = new ApiKeysSettingsService(supabase)

    try {
      await service.getStatus()
      expect.fail('Expected getStatus to throw')
    } catch (error) {
      expect((error as Error).message).to.equal('Unauthorized')
    }
  })

  it('upsert calls api-keys-upsert with geminiApiKey', async () => {
    const invoke = cy.stub().callsFake((name: string) => {
      if (name === 'api-keys-upsert') {
        return Promise.resolve({ data: { gemini: { configured: true } }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })
    const supabase = { functions: { invoke } } as unknown as SupabaseClient

    const service = new ApiKeysSettingsService(supabase)
    const result = await service.upsert('test-gemini-key')

    expect(result).to.deep.equal({ gemini: { configured: true } })
    expect(invoke).to.have.been.calledWith('api-keys-upsert', {
      body: { geminiApiKey: 'test-gemini-key' },
    })
  })

  it('upsert throws for null success response', async () => {
    const invoke = cy.stub().resolves({ data: null, error: null })
    const supabase = { functions: { invoke } } as unknown as SupabaseClient

    const service = new ApiKeysSettingsService(supabase)

    try {
      await service.upsert('test-gemini-key')
      expect.fail('Expected upsert to throw')
    } catch (error) {
      expect((error as Error).message).to.equal('Unexpected response while saving API key')
    }
  })

  it('upsert surfaces error message from context payload', async () => {
    const invoke = cy.stub().resolves({
      data: null,
      error: {
        context: { json: async () => ({ message: 'Invalid JWT' }) },
      },
    })
    const supabase = { functions: { invoke } } as unknown as SupabaseClient

    const service = new ApiKeysSettingsService(supabase)

    try {
      await service.upsert('test-gemini-key')
      expect.fail('Expected upsert to throw')
    } catch (error) {
      expect((error as Error).message).to.equal('Invalid JWT')
    }
  })
})
