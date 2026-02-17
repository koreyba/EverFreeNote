import { defineConfig } from "cypress"

export default defineConfig({
  projectId: '76trp2',
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
      webpackConfig: {
        devtool: false,
      },
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
    setupNodeEvents(on, config) {
      // Add code coverage for component tests
      require('@cypress/code-coverage/task')(on, config)

      const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'

      if (isCi) {
        on('before:spec', (spec) => {
          console.log(`[ct-debug] before:spec ${spec.relative}`)
        })

        on('after:spec', (spec, results) => {
          if (!results) {
            console.log(`[ct-debug] after:spec ${spec.relative} results=undefined`)
            return
          }

          const { tests, passes, failures, pending, skipped, duration } = results.stats
          console.log(
            `[ct-debug] after:spec ${spec.relative} tests=${tests} passes=${passes} failures=${failures} pending=${pending} skipped=${skipped} durationMs=${duration}`,
          )

          if (tests === 0) {
            console.warn(`[ct-debug] zero-tests ${spec.relative}`)
          }
        })
      }

      return config
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    // Increase timeouts for CI stability
    pageLoadTimeout: 120000,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 60000,
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
