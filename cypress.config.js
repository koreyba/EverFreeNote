const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // E2E test specific configuration
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true, // Enable video for e2e tests
    screenshotOnRunFailure: true,
    // Timeouts optimized for e2e
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    // Retry strategy for e2e tests
    retries: {
      runMode: 0,  // Retry 2 times in CI
      openMode: 0, // No retry in dev
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

      // Add any other node event listeners here
      return config
    },
    // Component test specific configuration
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false, // Disable video recording for component tests
    screenshotOnRunFailure: true,
    retries: {
      runMode: 0,
      openMode: 0,
    },
  },
  // Code coverage configuration
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
