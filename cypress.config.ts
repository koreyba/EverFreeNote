import { defineConfig } from "cypress"
import { allureCypress } from "allure-cypress/reporter"
import * as os from "node:os"

const componentCoverageOptions = {
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
}

export default defineConfig({
  projectId: '76trp2',
  experimentalMemoryManagement: true,
  numTestsKeptInMemory: 0,
  component: {
    // Required for CI stability.
    // With JIT enabled, Cypress CT can intermittently finish spec evaluation with an empty Mocha suite
    // in GitHub Actions (`received runnables null` / `Tests: 0`) because of a spec registration race.
    justInTimeCompile: false,
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
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--disable-dev-shm-usage')
          launchOptions.args.push('--js-flags=--max-old-space-size=8192')
        }
        return launchOptions
      })

      allureCypress(on, config, {
        resultsDir: "allure-results/component",
        environmentInfo: {
          os_platform: os.platform(),
          os_release: os.release(),
          os_version: os.version(),
          node_version: process.version,
          test_type: "web-component",
        },
      })

      const coverageEnabled = config.env.codeCoverage === true || config.env.codeCoverage === 'true'
      if (coverageEnabled) {
        config.env.codeCoverage = componentCoverageOptions
        require('@cypress/code-coverage/task')(on, config)
      } else {
        delete config.env.codeCoverage
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
    codeCoverage: false,
  },
})
