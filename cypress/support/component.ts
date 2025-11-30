/// <reference types="cypress" />

import './commands'
import '@testing-library/cypress/add-commands'
import '@cypress/code-coverage/support'

// Define a minimal Stub type based on usage to avoid 'any'
type SinonStub = {
  returns: (value: unknown) => SinonStub
  resolves: (value: unknown) => SinonStub
  callsFake: (fn: (...args: unknown[]) => unknown) => SinonStub
  returnsThis: () => SinonStub
} & ((...args: unknown[]) => unknown)

type SupabaseQueryBuilderStub = {
  select: SinonStub
  insert: SinonStub
  update: SinonStub
  delete: SinonStub
  eq: SinonStub
  single: SinonStub
}

type SupabaseStub = {
  auth: {
    getUser: SinonStub
    signInWithOAuth: SinonStub
    signOut: SinonStub
  }
  from: (SinonStub & (() => SupabaseQueryBuilderStub))
}

type ComponentTestWindow = Window & {
  supabase?: SupabaseStub
}

const createSupabaseQueryBuilder = (): SupabaseQueryBuilderStub => ({
  select: cy.stub().returnsThis(),
  insert: cy.stub().returnsThis(),
  update: cy.stub().returnsThis(),
  delete: cy.stub().returnsThis(),
  eq: cy.stub().returnsThis(),
  single: cy.stub().resolves({ data: null }),
})

const createSupabaseStub = (): SupabaseStub => {
  const queryBuilder = createSupabaseQueryBuilder()
  const fromStub = cy.stub().callsFake(() => queryBuilder) as SupabaseStub['from']

  return {
    auth: {
      getUser: cy.stub().resolves({ data: { user: null } }),
      signInWithOAuth: cy.stub().resolves({}),
      signOut: cy.stub().resolves({}),
    },
    from: fromStub,
  }
}

Cypress.on('window:before:load', (win) => {
  const appWindow = win as unknown as ComponentTestWindow
  appWindow.__NEXT_DATA__ = {
    props: {
      pageProps: {},
    },
    page: '',
    query: {},
    buildId: 'test',
  }
})

Cypress.Commands.add('mockSupabase', () => {
  cy.window().then((win) => {
    const appWindow = win as unknown as ComponentTestWindow
    appWindow.supabase = createSupabaseStub()
  })
})

beforeEach(() => {
  cy.mockSupabase()
})

declare global {
  namespace Cypress {
    interface Chainable {
      mockSupabase(): Chainable<void>
    }
  }
}
