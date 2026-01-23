import { defineConfig } from "cypress"

export default defineConfig({
  projectId: '76trp2',
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
    setupNodeEvents(on, config) {
      // Add code coverage for component tests
      require('@cypress/code-coverage/task')(on, config)

      on('task', {
        log(message) {
          console.log(message)
          return null
        },
      })

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
        'core/**/*.{js,jsx,ts,tsx}',
        'ui/**/*.{js,jsx,ts,tsx}',
      ],
    },
  },
})
