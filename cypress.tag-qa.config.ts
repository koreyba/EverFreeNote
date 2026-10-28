import { defineConfig } from 'cypress'
import base from './cypress.config'

// This suite requires an isolated local Supabase stack and test-only accounts.
// Keep it separate from the regular mocked component suite.
export default defineConfig({
  ...base,
  component: { ...base.component!, specPattern: 'cypress/qa/**/*.cy.tsx' },
})
