const transform = {
  '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './.babelrc' }],
}

const moduleNameMapper = {
  '^@/(.*)$': '<rootDir>/$1',
  '^@core/(.*)$': '<rootDir>/core/$1',
  '^@ui/web/(.*)$': '<rootDir>/ui/web/$1',
  '^@ui/mobile/(.*)$': '<rootDir>/ui/mobile/$1',
}

module.exports = {
  projects: [
    {
      displayName: 'unit-core',
      rootDir: __dirname,
      testEnvironment: 'node',
      testRegex: ['core/tests/unit/.*\\.test\\.(ts|tsx)$'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest/core.setup.cjs'],
      transform,
      moduleNameMapper,
      clearMocks: true,
    },
    {
      displayName: 'unit-web',
      rootDir: __dirname,
      testEnvironment: 'jsdom',
      testRegex: ['ui/web/tests/unit/.*\\.test\\.(ts|tsx)$'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest/web.setup.cjs'],
      transform,
      moduleNameMapper,
      clearMocks: true,
    },
  ],
}
