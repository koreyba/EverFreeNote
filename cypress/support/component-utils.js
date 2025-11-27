// @ts-check
/**
 * Component Testing Utilities for Cypress
 *
 * This file provides common utilities and helpers for component testing
 * to reduce boilerplate and improve test consistency.
 */

// Enhanced mount function with common options
Cypress.Commands.add('mountWithProviders', (component, options = {}) => {
  const {
    providers = [],
    mocks = {},
    fixtures = {},
    ...mountOptions
  } = options

  // Setup mocks before mounting
  if (Object.keys(mocks).length > 0) {
    cy.setupMocks(mocks)
  }

  // Load fixtures if specified
  if (Object.keys(fixtures).length > 0) {
    cy.loadFixtures(fixtures)
  }

  // Wrap component with providers
  let wrappedComponent = component
  providers.forEach(provider => {
    wrappedComponent = provider(wrappedComponent)
  })

  return cy.mount(wrappedComponent, mountOptions)
})

// Setup multiple mocks at once
Cypress.Commands.add('setupMocks', (mocks) => {
  Object.entries(mocks).forEach(([service, config]) => {
    cy.mockService(service, config)
  })
})

// Mock a specific service
Cypress.Commands.add('mockService', (service, config) => {
  const { method = 'get', response = {}, delay = 0, error = false } = config

  cy.window().then((win) => {
    if (!win[service]) {
      win[service] = {}
    }

    if (error) {
      win[service][method] = cy.stub().rejects(new Error('Mock error'))
    } else {
      const stub = cy.stub()
      if (delay > 0) {
        stub.resolves(response).delay(delay)
      } else {
        stub.resolves(response)
      }
      win[service][method] = stub
    }
  })
})

// Load fixture data
Cypress.Commands.add('loadFixtures', (fixtures) => {
  Object.entries(fixtures).forEach(([name, path]) => {
    cy.fixture(path).as(name)
  })
})

// Wait for component to be ready (useful for async components)
Cypress.Commands.add('waitForComponent', (selector, options = {}) => {
  const { timeout = 10000 } = options

  cy.get(selector, { timeout }).should('be.visible')
})

// Common assertion helpers for components

// Assert editor content
Cypress.Commands.add('shouldHaveEditorContent', (expectedContent) => {
  cy.get('[data-cy="editor-content"]').should('contain', expectedContent)
})

// Assert button state
Cypress.Commands.add('shouldHaveButtonState', (selector, state) => {
  const states = {
    enabled: () => cy.get(selector).should('not.be.disabled'),
    disabled: () => cy.get(selector).should('be.disabled'),
    loading: () => cy.get(selector).should('contain', 'Loading').and('be.disabled'),
    focused: () => cy.get(selector).should('have.focus')
  }

  if (states[state]) {
    states[state]()
  } else {
    throw new Error(`Unknown button state: ${state}`)
  }
})

// Assert input value
Cypress.Commands.add('shouldHaveInputValue', (selector, value) => {
  cy.get(selector).should('have.value', value)
})

// Assert element visibility
Cypress.Commands.add('shouldBeVisible', (selector) => {
  cy.get(selector).should('be.visible')
})

Cypress.Commands.add('shouldNotBeVisible', (selector) => {
  cy.get(selector).should('not.be.visible')
})

// Assert error message
Cypress.Commands.add('shouldShowError', (message) => {
  cy.get('[data-cy="error-message"]').should('contain', message).and('be.visible')
})

// Assert loading state
Cypress.Commands.add('shouldShowLoading', (selector = '[data-cy="loading"]') => {
  cy.get(selector).should('be.visible')
})

Cypress.Commands.add('shouldHideLoading', (selector = '[data-cy="loading"]') => {
  cy.get(selector).should('not.be.visible')
})

// User interaction helpers

// Type in editor (handles rich text editors)
Cypress.Commands.add('typeInEditor', (content, options = {}) => {
  const { selector = '[data-cy="editor"]', clear = true } = options

  cy.get(selector).as('editor').should('be.visible')

  if (clear) {
    cy.get('@editor').clear()
  }

  cy.get('@editor').type(content)
})

// Click button safely (waits for it to be enabled)
Cypress.Commands.add('clickButton', (selector, options = {}) => {
  const { force = false } = options

  cy.get(selector).should('not.be.disabled')

  if (force) {
    cy.get(selector).click({ force })
  } else {
    cy.get(selector).click()
  }
})

// Wait for async operations
Cypress.Commands.add('waitForAsync', (timeout = 2000) => {
  cy.wait(timeout)
})

// Test data generators

// Generate test user
Cypress.Commands.add('generateTestUser', (overrides = {}) => {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    ...overrides
  }
})

// Generate test note
Cypress.Commands.add('generateTestNote', (overrides = {}) => {
  return {
    id: 'test-note-id',
    title: 'Test Note',
    content: 'Test content',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'test-user-id',
    ...overrides
  }
})

// Component-specific helpers

// Rich text editor helpers
Cypress.Commands.add('formatTextInEditor', (format) => {
  const formatButtons = {
    bold: '[data-cy="bold-button"]',
    italic: '[data-cy="italic-button"]',
    underline: '[data-cy="underline-button"]',
    highlight: '[data-cy="highlight-button"]'
  }

  if (formatButtons[format]) {
    cy.get(formatButtons[format]).click()
  }
})

// Auth form helpers
Cypress.Commands.add('fillAuthForm', (credentials) => {
  const { email = 'test@example.com', password = 'password123' } = credentials

  cy.get('[data-cy="email-input"]').type(email)
  cy.get('[data-cy="password-input"]').type(password)
})

Cypress.Commands.add('submitAuthForm', () => {
  cy.get('[data-cy="submit-button"]').click()
})

// Export utilities for use in test files
export const componentUtils = {
  mountWithProviders: (component, options) => cy.mountWithProviders(component, options),
  setupMocks: (mocks) => cy.setupMocks(mocks),
  mockService: (service, config) => cy.mockService(service, config),
  loadFixtures: (fixtures) => cy.loadFixtures(fixtures),
  waitForComponent: (selector, options) => cy.waitForComponent(selector, options),

  // Assertions
  shouldHaveEditorContent: (expected) => cy.shouldHaveEditorContent(expected),
  shouldHaveButtonState: (selector, state) => cy.shouldHaveButtonState(selector, state),
  shouldHaveInputValue: (selector, value) => cy.shouldHaveInputValue(selector, value),
  shouldBeVisible: (selector) => cy.shouldBeVisible(selector),
  shouldNotBeVisible: (selector) => cy.shouldNotBeVisible(selector),
  shouldShowError: (message) => cy.shouldShowError(message),
  shouldShowLoading: (selector) => cy.shouldShowLoading(selector),
  shouldHideLoading: (selector) => cy.shouldHideLoading(selector),

  // Interactions
  typeInEditor: (content, options) => cy.typeInEditor(content, options),
  clickButton: (selector, options) => cy.clickButton(selector, options),
  waitForAsync: (timeout) => cy.waitForAsync(timeout),

  // Data generators
  generateTestUser: (overrides) => cy.generateTestUser(overrides),
  generateTestNote: (overrides) => cy.generateTestNote(overrides),

  // Component-specific
  formatTextInEditor: (format) => cy.formatTextInEditor(format),
  fillAuthForm: (credentials) => cy.fillAuthForm(credentials),
  submitAuthForm: () => cy.submitAuthForm()
}
