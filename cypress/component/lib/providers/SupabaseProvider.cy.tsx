import React from 'react'
import { SupabaseProvider, useSupabase } from '../../../../ui/web/providers/SupabaseProvider'
import { webSupabaseClientFactory } from '../../../../ui/web/adapters/supabaseClient'
import type { SupabaseClient } from '@supabase/supabase-js'

type SinonStub = ReturnType<typeof cy.stub>

const TestConsumer = () => {
  const { user, loading } = useSupabase()
  return (
    <div>
      <div data-cy="loading">{loading.toString()}</div>
      <div data-cy="user">{user ? user.email : 'no-user'}</div>
    </div>
  )
}

describe('SupabaseProvider', () => {
  let mockSupabase: SupabaseClient

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getSession: cy.stub().resolves({ data: { session: null }, error: null }),
        onAuthStateChange: cy.stub().returns({ data: { subscription: { unsubscribe: cy.stub() } } })
      }
    } as unknown as SupabaseClient

    // Mock the factory method
    cy.stub(webSupabaseClientFactory, 'createClient').returns(mockSupabase)
  })

  it('renders children and provides initial state', () => {
    cy.mount(
      <SupabaseProvider>
        <TestConsumer />
      </SupabaseProvider>
    )

    cy.get('[data-cy="loading"]').should('have.text', 'false')
    cy.get('[data-cy="user"]').should('have.text', 'no-user')
    
    cy.wrap(mockSupabase.auth.getSession).should('have.been.called')
    cy.wrap(mockSupabase.auth.onAuthStateChange).should('have.been.called')
  })

  it('updates user on session change', () => {
    const mockSession = { user: { email: 'test@example.com' } }
    ;(mockSupabase.auth.getSession as unknown as SinonStub).resolves({ data: { session: mockSession }, error: null })

    cy.mount(
      <SupabaseProvider>
        <TestConsumer />
      </SupabaseProvider>
    )

    cy.get('[data-cy="user"]').should('have.text', 'test@example.com')
  })

  it('handles unhandled rejection for Navigator LockManager', () => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes('Navigator LockManager lock')) {
        return false
      }
      return true
    })

    cy.mount(
      <SupabaseProvider>
        <div>Test</div>
      </SupabaseProvider>
    )

    // Simulate the specific unhandled rejection
    // Use a resolved promise to avoid creating a real unhandled rejected Promise in the spec runtime.
    const event = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: new Error('Navigator LockManager lock'),
    })
    
    window.dispatchEvent(event)
  })
})
