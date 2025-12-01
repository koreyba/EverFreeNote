import React from 'react'
import AuthForm from '@/components/AuthForm'

describe('AuthForm', () => {
  it('renders all buttons', () => {
    cy.mount(
      <AuthForm
        enableTestAuth
        onTestLogin={cy.spy()}
        onSkipAuth={cy.spy()}
        onGoogleAuth={cy.spy()}
      />
    )
    cy.get('[data-cy="google-button"]').should('be.visible')
    cy.get('[data-cy="test-login-button"]').should('be.visible')
    cy.get('[data-cy="skip-auth-button"]').should('be.visible')
    cy.get('[data-cy="auth-divider"]').should('be.visible')
  })

  it('calls onGoogleAuth when Google button is clicked', () => {
    const onGoogleAuth = cy.spy().as('onGoogleAuth')
    cy.mount(
      <AuthForm
        enableTestAuth
        onTestLogin={cy.spy()}
        onSkipAuth={cy.spy()}
        onGoogleAuth={onGoogleAuth}
      />
    )
    cy.get('[data-cy="google-button"]').click()
    cy.get('@onGoogleAuth').should('have.been.called')
  })

  it('calls onTestLogin when Test Login button is clicked', () => {
    const onTestLogin = cy.spy().as('onTestLogin')
    cy.mount(
      <AuthForm
        enableTestAuth
        onTestLogin={onTestLogin}
        onSkipAuth={cy.spy()}
        onGoogleAuth={cy.spy()}
      />
    )
    cy.get('[data-cy="test-login-button"]').click()
    cy.get('@onTestLogin').should('have.been.called')
  })

  it('calls onSkipAuth when Skip Auth button is clicked', () => {
    const onSkipAuth = cy.spy().as('onSkipAuth')
    cy.mount(
      <AuthForm
        enableTestAuth
        onTestLogin={cy.spy()}
        onSkipAuth={onSkipAuth}
        onGoogleAuth={cy.spy()}
      />
    )
    cy.get('[data-cy="skip-auth-button"]').click()
    cy.get('@onSkipAuth').should('have.been.called')
  })

  it('disables buttons while loading', () => {
    // Create a promise that we can control
    let resolvePromise: () => void
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve
    })

    const onGoogleAuth = cy.stub().returns(promise)

    cy.mount(
      <AuthForm
        enableTestAuth
        onTestLogin={cy.spy()}
        onSkipAuth={cy.spy()}
        onGoogleAuth={onGoogleAuth}
      />
    )

    cy.get('[data-cy="google-button"]').click()
    
    // Buttons should be disabled
    cy.get('[data-cy="google-button"]').should('be.disabled')
    cy.get('[data-cy="test-login-button"]').should('be.disabled')
    cy.get('[data-cy="skip-auth-button"]').should('be.disabled')

    // Resolve promise to finish loading
    cy.then(() => resolvePromise())

    // Buttons should be enabled again
    cy.get('[data-cy="google-button"]').should('not.be.disabled')
  })
})
