import type { SupabaseClient } from '@supabase/supabase-js'
import {
  WordPressSettingsService,
  type WordPressIntegrationStatus,
} from '../../../../core/services/wordpressSettings'

describe('core/services/WordPressSettingsService', () => {
  const status: WordPressIntegrationStatus = {
    configured: true,
    integration: {
      siteUrl: 'https://example.com',
      wpUsername: 'editor',
      enabled: true,
      hasPassword: true,
    },
  }

  it('getStatus returns status payload on success', async () => {
    const invoke = cy.stub().resolves({ data: status, error: null })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressSettingsService(supabase)
    const result = await service.getStatus()

    expect(result).to.deep.equal(status)
    expect(invoke).to.have.been.calledWith('wordpress-settings-status', {
      body: {},
    })
  })

  it('getStatus returns unconfigured state for invalid response payload', async () => {
    const invoke = cy.stub().resolves({ data: null, error: null })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressSettingsService(supabase)
    const result = await service.getStatus()

    expect(result).to.deep.equal({
      configured: false,
      integration: null,
    })
  })

  it('getStatus surfaces message from error context payload', async () => {
    const invoke = cy.stub().resolves({
      data: null,
      error: {
        context: {
          json: async () => ({ message: 'Invalid credentials' }),
        },
      },
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressSettingsService(supabase)

    try {
      await service.getStatus()
      expect.fail('Expected getStatus to throw')
    } catch (error) {
      expect((error as Error).message).to.equal('Invalid credentials')
    }
  })

  it('upsert surfaces msg field from error context payload', async () => {
    const invoke = cy.stub().resolves({
      data: null,
      error: {
        context: {
          json: async () => ({ msg: 'Invalid JWT' }),
        },
      },
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressSettingsService(supabase)

    try {
      await service.upsert({
        siteUrl: 'https://example.com',
        wpUsername: 'editor',
        applicationPassword: 'app-password',
        enabled: true,
      })
      expect.fail('Expected upsert to throw')
    } catch (error) {
      expect((error as Error).message).to.equal('Invalid JWT')
    }
  })

  it('upsert throws explicit error for invalid success payload', async () => {
    const invoke = cy.stub().resolves({ data: null, error: null })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressSettingsService(supabase)

    try {
      await service.upsert({
        siteUrl: 'https://example.com',
        wpUsername: 'editor',
        applicationPassword: 'app-password',
        enabled: true,
      })
      expect.fail('Expected upsert to throw')
    } catch (error) {
      expect((error as Error).message).to.equal('Unexpected response while saving WordPress settings')
    }
  })
})
