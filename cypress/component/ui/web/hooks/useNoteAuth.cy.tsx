import React from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import { useNoteAuth, type NoteAuthConfig } from '../../../../../ui/web/hooks/useNoteAuth'
import { QueryProvider } from '../../../../../ui/web/components/providers/QueryProvider'
import { SupabaseTestProvider } from '../../../../../ui/web/providers/SupabaseProvider'

type SinonStub = Cypress.Agent<sinon.SinonStub>

const testAuthConfig: NoteAuthConfig = {
  testAuthEnabled: true,
  testAuthEmail: 'test@example.com',
  testAuthPassword: 'test-password',
  skipAuthEmail: 'skip-auth@example.com',
  skipAuthPassword: 'skip-password',
}

type AuthTestClient = SupabaseClient & {
  auth: SupabaseClient['auth'] & {
    signInWithPassword: SinonStub
    signInWithOAuth: SinonStub
    signOut: SinonStub
    getSession: SinonStub
    onAuthStateChange: SinonStub
  }
}

const createMockSupabase = (): AuthTestClient => ({
  auth: {
    getSession: cy.stub().resolves({ data: { session: null }, error: null }),
    onAuthStateChange: cy.stub().returns({ data: { subscription: { unsubscribe: cy.stub() } } }),
    signInWithPassword: cy.stub().resolves({ data: { user: { id: 'test-user' } }, error: null }),
    signInWithOAuth: cy.stub().resolves({ data: {}, error: null }),
    signOut: cy.stub().resolves({ error: null }),
  },
} as unknown as AuthTestClient)

const TestComponent = ({ config = testAuthConfig }: { config?: NoteAuthConfig }) => {
  const auth = useNoteAuth(config)

  return (
    <div>
      <div data-cy="loading">{auth.loading ? 'true' : 'false'}</div>
      <div data-cy="user">{auth.user ? auth.user.id : 'no-user'}</div>
      <button data-cy="test-login-btn" onClick={auth.handleTestLogin}>Test Login</button>
      <button data-cy="skip-auth-btn" onClick={auth.handleSkipAuth}>Skip Auth</button>
      <button data-cy="google-login-btn" onClick={auth.handleSignInWithGoogle}>Google Login</button>
      <button data-cy="sign-out-btn" onClick={() => auth.handleSignOut()}>Sign Out</button>
    </div>
  )
}

const mountAuth = (supabase: AuthTestClient, config?: NoteAuthConfig) => {
  cy.mount(
    <SupabaseTestProvider supabase={supabase}>
      <QueryProvider>
        <TestComponent config={config} />
      </QueryProvider>
    </SupabaseTestProvider>
  )
}

describe('useNoteAuth', () => {
  it('checks the current session on mount', () => {
    const supabase = createMockSupabase()

    mountAuth(supabase)

    cy.get('[data-cy="loading"]').should('contain', 'false')
    cy.get('[data-cy="user"]').should('contain', 'no-user')
    cy.wrap(supabase.auth.getSession).should('have.been.calledOnce')
  })

  it('handles test login with explicit test configuration', () => {
    const supabase = createMockSupabase()

    mountAuth(supabase)

    cy.get('[data-cy="test-login-btn"]').click()
    cy.get('[data-cy="user"]').should('contain', 'test-user')
    cy.wrap(supabase.auth.signInWithPassword).should('have.been.calledWith', {
      email: testAuthConfig.testAuthEmail,
      password: testAuthConfig.testAuthPassword,
    })
  })

  it('handles skip auth with explicit test configuration', () => {
    const supabase = createMockSupabase()

    mountAuth(supabase)

    cy.get('[data-cy="skip-auth-btn"]').click()
    cy.get('[data-cy="user"]').should('contain', 'test-user')
    cy.wrap(supabase.auth.signInWithPassword).should('have.been.calledWith', {
      email: testAuthConfig.skipAuthEmail,
      password: testAuthConfig.skipAuthPassword,
    })
  })

  it('does not attempt test login when test auth is disabled', () => {
    const supabase = createMockSupabase()

    mountAuth(supabase, { ...testAuthConfig, testAuthEnabled: false })

    cy.get('[data-cy="test-login-btn"]').click()
    cy.get('[data-cy="user"]').should('contain', 'no-user')
    cy.wrap(supabase.auth.signInWithPassword).should('not.have.been.called')
  })

  it('does not attempt skip auth without credentials', () => {
    const supabase = createMockSupabase()

    mountAuth(supabase, { ...testAuthConfig, skipAuthPassword: '' })

    cy.get('[data-cy="skip-auth-btn"]').click()
    cy.get('[data-cy="user"]').should('contain', 'no-user')
    cy.wrap(supabase.auth.signInWithPassword).should('not.have.been.called')
  })

  it('handles sign out', () => {
    const supabase = createMockSupabase()
    supabase.auth.getSession.resolves({ data: { session: { user: { id: 'test-user' } } }, error: null })

    mountAuth(supabase)

    cy.get('[data-cy="user"]').should('contain', 'test-user')
    cy.get('[data-cy="sign-out-btn"]').click()
    cy.get('[data-cy="user"]').should('contain', 'no-user')
    cy.wrap(supabase.auth.signOut).should('have.been.calledOnce')
  })

  it('handles Google login', () => {
    const supabase = createMockSupabase()

    mountAuth(supabase)

    cy.get('[data-cy="google-login-btn"]').click()
    cy.wrap(supabase.auth.signInWithOAuth).should('have.been.calledOnce')
  })
})
