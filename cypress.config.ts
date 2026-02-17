import { defineConfig } from "cypress"

const CT_DEBUG_INSTRUMENTATION_VERSION = 'ct-debug-2026-02-17-v3'

export default defineConfig({
  projectId: '76trp2',
  // Debug experiment: avoid JIT compile race in CT that may lead to empty runnables.
  justInTimeCompile: false,
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
      webpackConfig: {
        devtool: false,
        // Reduce host/origin mismatch noise in CI websocket handshake.
        devServer: {
          allowedHosts: 'all',
          host: 'localhost',
          client: {
            webSocketURL: {
              hostname: 'localhost',
            },
          },
        },
      },
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
    setupNodeEvents(on, config) {
      // Add code coverage for component tests
      require('@cypress/code-coverage/task')(on, config)

      const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'

      if (isCi) {
        console.log(`[ct-debug] instrumentation-version ${CT_DEBUG_INSTRUMENTATION_VERSION}`)

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

            // Dump compact run metadata for zero-tests cases.
            // Cypress often keeps extra diagnostics in results/runs that are not printed by default reporter.
            const safeResults = results as unknown as {
              startedTestsAt?: string
              endedTestsAt?: string
              runs?: Array<{ error?: unknown; stats?: unknown; tests?: unknown[] }>
              reporterStats?: unknown
              error?: unknown
            }

            const zeroMeta = {
              spec: spec.relative,
              startedTestsAt: safeResults.startedTestsAt,
              endedTestsAt: safeResults.endedTestsAt,
              runsLength: safeResults.runs?.length ?? 0,
              runErrorCount: safeResults.runs?.filter((run) => Boolean(run?.error)).length ?? 0,
              runErrors: safeResults.runs
                ?.map((run, idx) => ({ idx, error: run?.error }))
                .filter((item) => Boolean(item.error)),
              topLevelError: safeResults.error,
              reporterStats: safeResults.reporterStats,
            }

            console.warn(`[ct-debug] zero-tests-meta ${JSON.stringify(zeroMeta)}`)
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
