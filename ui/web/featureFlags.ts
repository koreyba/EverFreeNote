const isTestEnv = process.env.NODE_ENV === 'test'

export const featureFlags = {
  testAuth: process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH === 'true' || isTestEnv,
}
