import { defineConfig } from "cypress"

export default defineConfig({
  projectId: '76trp2',
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents() {
      // implement node event listeners here
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    experimentalRunAllSpecs: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    experimentalPromptCommand: true,
    retries: {
      runMode: 0,
      openMode: 0,
    },
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js',
    setupNodeEvents(on, config) {
      // Add code coverage for component tests
      require('@cypress/code-coverage/task')(on, config)
      return config
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 0,
      openMode: 0,
    },
  },
  env: {
    codeCoverage: {
      exclude: [
        'cypress/**/*.*',
        '**/*.config.js',
        'node_modules/**/*',
        'coverage/**/*',
      ],
      include: [
        'components/**/*.{js,jsx,ts,tsx}',
        'lib/**/*.{js,jsx,ts,tsx}',
        'hooks/**/*.{js,jsx,ts,tsx}',
      ],
    },
  },
})
