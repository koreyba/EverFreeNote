// ***********************************************************
// This example support/component.js is processed and
// loaded automatically before your component test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Add Testing Library commands
import '@testing-library/cypress/add-commands'

// Import code coverage for component tests
import '@cypress/code-coverage/support'

// Import custom component testing utilities
import './component-utils'

// Mock Next.js router
Cypress.on('window:before:load', (win) => {
  win.__NEXT_DATA__ = {
    props: {
      pageProps: {},
    },
  }
})

// Mock Supabase client globally
Cypress.Commands.add('mockSupabase', () => {
  cy.window().then((win) => {
    win.supabase = {
      auth: {
        getUser: cy.stub().resolves({ data: { user: null } }),
        signInWithOAuth: cy.stub().resolves({}),
        signOut: cy.stub().resolves({}),
      },
      from: cy.stub().returns({
        select: cy.stub().returnsThis(),
        insert: cy.stub().returnsThis(),
        update: cy.stub().returnsThis(),
        delete: cy.stub().returnsThis(),
        eq: cy.stub().returnsThis(),
        single: cy.stub().resolves({ data: null }),
      }),
    }
  })
})

// Global before each for component tests
beforeEach(() => {
  cy.mockSupabase()
})
