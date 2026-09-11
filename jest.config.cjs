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
  '^@ui/shell/(.*)$': '<rootDir>/ui/shell/$1',
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

const coreIntegrationAllureOptions = {
  resultsDir: 'allure-results/core-integration',
  environmentInfo: {
    os_platform: os.platform(),
    os_release: os.release(),
    os_version: os.version(),
    node_version: process.version,
    test_type: 'core-integration',
  },
}

module.exports = {
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'core/**/*.{js,jsx,ts,tsx}',
    'ui/web/**/*.{js,jsx,ts,tsx}',
    'ui/shell/runtime/**/*.{js,jsx,ts,tsx}',
    'ui/shell/variants.ts',
    // Build helpers with real logic and real tests. The rest of ui/shell/scripts is
    // process orchestration, excluded from coverage in sonar-project.properties the way
    // the root scripts/ directory already is.
    'ui/shell/scripts/nativeProject.js',
    'ui/shell/scripts/supabaseEnv.js',
    'ui/shell/variants.data.js',
    '!**/*.d.ts',
    '!**/tests/**',
  ],
  coverageDirectory: '<rootDir>/coverage/jest',
  coverageReporters: ['json', 'text', 'lcov', 'html'],
  projects: [
    {
      displayName: 'unit-core',
      rootDir: __dirname,
      testEnvironment: 'allure-jest/node',
      testEnvironmentOptions: coreUnitAllureOptions,
      testRegex: ['core/tests/(unit|services)/.*\\.test\\.(ts|tsx)$'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest/core.setup.cjs'],
      transform,
      moduleNameMapper,
      clearMocks: true,
      testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
    },
    {
      displayName: 'integration-core',
      rootDir: __dirname,
      testEnvironment: 'allure-jest/node',
      testEnvironmentOptions: coreIntegrationAllureOptions,
      testRegex: ['core/tests/integration/.*\\.test\\.(ts|tsx)$'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest/core.setup.cjs'],
      transform,
      moduleNameMapper,
      clearMocks: true,
      testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
    },
    {
      displayName: 'unit-web',
      rootDir: __dirname,
      testEnvironment: 'allure-jest/jsdom',
      testEnvironmentOptions: webUnitAllureOptions,
      // The shell runtime is part of the web bundle and runs in the same jsdom
      // environment, so it is covered by this project rather than a separate one.
      testRegex: ['ui/web/tests/unit/.*\\.test\\.(ts|tsx)$', 'ui/shell/tests/unit/.*\\.test\\.(ts|tsx)$'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest/web.setup.cjs'],
      transform,
      moduleNameMapper,
      clearMocks: true,
      testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
    },
  ],
}
