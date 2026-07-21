/** @type {import('jest').Config} */
const os = require('node:os')
const path = require('node:path')

module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'allure-jest/node',
  testEnvironmentOptions: {
    resultsDir: 'allure-results/mobile-unit',
    environmentInfo: {
      os_platform: os.platform(),
      os_release: os.release(),
      os_version: os.version(),
      node_version: process.version,
      test_type: 'mobile-unit',
    },
  },
  testRegex: ['tests/.*\\.test\\.(ts|tsx)$'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  moduleNameMapper: {
    '^@everfreenote/core/(.*)$': '<rootDir>/../../core/$1',
    '^@core/(.*)$': '<rootDir>/../../core/$1',
    '^@ui/mobile/(.*)$': '<rootDir>/$1',
    '^@/(.*)$': '<rootDir>/../../$1',
  },
  // Mobile coverage is a separate producer. It owns the Expo application
  // sources; shared core modules imported by mobile tests are also recorded
  // naturally by Jest and are deduplicated when Sonar imports all LCOV files.
  collectCoverageFrom: [
    '<rootDir>/**/*.{js,jsx,ts,tsx}',
    '!<rootDir>/tests/**',
    '!<rootDir>/coverage/**',
    '!<rootDir>/android/**',
    '!<rootDir>/ios/**',
    '!<rootDir>/.expo/**',
    '!<rootDir>/allure-results/**',
    '!<rootDir>/allure-report/**',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/*.config.{js,ts}',
  ],
  coverageDirectory: '<rootDir>/coverage',
  // Sonar scans from the repository root, so LCOV source paths must also be
  // repository-relative (ui/mobile/...), not relative to this package.
  coverageReporters: [
    'json',
    'text',
    ['lcov', { projectRoot: path.resolve(__dirname, '../..') }],
    'html',
  ],
  clearMocks: true,
  // React Native/Expo tests can leave native listeners open; force exit prevents hangs.
  forceExit: true,
  // Default 5000ms is too tight for the longest multi-step integration tests
  // (several sequential waitFor rounds) once the full suite saturates every
  // CPU core across parallel workers — that starves individual async waits
  // without any actual logic bug. 15s gives enough headroom under load while
  // still failing fast on a genuine hang.
  testTimeout: 15000,
}
