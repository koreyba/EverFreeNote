import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import '../../../../app/globals.css'
import { SettingsPage } from '@ui/web/components/features/settings/SettingsPage'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { NOTE_WORKSPACE_STORAGE_KEY } from '@ui/web/lib/noteWorkspaceStorage'
import { createNoteWorkspaceState, serializeNoteWorkspaceState, updateWorkspaceTab } from '@core/services/noteWorkspaceTabs'

describe('Mobile settings sign out with unsaved notes', { retries: 0 }, () => {
  it('focuses the safe choice and preserves a failed draft on cancel', () => {
    cy.viewport(390, 844)
    const user = { id: 'settings-user', email: 'settings@example.invalid' } as User
    const client = createClient('https://settings-test.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const signOut = cy.stub(client.auth, 'signOut').as('signOut')
    signOut.resolves({ error: null })
    const workspace = updateWorkspaceTab(createNoteWorkspaceState(() => 'failed-tab', user.id), 'failed-tab', {
      mode: 'editing', draft: { title: 'Mobile unsaved draft' }, saveState: 'error', saveError: 'Storage unavailable',
    })
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, serializeNoteWorkspaceState(workspace))
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={user}>
      <SearchParamsContext.Provider value={new URLSearchParams('tab=account')}><SettingsPage /></SearchParamsContext.Provider>
    </SupabaseTestProvider>)
    cy.get('[data-cy="settings-sign-out-button"]').click()
    cy.get('[role="alertdialog"]').should('be.visible').and('contain', 'unsaved')
    cy.focused().should('contain', 'Keep editing')
    cy.get('@signOut').should('not.have.been.called')
    cy.screenshot('mobile-signout-unsaved-warning', { capture: 'viewport' })
    cy.get('[role="alertdialog"]').contains('button', 'Keep editing').click()
    cy.get('[role="alertdialog"]').should('not.exist')
    cy.window().its('sessionStorage').invoke('getItem', NOTE_WORKSPACE_STORAGE_KEY).should('contain', 'Mobile unsaved draft')
  })
})
