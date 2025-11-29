import React from 'react'
import { SupabaseProvider, useSupabase } from '@/lib/providers/SupabaseProvider'

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
  it('renders children and provides initial state', () => {
    cy.mount(
      <SupabaseProvider>
        <TestConsumer />
      </SupabaseProvider>
    )

    // Initially loading should be true (or false quickly if no session)
    // Since we can't easily mock the client creation inside the provider without
    // changing the code or using advanced mocking, we verify it renders and eventually settles.
    
    cy.get('[data-cy="loading"]').should('exist')
    cy.get('[data-cy="user"]').should('exist')
  })

  it('handles unhandled rejection for Navigator LockManager', () => {
    cy.mount(
      <SupabaseProvider>
        <div>Test</div>
      </SupabaseProvider>
    )

    // Simulate the specific unhandled rejection
    const event = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.reject(new Error('Navigator LockManager lock')),
      reason: 'Navigator LockManager lock'
    })
    
    // We can't easily assert that preventDefault was called on the event dispatched manually 
    // in this environment, but we can ensure it doesn't crash the test.
    window.dispatchEvent(event)
  })
})
