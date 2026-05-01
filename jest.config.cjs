const os = require('node:os')

const transform = {
  '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './.babelrc' }],
}

const moduleNameMapper = {
  '^@/components/(.*)$': '<rootDir>/ui/web/components/$1',
  '^@/supabase/(.*)$': '<rootDir>/supabase/$1',
  '^@/types/(.*)$': '<rootDir>/core/types/$1',
  '^@/(.*)$': '<rootDir>/$1',
  '^@core/(.*)$': '<rootDir>/core/$1',
  '^@ui/web/(.*)$': '<rootDir>/ui/web/$1',
  '^@ui/mobile/(.*)$': '<rootDir>/ui/mobile/$1',
}

const coreUnitAllureOptions = {
  resultsDir: 'allure-results/core-unit',
  environmentInfo: {
    os_platform: os.platform(),
    os_release: os.release(),
    os_version: os.version(),
    node_version: process.version,
    test_type: 'core-unit',
  },
}

const webUnitAllureOptions = {
  resultsDir: 'allure-results/web-unit',
  environmentInfo: {
    os_platform: os.platform(),
    os_release: os.release(),
    os_version: os.version(),
    node_version: process.version,
    test_type: 'web-unit',
  },
}

module.exports = {
  projects: [
    {
      displayName: 'unit-core',
      rootDir: __dirname,
      testEnvironment: 'allure-jest/node',
      testEnvironmentOptions: coreUnitAllureOptions,
      testRegex: ['core/tests/unit/.*\\.test\\.(ts|tsx)$'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest/core.setup.cjs'],
      transform,
      moduleNameMapper,
      clearMocks: true,
    },
    {
      displayName: 'integration-core',
      rootDir: __dirname,
      testEnvironment: 'node',
      testRegex: ['core/tests/integration/.*\\.test\\.(ts|tsx)$'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest/core.setup.cjs'],
      transform,
      moduleNameMapper,
      clearMocks: true,
    },
    {
      displayName: 'unit-web',
      rootDir: __dirname,
      testEnvironment: 'allure-jest/jsdom',
      testEnvironmentOptions: webUnitAllureOptions,
      testRegex: ['ui/web/tests/unit/.*\\.test\\.(ts|tsx)$'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest/web.setup.cjs'],
      transform,
      moduleNameMapper,
      clearMocks: true,
    },
  ],
}
