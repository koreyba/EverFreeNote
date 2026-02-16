import React from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import { WordPressSettingsDialog } from '../../../../ui/web/components/features/wordpress/WordPressSettingsDialog'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'

const mountDialog = (supabase: SupabaseClient) => {
  cy.mount(
    <SupabaseTestProvider supabase={supabase}>
      <WordPressSettingsDialog open onOpenChange={cy.stub()} />
    </SupabaseTestProvider>
  )
}

describe('features/wordpress/WordPressSettingsDialog', () => {
  it('loads existing status and renders current values', () => {
    const invoke = cy.stub().callsFake((name: string) => {
      if (name === 'wordpress-settings-status') {
        return Promise.resolve({
          data: {
            configured: true,
            integration: {
              siteUrl: 'https://stage.dkoreiba.com',
              wpUsername: 'koreybadenis',
              enabled: true,
              hasPassword: true,
            },
          },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const supabase = { functions: { invoke } } as unknown as SupabaseClient
    mountDialog(supabase)

    cy.get('#wp-site-url').should('have.value', 'https://stage.dkoreiba.com')
    cy.get('#wp-username').should('have.value', 'koreybadenis')
    cy.contains('Integration is configured.').should('be.visible')
  })

  it('validates required site url and username before save', () => {
    const invoke = cy.stub().callsFake((name: string) => {
      if (name === 'wordpress-settings-status') {
        return Promise.resolve({
          data: { configured: false, integration: null },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const supabase = { functions: { invoke } } as unknown as SupabaseClient
    mountDialog(supabase)

    cy.contains('button', 'Save').click()
    cy.contains('Site URL and username are required.').should('be.visible')
    cy.wrap(invoke).should('have.callCount', 1)
  })

  it('requires application password for initial setup', () => {
    const invoke = cy.stub().callsFake((name: string) => {
      if (name === 'wordpress-settings-status') {
        return Promise.resolve({
          data: {
            configured: false,
            integration: {
              siteUrl: 'https://stage.dkoreiba.com',
              wpUsername: 'koreybadenis',
              enabled: true,
              hasPassword: false,
            },
          },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const supabase = { functions: { invoke } } as unknown as SupabaseClient
    mountDialog(supabase)

    cy.contains('button', 'Save').click()
    cy.contains('Application password is required for initial setup.').should('be.visible')
    cy.wrap(invoke).should('have.callCount', 1)
  })

  it('saves settings with normalized url and shows success', () => {
    const invoke = cy.stub().callsFake((name: string, params: { body?: { siteUrl?: string } }) => {
      if (name === 'wordpress-settings-status') {
        return Promise.resolve({
          data: { configured: false, integration: null },
          error: null,
        })
      }
      if (name === 'wordpress-settings-upsert') {
        return Promise.resolve({
          data: {
            configured: true,
            integration: {
              siteUrl: params?.body?.siteUrl ?? 'https://stage.dkoreiba.com',
              wpUsername: 'koreybadenis',
              enabled: true,
              hasPassword: true,
            },
          },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const supabase = { functions: { invoke } } as unknown as SupabaseClient
    mountDialog(supabase)

    cy.get('#wp-site-url').clear().type('https://stage.dkoreiba.com/')
    cy.get('#wp-username').clear().type('koreybadenis')
    cy.get('#wp-app-password').type('cyez RgA9 Fm9L iw8h XmIn P3N6')
    cy.contains('button', 'Save').click()

    cy.wrap(invoke).should(
      'have.been.calledWith',
      'wordpress-settings-upsert',
      Cypress.sinon.match({
        body: Cypress.sinon.match({
          siteUrl: 'https://stage.dkoreiba.com',
          wpUsername: 'koreybadenis',
          enabled: true,
        }),
      })
    )
    cy.contains('WordPress settings saved.').should('be.visible')
    cy.get('#wp-app-password').should('have.value', '')
  })

  it('shows save error message from service', () => {
    const invoke = cy.stub().callsFake((name: string) => {
      if (name === 'wordpress-settings-status') {
        return Promise.resolve({
          data: {
            configured: true,
            integration: {
              siteUrl: 'https://stage.dkoreiba.com',
              wpUsername: 'koreybadenis',
              enabled: true,
              hasPassword: true,
            },
          },
          error: null,
        })
      }
      if (name === 'wordpress-settings-upsert') {
        return Promise.resolve({
          data: null,
          error: {
            context: {
              json: async () => ({ message: 'Invalid JWT' }),
            },
          },
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const supabase = { functions: { invoke } } as unknown as SupabaseClient
    mountDialog(supabase)

    cy.get('#wp-site-url').clear().type('https://stage.dkoreiba.com')
    cy.get('#wp-username').clear().type('koreybadenis')
    cy.contains('button', 'Save').click()

    cy.contains('Invalid JWT').should('be.visible')
  })
})
