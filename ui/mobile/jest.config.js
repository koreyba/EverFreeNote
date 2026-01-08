/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.(ts|tsx)'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/../core/$1',
    '^@ui/mobile/(.*)$': '<rootDir>/$1',
    '^@/(.*)$': '<rootDir>/../$1',
  },
  clearMocks: true,
  // React Native/Expo tests can leave native listeners open; force exit prevents hangs.
  forceExit: true,
}
