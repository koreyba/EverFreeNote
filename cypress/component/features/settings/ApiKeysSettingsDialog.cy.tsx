import React from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import { ApiKeysSettingsDialog } from '../../../../ui/web/components/features/settings/ApiKeysSettingsDialog'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'

const mountDialog = (supabase: SupabaseClient) => {
  cy.mount(
    <SupabaseTestProvider supabase={supabase}>
      <ApiKeysSettingsDialog open onOpenChange={cy.stub()} />
    </SupabaseTestProvider>
  )
}

describe('features/settings/ApiKeysSettingsDialog', () => {
  it('shows configured status when a key is already stored', () => {
    const invoke = cy.stub().callsFake((name: string) => {
      if (name === 'api-keys-status') {
        return Promise.resolve({ data: { gemini: { configured: true } }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mountDialog({ functions: { invoke } } as unknown as SupabaseClient)

    cy.contains('Gemini API key is configured.').should('be.visible')
    cy.get('#gemini-api-key').should('have.attr', 'placeholder', 'Leave empty to keep current key')
    cy.contains('A key is stored. Enter a new one only to replace it.').should('be.visible')
  })

  it('shows empty input for initial setup when not configured', () => {
    const invoke = cy.stub().callsFake((name: string) => {
      if (name === 'api-keys-status') {
        return Promise.resolve({ data: { gemini: { configured: false } }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mountDialog({ functions: { invoke } } as unknown as SupabaseClient)

    cy.contains('Gemini API key is configured.').should('not.exist')
    cy.get('#gemini-api-key').should('have.attr', 'placeholder', 'AIzaSy...')
  })

  it('requires API key for initial setup when not configured', () => {
    const invoke = cy.stub().callsFake((name: string) => {
      if (name === 'api-keys-status') {
        return Promise.resolve({ data: { gemini: { configured: false } }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mountDialog({ functions: { invoke } } as unknown as SupabaseClient)

    cy.contains('button', 'Save').click()
    cy.contains('Gemini API key is required for initial setup.').should('be.visible')
    cy.wrap(invoke).should('have.callCount', 1)
  })

  it('saves key and shows success, clears input', () => {
    const invoke = cy.stub().callsFake((name: string) => {
      if (name === 'api-keys-status') {
        return Promise.resolve({ data: { gemini: { configured: false } }, error: null })
      }
      if (name === 'api-keys-upsert') {
        return Promise.resolve({ data: { gemini: { configured: true } }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mountDialog({ functions: { invoke } } as unknown as SupabaseClient)

    cy.get('#gemini-api-key').type('AIzaSy-test-key')
    cy.contains('button', 'Save').click()

    cy.wrap(invoke).should(
      'have.been.calledWith',
      'api-keys-upsert',
      Cypress.sinon.match({ body: Cypress.sinon.match({ geminiApiKey: 'AIzaSy-test-key' }) })
    )
    cy.contains('API key saved.').should('be.visible')
    cy.get('#gemini-api-key').should('have.value', '')
  })

  it('shows error message when status load fails', () => {
    const invoke = cy.stub().callsFake((name: string) => {
      if (name === 'api-keys-status') {
        return Promise.resolve({
          data: null,
          error: {
            context: { json: async () => ({ message: 'Service unavailable' }) },
          },
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mountDialog({ functions: { invoke } } as unknown as SupabaseClient)

    cy.contains('Service unavailable').should('be.visible')
  })

  it('shows error message when save fails', () => {
    const invoke = cy.stub().callsFake((name: string) => {
      if (name === 'api-keys-status') {
        return Promise.resolve({ data: { gemini: { configured: false } }, error: null })
      }
      if (name === 'api-keys-upsert') {
        return Promise.resolve({
          data: null,
          error: {
            context: { json: async () => ({ message: 'Invalid JWT' }) },
          },
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mountDialog({ functions: { invoke } } as unknown as SupabaseClient)

    cy.get('#gemini-api-key').type('AIzaSy-test-key')
    cy.contains('button', 'Save').click()

    cy.contains('Invalid JWT').should('be.visible')
  })
})
