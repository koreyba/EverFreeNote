/** @type {import('jest').Config} */
const os = require('node:os')

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
    '^@core/(.*)$': '<rootDir>/../../core/$1',
    '^@ui/mobile/(.*)$': '<rootDir>/$1',
    '^@/(.*)$': '<rootDir>/../../$1',
  },
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
