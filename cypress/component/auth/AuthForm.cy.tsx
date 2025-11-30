import React from 'react'
import AuthForm from '@/components/AuthForm'

describe('AuthForm Component', () => {
  it('renders all authentication buttons and elements', () => {
    const onTestLoginSpy = cy.spy().as('onTestLoginSpy')
    const onSkipAuthSpy = cy.spy().as('onSkipAuthSpy')
    const onGoogleAuthSpy = cy.spy().as('onGoogleAuthSpy')

    // Монтируем РЕАЛЬНЫЙ компонент AuthForm
    cy.mount(
      <AuthForm
        onTestLogin={onTestLoginSpy}
        onSkipAuth={onSkipAuthSpy}
        onGoogleAuth={onGoogleAuthSpy}
      />
    )

    // Проверяем что форма отображается
    cy.get('[data-cy="auth-form"]').should('be.visible')

    // Проверяем что все кнопки отображаются
    cy.get('[data-cy="google-button"]').should('be.visible')
    cy.get('[data-cy="test-login-button"]').should('be.visible')
    cy.get('[data-cy="skip-auth-button"]').should('be.visible')

    // Проверяем разделитель
    cy.get('[data-cy="auth-divider"]').should('be.visible').and('contain', 'Or test the app')

    // Проверяем текст кнопок
    cy.get('[data-cy="google-button"]').should('contain', 'Continue with Google')
    cy.get('[data-cy="test-login-button"]').should('contain', '🧪 Test Login (Persistent)')
    cy.get('[data-cy="skip-auth-button"]').should('contain', '🚀 Skip Authentication (Quick Test)')
  })

  it('calls onGoogleAuth when Google button is clicked', () => {
    const onTestLoginSpy = cy.spy().as('onTestLoginSpy')
    const onSkipAuthSpy = cy.spy().as('onSkipAuthSpy')
    const onGoogleAuthSpy = cy.spy().as('onGoogleAuthSpy')

    cy.mount(
      <AuthForm
        onTestLogin={onTestLoginSpy}
        onSkipAuth={onSkipAuthSpy}
        onGoogleAuth={onGoogleAuthSpy}
      />
    )

    // Кликаем на кнопку Google
    cy.get('[data-cy="google-button"]').click()

    // Проверяем что коллбек был вызван
    cy.get('@onGoogleAuthSpy').should('have.been.calledOnce')
  })

  it('calls onTestLogin when test login button is clicked', () => {
    const onTestLoginSpy = cy.spy().as('onTestLoginSpy')
    const onSkipAuthSpy = cy.spy().as('onSkipAuthSpy')
    const onGoogleAuthSpy = cy.spy().as('onGoogleAuthSpy')

    cy.mount(
      <AuthForm
        onTestLogin={onTestLoginSpy}
        onSkipAuth={onSkipAuthSpy}
        onGoogleAuth={onGoogleAuthSpy}
      />
    )

    // Кликаем на кнопку Test Login
    cy.get('[data-cy="test-login-button"]').click()

    // Проверяем что коллбек был вызван
    cy.get('@onTestLoginSpy').should('have.been.calledOnce')
  })

  it('calls onSkipAuth when skip auth button is clicked', () => {
    const onTestLoginSpy = cy.spy().as('onTestLoginSpy')
    const onSkipAuthSpy = cy.spy().as('onSkipAuthSpy')
    const onGoogleAuthSpy = cy.spy().as('onGoogleAuthSpy')

    cy.mount(
      <AuthForm
        onTestLogin={onTestLoginSpy}
        onSkipAuth={onSkipAuthSpy}
        onGoogleAuth={onGoogleAuthSpy}
      />
    )

    // Кликаем на кнопку Skip Auth
    cy.get('[data-cy="skip-auth-button"]').click()

    // Проверяем что коллбек был вызван
    cy.get('@onSkipAuthSpy').should('have.been.calledOnce')
  })

  it('buttons are disabled during loading', () => {
    const onTestLoginSpy = cy.spy(async () => {
      // Имитируем асинхронную операцию
      await new Promise(resolve => setTimeout(resolve, 100))
    }).as('onTestLoginSpy')
    const onSkipAuthSpy = cy.spy().as('onSkipAuthSpy')
    const onGoogleAuthSpy = cy.spy().as('onGoogleAuthSpy')

    cy.mount(
      <AuthForm
        onTestLogin={onTestLoginSpy}
        onSkipAuth={onSkipAuthSpy}
        onGoogleAuth={onGoogleAuthSpy}
      />
    )

    // Кликаем на кнопку Test Login
    cy.get('[data-cy="test-login-button"]').click()

    // Во время выполнения кнопки должны быть disabled
    cy.get('[data-cy="google-button"]').should('be.disabled')
    cy.get('[data-cy="test-login-button"]').should('be.disabled')
    cy.get('[data-cy="skip-auth-button"]').should('be.disabled')

    // После завершения кнопки должны быть enabled
    cy.get('[data-cy="google-button"]').should('not.be.disabled')
    cy.get('[data-cy="test-login-button"]').should('not.be.disabled')
    cy.get('[data-cy="skip-auth-button"]').should('not.be.disabled')
  })

  it('has correct button styling', () => {
    const onTestLoginSpy = cy.spy().as('onTestLoginSpy')
    const onSkipAuthSpy = cy.spy().as('onSkipAuthSpy')
    const onGoogleAuthSpy = cy.spy().as('onGoogleAuthSpy')

    cy.mount(
      <AuthForm
        onTestLogin={onTestLoginSpy}
        onSkipAuth={onSkipAuthSpy}
        onGoogleAuth={onGoogleAuthSpy}
      />
    )

    // Проверяем стили кнопки Google
    cy.get('[data-cy="google-button"]')
      .should('have.class', 'w-full')
      .and('have.class', 'h-12')

    // Проверяем стили кнопок Test Login и Skip Auth (outline variant)
    cy.get('[data-cy="test-login-button"]')
      .should('have.class', 'w-full')
      .and('have.class', 'h-10')

    cy.get('[data-cy="skip-auth-button"]')
      .should('have.class', 'w-full')
      .and('have.class', 'h-10')
  })

  it('Google button contains SVG icon', () => {
    const onTestLoginSpy = cy.spy().as('onTestLoginSpy')
    const onSkipAuthSpy = cy.spy().as('onSkipAuthSpy')
    const onGoogleAuthSpy = cy.spy().as('onGoogleAuthSpy')

    cy.mount(
      <AuthForm
        onTestLogin={onTestLoginSpy}
        onSkipAuth={onSkipAuthSpy}
        onGoogleAuth={onGoogleAuthSpy}
      />
    )

    // Проверяем что у кнопки Google есть SVG иконка
    cy.get('[data-cy="google-button"] svg').should('exist')
    cy.get('[data-cy="google-button"] svg').should('have.attr', 'viewBox', '0 0 24 24')
  })
})
