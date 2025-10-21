const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // implement node event listeners here
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
